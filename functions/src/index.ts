import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Octokit } from '@octokit/rest';
// or try this alternative import if the above still fails
// import { Octokit } from '@octokit/rest/dist-types/index';

// Add type definitions if needed
interface GitHubFile {
  path: string;
  type: 'file' | 'dir';
  size: number;
  content?: string | null;
  indexed_at?: admin.firestore.Timestamp;
}

// Initialize Firebase Admin
try {
  admin.initializeApp();
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

// TODO: Implement user invitation functionality later
// interface InvitationData {
//   email: string;
//   accountName: string;
//   role: 'admin' | 'member';
//   invitationId: string;
// }

interface GithubTokenData {
  token: string;
  accountId: string;
}

// TODO: Implement these user management functions later
// export const addUser = ...
// export const getUsers = ...
// export const getAllUsers = ...
// export const api = ...

export const sendInvitation = onCall(
  { 
    cors: true
  }, 
  async (request) => {
    console.log('Function triggered');
    
    try {
      const { email, accountName, role, invitationId } = request.data;
      console.log('Received data:', { email, accountName, role, invitationId });

      // Just return success without doing anything
      return { 
        success: true,
        message: 'Function called successfully',
        receivedData: { email, accountName, role, invitationId }
      };
    } catch (error) {
      console.error('Function error:', error);
      throw new Error('Function error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
);

// Store GitHub token securely
export const storeGithubToken = onCall(
  { 
    cors: true
  }, 
  async (request) => {
    if (!request.data || !request.data.token || !request.data.accountId) {
      throw new Error('Missing required fields: token and accountId');
    }

    const { token, accountId } = request.data;

    try {
      // Verify token is valid
      const octokit = new Octokit({ auth: token });
      await octokit.users.getAuthenticated();

      // Store token
      await admin.firestore()
        .collection('secure_tokens')
        .doc(accountId)
        .set({
          githubToken: token,
          updatedAt: new Date().toISOString()  // Use ISO string instead of serverTimestamp
        });

      return { success: true };
    } catch (error) {
      console.error('Error storing GitHub token:', error);
      throw new Error('Invalid GitHub token or storage error');
    }
  }
);

// Function to sync repository
export const syncGithubRepository = onCall(
  { 
    cors: true,
    timeoutSeconds: 540  // 9 minutes timeout for large repos
  }, 
  async (request) => {
    if (!request.auth) {
      throw new Error('Unauthenticated');
    }

    const { repositoryName, accountId } = request.data;
    
    try {
      // Get token from secure storage
      const tokenDoc = await admin.firestore()
        .collection('secure_tokens')
        .doc(accountId)
        .get();

      if (!tokenDoc.exists) {
        throw new Error('GitHub token not found');
      }

      const { githubToken } = tokenDoc.data()!;
      const octokit = new Octokit({ auth: githubToken });

      // Start repository sync
      const [owner, repo] = repositoryName.split('/');
      
      // Update sync status
      const repoRef = admin.firestore()
        .collection('repositories')
        .doc(repositoryName.replace('/', '_'));

      await repoRef.set({
        metadata: {
          sync_status: 'syncing',
          last_synced: admin.firestore.FieldValue.serverTimestamp(),
          error: null
        }
      }, { merge: true });

      // Get repository contents
      const { data: contents } = await octokit.repos.getContent({
        owner,
        repo,
        path: ''
      });

      // Process repository contents
      const files = Array.isArray(contents) ? contents : [contents];
      const processedFiles = await processFiles(files, octokit, owner, repo);

      // Store files in Firestore
      await repoRef.set({
        files: processedFiles,
        metadata: {
          sync_status: 'completed',
          last_synced: admin.firestore.FieldValue.serverTimestamp(),
          error: null
        }
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Sync error:', error);
      
      // Update status with error
      await admin.firestore()
        .collection('repositories')
        .doc(repositoryName.replace('/', '_'))
        .set({
          metadata: {
            sync_status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            last_synced: admin.firestore.FieldValue.serverTimestamp()
          }
        }, { merge: true });

      throw new Error('Failed to sync repository');
    }
  }
);

// Helper function to process files recursively with proper typing
async function processFiles(
  files: any[],
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = ''
): Promise<GitHubFile[]> {
  const processedFiles: GitHubFile[] = [];

  for (const file of files) {
    if (file.type === 'file') {
      const { data: content } = await octokit.repos.getContent({
        owner,
        repo,
        path: file.path,
        mediaType: {
          format: 'raw'
        }
      });

      processedFiles.push({
        path: file.path,
        type: 'file',
        size: file.size,
        content: typeof content === 'string' ? content : null,
        indexed_at: admin.firestore.Timestamp.now()
      });
    } else if (file.type === 'dir') {
      const { data: dirContents } = await octokit.repos.getContent({
        owner,
        repo,
        path: file.path
      });

      const subFiles = await processFiles(
        Array.isArray(dirContents) ? dirContents : [dirContents],
        octokit,
        owner,
        repo,
        file.path
      );

      processedFiles.push(...subFiles);
    }
  }

  return processedFiles;
}