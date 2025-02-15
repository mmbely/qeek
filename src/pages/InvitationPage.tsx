import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext';

export default function InvitationPage() {
  const { invitationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAcceptInvitation = async () => {
    if (!user || !invitationId) return;

    setIsProcessing(true);
    setError(null);

    try {
      const functions = getFunctions();
      const acceptInvitation = httpsCallable(functions, 'handleInvitationAcceptance');
      await acceptInvitation({ invitationId });
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Accept Invitation</h2>
          <p className="mt-2 text-gray-600">
            Click below to join the account
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-md">
            {error}
          </div>
        )}

        <button
          onClick={handleAcceptInvitation}
          disabled={isProcessing}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Accept Invitation'}
        </button>
      </div>
    </div>
  );
}