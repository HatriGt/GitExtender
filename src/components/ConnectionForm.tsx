import { useState, useEffect } from "react";
import { useRepository } from "@/contexts/RepositoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, KeyRound, History, ChevronDown, Eye, EyeOff, Clock, User, Building2, X } from "lucide-react";
import { toast } from "sonner";
import { GitProvider, SavedRepository } from "@/types/git";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNowStrict } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";

export const ConnectionForm = () => {
  const { connectRepository, loading, savedRepositories, repository, saveRepository } = useRepository();
  const navigate = useNavigate();
  
  const [input, setInput] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isUsername, setIsUsername] = useState(false);
  const [isOrganization, setIsOrganization] = useState(false);

  // Load last used repository data if available
  useEffect(() => {
    if (repository) {
      setInput(repository.url || "");
      setToken(repository.token || "");
    }
  }, [repository]);

  const detectProvider = (url: string): GitProvider | null => {
    if (!url) return null;
    if (url.includes("github.com")) return "github";
    if (url.includes("gitlab.com")) return "gitlab";
    if (url.includes("bitbucket.org")) return "bitbucket";
    return null;
  };

  const cleanUsername = (input: string): string => {
    // Remove any GitHub URL prefixes
    const cleaned = input
      .replace(/^https?:\/\/(?:www\.)?github\.com\//, '')
      .replace(/^github\.com\//, '')
      .replace(/^@/, '')
      .trim();
    
    // Remove trailing slash if present
    return cleaned.replace(/\/$/, '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Check if input is a username (no slashes or dots, or just github.com URL)
    const cleanedValue = cleanUsername(value);
    const isUsernameInput = /^[a-zA-Z0-9_-]+$/.test(cleanedValue);
    setIsUsername(isUsernameInput);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) {
      toast.error("Input is required");
      return;
    }

    if (isUsername) {
      // Clean the username input
      const cleanedUsername = cleanUsername(input);
      
      // Check if this user/org already exists in saved repositories
      const existingRepo = savedRepositories.find(
        repo => repo.owner === cleanedUsername && 
                repo.type === (isOrganization ? 'organization' : 'user')
      );

      const newRepo: SavedRepository = {
        url: `https://github.com/${cleanedUsername}`,
        name: cleanedUsername,
        owner: cleanedUsername,
        provider: 'github',
        lastUsed: new Date().toISOString(),
        token: token || undefined,
        defaultBranches: {
          development: "Development",
          quality: "Quality",
          production: "Production"
        },
        isOrganization,
        type: isOrganization ? 'organization' : 'user',
        isDeleted: false
      };

      if (existingRepo) {
        // Update the existing entry
        saveRepository({
          ...existingRepo,
          token: token || existingRepo.token,
          lastUsed: new Date().toISOString(),
          isDeleted: false
        });
      } else {
        // Create new entry
        saveRepository(newRepo);
      }
      
      // Store token and type in localStorage
      if (token) {
        localStorage.setItem('github_token', token);
      }
      localStorage.setItem('profile_type', isOrganization ? 'org' : 'user');
      
      // Navigate to user/organization profile page with clean URL
      navigate(`/${cleanedUsername}`);
      return;
    }
    
    try {
      // Check if this repository already exists in saved repositories
      const existingRepo = savedRepositories.find(
        repo => repo.url === input
      );

      const newRepo: SavedRepository = {
        url: input,
        name: input.split('/').pop() || '',
        owner: input.split('/').slice(-2, -1)[0] || '',
        provider: detectProvider(input) || 'github',
        lastUsed: new Date().toISOString(),
        token: token || undefined,
        defaultBranches: {
          development: "Development",
          quality: "Quality",
          production: "Production"
        },
        isOrganization: false,
        type: 'repository'
      };

      if (existingRepo) {
        // Update the existing entry
        saveRepository({
          ...existingRepo,
          token: token || existingRepo.token,
          lastUsed: new Date().toISOString()
        });
      } else {
        // Create new entry
        saveRepository(newRepo);
      }

      await connectRepository(
        input, 
        token || undefined,
        {
          development: "Development",
          quality: "Quality",
          production: "Production"
        }
      );
      toast.success("Repository connected successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect to repository");
    }
  };
  
  const handleSelectSavedRepository = (savedRepo: SavedRepository) => {
    setInput(savedRepo.url);
    setToken(savedRepo.token || "");
    
    if (savedRepo.type === 'repository') {
      setIsUsername(false);
      setIsOrganization(false);
    } else {
      setIsUsername(true);
      setIsOrganization(savedRepo.type === 'organization');
      
      // Store token and type in localStorage
      if (savedRepo.token) {
        localStorage.setItem('github_token', savedRepo.token);
      }
      localStorage.setItem('profile_type', savedRepo.type === 'organization' ? 'org' : 'user');
      
      // Navigate to user/organization profile page
      navigate(`/${savedRepo.owner}`);
    }
  };

  const handleDeleteRecent = (e: React.MouseEvent, repo: SavedRepository) => {
    e.stopPropagation();
    const updatedRepos = savedRepositories.filter(r => r.url !== repo.url);
    saveRepository({
      ...repo,
      lastUsed: new Date().toISOString(),
      isDeleted: true
    });
    toast.success(`${repo.type === 'repository' ? 'Repository' : repo.type === 'organization' ? 'Organization' : 'User'} removed from recents`);
  };

  const provider = detectProvider(input);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="w-full max-w-md mx-auto shadow-lg border border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold">Connect to GitHub</CardTitle>
          <CardDescription>
            Enter a repository URL, username, or organization name to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="input">
                  {isUsername ? (isOrganization ? "Organization Name" : "Username") : "Repository URL"}
                </Label>
                
                {savedRepositories.length > 0 && !isUsername && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 flex items-center gap-1"
                      >
                        <History className="h-3.5 w-3.5" />
                        Recent
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[300px] max-h-[400px] overflow-y-auto">
                      <DropdownMenuLabel>Recent Connections</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {savedRepositories
                        .filter(repo => !repo.isDeleted)
                        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
                        .map((repo) => (
                          <DropdownMenuItem
                            key={repo.url}
                            onClick={() => handleSelectSavedRepository(repo)}
                            className="flex flex-col items-start group"
                          >
                            <div className="flex justify-between w-full items-center">
                              <div className="flex items-center gap-2">
                                {repo.type === 'repository' ? (
                                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                                ) : repo.type === 'organization' ? (
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <User className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span className="font-medium">
                                  {repo.type === 'repository' ? `${repo.owner}/${repo.name}` : repo.owner}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDeleteRecent(e, repo)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {repo.url.length > 40 ? repo.url.substring(0, 40) + '...' : repo.url}
                            </span>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDistanceToNowStrict(new Date(repo.lastUsed), { addSuffix: true })}
                            </div>
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                {isUsername ? (
                  isOrganization ? (
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-muted-foreground" />
                  )
                ) : (
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  id="input"
                  placeholder={isUsername ? (isOrganization ? "organization-name" : "username") : "https://github.com/username/repository"}
                  value={input}
                  onChange={handleInputChange}
                  required
                  className="flex-1"
                />
              </div>
              {!isUsername && provider && (
                <p className="text-xs text-muted-foreground mt-1">
                  Detected: {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </p>
              )}
            </div>

            {isUsername && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="organization-toggle"
                  checked={isOrganization}
                  onCheckedChange={setIsOrganization}
                />
                <Label htmlFor="organization-toggle">Organization Profile</Label>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="access-token">
                Personal Access Token {isUsername ? "(required for private repositories)" : "(optional)"}
              </Label>
              <div className="flex items-center space-x-2 relative">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="access-token"
                  type={showToken ? "text" : "password"}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="flex-1 pr-10"
                />
                <Button 
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showToken ? "Hide token" : "Show token"}</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isUsername 
                  ? "Token is required to view private repositories and organization data"
                  : "Token is needed for private repositories and branch management"}
              </p>
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connecting..." : isUsername ? `View ${isOrganization ? 'Organization' : 'User'} Profile` : "Connect Repository"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};
