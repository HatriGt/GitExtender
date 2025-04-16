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
  id?: string;
  name: string;
  owner: string;
  url: string;
  provider: GitProvider;
  isConnected: boolean;
  defaultBranches: {
    development: string;
    quality: string;
    production: string;
  };
  token?: string;
  description?: string;
  lastFetched?: string;
}

export interface SavedRepository {
  url: string;
  name: string;
  owner: string;
  provider: GitProvider;
  lastUsed: string;
  token?: string;
  defaultBranches: {
    development: string;
    quality: string;
    production: string;
  };
  isOrganization?: boolean;
  type: 'repository' | 'user' | 'organization';
  isDeleted?: boolean;
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
