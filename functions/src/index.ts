import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { Octokit } from '@octokit/rest';
import * as nodemailer from 'nodemailer';
import * as functions from 'firebase-functions';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Initialize nodemailer transporter
const createTransporter = async () => {
  try {
    // Get secrets from Firebase Functions
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error('Missing required email configuration');
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false // For development only, remove in production
      }
    });

    // Verify configuration
    await transporter.verify();
    console.log('Email service is ready');
    return transporter;
  } catch (error) {
    console.error('Email service configuration error:', error);
    throw error;
  }
};

// Type definitions
interface GitHubFile {
  path: string;
  type: 'file' | 'dir';
  size: number;
  content?: string | null;
  indexed_at?: admin.firestore.Timestamp;
}

type InvitationRole = 'admin' | 'member';
type InvitationStatus = 'pending' | 'accepted' | 'expired';

interface InvitationData {
  email: string;
  accountId: string;
  role: InvitationRole;
  inviterId: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
  token: string;
  lastUpdated?: string;
}

// Initialize Firebase Admin
try {
  admin.initializeApp();
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

// Function to create initial account for new users
export const createInitialAccount = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to create account');
    }

    const { displayName, email } = request.auth.token;
    const uid = request.auth.uid;

    try {
      // Create account document
      const accountRef = admin.firestore().collection('accounts').doc();
      await accountRef.set({
        name: `${displayName}'s Account`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        members: {
          [uid]: {
            role: 'owner',
            joinedAt: admin.firestore.FieldValue.serverTimestamp()
          }
        },
        settings: {
          githubRepository: null,
          theme: 'light'
        }
      });

      // Update user document with account reference
      await admin.firestore().collection('users').doc(uid).set({
        accountId: accountRef.id,
        email: email,
        displayName: displayName,
        role: 'owner'
      }, { merge: true });

      return { 
        success: true, 
        accountId: accountRef.id 
      };
    } catch (error) {
      console.error('Error creating initial account:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to create initial account'
      );
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
          updatedAt: new Date().toISOString()
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
    timeoutSeconds: 540,
    memory: '1GiB',
    region: 'us-central1'
  }, 
  async (request) => {
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to sync repository');
    }

    const { repositoryName, accountId } = request.data;
    if (!repositoryName || !accountId) {
      throw new functions.https.HttpsError('invalid-argument', 'Repository name and account ID are required');
    }

    try {
      // Get GitHub token
      const tokenDoc = await admin.firestore()
        .collection('secure_tokens')
        .doc(accountId)
        .get();

      const githubToken = tokenDoc.data()?.githubToken;
      if (!githubToken) {
        throw new functions.https.HttpsError('failed-precondition', 'GitHub token not found');
      }

      // Initialize Octokit
      const octokit = new Octokit({ auth: githubToken });
      const [owner, repo] = repositoryName.split('/');

      console.log('Starting repository sync:', { owner, repo });

      // Get repository contents
      const files: GitHubFile[] = [];
      await processRepositoryContents(files, octokit, owner, repo);

      // Store files in Firestore
      const repoRef = admin.firestore()
        .collection('repositories')
        .doc(repositoryName.replace('/', '_'));

      const batch = admin.firestore().batch();
      const filesCollection = repoRef.collection('files');

      // Delete existing files
      const existingFiles = await filesCollection.get();
      existingFiles.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Add new files
      for (const file of files) {
        if (file.type === 'file') {
          const docRef = filesCollection.doc(file.path.replace(/\//g, '_'));
          batch.set(docRef, {
            ...file,
            indexed_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      await batch.commit();

      console.log('Repository sync completed:', {
        filesProcessed: files.length,
        repository: repositoryName
      });

      return { 
        success: true, 
        filesProcessed: files.length 
      };
    } catch (error) {
      console.error('Error in sync function:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to sync repository: ${errorMessage}`);
    }
  }
);

// Helper function to process repository contents recursively
async function processRepositoryContents(
  files: GitHubFile[],
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string = ''
): Promise<void> {
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path
    });

    const contents = Array.isArray(data) ? data : [data];

    for (const item of contents) {
      if (item.type === 'file') {
        // Get file content
        const { data: content } = await octokit.repos.getContent({
          owner,
          repo,
          path: item.path,
          mediaType: {
            format: 'raw'
          }
        });

        files.push({
          path: item.path,
          type: 'file',
          size: item.size,
          content: typeof content === 'string' ? content : null
        });
      } else if (item.type === 'dir') {
        files.push({
          path: item.path,
          type: 'dir',
          size: 0
        });
        // Process subdirectory
        await processRepositoryContents(files, octokit, owner, repo, item.path);
      }
    }
  } catch (error) {
    console.error(`Error processing path ${path}:`, error);
    throw error;
  }
}

// Generate a secure invitation token
function generateInvitationToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

// Send invitation email
export const sendInvitation = onCall(
  { 
    cors: true
  }, 
  async (request) => {
    if (!request.auth) {
      throw new Error('Must be authenticated to send invitations');
    }

    const { email, accountId, role, resend = false } = request.data;
    if (!email || !accountId || !role) {
      throw new Error('Missing required fields');
    }

    try {
      // Check if invitation already exists
      const invitationsRef = admin.firestore().collection('invitations');
      const existingInvites = await invitationsRef
        .where('email', '==', email.toLowerCase())
        .where('accountId', '==', accountId)
        .where('status', '==', 'pending')
        .get();

      // Generate new token and timestamps
      const token = generateInvitationToken();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      if (!existingInvites.empty) {
        if (!resend) {
          throw new Error('Invitation already sent to this email');
        }
        // Update existing invitation with new expiration and token
        const existingInvite = existingInvites.docs[0];
        await existingInvite.ref.update({
          token,
          expiresAt: expiresAt.toISOString(),
          lastUpdated: now.toISOString()
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Check if user is already a member
      const targetAccountDoc = await admin.firestore()
        .collection('accounts')
        .doc(accountId)
        .get();

      if (!targetAccountDoc.exists) {
        throw new Error('Account not found');
      }

      const members = targetAccountDoc.data()?.members || {};
      const existingMember = Object.values(members).find(
        (member: any) => member.email?.toLowerCase() === email.toLowerCase()
      );

      if (existingMember) {
        throw new Error('User is already a member of this account');
      }

      if (existingInvites.empty) {
        // Create new invitation
        const invitation: InvitationData = {
          email: email.toLowerCase(),
          accountId,
          role,
          inviterId: request.auth.uid,
          status: 'pending' as InvitationStatus,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          lastUpdated: now.toISOString(),
          token
        };

        await invitationsRef.add(invitation);
      }

      // Get account details for email
      const accountDoc = await admin.firestore()
        .collection('accounts')
        .doc(accountId)
        .get();
      
      const accountData = accountDoc.data();
      if (!accountData) {
        throw new Error('Account not found');
      }

      // Get inviter details for the email
      const inviterDoc = await admin.firestore()
        .collection('users')
        .doc(request.auth.uid)
        .get();

      const inviterData = inviterDoc.data();
      if (!inviterData) {
        throw new Error('Inviter data not found');
      }

      // Prepare email content
      const emailSubject = `Invitation to join ${accountData.name} on Qeek`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've Been Invited to Join Qeek</h2>
          <p>Hello,</p>
          <p><strong>${inviterData.displayName || inviterData.email}</strong> has invited you to join <strong>${accountData.name}</strong> as a ${role}.</p>
          <p>Click the button below to accept the invitation:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${token}" 
               style="background-color: #0066cc; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Accept Invitation
            </a>
          </p>
          <p><strong>Note:</strong> This invitation will expire in 7 days.</p>
          <p style="color: #666; font-size: 0.9em;">If you did not expect this invitation, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 0.8em; text-align: center;">
            Best regards,<br>The Qeek Team
          </p>
        </div>
      `;

      // Send email using nodemailer
      try {
        const emailTransporter = await createTransporter();
        await emailTransporter.sendMail({
          from: process.env.SMTP_FROM || `Qeek <${process.env.SMTP_USER}>`,
          to: email,
          subject: emailSubject,
          html: emailHtml
        });

        console.log('Invitation email sent successfully to:', {
          to: email,
          inviter: inviterData.email,
          accountName: accountData.name,
          role: role
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        throw new Error('Failed to send invitation email. Please try again.');
      }

      return { 
        success: true,
        message: 'Invitation sent successfully'
      };
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to send invitation');
    }
  }
);

// Accept invitation
export const acceptInvitation = onCall(
  { 
    cors: true
  }, 
  async (request) => {
    if (!request.auth) {
      throw new Error('Must be authenticated to accept invitation');
    }

    const { token } = request.data;
    if (!token) {
      throw new Error('Invalid invitation token');
    }

    try {
      // Find invitation
      const invitationsRef = admin.firestore().collection('invitations');
      const inviteSnapshot = await invitationsRef
        .where('token', '==', token)
        .where('status', '==', 'pending')
        .get();

      if (inviteSnapshot.empty) {
        throw new Error('Invalid or expired invitation');
      }

      const invitation = inviteSnapshot.docs[0].data() as InvitationData;
      
      // Check if invitation has expired
      if (new Date(invitation.expiresAt) < new Date()) {
        await invitationsRef.doc(inviteSnapshot.docs[0].id).update({
          status: 'expired' as InvitationStatus,
          lastUpdated: new Date().toISOString()
        });
        throw new Error('Invitation has expired');
      }

      // Check if user email matches invitation
      if (request.auth.token.email?.toLowerCase() !== invitation.email) {
        throw new Error('Email mismatch');
      }

      // Add user to account
      const accountRef = admin.firestore()
        .collection('accounts')
        .doc(invitation.accountId);

      await accountRef.update({
        [`members.${request.auth.uid}`]: {
          role: invitation.role,
          joinedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });

      // Update invitation status
      await invitationsRef.doc(inviteSnapshot.docs[0].id).update({
        status: 'accepted' as InvitationStatus,
        lastUpdated: new Date().toISOString()
      });

      return { 
        success: true,
        accountId: invitation.accountId
      };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to accept invitation');
    }
  }
);

export const triggerRepositorySync = onCall(
  { 
    cors: true,
    timeoutSeconds: 540,
    memory: '1GiB',
    region: 'us-central1'
  }, 
  async (request) => {
    const { repositoryName, accountId } = request.data;
    console.log('Starting repository sync:', { repositoryName, accountId });

    try {
      if (!repositoryName || !accountId) {
        throw new functions.https.HttpsError('invalid-argument', 'Repository name and account ID are required');
      }

      // Path to Python script - try multiple possible locations
      let scriptPath = '';
      const possiblePaths = [
        path.join(__dirname, '../repository-indexer/src/cli.py'),
        path.join(__dirname, '../../repository-indexer/src/cli.py'),
        '/app/repository-indexer/src/cli.py',
        '/workspace/repository-indexer/src/cli.py'
      ];

      for (const testPath of possiblePaths) {
        console.log(`Checking for Python script at: ${testPath}`);
        if (fs.existsSync(testPath)) {
          scriptPath = testPath;
          console.log(`Found Python script at: ${scriptPath}`);
          break;
        }
      }

      if (!scriptPath) {
        throw new Error(`Python script not found. Checked paths: ${possiblePaths.join(', ')}`);
      }

      // Set up environment for Python with more debugging
      const processEnv = {
        ...process.env,
        PYTHONPATH: path.dirname(path.dirname(scriptPath)),
        PYTHONUNBUFFERED: '1',
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || '/workspace/firebase-credentials.json'
      };

      console.log('Executing Python script with env:', {
        PYTHONPATH: processEnv.PYTHONPATH,
        scriptPath,
        GOOGLE_APPLICATION_CREDENTIALS: processEnv.GOOGLE_APPLICATION_CREDENTIALS
      });

      // First run a test script to check Python environment
      const testScriptPath = path.join(path.dirname(scriptPath), 'test_env.py');
      if (fs.existsSync(testScriptPath)) {
        console.log('Running Python environment test script...');
        const testProcess = spawn('python3', [testScriptPath], { 
          env: processEnv,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        await new Promise((resolve) => {
          testProcess.stdout?.on('data', (data) => {
            console.log('Test script stdout:', data.toString());
          });
          
          testProcess.stderr?.on('data', (data) => {
            console.error('Test script stderr:', data.toString());
          });
          
          testProcess.on('close', (code) => {
            console.log(`Test script exited with code ${code}`);
            resolve(null);
          });
        });
      }

      // Execute Python script
      const pythonProcess = spawn('python3', [
        scriptPath,
        repositoryName,
        '--account-id', accountId,
        '--skip-types', 'jpg,png,gif,json',
        '--debug'
      ], { 
        env: processEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';
        
        pythonProcess.stdout?.on('data', (data) => {
          const output = data.toString();
          console.log('Python stdout:', output);
          stdout += output;
        });

        pythonProcess.stderr?.on('data', (data) => {
          const error = data.toString();
          console.error('Python stderr:', error);
          stderr += error;
        });

        pythonProcess.on('close', (code) => {
          console.log(`Python process exited with code ${code}`);
          console.log('Full stdout:', stdout);
          console.log('Full stderr:', stderr);
          
          if (code === 0) {
            resolve({ success: true, output: stdout });
          } else {
            reject(new functions.https.HttpsError(
              'internal',
              `Repository sync failed with code ${code}. Error: ${stderr}`,
              { stdout, stderr }
            ));
          }
        });
      });
    } catch (error) {
      console.error('Sync error:', error);
      throw new functions.https.HttpsError(
        'internal',
        error instanceof Error ? error.message : 'Failed to sync repository',
        { error: error instanceof Error ? error.stack : undefined }
      );
    }
  }
);