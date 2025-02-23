import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import type { Account } from '../types/account';

interface AccountContextType {
  currentAccount: Account | null;
  isLoading: boolean;
  error: string | null;
  updateAccountSettings: (settings: Partial<Account['settings']>) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      console.log('[AccountContext] No user, clearing accounts');
      setAccounts([]);
      setCurrentAccount(null);
      setIsLoading(false);
      return;
    }

    console.log('[AccountContext] Fetching accounts for user:', user.uid);
    
    const accountsRef = collection(db, 'accounts');
    const q = query(
      accountsRef,
      where(`members.${user.uid}`, '!=', null)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userAccounts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Account[];

      console.log('[AccountContext] Found accounts:', userAccounts);
      setAccounts(userAccounts);
      
      if (!currentAccount && userAccounts.length > 0) {
        console.log('[AccountContext] Setting current account:', userAccounts[0]);
        setCurrentAccount(userAccounts[0]);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateAccountSettings = async (settings: Partial<Account['settings']>) => {
    if (!currentAccount || !user?.uid) return;

    try {
      const updatedSettings = {
        ...currentAccount.settings,
        ...settings
      };

      await setDoc(doc(db, 'accounts', currentAccount.id), {
        settings: updatedSettings,
        updatedAt: new Date().toISOString()
      }, { merge: true });

    } catch (err) {
      console.error('Error updating account settings:', err);
      throw err;
    }
  };

  return (
    <AccountContext.Provider value={{
      currentAccount,
      isLoading,
      error,
      updateAccountSettings
    }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}