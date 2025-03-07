import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  UserCredential, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, set } from 'firebase/database';
import { auth, db, database, functions } from '../config/firebase';
import { registerUser, loginUser, logoutUser } from '../services/auth';
import { CustomUser } from '../types/user';

const googleProvider = new GoogleAuthProvider();

interface AuthContextProps {
  user: CustomUser | null;
  setUser: React.Dispatch<React.SetStateAction<CustomUser | null>>;
  login: (email: string, password: string) => Promise<UserCredential>;
  register: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<UserCredential>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth State Changed:', user?.uid);
      setUser(user as CustomUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  interface UserData {
    uid: string;
    email: string | null;
    displayName: string | undefined;
    photoURL: string | null;
    lastSeen: string;
    createdAt?: string;
  }

  const saveUserToDatabase = async (user: User, isNewUser: boolean = false) => {
    try {
      // Save basic user profile to Firestore
      const userRef = doc(db, 'users', user.uid);
      const userData: UserData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        photoURL: user.photoURL,
        lastSeen: new Date().toISOString(),
      };
      
      if (isNewUser) {
        userData.createdAt = new Date().toISOString();
      }

      await setDoc(userRef, userData, { merge: true });

      // Only create initial account for new users
      let accountId: string | undefined;
      if (isNewUser) {
        const createAccount = httpsCallable(functions, 'createInitialAccount');
        const result = await createAccount();
        console.log('Initial account created:', result.data);
        accountId = (result.data as { accountId: string }).accountId;
      }

      // Save presence data to Realtime Database
      const rtdbUserRef = ref(database, `users/${user.uid}`);
      await set(rtdbUserRef, {
        online: true,
        lastSeen: new Date().toISOString(),
        ...(accountId && { accountId })
      });
    } catch (error) {
      console.error('Error saving user to database:', error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await saveUserToDatabase(userCredential.user, false);
    return userCredential;
  };

  const register = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserToDatabase(userCredential.user, true);
    return userCredential;
  };

  const logout = () => {
    return signOut(auth);
  };

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      
      // Check if user document exists to determine if they're new
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      const isNewUser = !userDoc.exists();
      
      await saveUserToDatabase(result.user, isNewUser);
      return result;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  };

  const value = {
    user,
    setUser,
    login,
    register,
    logout,
    googleSignIn,
    isDarkMode,
    toggleDarkMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
