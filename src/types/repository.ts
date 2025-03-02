export type SortColumn = 'path' | 'language' | 'size' | 'last_updated' | 'status';
export type SortDirection = 'asc' | 'desc';
export type FileStatus = 'active' | 'archived' | 'deprecated' | 'all';

export interface RepositoryFile {
  path: string;
  name?: string;
  language: string;
  size: number;
  last_updated: string;
  last_commit_message: string;
  type: string;
  content?: string;
  imports?: string[];
  ai_analysis?: {
    summary?: string;
    imports?: Array<{ path: string; purpose: string }>;
    functions?: Array<{ name: string; purpose: string }>;
    classes?: Array<{ name: string; purpose: string }>;
    exports?: Array<{ name: string; purpose: string }>;
    primary_features?: string[];
    integrationPoints?: Array<{ name: string; purpose: string; type: string }>;
  };
  metadata?: {
    sha: string;
    type: string;
    content_type: string;
  };
  first_indexed_at: {
    seconds: number;
    nanoseconds: number;
  };
  updated_at: {
    seconds: number;
    nanoseconds: number;
  };
  status: string;
}

export interface CodeFunction {
  name: string;
  parameters: Array<{ name: string; type: string }>;
  returnType: string;
  description?: string;
  code?: string;
}

export interface CodeClass {
  name: string;
  methods: CodeFunction[];
  properties: Array<{ name: string; type: string }>;
  description?: string;
}
