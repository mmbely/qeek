import { User as FirebaseUser } from 'firebase/auth';

export interface CustomUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  companyId?: string;
}