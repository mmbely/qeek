import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../services/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  query,
  setDoc,
  where 
} from 'firebase/firestore';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCurrentAccount(null);
      setLoading(false);
      return;
    }

    console.log('[AccountContext] Loading account for user:', user.uid);

    const loadAccount = async () => {
      try {
        console.log('[AccountContext] Starting account load for user:', user.uid, 'with ID:', user.uid);
        
        // Find account where user is owner or member
        const accountsRef = collection(db, 'accounts');
        
        // Query for accounts where user is either owner or member
        const q = query(accountsRef, 
          where('ownerId', '==', user.uid)
        );
        const memberQuery = query(accountsRef,
          where(`members.${user.uid}`, '!=', null)
        );

        const [ownerSnapshot, memberSnapshot] = await Promise.all([
          getDocs(q),
          getDocs(memberQuery)
        ]);

        // Combine results, removing duplicates
        const allDocs = [...ownerSnapshot.docs, ...memberSnapshot.docs];
        const uniqueDocs = allDocs.filter((doc, index, self) => 
          index === self.findIndex((d) => d.id === doc.id)
        );
        
        if (uniqueDocs.length === 0) {
          console.log('[AccountContext] No account found for user');
          setCurrentAccount(null);
          setLoading(false);
          return;
        }

        // Use the first account found
        const accountDoc = uniqueDocs[0];

        console.log('[AccountContext] Found account:', accountDoc.data());
        
        const rawData = accountDoc.data();
        const accountData = {
          name: rawData.name,
          members: Object.entries(rawData.members).reduce((acc, [userId, member]: [string, any]) => ({
            ...acc,
            [userId]: {
              role: member.role as 'admin' | 'member',
              joinedAt: new Date(member.joinedAt)
            }
          }), {}),
          settings: rawData.settings || {},
          createdAt: new Date(rawData.createdAt),
          updatedAt: new Date(rawData.updatedAt),
          ownerId: rawData.ownerId
        };

        // Create account object with all required fields
        const account: Account = {
          id: accountDoc.id,
          ...accountData
        };

        console.log('[AccountContext] Setting current account:', account);
        setCurrentAccount(account);
      } catch (err) {
        console.error('[AccountContext] Error in account operations:', err);
        if (err instanceof Error) {
          console.error('[AccountContext] Error details:', {
            message: err.message,
            stack: err.stack,
            name: err.name
          });
        }
        setError(err instanceof Error ? err.message : 'Unknown error');
        setCurrentAccount(null);
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
    return () => {}; // No cleanup needed for single fetch
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
      isLoading: loading,
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
