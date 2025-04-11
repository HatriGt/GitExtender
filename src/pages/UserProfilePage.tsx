import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, Star, GitFork, Eye, Building2, User, Search, Filter, SortAsc, SortDesc, Github, ExternalLink, Calendar, Clock, Code2, Globe, Mail, Link2, Twitter, CodeIcon } from "lucide-react";
import { toast } from "sonner";
import { useRepository } from "@/contexts/RepositoryContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Repository {
  name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string;
  html_url: string;
}

interface UserProfile {
  login: string;
  name: string;
  avatar_url: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  html_url: string;
  type: 'User' | 'Organization';
  location?: string;
  email?: string;
  blog?: string;
  twitter_username?: string;
}

const UserProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { repository, connectRepository } = useRepository();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"updated" | "stars" | "forks">("updated");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [token, setToken] = useState<string>("");
  const [isOrganization, setIsOrganization] = useState<boolean | null>(null);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  useEffect(() => {
    const storedToken = localStorage.getItem('github_token');
    const storedProfileType = localStorage.getItem('profile_type');
    const lastVisitedProfile = localStorage.getItem('last_visited_profile');
    
    // If we have a token but no profile type, or if this is a new profile, show the form
    if (!storedProfileType || lastVisitedProfile !== username) {
      setShowTokenForm(true);
      if (storedToken) {
        setToken(storedToken);
      }
      return;
    }

    // If we have both token and profile type, and it's the same profile, fetch data
    if (storedToken && storedProfileType && lastVisitedProfile === username) {
      setToken(storedToken);
      setIsOrganization(storedProfileType === 'org');
      fetchUserData(storedToken, storedProfileType === 'org');
    } else {
      setShowTokenForm(true);
    }
  }, [username]);

  const fetchUserData = async (tokenToUse: string, isOrg: boolean) => {
    try {
      setLoading(true);
      
      // Ensure username is clean and doesn't contain github.com
      const cleanUsername = username?.replace(/^github\.com\//, '').replace(/\/$/, '');
      
      if (!cleanUsername) {
        throw new Error("Invalid username");
      }

      const profileEndpoint = isOrg 
        ? `https://api.github.com/orgs/${cleanUsername}`
        : `https://api.github.com/users/${cleanUsername}`;
      
      const reposEndpoint = isOrg
        ? `https://api.github.com/orgs/${cleanUsername}/repos?sort=updated&per_page=100`
        : `https://api.github.com/users/${cleanUsername}/repos?sort=updated&per_page=100`;

      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Authorization': `Bearer ${tokenToUse}`
      };

      const [profileRes, reposRes] = await Promise.all([
        fetch(profileEndpoint, { headers }),
        fetch(reposEndpoint, { headers })
      ]);

      if (!profileRes.ok) {
        if (profileRes.status === 404) {
          throw new Error(`${isOrg ? 'Organization' : 'User'} not found`);
        } else if (profileRes.status === 401) {
          throw new Error("Authentication failed. Please check your access token.");
        }
        throw new Error("Failed to fetch profile data");
      }

      if (!reposRes.ok) {
        if (reposRes.status === 401) {
          throw new Error("Authentication failed. Please check your access token.");
        }
        throw new Error("Failed to fetch repositories");
      }

      const profileData = await profileRes.json();
      const reposData = await reposRes.json();

      setProfile(profileData);
      setRepositories(reposData);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch profile data");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast.error("Please enter a valid token");
      return;
    }
    if (isOrganization === null) {
      toast.error("Please select a profile type");
      return;
    }
    
    // Store token and profile type in localStorage
    localStorage.setItem('github_token', token);
    localStorage.setItem('profile_type', isOrganization ? 'org' : 'user');
    localStorage.setItem('last_visited_profile', username || '');
    
    await fetchUserData(token, isOrganization);
    setShowTokenForm(false);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const filteredAndSortedRepos = useMemo(() => {
    return repositories
      .filter(repo => 
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      )
      .sort((a, b) => {
        if (sortBy === "stars") {
          return sortOrder === "desc" ? b.stargazers_count - a.stargazers_count : a.stargazers_count - b.stargazers_count;
        } else if (sortBy === "forks") {
          return sortOrder === "desc" ? b.forks_count - a.forks_count : a.forks_count - b.forks_count;
        } else {
          // Default to updated date sorting
          return 0; // We don't have the updated_at field in our current interface
        }
      });
  }, [repositories, searchQuery, sortBy, sortOrder]);

  const handleRepoClick = async (repoName: string) => {
    if (!username) {
      console.error("No username found in URL");
      return;
    }

    try {
      setIsNavigating(true);
      // Clean the username
      const cleanUsername = username.replace(/^github\.com\//, '').replace(/\/$/, '');
      
      // First, fetch the repository's branches
      const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Authorization': `Bearer ${token}`
      };

      const branchesResponse = await fetch(
        `https://api.github.com/repos/${cleanUsername}/${repoName}/branches`,
        { headers }
      );

      if (!branchesResponse.ok) {
        throw new Error('Failed to fetch repository branches');
      }

      const branches = await branchesResponse.json();
      const branchNames = branches.map((branch: { name: string }) => branch.name);

      // Create default branch mapping based on existing branches
      const defaultBranches = {
        development: branchNames.includes('Development') ? 'Development' : branchNames[0],
        quality: branchNames.includes('Quality') ? 'Quality' : branchNames[0],
        production: branchNames.includes('Production') ? 'Production' : branchNames[0]
      };
      
      // Connect the repository with actual branch names
      await connectRepository(
        `https://github.com/${cleanUsername}/${repoName}`,
        token,
        defaultBranches
      );

      // Navigate to the repository page
      navigate(`/${cleanUsername}/${repoName}`);
    } catch (error) {
      console.error("Failed to connect repository:", error);
      toast.error("Failed to connect to repository");
      setIsNavigating(false);
    }
  };

  if (showTokenForm) {
    return (
      <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Navbar />
        <main className="flex-1 container py-6">
          <div className="max-w-md mx-auto mt-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card p-8 rounded-lg shadow-lg"
            >
              <h2 className="text-2xl font-bold mb-4">GitHub Access</h2>
              <p className="text-muted-foreground mb-6">
                Please enter your GitHub Personal Access Token and select the profile type.
                This information will be stored locally in your browser.
              </p>
              <form onSubmit={handleTokenSubmit}>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>GitHub Token</Label>
                    <Input
                      type="password"
                      placeholder="Enter your GitHub token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Profile Type</Label>
                    <RadioGroup
                      value={isOrganization ? "org" : "user"}
                      onValueChange={(value) => setIsOrganization(value === "org")}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="user" id="user" />
                        <Label htmlFor="user">User</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="org" id="org" />
                        <Label htmlFor="org">Organization</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <Button type="submit" className="w-full">
                    Connect
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Navbar />
        <main className="flex-1 container py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-4 mb-8">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen flex flex-col relative overflow-hidden",
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950' 
        : 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200'
    )}>
      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className={cn(
          "absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-spin-slow",
          theme === 'dark'
            ? 'bg-gradient-to-r from-violet-500/20 via-transparent to-blue-500/20'
            : 'bg-gradient-to-r from-violet-400/10 via-transparent to-blue-400/10'
        )} />
        <div className={cn(
          "absolute -top-1/2 -right-1/2 w-[200%] h-[200%] animate-spin-slow-reverse",
          theme === 'dark'
            ? 'bg-gradient-to-r from-rose-500/10 via-transparent to-indigo-500/10'
            : 'bg-gradient-to-r from-rose-400/5 via-transparent to-indigo-400/5'
        )} />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className={cn(
          "absolute inset-0",
          theme === 'dark'
            ? 'bg-gradient-to-b from-slate-900/80 via-slate-900/50 to-slate-900/80'
            : 'bg-gradient-to-b from-slate-50/80 via-slate-50/50 to-slate-50/80'
        )} />
      </div>

      <Navbar />
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-lg font-medium">Connecting to repository...</p>
              <Progress value={undefined} className="w-48 mx-auto" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-1 container py-6 relative z-10">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="max-w-7xl mx-auto"
        >
          {/* Hero Section */}
          <motion.div variants={item} className="mb-8">
            <Card className="overflow-hidden relative border-0 shadow-xl bg-background/30 backdrop-blur-sm">
              <div className="relative">
                <div className={cn(
                  "h-48",
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-violet-500/30 via-blue-500/20 to-transparent' 
                    : 'bg-gradient-to-r from-violet-400/20 via-blue-400/10 to-transparent'
                )} />
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
                <div className="absolute -bottom-16 left-8">
                  <Avatar className="h-32 w-32 border-4 border-background shadow-lg ring-4 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.login} />
                    <AvatarFallback>{profile?.login?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <CardContent className="pt-20">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                        {profile?.name || profile?.login}
                      </h1>
                      {isOrganization ? (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Organization
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          User
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground max-w-2xl">{profile?.bio}</p>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined GitHub
                      </div>
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        {profile?.location || 'Location not specified'}
                      </div>
                      {profile?.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {profile.email}
                        </div>
                      )}
                      {profile?.blog && (
                        <div className="flex items-center gap-1">
                          <Link2 className="h-4 w-4" />
                          <a href={profile.blog} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                            Website
                          </a>
                        </div>
                      )}
                      {profile?.twitter_username && (
                        <div className="flex items-center gap-1">
                          <Twitter className="h-4 w-4" />
                          <a 
                            href={`https://twitter.com/${profile.twitter_username}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors"
                          >
                            @{profile.twitter_username}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" asChild className="bg-background/30 backdrop-blur-sm">
                      <a href={profile?.html_url} target="_blank" rel="noopener noreferrer">
                        <Github className="mr-2 h-4 w-4" />
                        View on GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Section */}
          <motion.div variants={item} className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:shadow-lg transition-all duration-300 bg-background/30 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Repositories</p>
                      <p className="text-2xl font-bold">{profile?.public_repos}</p>
                    </div>
                    <div className="p-3 rounded-full bg-violet-500/10">
                      <GitBranch className="h-6 w-6 text-violet-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300 bg-background/30 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Followers</p>
                      <p className="text-2xl font-bold">{profile?.followers}</p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-500/10">
                      <User className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300 bg-background/30 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Following</p>
                      <p className="text-2xl font-bold">{profile?.following}</p>
                    </div>
                    <div className="p-3 rounded-full bg-cyan-500/10">
                      <User className="h-6 w-6 text-cyan-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Repositories Section */}
          <motion.div variants={item}>
            <Card className="bg-background/30 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <CardTitle className="bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                      Repositories
                    </CardTitle>
                    <CardDescription>Browse and manage your repositories</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search repositories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 bg-background/30"
                      />
                    </div>
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as "updated" | "stars" | "forks")}>
                      <SelectTrigger className="w-[180px] bg-background/30">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="updated">Last updated</SelectItem>
                        <SelectItem value="stars">Stars</SelectItem>
                        <SelectItem value="forks">Forks</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                      className="bg-background/30"
                    >
                      {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAndSortedRepos.map((repo) => (
                      <Card 
                        key={repo.name} 
                        className="hover:shadow-lg transition-all duration-300 group bg-background/30 backdrop-blur-sm"
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {repo.name}
                            </CardTitle>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => window.open(`https://github.dev/${username}/${repo.name}`, '_blank')}
                                      className="h-8 w-8"
                                    >
                                      <Code2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Open in github.dev editor</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRepoClick(repo.name)}
                                      className="h-8 w-8"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>View repository</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          <CardDescription className="line-clamp-2">{repo.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {repo.language && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Code2 className="h-3 w-3" />
                                {repo.language}
                              </Badge>
                            )}
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {repo.stargazers_count}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <GitFork className="h-3 w-3" />
                              {repo.forks_count}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {repo.watchers_count}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default UserProfilePage; 