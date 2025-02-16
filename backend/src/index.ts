import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import repositoryRouter from './routes/repository';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/repository', repositoryRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

admin.initializeApp();

interface InvitationData {
  email: string;
  accountName: string;
  role: 'admin' | 'member';
  invitationId: string;
}

export const sendInvitation = onCall<InvitationData>({
    maxInstances: 10,
    cors: ['http://localhost:3000']
  }, 
  async (request) => {
    if (!request.auth) {
      throw new Error('Unauthenticated');
    }

    const { email, accountName, role, invitationId } = request.data;

    try {
      // For testing, log the request
      console.log('Received invitation request:', {
        email,
        accountName,
        role,
        invitationId
      });

      // Create invitation document
      const invitationRef = admin.firestore().collection('invitations').doc(invitationId);
      await invitationRef.set({
        email,
        accountName,
        role,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ),
      });

      // For development, just log instead of sending email
      console.log('Would send email to:', email);
      
      return { 
        success: true,
        message: 'Invitation created successfully'
      };
    } catch (error) {
      console.error('Error processing invitation:', error);
      throw new Error('Failed to process invitation');
    }
  }
);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
