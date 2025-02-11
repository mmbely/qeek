import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setCurrentAccount(null);
      setIsLoading(false);
      return;
    }

    // First, find the user's primary account
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      async (userDoc) => {
        try {
          const userData = userDoc.data();
          if (!userData?.primaryAccountId) {
            // Create a default account for the user
            const newAccount: Account = {
              id: user.uid, // Using user.uid as default account id
              name: `${userData?.displayName || 'My'}'s Account`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ownerId: user.uid,
              settings: {},
              members: {
                [user.uid]: {
                  role: 'owner',
                  joinedAt: new Date().toISOString()
                }
              }
            };

            await setDoc(doc(db, 'accounts', newAccount.id), newAccount);
            await setDoc(doc(db, 'users', user.uid), {
              ...userData,
              primaryAccountId: newAccount.id
            }, { merge: true });

            setCurrentAccount(newAccount);
          } else {
            // Fetch the account data
            const accountDoc = await getDoc(doc(db, 'accounts', userData.primaryAccountId));
            if (accountDoc.exists()) {
              setCurrentAccount(accountDoc.data() as Account);
            }
          }
        } catch (err) {
          console.error('Error setting up account:', err);
          setError(err instanceof Error ? err.message : 'Failed to load account');
        } finally {
          setIsLoading(false);
        }
      }
    );

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