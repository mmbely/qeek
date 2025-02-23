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
import { doc, setDoc } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { auth, db, database } from '../config/firebase';
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

  const saveUserToDatabase = async (user: User) => {
    // Save to Firestore (for user profiles)
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      companyId: 'default',
    }, { merge: true });

    // Save to Realtime Database (if needed for real-time features)
    const rtdbUserRef = ref(database, `users/${user.uid}`);
    await set(rtdbUserRef, {
      online: true,
      lastSeen: new Date().toISOString(),
      // ... other real-time data
    });
  };

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await saveUserToDatabase(userCredential.user);
    return userCredential;
  };

  const register = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserToDatabase(userCredential.user);
    return userCredential;
  };

  const logout = () => {
    return signOut(auth);
  };

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    await saveUserToDatabase(userCredential.user);
    return userCredential;
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
