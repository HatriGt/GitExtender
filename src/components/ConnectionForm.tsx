
import { useState, useEffect } from "react";
import { useRepository } from "@/contexts/RepositoryContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, KeyRound, History, ChevronDown, Eye, EyeOff, Clock } from "lucide-react";
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

export const ConnectionForm = () => {
  const { connectRepository, loading, savedRepositories, repository } = useRepository();
  
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Branch naming configuration
  const [developmentBranch, setDevelopmentBranch] = useState("development");
  const [qualityBranch, setQualityBranch] = useState("quality");
  const [productionBranch, setProductionBranch] = useState("production");

  // Load last used repository data if available
  useEffect(() => {
    if (repository) {
      setUrl(repository.url || "");
      setToken(repository.token || "");
      
      if (repository.defaultBranches) {
        setDevelopmentBranch(repository.defaultBranches.development);
        setQualityBranch(repository.defaultBranches.quality);
        setProductionBranch(repository.defaultBranches.production);
      }
    }
  }, [repository]);

  const detectProvider = (url: string): GitProvider | null => {
    if (!url) return null;
    if (url.includes("github.com")) return "github";
    if (url.includes("gitlab.com")) return "gitlab";
    if (url.includes("bitbucket.org")) return "bitbucket";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error("Repository URL is required");
      return;
    }
    
    try {
      await connectRepository(
        url, 
        token || undefined,
        {
          development: developmentBranch,
          quality: qualityBranch,
          production: productionBranch
        }
      );
      toast.success("Repository connected successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect to repository");
    }
  };
  
  const handleSelectSavedRepository = (savedRepo: SavedRepository) => {
    setUrl(savedRepo.url);
    setToken(savedRepo.token || "");
    
    if (savedRepo.defaultBranches) {
      setDevelopmentBranch(savedRepo.defaultBranches.development);
      setQualityBranch(savedRepo.defaultBranches.quality);
      setProductionBranch(savedRepo.defaultBranches.production);
    }
  };

  const provider = detectProvider(url);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="w-full max-w-md mx-auto shadow-lg border border-border/50 bg-card/60 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-2xl font-bold">Connect Repository</CardTitle>
          <CardDescription>
            Enter your Git repository URL and optional access token to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="repository-url">Repository URL</Label>
                
                {savedRepositories.length > 0 && (
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
                    <DropdownMenuContent align="end" className="w-[300px]">
                      <DropdownMenuLabel>Recent Repositories</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {savedRepositories
                        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
                        .map((repo) => (
                          <DropdownMenuItem
                            key={repo.url}
                            onClick={() => handleSelectSavedRepository(repo)}
                            className="flex flex-col items-start"
                          >
                            <span className="font-medium">{repo.owner}/{repo.name}</span>
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
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="repository-url"
                  placeholder="https://github.com/username/repository"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  className="flex-1"
                />
              </div>
              {provider && (
                <p className="text-xs text-muted-foreground mt-1">
                  Detected: {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="access-token">
                Personal Access Token (optional)
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
                Token is needed for private repositories and branch management
              </p>
            </div>
            
            <div className="pt-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full text-sm flex items-center justify-between"
              >
                <span>Advanced Settings</span>
                <ChevronDown className={`h-4 w-4 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
              
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 space-y-4 border rounded-md p-4 bg-muted/30"
                >
                  <div>
                    <Label htmlFor="development-branch" className="text-sm">
                      Development Branch Name
                    </Label>
                    <Input
                      id="development-branch"
                      value={developmentBranch}
                      onChange={(e) => setDevelopmentBranch(e.target.value)}
                      className="mt-1"
                      placeholder="development"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="quality-branch" className="text-sm">
                      Quality Branch Name
                    </Label>
                    <Input
                      id="quality-branch"
                      value={qualityBranch}
                      onChange={(e) => setQualityBranch(e.target.value)}
                      className="mt-1"
                      placeholder="quality"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="production-branch" className="text-sm">
                      Production Branch Name
                    </Label>
                    <Input
                      id="production-branch"
                      value={productionBranch}
                      onChange={(e) => setProductionBranch(e.target.value)}
                      className="mt-1"
                      placeholder="production"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !url.trim()} 
            className="w-full relative overflow-hidden group"
          >
            <span className="absolute inset-0 w-0 bg-white/20 transition-all duration-500 ease-out group-hover:w-full"></span>
            <span className="relative">
              {loading ? "Connecting..." : "Connect Repository"}
            </span>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
