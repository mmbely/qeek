import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const storeGithubTokenFunction = httpsCallable(functions, 'storeGithubToken');
const syncRepoFunction = httpsCallable(functions, 'syncGithubRepository');

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
}

// Store token using Cloud Function
export const storeGithubToken = async (token: string, accountId: string) => {
  try {
    console.log('Storing GitHub token for account:', accountId);
    const result = await storeGithubTokenFunction({ token, accountId });
    console.log('Token storage response:', result);
    return result.data;
  } catch (error) {
    console.error('Error storing GitHub token:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to store GitHub token');
  }
};

// Get token from secure_tokens collection
export const getToken = async (accountId: string): Promise<string | null> => {
  try {
    console.log('Getting token for account:', accountId);
    const tokenDoc = await getDoc(doc(db, 'secure_tokens', accountId));
    if (!tokenDoc.exists()) {
      console.log('No token found for account:', accountId);
      return null;
    }
    return tokenDoc.data()?.githubToken || null;
  } catch (error) {
    console.error('Error getting GitHub token:', error);
    throw new Error('Failed to get GitHub token');
  }
};

// Clear token from secure_tokens collection
export const clearToken = async (accountId: string) => {
  try {
    await deleteDoc(doc(db, 'secure_tokens', accountId));
  } catch (error) {
    console.error('Error clearing GitHub token:', error);
    throw error;
  }
};

// Validate token with GitHub API
export const validateToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

// Fetch repositories using token
export const fetchUserRepositories = async (accountId: string): Promise<GitHubRepo[]> => {
  const token = await getToken(accountId);
  if (!token) throw new Error('GitHub token not found');

  try {
    const response = await fetch('https://api.github.com/user/repos?sort=updated', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch repositories');

    const repos = await response.json();
    return repos.map((repo: any): GitHubRepo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      description: repo.description,
      default_branch: repo.default_branch
    }));
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw error;
  }
};

// Sync repository using Cloud Function
export const syncRepository = async (repositoryName: string, accountId: string) => {
  try {
    console.log('Syncing repository:', repositoryName, 'for account:', accountId);
    const result = await syncRepoFunction({ repositoryName, accountId });
    console.log('Sync response:', result);
    return result.data;
  } catch (error) {
    console.error('Error syncing repository:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to sync repository');
  }
};
