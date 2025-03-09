import { User as FirebaseUser } from 'firebase/auth';

export interface CustomUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  getIdToken: () => Promise<string>;
  accountIds?: string[];
  companyId?: string;
}

export type InvitationRole = 'admin' | 'member';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface InvitationData {
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

export interface InvitationResponse {
  success: boolean;
  message?: string;
  accountId?: string;
}

export interface UserInvitation extends InvitationData {
  id: string;
  accountName?: string;
  inviterName?: string;
}

// Helper function to convert Firebase User to CustomUser
export function toCustomUser(firebaseUser: FirebaseUser): CustomUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    getIdToken: () => firebaseUser.getIdToken(),
    // Map other properties
  };
}