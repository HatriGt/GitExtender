
export type GitProvider = 'github' | 'gitlab' | 'bitbucket';

export type BranchType = 'feature' | 'bugfix' | 'hotfix' | 'other';

export interface MergeStatus {
  target: string;
  isMerged: boolean;
  lastMergeDate?: string;
  commitsBehind?: number;
  commitsAhead?: number;
}

export interface Branch {
  id: string;
  name: string;
  type: BranchType;
  lastUpdated: string;
  author: string;
  authorAvatar?: string;
  status: MergeStatus[];
  selected?: boolean;
}

export interface Repository {
  url: string;
  provider: GitProvider;
  owner: string;
  name: string;
  isConnected: boolean;
  lastFetched?: string;
  token?: string;
  defaultBranches: {
    development: string;
    quality: string;
    production: string;
  };
  description?: string;
}

export interface SavedRepository {
  url: string;
  provider: GitProvider;
  owner: string;
  name: string;
  token?: string;
  lastUsed: string;
  defaultBranches: {
    development: string;
    quality: string;
    production: string;
  };
}

export interface RepoContributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

export interface RepoPullRequest {
  id: string;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  created_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
}

export interface RepoRelease {
  name: string;
  tag_name: string;
  published_at: string;
  url: string;
}

export interface RepositoryStats {
  description?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  totalCommits?: number;
  lastUpdated?: string;
  pullRequests?: {
    open: number;
    closed: number;
    merged: number;
  };
  contributors?: RepoContributor[];
  language?: string;
  topics?: string[];
  releases?: RepoRelease[];
  license?: string;
  visibility?: string;
  defaultBranch?: string;
  createdAt?: string;
}
