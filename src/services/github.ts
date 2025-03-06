import { httpsCallable } from 'firebase/functions';
import { 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  QueryDocumentSnapshot, 
  DocumentData, 
  DocumentSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db, functions } from '../config/firebase';
import { Octokit } from '@octokit/rest';
import { 
  InvitationData, 
  InvitationResponse, 
  UserInvitation, 
  InvitationRole, 
  InvitationStatus 
} from '../types/user';

// Add type interfaces for Firestore documents
interface AccountData extends DocumentData {
  name: string;
  members: Record<string, {
    role: 'admin' | 'member';
    joinedAt: number;
  }>;
}

interface UserData extends DocumentData {
  displayName?: string;
  email: string;
  photoURL?: string;
}

// Types
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  default_branch: string;
  language?: string;
  size?: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  git_url: string;
  ssh_url: string;
  clone_url: string;
  html_url: string;
}

export interface SyncResponse {
  success: boolean;
  filesProcessed?: number;
  error?: string;
}

export interface SyncStatus {
  status: 'idle' | 'syncing' | 'completed' | 'failed';
  error?: string;
  progress?: number;
  lastSynced?: Date;
}

export interface RepositoryFile {
  path: string;
  language?: string;
  size: number;
  last_updated?: string;
  last_commit_message?: string;
  type: 'file' | 'dir';
  content?: string;
  imports?: string[];
  metadata?: {
    sha: string;
    type: string;
    [key: string]: any;
  };
  first_indexed_at?: any;
  updated_at?: any;
  status?: string;
  classes?: string[];
  functions?: string[];
  exports?: string[];
  summary?: string;
}

// GitHub token management
export const storeGithubToken = async (token: string, accountId: string): Promise<void> => {
  try {
    const storeToken = httpsCallable<
      { token: string; accountId: string },
      { success: boolean; error?: string }
    >(functions, 'storeGithubToken');
    
    const result = await storeToken({ token, accountId });
    if (!result.data.success) {
      throw new Error(result.data.error || 'Failed to store GitHub token');
    }
  } catch (error) {
    console.error('Error storing GitHub token:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to store GitHub token');
  }
};

export const getToken = async (accountId: string): Promise<string | null> => {
  try {
    const tokenDoc = await getDoc(doc(db, 'secure_tokens', accountId));
    return tokenDoc.data()?.githubToken || null;
  } catch (error) {
    console.error('Error getting GitHub token:', error);
    return null;
  }
};

