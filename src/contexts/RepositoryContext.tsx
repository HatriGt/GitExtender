import { createContext, useContext, useState, useEffect } from 'react';
import { Branch, Repository, GitProvider, SavedRepository, RepositoryStats, RepoContributor } from '../types/git';
import axios from 'axios';
import { format, formatDistanceToNow } from 'date-fns';

interface RepositoryContextType {
  repository: Repository | null;
  branches: Branch[];
  loading: boolean;
  error: string | null;
  savedRepositories: SavedRepository[];
  repoStats: RepositoryStats | null;
  readmeContent: string | null;
  connectRepository: (url: string, token?: string, defaultBranches?: {
    development: string;
    quality: string;
    production: string;
  }) => Promise<void>;
  disconnectRepository: () => void;
  fetchBranches: (repoToUse?: Repository) => Promise<void>;
  toggleBranchSelection: (branchId: string) => void;
  areAllBranchesSelected: boolean;
  toggleAllBranchSelection: () => void;
  selectedBranches: Branch[];
  updateDefaultBranches: (branches: { development: string; quality: string; production: string }) => void;
  createPullRequest: (branchName: string, targetBranch: string) => void;
  openPullRequestForm: (branchName: string, targetBranch: string) => void;
  deleteBranch: (branchName: string) => Promise<void>;
  saveRepository: (repo: SavedRepository) => void;
}

const RepositoryContext = createContext<RepositoryContextType>({
  repository: null,
  branches: [],
  loading: false,
  error: null,
  savedRepositories: [],
  repoStats: null,
  readmeContent: null,
  connectRepository: async () => {},
  disconnectRepository: () => {},
  fetchBranches: async () => {},
  toggleBranchSelection: () => {},
  areAllBranchesSelected: false,
  toggleAllBranchSelection: () => {},
  selectedBranches: [],
  updateDefaultBranches: () => {},
  createPullRequest: () => {},
  openPullRequestForm: () => {},
  deleteBranch: async () => {},
  saveRepository: () => {},
});

export const useRepository = () => useContext(RepositoryContext);

const SAVED_REPOSITORIES_KEY = 'gitextender-saved-repositories';
const LAST_REPO_DATA_KEY = 'gitextender-last-repo-data';

