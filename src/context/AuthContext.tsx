import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  UserCredential, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { registerUser, loginUser, logoutUser } from '../services/auth';
import { ref, set } from 'firebase/database';
import { database } from '../services/firebase';
import { CustomUser } from '../types/user';

const googleProvider = new GoogleAuthProvider();

interface AuthContextProps {
  user: CustomUser | null;
  login: (email: string, password: string) => Promise<UserCredential>;
  register: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  googleSignIn: () => Promise<UserCredential>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed. User:", user);
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user as CustomUser;
    user.companyId = 'default'; // You might want to fetch this from the database instead
    await saveUserToDatabase(user);
    return userCredential;
  };

  const register = async (email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user as CustomUser;
    user.companyId = 'default';
    await saveUserToDatabase(user);
    return userCredential;
  };

  const logout = () => {
    return signOut(auth);
  };

  const googleSignIn = async () => {
    const userCredential = await signInWithPopup(auth, googleProvider);
    await saveUserToDatabase(userCredential.user);
    return userCredential;
  };

  const saveUserToDatabase = async (user: CustomUser) => {
    const userRef = ref(database, `users/${user.uid}`);
    await set(userRef, {
      displayName: user.displayName || 'Anonymous',
      email: user.email,
      photoURL: user.photoURL || '/placeholder.svg?height=40&width=40',
      companyId: user.companyId || 'default'
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, googleSignIn }}>
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