export const clearToken = async (accountId: string): Promise<void> => {
  try {
    await setDoc(doc(db, 'secure_tokens', accountId), {
      githubToken: null,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing GitHub token:', error);
    throw new Error('Failed to clear GitHub token');
  }
};

// Repository synchronization
export const syncRepository = async (repositoryName: string, accountId: string): Promise<SyncResponse> => {
  try {
    // Update sync status in Firestore
    const statusRef = doc(db, `repositories/${repositoryName.replace('/', '_')}/status/sync`);
    await setDoc(statusRef, {
      status: 'syncing',
      startedAt: new Date().toISOString()
    });

    // Call Firebase Function
    const syncRepo = httpsCallable<
      { repositoryName: string; accountId: string },
      SyncResponse
    >(functions, 'syncGithubRepository');
    
    const result = await syncRepo({ repositoryName, accountId });
    
    if (!result.data?.success) {
      throw new Error(result.data?.error || 'Sync failed');
    }

    // Update success status
    await setDoc(statusRef, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      filesProcessed: result.data.filesProcessed
    });
    
    return result.data;
  } catch (error) {
    // Update error status
    const statusRef = doc(db, `repositories/${repositoryName.replace('/', '_')}/status/sync`);
    await setDoc(statusRef, {
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      failedAt: new Date().toISOString()
    });

    console.error('Error syncing repository:', error);
    throw error;
  }
};

// Repository validation
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Repository fetching
export const fetchUserRepositories = async (accountId: string): Promise<GitHubRepo[]> => {
  try {
    const token = await getToken(accountId);
    if (!token) {
      throw new Error('GitHub token not found');
    }

    const response = await fetch('https://api.github.com/user/repos?sort=updated', {
      headers: {
        Authorization: `token ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw new Error('Failed to fetch repositories');
  }
};

// File content fetching
export async function getFileContent(repoFullName: string, filePath: string, accountId: string): Promise<string> {
  try {
    const tokenDoc = await getDoc(doc(db, 'secure_tokens', accountId));
    const githubToken = tokenDoc.data()?.githubToken;
    
    if (!githubToken) {
      throw new Error('GitHub token not found for this account');
    }

    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = repoFullName.split('/');

    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
    });

    if ('content' in response.data && !Array.isArray(response.data)) {
      const base64Content = response.data.content.replace(/\n/g, '');
      return atob(base64Content);
    }
    throw new Error('Invalid response from GitHub API');
  } catch (error) {
    console.error('GitHub API error:', error);
    throw new Error(`Failed to fetch file content: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Repository files fetching
export async function getRepositoryFiles(repoFullName: string): Promise<RepositoryFile[]> {
  try {
    const repoPath = repoFullName.replace('/', '_');
    const filesCollectionRef = collection(db, 'repositories', repoPath, 'files');
    const filesSnapshot = await getDocs(filesCollectionRef);
    
    return filesSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      return {
        path: doc.id,
        name: doc.id.split('/').pop() || '',
        language: data.language,
        size: data.size || 0,
        last_updated: data.last_updated,
        last_commit_message: data.last_commit_message,
        type: data.type || 'file',
        content: data.content || '',
        imports: data.imports || [],
        metadata: data.metadata || { sha: '', type: '' },
        first_indexed_at: data.first_indexed_at,
        updated_at: data.updated_at,
        status: data.status,
        classes: data.classes || [],
        functions: data.functions || [],
        exports: data.exports || [],
        summary: data.summary
      };
    });
  } catch (error) {
    console.error('Error fetching repository files:', error);
    throw error;
  }
}

// Repository file fetching
export async function getRepositoryFile(path: string): Promise<RepositoryFile> {
  const fileRef = doc(db, 'files', path);
  const fileDoc = await getDoc(fileRef);
  
  if (!fileDoc.exists()) {
    throw new Error('File not found');
  }

  const data = fileDoc.data();
  return {
    path: fileDoc.id,
    language: data?.language,
    size: data?.size || 0,
    last_updated: data?.last_updated,
    last_commit_message: data?.last_commit_message,
    type: data?.type || 'file',
    content: data?.content || '',
    imports: data?.imports || [],
    metadata: data?.metadata || {
      sha: '',
      type: ''
    },
    first_indexed_at: data?.first_indexed_at,
    updated_at: data?.updated_at,
    status: data?.status,
    classes: data?.classes || [],
    functions: data?.functions || [],
    exports: data?.exports || [],
    summary: data?.summary
  };
}

// Invitation Management
export const sendInvitation = async (
  email: string,
  accountId: string,
  role: InvitationRole,
  resend: boolean = false
): Promise<InvitationResponse> => {
  try {
    // Input validation
    if (!email?.trim()) {
      throw new Error('Email is required');
    }

    if (!accountId?.trim()) {
      throw new Error('Account ID is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Check if user is already a member
    const membersRef = doc(db, 'accounts', accountId);
    const membersDoc = await getDoc(membersRef);
    
    if (!membersDoc.exists()) {
      throw new Error('Account not found');
    }

    const members = membersDoc.data()?.members || {};
    const existingMember = Object.values(members).find(
      (member: any) => member.email?.toLowerCase() === email.toLowerCase()
    );
    
    if (existingMember) {
      throw new Error('User is already a member of this account');
    }

    // Call Firebase Function
    const sendInvite = httpsCallable<
      { email: string; accountId: string; role: InvitationRole; resend: boolean },
      InvitationResponse
    >(functions, 'sendInvitation');

    const result = await sendInvite({ 
      email: email.trim().toLowerCase(), 
      accountId: accountId.trim(),
      role,
      resend
    });

    // If successful, fetch updated invitations
    if (result.data.success) {
      await getInvitations(accountId);
    }

    return result.data;
  } catch (error) {
    console.error('Error sending invitation:', error);
    throw new Error(
      error instanceof Error 
        ? `Failed to send invitation: ${error.message}` 
        : 'Failed to send invitation'
    );
  }
};

export const acceptInvitation = async (token: string): Promise<InvitationResponse> => {
  try {
    // Input validation
    if (!token?.trim()) {
      throw new Error('Invitation token is required');
    }

    // Find invitation
    const invitationsRef = collection(db, 'invitations');
    const q = query(
      invitationsRef,
      where('token', '==', token.trim()),
      where('status', '==', 'pending' as InvitationStatus)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      throw new Error('Invalid or expired invitation token');
    }

    const invitation = snapshot.docs[0].data() as InvitationData;
    
    // Check if invitation has expired
    if (new Date(invitation.expiresAt) < new Date()) {
      await updateDoc(snapshot.docs[0].ref, { 
        status: 'expired' as InvitationStatus,
        lastUpdated: new Date().toISOString()
      });
      throw new Error('Invitation has expired');
    }

    // Call Firebase Function
    const acceptInvite = httpsCallable<
      { token: string },
      InvitationResponse
    >(functions, 'acceptInvitation');

    const result = await acceptInvite({ token: token.trim() });

    // Update invitation status locally if successful
    if (result.data.success) {
      await updateDoc(snapshot.docs[0].ref, { 
        status: 'accepted' as InvitationStatus,
        lastUpdated: new Date().toISOString()
      });
    }

    return result.data;
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw new Error(
      error instanceof Error 
        ? `Failed to accept invitation: ${error.message}` 
        : 'Failed to accept invitation'
    );
  }
};

export const getInvitations = async (accountId: string): Promise<UserInvitation[]> => {
  if (!accountId?.trim()) {
    throw new Error('Valid Account ID is required');
  }

  try {
    // Get all invitations for the account (pending, accepted, expired)
    const invitationsRef = collection(db, 'invitations');
    const q = query(
      invitationsRef,
      where('accountId', '==', accountId),
      where('status', 'in', ['pending', 'accepted', 'expired'])
    );

    const [snapshot, accountDoc] = await Promise.all([
      getDocs(q),
      getDoc(doc(db, 'accounts', accountId))
    ]);

    if (snapshot.empty) {
      return [];
    }

    const accountData = accountDoc.exists() ? accountDoc.data() as AccountData : undefined;
    if (!accountData) {
      throw new Error('Account not found');
    }

    // Get all unique inviter IDs
    const inviterIds = new Set(snapshot.docs.map(doc => doc.data().inviterId).filter(Boolean));
    
    // Fetch all inviter data in parallel
    const inviterDocs = await Promise.all(
      Array.from(inviterIds).map(id => getDoc(doc(db, 'users', id)))
    );

    // Create inviter lookup map
    const inviterMap = new Map(
      inviterDocs
        .filter(doc => doc.exists())
        .map(doc => [doc.id, doc.data() as UserData])
    );

    // Process invitations
    const invitations: UserInvitation[] = snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data() as InvitationData;
      const inviterData = data.inviterId ? inviterMap.get(data.inviterId) : undefined;

      // Check if invitation has expired
      const isExpired = data.status === 'pending' && 
        new Date(data.expiresAt) < new Date();

      // Auto-update expired invitations
      if (isExpired && data.status === 'pending') {
        void updateDoc(docSnapshot.ref, { 
          status: 'expired' as InvitationStatus,
          lastUpdated: new Date().toISOString()
        });
      }

      return {
        ...data,
        id: docSnapshot.id,
        accountName: accountData.name,
        inviterName: inviterData?.displayName || 'Unknown User',
        status: isExpired ? 'expired' : data.status
      };
    });

    // Sort invitations by status and date
    return invitations.sort((a, b) => {
      const statusOrder = { pending: 0, accepted: 1, expired: 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    throw new Error(
      error instanceof Error 
        ? `Failed to fetch invitations: ${error.message}` 
        : 'Failed to fetch invitations. Please try again.'
    );
  }
};
