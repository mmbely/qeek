import { functions, db } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, deleteDoc, setDoc, collection, getDocs, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { RepositoryFile } from '../types/repository';
import { Octokit } from '@octokit/rest';

const storeGithubTokenFunction = httpsCallable(functions, 'storeGithubToken');
const syncRepoFunction = httpsCallable(functions, 'syncGithubRepository');

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
}

// Store token using Cloud Function
export const storeGithubToken = async (token: string, accountId: string) => {
  try {
    const result = await storeGithubTokenFunction({ token, accountId });
    return result.data;
  } catch (error) {
    console.error('Error storing GitHub token:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to store GitHub token');
  }
};

// Get token from secure_tokens collection
export const getToken = async (accountId: string): Promise<string | null> => {
  try {
    const tokenDoc = await getDoc(doc(db, 'secure_tokens', accountId));
    return tokenDoc.exists() ? tokenDoc.data()?.githubToken || null : null;
  } catch (error) {
    console.error('Error getting GitHub token:', error);
    throw new Error('Failed to get GitHub token');
  }
};

// Clear token from secure_tokens collection
export const clearToken = async (accountId: string) => {
  try {
    await deleteDoc(doc(db, 'secure_tokens', accountId));
  } catch (error) {
    console.error('Error clearing GitHub token:', error);
    throw error;
  }
};

// Validate token with GitHub API
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

// Fetch repositories using token
export const fetchUserRepositories = async (accountId: string): Promise<GitHubRepo[]> => {
  const token = await getToken(accountId);
  if (!token) throw new Error('GitHub token not found');

  try {
    const response = await fetch('https://api.github.com/user/repos?sort=updated', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch repositories');

    const repos = await response.json();
    return repos.map((repo: any): GitHubRepo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      description: repo.description,
      default_branch: repo.default_branch
    }));
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw error;
  }
};

// Sync repository using Cloud Function
export const syncRepository = async (repositoryName: string, accountId: string) => {
  try {
    const result = await syncRepoFunction({ repositoryName, accountId });
    return result.data;
  } catch (error) {
    console.error('Error syncing repository:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to sync repository');
  }
};

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
        content: data.content || '',
        sha: data.sha || '',
        type: data.type || '',
        size: data.size || 0,
        status: data.status || 'active',
        language: data.language || '',
        last_commit_message: data.last_commit_message || '',
        last_updated: data.last_updated || '',
        metadata: data.metadata || { content_type: '', sha: '', type: '' },
        classes: data.classes || [],
        functions: data.functions || [],
        imports: data.imports || [],
        exports: data.exports || [],
        summary: data.summary,
        first_indexed_at: data.first_indexed_at,
        updated_at: data.updated_at
      };
    });
  } catch (error) {
    console.error('Error fetching repository files:', error);
    throw error;
  }
}

export async function getRepositoryFile(path: string): Promise<RepositoryFile> {
  const fileRef = doc(db, 'files', path);
  const fileDoc = await getDoc(fileRef);
  
  if (!fileDoc.exists()) {
    throw new Error('File not found');
  }

  const data = fileDoc.data();
  return {
    path: fileDoc.id,
    language: data?.language || '',
    size: data?.size || 0,
    last_updated: data?.last_updated || '',
    last_commit_message: data?.last_commit_message || '',
    type: data?.type || '',
    content: data?.content || '',
    imports: data?.imports || [],
    ai_analysis: data?.ai_analysis || {
      summary: undefined,
      imports: undefined,
      functions: undefined,
      classes: undefined,
      exports: undefined,
      primary_features: undefined,
      integrationPoints: undefined
    },
    metadata: data?.metadata || {
      sha: '',
      type: '',
      content_type: ''
    },
    first_indexed_at: data?.first_indexed_at || {
      seconds: 0,
      nanoseconds: 0
    },
    updated_at: data?.updated_at || {
      seconds: 0,
      nanoseconds: 0
    },
    status: data?.status || 'active'
  };
}
