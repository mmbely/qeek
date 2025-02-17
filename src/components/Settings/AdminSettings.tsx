import React, { useState } from 'react';
import { Shield, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { migrations } from '../../migrations';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { serverTimestamp } from 'firebase/firestore';

const SUPER_ADMIN_ID = 'RnInDl1twWVwyWWMcEkB1sETtoq1';

export default function AdminSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // If not super admin, don't render anything
  if (user?.uid !== SUPER_ADMIN_ID) {
    return null;
  }

  const handleMigration = async (migrationKey: string) => {
    setIsLoading(prev => ({ ...prev, [migrationKey]: true }));
    try {
      const result = await migrations.tickets.addAccountId();
      setResults(prev => ({
        ...prev,
        [migrationKey]: {
          success: result.success,
          message: result.message || result.error || 'Unknown error'
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [migrationKey]: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, [migrationKey]: false }));
    }
  };

  const handleRepositoryMigration = async () => {
    setIsLoading(prev => ({ ...prev, repositories: true }));
    try {
      const reposRef = collection(db, 'repositories');
      const reposSnapshot = await getDocs(reposRef);
      
      let migratedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const repoDoc of reposSnapshot.docs) {
        const repoData = repoDoc.data();
        
        // Skip if already has accountId
        if ('accountId' in repoData) {
          console.log(`Skipping ${repoDoc.id}: already has accountId`);
          skippedCount++;
          continue;
        }

        try {
          // Determine the accountId
          let accountId = SUPER_ADMIN_ID; // Default to super admin
          
          // If metadata exists and has user_id, use that
          if (repoData.metadata?.user_id) {
            accountId = repoData.metadata.user_id;
          }
          
          console.log(`Migrating ${repoDoc.id} to account ${accountId}`);
          
          // Update repository with accountId
          await updateDoc(doc(db, 'repositories', repoDoc.id), {
            accountId: accountId,
            metadata: {
              ...(repoData.metadata || {}),
              migrated_at: serverTimestamp(),
              migrated_by: user?.uid,
              original_user_id: repoData.metadata?.user_id || null
            }
          });
          
          console.log(`Successfully migrated ${repoDoc.id}`);
          migratedCount++;
        } catch (error) {
          console.error(`Error migrating repository ${repoDoc.id}:`, error);
          errorCount++;
        }
      }

      setResults(prev => ({
        ...prev,
        repositories: {
          success: errorCount === 0,
          message: `Migration complete: ${migratedCount} repositories migrated, ${skippedCount} skipped, ${errorCount} errors`
        }
      }));
    } catch (error) {
      console.error('Migration error:', error);
      setResults(prev => ({
        ...prev,
        repositories: {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }));
    } finally {
      setIsLoading(prev => ({ ...prev, repositories: false }));
    }
  };

  const handleDebugRepositories = async () => {
    try {
      const reposRef = collection(db, 'repositories');
      const reposSnapshot = await getDocs(reposRef);
      
      console.log('Repository Debug Information:');
      reposSnapshot.docs.forEach(doc => {
        console.log(`\nRepository: ${doc.id}`);
        console.log('Data:', doc.data());
      });
    } catch (error) {
      console.error('Error debugging repositories:', error);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Admin Settings
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Super admin actions - handle with care
        </p>
      </div>

      {/* Migrations Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Database Migrations
          </h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Ticket Account Migration */}
          <div className="border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Migrate Tickets to Account
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Assigns all unassigned tickets to the default account. This operation cannot be undone.
                </p>
                
                {results['tickets'] && (
                  <div className={`mt-2 text-sm ${
                    results['tickets'].success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {results['tickets'].message}
                  </div>
                )}

                <div className="mt-3">
                  <button
                    onClick={() => handleMigration('tickets')}
                    disabled={isLoading['tickets']}
                    className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading['tickets'] ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Running Migration...
                      </>
                    ) : (
                      'Run Migration'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Repository Account Migration */}
          <div className="border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Migrate Repositories to Account
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Assigns repositories to their respective accounts. This operation cannot be undone.
                </p>
                
                {results['repositories'] && (
                  <div className={`mt-2 text-sm ${
                    results['repositories'].success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {results['repositories'].message}
                  </div>
                )}

                <div className="mt-3 space-x-3">
                  <button
                    onClick={() => handleRepositoryMigration()}
                    disabled={isLoading['repositories']}
                    className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 
                             disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading['repositories'] ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Running Migration...
                      </>
                    ) : (
                      'Run Migration'
                    )}
                  </button>
                  
                  <button
                    onClick={handleDebugRepositories}
                    className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
                  >
                    Debug Repositories
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Section - Optional */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">System Status</h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add system status information here
          </p>
        </div>
      </div>
    </div>
  );
}