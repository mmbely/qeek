export interface RepositoryFile {
  path: string;
  content: string;
  sha: string;
  size: number;
  type: string;
  status?: 'active' | 'deleted' | 'modified';
  language?: string;
  last_updated?: string;
  last_commit_message?: string;
  metadata?: {
    content_type: string;
    sha: string;
    type: string;
  };
  functions?: string[];
  classes?: string[];
  lastModified?: Date;
}

export interface Repository {
  files: RepositoryFile[];
  metadata: {
    name: string;
    description?: string;
    default_branch: string;
    sync_status: string;
    last_synced?: Date;
    accountId: string;
  };
}

// Optional: Add repository status types for better type safety
export type RepositorySyncStatus = 
  | 'not_synced'
  | 'syncing'
  | 'synced'
  | 'error';

// Optional: Add repository type for better organization
export type RepositoryType = 
  | 'github'
  | 'gitlab'
  | 'bitbucket';