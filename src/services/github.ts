import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  default_branch: string;
}

export class GitHubService {
  private token: string | null = null;

  async setToken(userId: string, token: string) {
    this.token = token;
    // Store in Firestore
    await setDoc(doc(db, 'users', userId, 'settings', 'github'), {
      token: token,
      updatedAt: new Date().toISOString()
    });
  }

  async getToken(userId: string) {
    if (!this.token) {
      const docRef = doc(db, 'users', userId, 'settings', 'github');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        this.token = docSnap.data().token;
      }
    }
    return this.token;
  }

  async clearToken(userId: string) {
    this.token = null;
    await deleteDoc(doc(db, 'users', userId, 'settings', 'github'));
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Error validating token:', error);
      return false;
    }
  }

  async fetchUserRepositories(userId: string): Promise<GitHubRepo[]> {
    const token = await this.getToken(userId);
    if (!token) throw new Error('GitHub token not found');

    try {
      const response = await fetch('https://api.github.com/user/repos?sort=updated', {
        headers: {
          'Authorization': `token ${token}`,
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
  }

  async setSelectedRepository(userId: string, repoFullName: string) {
    await setDoc(doc(db, 'users', userId, 'settings', 'github'), {
      selectedRepository: repoFullName,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  async getSelectedRepository(userId: string) {
    const docRef = doc(db, 'users', userId, 'settings', 'github');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().selectedRepository;
    }
    return null;
  }
}

export const githubService = new GitHubService();

export const storeGithubToken = async (token: string, accountId: string) => {
  const storeTokenFn = httpsCallable(functions, 'storeGithubToken');
  return storeTokenFn({ token, accountId });
};

export const syncRepository = async (repositoryName: string, accountId: string) => {
  const syncRepoFn = httpsCallable(functions, 'syncGithubRepository');
  return syncRepoFn({ repositoryName, accountId });
};
