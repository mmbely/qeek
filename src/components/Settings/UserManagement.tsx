import React, { useState, useEffect } from 'react';
import { useAccount } from '../../context/AccountContext';
import { Mail, UserPlus, Trash2, Shield, CheckCircle, XCircle } from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, UserData>>({});

  // Fetch user details for all members
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!currentAccount) return;

      const details: Record<string, UserData> = {};
      for (const userId of Object.keys(currentAccount.members)) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            details[userId] = userDoc.data() as UserData;
          }
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
        }
      }
      setUserDetails(details);
    };

    fetchUserDetails();
  }, [currentAccount]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;

    setIsInviting(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Create invitation document
      const invitationRef = collection(db, 'invitations');
      const invitation = {
        email: inviteEmail.toLowerCase(),
        role: inviteRole,
        accountId: currentAccount.id,
        accountName: currentAccount.name,
        status: 'pending',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      const docRef = await addDoc(invitationRef, invitation);

      // Send email invitation
      await sendEmailInvitation({
        email: inviteEmail,
        accountName: currentAccount.name,
        role: inviteRole,
        invitationId: docRef.id
      });

      setSuccessMessage(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    } catch (err) {
      console.error('Failed to send invitation:', err);
      setError('Failed to send invitation. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">User Management</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage users and invitations for your account
        </p>
      </div>

      {/* Invite Users Form */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </h3>
        </div>

        <form onSubmit={handleInviteUser} className="p-4 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
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
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
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
            disabled={isInviting || !inviteEmail}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInviting ? 'Sending Invitation...' : 'Send Invitation'}
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
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                    {userData?.photoURL ? (
                      <img 
                        src={userData.photoURL} 
                        alt={userData.displayName} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {userData?.displayName || 'Loading...'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {userData?.email || 'Loading...'}
                      <span className="mx-1">•</span>
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
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