import React, { useState, useEffect } from 'react';
import { useAccount } from '../../context/AccountContext';
import { Mail, UserPlus, Trash2, Shield, CheckCircle, XCircle } from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp, setDoc, updateDoc, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { sendEmailInvitation } from '../../services/email';

interface UserData {
  displayName: string;
  email: string;
  photoURL?: string;
}

interface InviteData {
  email: string;
  role: 'admin' | 'member';
}

export default function UserManagement() {
  const { currentAccount } = useAccount();
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, UserData>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Improved useEffect for loading user details
  useEffect(() => {
    const loadUserDetails = async () => {
      if (!currentAccount) return;
      
      setIsLoadingUsers(true);
      try {
        const userPromises = Object.keys(currentAccount.members).map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              return { userId, userData: userDoc.data() as UserData };
            }
          } catch (error) {
            console.error(`Failed to load user ${userId}:`, error);
          }
          return null;
        });

        const users = await Promise.all(userPromises);
        const newUserDetails: Record<string, UserData> = {};
        
        users.forEach(user => {
          if (user) {
            newUserDetails[user.userId] = user.userData;
          }
        });

        setUserDetails(newUserDetails);
      } catch (error) {
        console.error('Failed to load user details:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUserDetails();
  }, [currentAccount]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;

    setIsAdding(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Check if user exists in Firebase
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', newUserEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('User not found. Please ensure the email is correct.');
      }

      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;

      // Check if user is already a member
      if (currentAccount.members[userId]) {
        throw new Error('User is already a member of this account');
      }

      // Add user to account
      const accountRef = doc(db, 'accounts', currentAccount.id);
      await updateDoc(accountRef, {
        [`members.${userId}`]: {
          role: newUserRole,
          joinedAt: Date.now()
        }
      });

      setSuccessMessage(`User ${newUserEmail} added successfully`);
      setNewUserEmail('');

      // Refresh user details
      const updatedUserDoc = await getDoc(doc(db, 'users', userId));
      if (updatedUserDoc.exists()) {
        setUserDetails(prev => ({
          ...prev,
          [userId]: updatedUserDoc.data() as UserData
        }));
      }
    } catch (err) {
      console.error('Failed to add user:', err);
      setError(err instanceof Error ? err.message : 'Failed to add user. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  // User Avatar Component
  const UserAvatar = ({ userData }: { userData?: UserData }) => {
    const [imageError, setImageError] = useState(false);
    const initials = userData?.displayName 
      ? userData.displayName.split(' ').map(n => n[0]).join('').toUpperCase()
      : '?';

    if (!userData || imageError) {
      return (
        <div className="w-8 h-8 rounded-full flex items-center justify-center
                      bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          <span className="text-sm font-medium">{initials}</span>
        </div>
      );
    }

    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden
                    bg-gray-200 dark:bg-gray-700">
        {userData.photoURL ? (
          <img 
            src={userData.photoURL} 
            alt={userData.displayName || ''}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {initials}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">User Management</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage users and invitations for your account
        </p>
      </div>

      {/* Add User Form */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </h3>
        </div>

        <form onSubmit={handleAddUser} className="p-4 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'member')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm flex items-center gap-1">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="text-green-500 text-sm flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isAdding || !newUserEmail}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? 'Adding User...' : 'Add User'}
          </button>
        </form>
      </div>

      {/* Updated Current Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Current Users</h3>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {currentAccount && Object.entries(currentAccount.members).map(([userId, member]) => {
            const userData = userDetails[userId];

            return (
              <div key={userId} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserAvatar userData={userData} />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {isLoadingUsers ? (
                        <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-4 w-24 inline-block" />
                      ) : (
                        userData?.displayName || 'Unknown User'
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {isLoadingUsers ? (
                        <span className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-3 w-32 inline-block" />
                      ) : (
                        <>
                          {userData?.email || 'No email'}
                          <span className="mx-1">•</span>
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    {member.role === 'admin' && <Shield className="h-4 w-4" />}
                    {member.role}
                  </span>
                  <button 
                    className="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    title="Remove user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}