const parseRepoUrl = (url: string): { provider: GitProvider, owner: string, name: string } => {
  let provider: GitProvider = 'github';
  
  if (url.includes('gitlab')) provider = 'gitlab';
  if (url.includes('bitbucket')) provider = 'bitbucket';
  
  // Clean the URL
  const cleanUrl = url
    .replace(/^(https?:\/\/)?(www\.)?/, '') // Remove protocol and www
    .replace(/\.git$/, '') // Remove .git suffix
    .replace(/^github\.com\//, ''); // Remove github.com/ prefix if present
  
  // Split by slashes and filter out empty parts
  const parts = cleanUrl.split('/').filter(Boolean);
  
  if (parts.length < 2) {
    throw new Error('Invalid repository URL format. Expected format: owner/repo or github.com/owner/repo');
  }
  
  // The last two parts should be owner and repo name
  const owner = parts[parts.length - 2];
  const name = parts[parts.length - 1];
  
  return { provider, owner, name };
};

const getBranchType = (branchName: string) => {
  const lowerName = branchName.toLowerCase();
  
  if (
    lowerName.startsWith('feature/') || 
    lowerName.startsWith('feat/') || 
    lowerName.startsWith('features/') ||
    branchName.startsWith('Feature/') ||
    branchName.startsWith('FEATURE/')
  ) {
    return 'feature' as const;
  }
  
  if (
    lowerName.startsWith('bugfix/') || 
    lowerName.startsWith('bug/') || 
    lowerName.startsWith('fix/') ||
    branchName.startsWith('BugFix/') ||
    branchName.startsWith('bugFix/') ||
    branchName.startsWith('Bug/') ||
    branchName.startsWith('Fix/') ||
    branchName.startsWith('BUGFIX/')
  ) {
    return 'bugfix' as const;
  }

  if (
    lowerName.startsWith('hotfix/') ||
    branchName.startsWith('HotFix/') ||
    branchName.startsWith('hotFix/') ||
    branchName.startsWith('HOTFIX/')
  ) {
    return 'hotfix' as const;
  }
  
  return 'other' as const;
};

const fetchGitHubBranches = async (
  owner: string, 
  repo: string, 
  token?: string, 
  defaultBranches: { development: string; quality: string; production: string } = { development: 'Development', quality: 'Quality', production: 'Production' }
): Promise<Branch[]> => {
  let allBranches: any[] = [];
  let currentPage = 1;
  let hasMorePages = true;
  const perPage = 100; // GitHub API maximum
  
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  try {
    // First, get all branches in a single request
    const response = await axios({
      method: 'get',
      url: `https://api.github.com/repos/${owner}/${repo}/branches`,
      params: {
        per_page: perPage
      },
      headers: headers
    });
    
    allBranches = response.data;
    
    // Create a set of existing branch names for quick lookup
    const existingBranchNames = new Set(allBranches.map((branch: any) => branch.name));
    
    // Filter target branches to only include existing ones
    const targetBranches = [
      defaultBranches.development,
      defaultBranches.quality,
      defaultBranches.production
    ].filter(branchName => existingBranchNames.has(branchName));
    
    const filteredBranches = allBranches.filter(
      branch => {
        const branchType = getBranchType(branch.name);
        return ['feature', 'bugfix', 'hotfix'].includes(branchType);
      }
    );
    
    const branchesWithDetails = await Promise.all(
      filteredBranches.map(async (branch) => {
        const type = getBranchType(branch.name);
        
        const commitResponse = await axios({
          method: 'get',
          url: `https://api.github.com/repos/${owner}/${repo}/commits/${branch.commit.sha}`,
          headers: headers
        });
        
        const commit = commitResponse.data;
        
        // Only check merge status against existing target branches
        const mergeStatuses = await Promise.all(
          targetBranches.map(async (target) => {
            try {
              // Use GitHub's compare API to check the difference between branches
              const compareResponse = await axios({
                method: 'get',
                url: `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(target)}...${encodeURIComponent(branch.name)}`,
                headers: headers
              });
              
              const { ahead_by: commitsAhead, behind_by: commitsBehind, status } = compareResponse.data;
              
              const isMerged = (commitsAhead === 0 && status !== 'diverged') || 
                             (status === 'identical');

              // For additional context, get the commit counts
              const featureCommitsResponse = await axios({
                method: 'get',
                url: `https://api.github.com/repos/${owner}/${repo}/commits`,
                params: {
                  sha: branch.name,
                  per_page: 100
                },
                headers: headers
              });

              const totalCommits = featureCommitsResponse.data.length;
              const mergedCommits = totalCommits - commitsAhead;
              
              return {
                target,
                isMerged,
                lastMergeDate: isMerged ? new Date().toISOString() : undefined,
                commitsBehind,
                commitsAhead,
                totalCommits,
                mergedCommits: Math.max(0, mergedCommits)
              };
            } catch (error) {
              console.log(`Error checking merge status for ${branch.name} to ${target}:`, error);
              return { 
                target, 
                isMerged: false, 
                commitsBehind: 0, 
                commitsAhead: 0,
                totalCommits: 0,
                mergedCommits: 0
              };
            }
          })
        );
        
        return {
          id: branch.name,
          name: branch.name,
          type,
          lastUpdated: commit.commit?.committer?.date || commit.commit?.author?.date || new Date().toISOString(),
          author: commit.commit?.author?.name || commit.author?.login || 'Unknown',
          authorAvatar: commit.author?.avatar_url,
          status: mergeStatuses
        };
      })
    );
    
    return branchesWithDetails
      .filter(Boolean)
      .sort((a, b) => new Date(b!.lastUpdated).getTime() - new Date(a!.lastUpdated).getTime());
  } catch (error) {
    console.error('Error in fetchGitHubBranches:', error);
    throw new Error(`Failed to fetch branches: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const fetchGitHubRepoStats = async (owner: string, repo: string, token?: string): Promise<RepositoryStats> => {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  try {
    const repoResponse = await axios({
      method: 'get',
      url: `https://api.github.com/repos/${owner}/${repo}`,
      headers: headers
    });
    
    const repoData = repoResponse.data;
    
    const prResponse = await axios({
      method: 'get',
      url: `https://api.github.com/repos/${owner}/${repo}/pulls`,
      params: {
        state: 'all',
        per_page: 100
      },
      headers: headers
    });
    
    const prs = prResponse.data;
    
    const openPRs = prs.filter((pr: any) => pr.state === 'open').length;
    const closedPRs = prs.filter((pr: any) => pr.state === 'closed' && !pr.merged_at).length;
    const mergedPRs = prs.filter((pr: any) => pr.merged_at).length;
    
    const contributorsResponse = await axios({
      method: 'get',
      url: `https://api.github.com/repos/${owner}/${repo}/contributors`,
      params: { per_page: 10 },
      headers: headers
    });
    
    const contributors: RepoContributor[] = contributorsResponse.data.map((contributor: any) => ({
      login: contributor.login,
      avatar_url: contributor.avatar_url,
      contributions: contributor.contributions
    }));
    
    const commitActivity = await axios({
      method: 'get',
      url: `https://api.github.com/repos/${owner}/${repo}/stats/participation`,
      headers: headers
    });

    const totalCommits = commitActivity.data?.all 
      ? commitActivity.data.all.slice(-4).reduce((sum: number, week: number) => sum + week, 0)
      : 0;

    const releasesResponse = await axios({
      method: 'get',
      url: `https://api.github.com/repos/${owner}/${repo}/releases`,
      params: { per_page: 5 },
      headers: headers
    });

    const releases = releasesResponse.data.map((release: any) => ({
      name: release.name,
      tag_name: release.tag_name,
      published_at: release.published_at,
      url: release.html_url
    }));
    
    return {
      description: repoData.description,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      lastUpdated: repoData.updated_at,
      pullRequests: {
        open: openPRs,
        closed: closedPRs,
        merged: mergedPRs
      },
      contributors,
      language: repoData.language,
      topics: repoData.topics,
      totalCommits,
      releases,
      license: repoData.license?.name,
      visibility: repoData.visibility,
      defaultBranch: repoData.default_branch,
      createdAt: repoData.created_at
    };
  } catch (error) {
    console.error('Error fetching repo stats:', error);
    return {};
  }
};

