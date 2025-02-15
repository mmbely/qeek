import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
try {
  admin.initializeApp();
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

interface InvitationData {
  email: string;
  accountName: string;
  role: 'admin' | 'member';
  invitationId: string;
}

interface InvitationAcceptanceData {
  invitationId: string;
}

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

export const handleInvitationAcceptance = onCall<InvitationAcceptanceData>({
    maxInstances: 10,
    cors: ['http://localhost:3000']
  },
  async (request) => {
    if (!request.auth) {
      throw new Error('Unauthenticated');
    }

    const { invitationId } = request.data;
    const userId = request.auth.uid;

    try {
      const invitationRef = admin.firestore().collection('invitations').doc(invitationId);
      const invitation = await invitationRef.get();

      if (!invitation.exists) {
        throw new Error('Invitation not found');
      }

      const invitationData = invitation.data()!;

      if (invitationData.status !== 'pending') {
        throw new Error('Invitation has already been used');
      }

      if (new Date(invitationData.expiresAt.toDate()) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Add user to account
      const accountRef = admin.firestore().collection('accounts').doc(invitationData.accountId);
      await accountRef.update({
        [`members.${userId}`]: {
          role: invitationData.role,
          joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      // Update user's account reference
      await admin.firestore().collection('users').doc(userId).update({
        accountId: invitationData.accountId,
      });

      // Mark invitation as accepted
      await invitationRef.update({
        status: 'accepted',
        acceptedBy: userId,
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw new Error('Failed to process invitation');
    }
  }
);