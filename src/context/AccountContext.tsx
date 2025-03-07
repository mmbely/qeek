import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import type { Account } from '../types/account';

interface AccountContextType {
  currentAccount: Account | null;
  availableAccounts: Account[];
  isLoading: boolean;
  error: string | null;
  updateAccountSettings: (settings: Partial<Account['settings']>) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
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

    // First get the user's last active account
    getDoc(doc(db, 'users', user.uid)).then((userDoc) => {
      const lastActiveAccount = userDoc.data()?.lastActiveAccount;

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userAccounts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Account[];

        console.log('[AccountContext] Found accounts:', userAccounts);
        setAccounts(userAccounts);
        
        if (!currentAccount && userAccounts.length > 0) {
          // Try to set the last active account, or fall back to first account
          const targetAccount = userAccounts.find(acc => acc.id === lastActiveAccount) || userAccounts[0];
          console.log('[AccountContext] Setting current account:', targetAccount);
          setCurrentAccount(targetAccount);
        }
        
        setIsLoading(false);
      });

      return () => unsubscribe();
    });
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

  const switchAccount = async (accountId: string) => {
    if (!user?.uid) return;

    const targetAccount = accounts.find(acc => acc.id === accountId);
    if (!targetAccount) {
      throw new Error('Account not found');
    }

    // Update user's last active account
    await setDoc(doc(db, 'users', user.uid), {
      lastActiveAccount: accountId,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setCurrentAccount(targetAccount);
  };

  return (
    <AccountContext.Provider value={{
      currentAccount,
      availableAccounts: accounts,
      isLoading,
      error,
      updateAccountSettings,
      switchAccount
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