const fetchReadmeContent = async (owner: string, name: string, token?: string): Promise<string | null> => {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.raw',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  try {
    const response = await axios({
      method: 'get',
      url: `https://api.github.com/repos/${owner}/${name}/readme`,
      headers: headers
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching README:', error);
    return null;
  }
};

export const RepositoryProvider = ({ children }: { children: React.ReactNode }) => {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRepositories, setSavedRepositories] = useState<SavedRepository[]>([]);
  const [repoStats, setRepoStats] = useState<RepositoryStats | null>(null);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);

  useEffect(() => {
    const savedReposString = localStorage.getItem(SAVED_REPOSITORIES_KEY);
    if (savedReposString) {
      try {
        const savedRepos = JSON.parse(savedReposString);
        setSavedRepositories(savedRepos);
      } catch (error) {
        console.error('Error parsing saved repositories:', error);
      }
    }
    
    const lastRepoDataString = localStorage.getItem(LAST_REPO_DATA_KEY);
    if (lastRepoDataString) {
      try {
        const lastRepoData = JSON.parse(lastRepoDataString);
        if (lastRepoData.url) {
          setRepository({
            ...lastRepoData,
            isConnected: false,
          });
        }
      } catch (error) {
        console.error('Error parsing last repository data:', error);
      }
    }
  }, []);

  const saveRepository = (repo: SavedRepository) => {
    const existingRepoIndex = savedRepositories.findIndex(r => r.url === repo.url);
    
    let updatedRepos: SavedRepository[];
    
    if (existingRepoIndex >= 0) {
      if (repo.isDeleted) {
        // Remove the repository if it's marked as deleted
        updatedRepos = savedRepositories.filter(r => r.url !== repo.url);
      } else {
        // Update the existing entry
        updatedRepos = [...savedRepositories];
        updatedRepos[existingRepoIndex] = {
          ...repo,
          lastUsed: new Date().toISOString()
        };
      }
    } else if (!repo.isDeleted) {
      // Only add new repositories that aren't marked as deleted
      updatedRepos = [
        ...savedRepositories,
        {
          ...repo,
          lastUsed: new Date().toISOString()
        }
      ];
    } else {
      // If it's a new entry marked as deleted, don't add it
      updatedRepos = savedRepositories;
    }
    
    setSavedRepositories(updatedRepos);
    localStorage.setItem(SAVED_REPOSITORIES_KEY, JSON.stringify(updatedRepos));
  };

  const saveLastRepoData = (data: { url: string, token?: string, defaultBranches: { development: string, quality: string, production: string } }) => {
    localStorage.setItem(LAST_REPO_DATA_KEY, JSON.stringify(data));
  };

  const fetchRepoStats = async (owner: string, name: string, provider: GitProvider, token?: string) => {
    try {
      let stats: RepositoryStats = {};
      
      switch (provider) {
        case 'github':
          stats = await fetchGitHubRepoStats(owner, name, token);
          
          const readme = await fetchReadmeContent(owner, name, token);
          setReadmeContent(readme);
          break;
        default:
          console.log('Stats not implemented for this provider yet');
          break;
      }
      
      setRepoStats(stats);
      return stats;
    } catch (error) {
      console.error('Error fetching repository stats:', error);
      return null;
    }
  };

  const connectRepository = async (
    url: string, 
    token?: string,
    defaultBranches?: { 
      development: string;
      quality: string;
      production: string;
    }
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Parse the repository URL to get owner and name
      const { provider, owner, name } = parseRepoUrl(url);

      // Check if it's a user/organization profile
      const isProfile = !name || name === '';
      
      if (isProfile) {
        // For profiles, we don't need to verify the repository
        const repository: Repository = {
          name: '',
          owner,
          url: `https://github.com/${owner}`,
          provider,
          isConnected: true,
          defaultBranches: defaultBranches || {
            development: 'Development',
            quality: 'Quality',
            production: 'Production'
          },
          token,
          lastFetched: new Date().toISOString()
        };

        // Save repository data
        setRepository(repository);
        saveRepository({
          url: repository.url,
          name: repository.name,
          owner: repository.owner,
          provider: repository.provider,
          lastUsed: new Date().toISOString(),
          token: repository.token,
          defaultBranches: repository.defaultBranches,
          isOrganization: true,
          type: 'organization'
        });

        // Save last used repository data
        saveLastRepoData({
          url: repository.url,
          token: repository.token,
          defaultBranches: repository.defaultBranches
        });

        return;
      }

      // Set up headers for GitHub API
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // First, verify the repository exists and get basic info
      const repoResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${name}`,
        { headers }
      );

      if (!repoResponse.data) {
        throw new Error('Repository not found');
      }

      const repoData = repoResponse.data;

      // Create repository object
      const repository: Repository = {
        id: repoData.id.toString(),
        name: repoData.name,
        owner: repoData.owner.login,
        url: repoData.html_url,
        provider,
        isConnected: true,
        defaultBranches: defaultBranches || {
          development: 'Development',
          quality: 'Quality',
          production: 'Production'
        },
        token,
        description: repoData.description,
        lastFetched: new Date().toISOString()
      };

      // Save repository data
      setRepository(repository);
      saveRepository({
        url: repository.url,
        name: repository.name,
        owner: repository.owner,
        provider: repository.provider,
        lastUsed: new Date().toISOString(),
        token: repository.token,
        defaultBranches: repository.defaultBranches,
        isOrganization: false,
        type: 'repository'
      });

      // Save last used repository data
      saveLastRepoData({
        url: repository.url,
        token: repository.token,
        defaultBranches: repository.defaultBranches
      });

      // Fetch additional data
      await Promise.all([
        fetchBranches(repository),
        fetchRepoStats(owner, name, provider, token),
        fetchReadmeContent(owner, name, token)
      ]);

    } catch (error) {
      console.error('Error connecting to repository:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          setError('Repository not found. Please check the URL and try again.');
        } else if (error.response?.status === 401) {
          setError('Authentication failed. Please check your access token.');
        } else {
          setError(error.response?.data?.message || 'Failed to connect to repository');
        }
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      setRepository(null);
    } finally {
      setLoading(false);
    }
  };

  const disconnectRepository = () => {
    setRepository(prev => {
      if (prev) {
        return { ...prev, isConnected: false };
      }
      return null;
    });
    setBranches([]);
    setRepoStats(null);
    setReadmeContent(null);
  };
  
  const updateDefaultBranches = async (newDefaultBranches: { development: string, quality: string, production: string }) => {
    if (!repository) return;

    try {
      // Update the repository state with new branch names
      const updatedRepo = {
        ...repository,
        defaultBranches: newDefaultBranches
      };
      
      // Update repository state
      setRepository(updatedRepo);

      // Fetch branches with new settings
      await fetchBranches(updatedRepo);
    } catch (error) {
      console.error('Error updating default branches:', error);
      throw error;
    }
  };

  const fetchBranches = async (repoToUse?: Repository) => {
    const repo = repoToUse || repository;
    if (!repo) return;

    setLoading(true);
    setError(null);

    try {
      const { owner, name, provider, token, defaultBranches } = repo;
      
      // Fetch branches using the latest branch names
      const fetchedBranches = await fetchGitHubBranches(
        owner,
        name,
        token,
        defaultBranches
      );

      setBranches(fetchedBranches);
    } catch (error) {
      console.error('Error fetching branches:', error);
      setError('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  };

  const toggleBranchSelection = (branchId: string) => {
    setBranches(branches.map(branch => 
      branch.id === branchId 
        ? { ...branch, selected: !branch.selected } 
        : branch
    ));
  };

  const areAllBranchesSelected = branches.length > 0 && branches.every(branch => branch.selected);
  
  const toggleAllBranchSelection = () => {
    setBranches(branches.map(branch => ({
      ...branch,
      selected: !areAllBranchesSelected
    })));
  };
  
  const selectedBranches = branches.filter(branch => branch.selected);

  const createPullRequest = (branchName: string, targetBranch: string) => {
    if (!repository) return;
    
    let url = '';
    
    switch (repository.provider) {
      case 'github':
        url = `https://github.com/${repository.owner}/${repository.name}/compare/${encodeURIComponent(targetBranch)}...${encodeURIComponent(branchName)}?expand=1`;
        break;
      default:
        console.error('Unsupported Git provider');
        return;
    }
    
    window.open(url, '_blank');
  };
  
  const openPullRequestForm = (branchName: string, targetBranch: string) => {
    createPullRequest(branchName, targetBranch);
  };
  
  const deleteBranch = async (branchName: string) => {
    if (!repository || !repository.token) {
      setError('Repository token is required to delete branches');
      return;
    }
    
    try {
      const headers = {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${repository.token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      };
      
      await axios({
        method: 'delete',
        url: `https://api.github.com/repos/${repository.owner}/${repository.name}/git/refs/heads/${encodeURIComponent(branchName)}`,
        headers
      });
      
      setBranches(branches.filter(branch => branch.name !== branchName));
    } catch (error) {
      console.error('Error deleting branch:', error);
      throw new Error(`Failed to delete branch: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const value = {
    repository,
    branches,
    loading,
    error,
    savedRepositories,
    repoStats,
    readmeContent,
    connectRepository,
    disconnectRepository,
    fetchBranches,
    toggleBranchSelection,
    areAllBranchesSelected,
    toggleAllBranchSelection,
    selectedBranches,
    updateDefaultBranches,
    createPullRequest,
    openPullRequestForm,
    deleteBranch,
    saveRepository
  };

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
};
