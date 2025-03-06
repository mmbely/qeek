import { User as FirebaseUser } from 'firebase/auth';

export interface CustomUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
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