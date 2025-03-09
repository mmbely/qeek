import React, { useState, useEffect } from 'react';
import { useAccount } from '../../context/AccountContext';
import { Mail, UserPlus, Trash2, Shield, CheckCircle, XCircle, Clock } from 'lucide-react';
import { doc, getDoc, collection, updateDoc, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { InvitationRole, InvitationStatus } from '../../types/user';
import { sendInvitation, getInvitations } from '../../services/github';
import { UserInvitation } from '../../types/user';
import { UserAvatar } from '../../components/ui/UserAvatar';

interface UserData {
  displayName: string;
  email: string;
  photoURL?: string;
}

interface InviteData {
  email: string;
  role: InvitationRole;
}

interface InvitationTableProps {
  invitations: UserInvitation[];
  isLoading: boolean;
  onResend: (invitation: UserInvitation) => void;
  onCancel: (invitationId: string) => void;
}

export default function UserManagement() {
  const { currentAccount } = useAccount();
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<InvitationRole>('member');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, UserData>>({});
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
  const [isResendingInvitation, setIsResendingInvitation] = useState<string | null>(null);
  const [isCancellingInvitation, setIsCancellingInvitation] = useState<string | null>(null);

  // Load and auto-refresh invitations
  useEffect(() => {
    const loadInvitations = async () => {
      if (!currentAccount) return;
      
      setIsLoadingInvitations(true);
      setError(null);
      try {
        const loadedInvitations = await getInvitations(currentAccount.id);
        // Sort invitations by status and date
        const sortedInvitations = loadedInvitations.sort((a, b) => {
          const statusOrder: Record<InvitationStatus, number> = { 
            pending: 0, 
            accepted: 1, 
            expired: 2 
          };
          const statusDiff = statusOrder[a.status] - statusOrder[b.status];
          if (statusDiff !== 0) return statusDiff;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setInvitations(sortedInvitations);
      } catch (error) {
        console.error('Failed to load invitations:', error);
        setError('Failed to load invitations');
      } finally {
        setIsLoadingInvitations(false);
      }
    };

    loadInvitations();
  }, [currentAccount]);

  // Load user details
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkExistingMember = async (accountId: string, email: string): Promise<boolean> => {
    const membersRef = doc(db, 'accounts', accountId);
    const membersDoc = await getDoc(membersRef);
    const members = membersDoc.data()?.members || {};
    
    return Object.values(members).some(
      (member: any) => member.email?.toLowerCase() === email.toLowerCase()
    );
  };

  const sortInvitations = (invitations: UserInvitation[]): UserInvitation[] => {
    const statusOrder: Record<InvitationStatus, number> = {
      pending: 0,
      accepted: 1,
      expired: 2
    };

    return [...invitations].sort((a, b) => {
      // First sort by status
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then sort by lastUpdated if available, or createdAt as fallback
      const aTime = a.lastUpdated ? new Date(a.lastUpdated).getTime() : new Date(a.createdAt).getTime();
      const bTime = b.lastUpdated ? new Date(b.lastUpdated).getTime() : new Date(b.createdAt).getTime();
      return bTime - aTime; // Most recent first
    });
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    // Input validation
    if (!currentAccount) {
      setError('No account selected');
      return;
    }

    const email = newUserEmail.trim();
    if (!email) {
      setError('Please enter a valid email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Invalid email format');
      return;
    }

    setIsAdding(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Check if user is already a member
      const isExistingMember = await checkExistingMember(currentAccount.id, email);
      if (isExistingMember) {
        throw new Error('User is already a member of this account');
      }

      // Send invitation
      const result = await sendInvitation(email, currentAccount.id, newUserRole);
      
      if (result.success) {
        setSuccessMessage(`Invitation sent to ${email}`);
        setNewUserEmail('');
        
        // Refresh and sort invitations
        const updatedInvitations = await getInvitations(currentAccount.id);
        setInvitations(sortInvitations(updatedInvitations));
      } else {
        throw new Error(result.message || 'Failed to send invitation');
      }
    } catch (err) {
      console.error('Failed to send invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setIsAdding(false);
    }
  };

  const handleResendInvitation = async (invitation: UserInvitation) => {
    if (!currentAccount) {
      setError('No account selected');
      return;
    }

    // Validate invitation state
    if (invitation.status !== 'pending' && invitation.status !== 'expired') {
      setError('Can only resend pending or expired invitations');
      return;
    }

    setIsResendingInvitation(invitation.id);
    setError(null);
    
    try {
      const result = await sendInvitation(invitation.email, currentAccount.id, invitation.role, true);
      
      if (result.success) {
        setSuccessMessage(`Invitation resent to ${invitation.email}`);
        
        // Refresh and sort invitations
        const updatedInvitations = await getInvitations(currentAccount.id);
        setInvitations(sortInvitations(updatedInvitations));
      } else {
        throw new Error(result.message || 'Failed to resend invitation');
      }
    } catch (err) {
      console.error('Failed to resend invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    } finally {
      setIsResendingInvitation(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!currentAccount) {
      setError('No account selected');
      return;
    }

    // Get current invitation
    const invitation = invitations.find(inv => inv.id === invitationId);
    if (!invitation) {
      setError('Invitation not found');
      return;
    }

    // Validate invitation state
    if (invitation.status !== 'pending') {
      setError('Can only cancel pending invitations');
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    setIsCancellingInvitation(invitationId);
    setError(null);
    
    try {
      const now = new Date().toISOString();

      // Update invitation status in Firestore
      const invitationRef = doc(db, 'invitations', invitationId);
      await updateDoc(invitationRef, {
        status: 'expired' as InvitationStatus,
        lastUpdated: now
      });

      setSuccessMessage('Invitation cancelled successfully');
      
      // Update local state with sorted invitations
      const updatedInvitations = invitations.map(inv => 
        inv.id === invitationId 
          ? { 
              ...inv, 
              status: 'expired' as InvitationStatus, 
              lastUpdated: now 
            }
          : inv
      );
      
      setInvitations(sortInvitations(updatedInvitations));
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    } finally {
      setIsCancellingInvitation(null);
    }
  };

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

  const handleDeleteUser = async (userId: string) => {
    if (!currentAccount || !window.confirm('Are you sure you want to remove this user?')) return;

    setIsDeletingUser(userId);
    setError(null);
    
    try {
      const accountRef = doc(db, 'accounts', currentAccount.id);
      
      // Create new members object without the deleted user
      const updatedMembers = { ...currentAccount.members };
      delete updatedMembers[userId];
      
      await updateDoc(accountRef, {
        members: updatedMembers
      });

      // Update local state
      setUserDetails(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });

      setSuccessMessage('User removed successfully');
    } catch (err) {
      console.error('Failed to remove user:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove user. Please try again.');
    } finally {
      setIsDeletingUser(null);
    }
  };

  // Invitation Table Component
  const InvitationTable = ({ invitations, isLoading, onResend, onCancel }: InvitationTableProps) => {
    if (isLoading) {
      return (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      );
    }

    if (invitations.length === 0) {
      return (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          No pending invitations
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {invitations.map((invitation) => (
              <tr key={invitation.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {invitation.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${invitation.role === 'admin' ? 
                      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 
                      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>
                    {invitation.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    Pending
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onResend(invitation)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200"
                      disabled={isResendingInvitation === invitation.id}
                    >
                      {isResendingInvitation === invitation.id ? 'Resending...' : 'Resend'}
                    </button>
                    <button
                      onClick={() => onCancel(invitation.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200"
                      disabled={isCancellingInvitation === invitation.id}
                    >
                      {isCancellingInvitation === invitation.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {/* Pending Invitations */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Pending Invitations
        </h3>
        <InvitationTable
          invitations={invitations}
          isLoading={isLoadingInvitations}
          onResend={handleResendInvitation}
          onCancel={handleCancelInvitation}
        />
      </div>

      {/* Add User Form */}
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite New User
          </h3>
        </div>

        <form onSubmit={handleSendInvitation} className="p-4 space-y-4">
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
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 disabled:opacity-50"
          >
            {isAdding ? (
              <>
                <Mail className="animate-spin -ml-1 mr-2 h-5 w-5" />
                Sending Invitation...
              </>
            ) : (
              <>
                <Mail className="-ml-1 mr-2 h-5 w-5" />
                Send Invitation
              </>
            )}
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
                    onClick={() => handleDeleteUser(userId)}
                    disabled={isDeletingUser === userId}
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