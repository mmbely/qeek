import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAccount } from '../../context/AccountContext';
import ToolSection from './ToolSection/ToolSection';
import { RepositoryFile } from '../../types/repository';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import { getRepositoryFiles } from '../../services/github';

const ToolView = () => {
  const [files, setFiles] = useState<RepositoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentAccount } = useAccount();

  useEffect(() => {
    const loadFiles = async () => {
      try {
        setLoading(true);
        const repoFiles = await getRepositoryFiles('mmbely/qeek');
        setFiles(repoFiles as RepositoryFile[]);
      } catch (error) {
        console.error('Error loading files:', error);
        setError(error instanceof Error ? error.message : 'Failed to load files');
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, []);

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

  return <ToolSection files={files} />;
};

export default ToolView;