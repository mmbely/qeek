import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Octokit } from '@octokit/rest';
import * as functions from 'firebase-functions';
import { spawn } from 'child_process';
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
    timeoutSeconds: 540,
    memory: '1GiB',
    region: 'us-central1'
  }, 
  async (request) => {
    if (!request.auth) {
      throw new Error('Must be authenticated to sync repository');
    }

    const { repositoryName, accountId } = request.data;
    if (!repositoryName || !accountId) {
      throw new Error('Repository name and account ID are required');
    }

    try {
      // Get absolute path to Python script
      const scriptPath = require('path').resolve(__dirname, '../repository-indexer/src/main.py');
      console.log('Python script path:', scriptPath);
      console.log('Current working directory:', process.cwd());
      
      const userId = request.auth.uid;
      console.log('Starting sync for:', { repositoryName, userId, accountId });
      
      return new Promise((resolve, reject) => {
        console.log('Spawning Python process...');
        const process = spawn('python3', [
          scriptPath,
          repositoryName,
          userId,
          accountId
        ]);

        let dataString = '';
        let errorString = '';

        process.stdout.on('data', (data) => {
          const output = data.toString();
          console.log(`Python stdout: ${output}`);
          dataString += output;
        });

        process.stderr.on('data', (data) => {
          const error = data.toString();
          console.error(`Python stderr: ${error}`);
          errorString += error;
        });

        process.on('error', (error: Error) => {
          console.error('Failed to start Python process:', error);
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        process.on('close', (code) => {
          console.log(`Python process exited with code ${code}`);
          
          if (code === 0) {
            try {
              console.log('Python output:', dataString);
              const result = JSON.parse(dataString);
              resolve(result);
            } catch (e) {
              console.error('Failed to parse Python output:', e);
              const errorMessage = e instanceof Error ? e.message : 'Unknown error';
              reject(new Error(`Failed to parse Python output: ${errorMessage}`));
            }
          } else {
            console.error('Python script failed:', errorString);
            reject(new Error(`Python script failed with code ${code}: ${errorString}`));
          }
        });
      });
    } catch (error) {
      console.error('Error in sync function:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to run repository sync: ${errorMessage}`);
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