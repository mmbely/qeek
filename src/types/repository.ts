export interface RepositoryFile {
  path: string;
  name: string;
  content: string;
  sha: string;
  type: string;
  size: number;
  status: string;
  language: string;
  last_commit_message: string;
  last_updated: string;
  metadata: {
    content_type: string;
    sha: string;
    type: string;
  };
  classes: CodeClass[];
  functions: CodeFunction[];
  imports: string[];
  exports: string[];
  summary?: string;
  first_indexed_at: {
    seconds: number;
    nanoseconds: number;
  };
  updated_at: {
    seconds: number;
    nanoseconds: number;
  };
}

export interface CodeFunction {
  name: string;
  purpose?: string;
  params?: string[];
}

export interface CodeClass {
  name: string;
  purpose?: string;
  methods?: string[];
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