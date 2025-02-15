import { User as FirebaseUser } from 'firebase/auth';

export interface CustomUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  accountIds?: string[];
  companyId?: string;
}