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
});

export const useRepository = () => useContext(RepositoryContext);

const SAVED_REPOSITORIES_KEY = 'gitextender-saved-repositories';
const LAST_REPO_DATA_KEY = 'gitextender-last-repo-data';

const parseRepoUrl = (url: string): { provider: GitProvider, owner: string, name: string } => {
  let provider: GitProvider = 'github';
  
  if (url.includes('gitlab')) provider = 'gitlab';
  if (url.includes('bitbucket')) provider = 'bitbucket';
  
  const cleanUrl = url.endsWith('.git') ? url.slice(0, -4) : url;
  let path = cleanUrl.replace(/^(https?:\/\/)?(www\.)?/, '');
  
  const parts = path.split('/');
  
  const owner = parts.length >= 2 ? parts[parts.length - 2] : '';
  const name = parts.length >= 1 ? parts[parts.length - 1] : '';
  
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
    while (hasMorePages) {
      const response = await axios({
        method: 'get',
        url: `https://api.github.com/repos/${owner}/${repo}/branches`,
        params: {
          per_page: perPage,
          page: currentPage
        },
        headers: headers
      });
      
      const branchesPage = response.data;
      
      if (branchesPage.length === 0) {
        hasMorePages = false;
      } else {
        allBranches = [...allBranches, ...branchesPage];
        
        const linkHeader = response.headers.link;
        hasMorePages = linkHeader && linkHeader.includes('rel="next"');
        
        currentPage++;
      }
    }
    
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
        
        const targets = [
          defaultBranches.development,
          defaultBranches.quality,
          defaultBranches.production
        ];

        const mergeStatuses = await Promise.all(
          targets.map(async (target) => {
            try {
              // First check if the target branch exists
              let targetExists = true;
              try {
                await axios({
                  method: 'get',
                  url: `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(target)}`,
                  headers: headers
                });
              } catch (error) {
                targetExists = false;
              }
              
              if (!targetExists) {
                return {
                  target,
                  isMerged: false,
                  commitsBehind: 0,
                  commitsAhead: 0
                };
              }

              // Method 1: Check if the branch has been merged into target using the compare API
              try {
                // First check commits from target to branch
                const compareResponse = await axios({
                  method: 'get',
                  url: `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(target)}...${encodeURIComponent(branch.name)}`,
                  headers: headers
                });
                
                if (compareResponse.status === 200) {
                  const compareData = compareResponse.data;
                  
                  // If branch is ahead by 0 commits and status is not diverged, it means branch is either equal to or behind target
                  const commitsAhead = compareData.ahead_by;
                  const commitsBehind = compareData.behind_by;
                  
                  // Branch is merged if:
                  // 1. It has no commits ahead of target and is not diverged
                  // 2. It is behind target (meaning target has all its commits)
                  // 3. It has diverged but target has all its commits
                  const isMerged = (commitsAhead === 0 && compareData.status !== 'diverged') || 
                                  (commitsBehind > 0 && commitsAhead === 0) ||
                                  (compareData.status === 'diverged' && commitsBehind > 0);
                  
                  // If we're not sure about the merge status, check the other direction
                  if (!isMerged) {
                    try {
                      const reverseCompare = await axios({
                        method: 'get',
                        url: `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(branch.name)}...${encodeURIComponent(target)}`,
                        headers: headers
                      });
                      
                      // If target contains all of branch's commits, then branch is effectively merged
                      if (reverseCompare.data.status === 'ahead' && reverseCompare.data.ahead_by > 0) {
                        return {
                          target,
                          isMerged: true,
                          lastMergeDate: new Date().toISOString(),
                          commitsBehind: 0,
                          commitsAhead: 0
                        };
                      }
                    } catch (error) {
                      console.error(`Reverse comparison error: ${error}`);
                    }
                  }
                  
                  return {
                    target,
                    isMerged,
                    lastMergeDate: isMerged ? new Date().toISOString() : undefined,
                    commitsBehind,
                    commitsAhead
                  };
                }
                
                return { target, isMerged: false, commitsBehind: 0, commitsAhead: 0 };
              } catch (error) {
                console.error(`Compare API error: ${error}`);
                
                // Method 2: Fall back to checking if the branch SHA is an ancestor of target SHA
                try {
                  // Get both branch and target SHAs
                  const branchResponse = await axios({
                    method: 'get',
                    url: `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch.name)}`,
                    headers: headers
                  });
                  
                  const targetResponse = await axios({
                    method: 'get',
                    url: `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(target)}`,
                    headers: headers
                  });
                  
                  const branchSha = branchResponse.data.commit.sha;
                  const targetSha = targetResponse.data.commit.sha;
                  
                  // If they're the same SHA, the branch is definitely merged
                  if (branchSha === targetSha) {
                    return {
                      target,
                      isMerged: true,
                      lastMergeDate: new Date().toISOString(),
                      commitsBehind: 0,
                      commitsAhead: 0
                    };
                  }
                  
                  // Try to use commits endpoint to see if branch commit is in target's history
                  try {
                    const commitsResponse = await axios({
                      method: 'get',
                      url: `https://api.github.com/repos/${owner}/${repo}/commits`,
                      params: {
                        sha: target,
                        per_page: 100
                      },
                      headers: headers
                    });
                    
                    // Check if branch commit is in the target's history
                    const isMerged = commitsResponse.data.some((commit: any) => commit.sha === branchSha);
                    
                    return {
                      target,
                      isMerged,
                      lastMergeDate: isMerged ? new Date().toISOString() : undefined,
                      commitsBehind: isMerged ? 0 : 1, // Estimate
                      commitsAhead: 0
                    };
                  } catch (error) {
                    console.error(`Commits history check error: ${error}`);
                    return { target, isMerged: false, commitsBehind: 0, commitsAhead: 0 };
                  }
                } catch (error) {
                  console.error(`Branch SHA comparison error: ${error}`);
                  return { target, isMerged: false, commitsBehind: 0, commitsAhead: 0 };
                }
              }
            } catch (error) {
              console.log(`Error checking merge status for ${branch.name} to ${target}:`, error);
              return { target, isMerged: false, commitsBehind: 0, commitsAhead: 0 };
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
      updatedRepos = [...savedRepositories];
      updatedRepos[existingRepoIndex] = {
        ...repo,
        lastUsed: new Date().toISOString()
      };
    } else {
      updatedRepos = [
        ...savedRepositories,
        {
          ...repo,
          lastUsed: new Date().toISOString()
        }
      ];
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
    if (!url) {
      setError('Repository URL is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const { provider, owner, name } = parseRepoUrl(url);
      
      if (!owner || !name) {
        throw new Error('Invalid repository URL format');
      }
      
      // Load saved branch names from localStorage if not provided
      if (!defaultBranches) {
        const savedDefaultBranchesString = localStorage.getItem(LAST_REPO_DATA_KEY);
        if (savedDefaultBranchesString) {
          try {
            defaultBranches = JSON.parse(savedDefaultBranchesString);
          } catch (error) {
            console.error('Error parsing saved default branches:', error);
            defaultBranches = { 
              development: 'Development',
              quality: 'Quality',
              production: 'Production'
            };
          }
        } else {
          defaultBranches = { 
            development: 'Development',
            quality: 'Quality',
            production: 'Production'
          };
        }
      }
      
      const repo: Repository = {
        url,
        provider,
        owner,
        name,
        isConnected: true,
        lastFetched: new Date().toISOString(),
        token,
        defaultBranches
      };
      
      const stats = await fetchRepoStats(owner, name, provider, token);
      
      if (stats?.description) {
        repo.description = stats.description;
      }
      
      setRepository(repo);
      
      saveRepository({
        url,
        provider,
        owner,
        name,
        token,
        lastUsed: new Date().toISOString(),
        defaultBranches
      });
      
      saveLastRepoData({
        url,
        token,
        defaultBranches
      });
      
      let fetchedBranches: Branch[] = [];
      
      try {
        switch (provider) {
          case 'github':
            fetchedBranches = await fetchGitHubBranches(owner, name, token, defaultBranches);
            break;
          default:
            throw new Error('Only GitHub is currently supported');
        }
        
        setBranches(fetchedBranches);
      } catch (err) {
        console.error('Error fetching branches:', err);
        setError(`Failed to fetch branches from repository. ${err instanceof Error ? err.message : ''} Please check your repository URL and access token.`);
        setBranches([]);
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to connect to the repository. ${err instanceof Error ? err.message : ''}`);
      setRepository(null);
      setBranches([]);
      setRepoStats(null);
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
    deleteBranch
  };

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
};
