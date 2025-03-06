import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

interface InvitationEmailData {
  email: string;
  accountName: string;
  role: 'admin' | 'member';
  invitationId: string;
}

export const sendEmailInvitation = async (data: InvitationEmailData) => {
  try {
    // Use the functions instance from your config
    const sendInvitation = httpsCallable(functions, 'sendInvitation');
    
    console.log('Attempting to send invitation:', {
      email: data.email,
      accountName: data.accountName,
      role: data.role,
      invitationId: data.invitationId
    });
    
    const result = await sendInvitation(data);
    return result.data;
  } catch (error: any) {
    console.error('Detailed error:', {
      code: error.code,
      message: error.message,
      details: error.details
    });
    throw error;
  }
};