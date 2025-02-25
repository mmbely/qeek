import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAccount } from '../../context/AccountContext';
import ToolSection from './ToolSection/ToolSection';
import { RepositoryFile } from '../../types/repository';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

const ToolView = () => {
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentAccount } = useAccount();

  useEffect(() => {
    const fetchFiles = async () => {
      if (!currentAccount?.settings?.githubRepository) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch repository data
        const repoId = currentAccount.settings.githubRepository.replace('/', '_');
        const repoRef = doc(db, 'repositories', repoId);
        const repoDoc = await getDoc(repoRef);

        if (!repoDoc.exists()) {
          throw new Error('Repository not found');
        }

        // Fetch files from the 'files' subcollection
        const filesCollection = collection(repoRef, 'files');
        const filesSnapshot = await getDocs(filesCollection);
        
        const repoFiles = filesSnapshot.docs.map((doc) => {
          const fileData = doc.data() as RepositoryFile;
          return {
            ...fileData,
          };
        });

        console.log('Fetched files:', repoFiles);
        setFiles(repoFiles);
      } catch (error) {
        console.error('Failed to fetch repository files:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch files');
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [currentAccount]);

  const filePaths = useMemo(() => 
    files.map((file: RepositoryFile) => file.path),
    [files]
  );

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!currentAccount?.settings?.githubRepository) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Please connect a GitHub repository in settings
        </p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No files found in repository
        </p>
      </div>
    );
  }

  return <ToolSection files={filePaths} />;
};

export default ToolView;