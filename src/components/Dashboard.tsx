import { useState, useEffect } from "react";
import { useRepository } from "@/contexts/RepositoryContext";
import { BranchTable } from "./BranchTable";
import { BulkActions } from "./BulkActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  AlertCircle,
  GitBranchPlus, 
  RefreshCw, 
  Settings2, 
  Database,
  GitMergeIcon,
  GitPullRequestIcon,
  GitCommitIcon,
  Users,
  Calendar,
  Hash,
  BookOpen,
  Star,
  GitFork,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/contexts/ThemeContext";
import { Badge } from "@/components/ui/badge";
import { format, formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Dashboard = () => {
  const { 
    repository, 
    branches, 
    loading, 
    error, 
    fetchBranches, 
    updateDefaultBranches,
    repoStats,
    readmeContent
  } = useRepository();
  
  const { theme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReadmeOpen, setIsReadmeOpen] = useState(false);
  const [developmentBranch, setDevelopmentBranch] = useState('');
  const [qualityBranch, setQualityBranch] = useState('');
  const [productionBranch, setProductionBranch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('Connecting to repository');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Progress animation for loading state
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev < 15) {
            setLoadingStage('Connecting to repository');
            return prev + 5;
          } else if (prev < 35) {
            setLoadingStage('Fetching branch information');
            return prev + 3;
          } else if (prev < 60) {
            setLoadingStage('Analyzing merge status');
            return prev + 2;
          } else if (prev < 75) {
            setLoadingStage('Processing commit data');
            return prev + 1;
          } else if (prev < 90) {
            setLoadingStage('Preparing interface');
            return prev + 0.5;
          }
          return 90;
        });
      }, 200);
      
      return () => {
        clearInterval(interval);
        setLoadingProgress(100);
        
        setTimeout(() => {
          setLoadingProgress(0);
          setLoadingStage('');
        }, 800);
      };
    }
  }, [loading]);

  // Apply default branch names from repository when component mounts
  useEffect(() => {
    if (repository?.defaultBranches) {
      setDevelopmentBranch(repository.defaultBranches.development);
      setQualityBranch(repository.defaultBranches.quality);
      setProductionBranch(repository.defaultBranches.production);
      setHasUnsavedChanges(false);
    }
  }, [repository?.defaultBranches]);

  // Check for unsaved changes when branch names change
  useEffect(() => {
    if (repository?.defaultBranches) {
      const hasChanges = 
        developmentBranch !== repository.defaultBranches.development ||
        qualityBranch !== repository.defaultBranches.quality ||
        productionBranch !== repository.defaultBranches.production;
      setHasUnsavedChanges(hasChanges);
    }
  }, [developmentBranch, qualityBranch, productionBranch, repository?.defaultBranches]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchBranches();
      toast.success("Branches updated successfully");
    } catch (error) {
      // Error is handled inside fetchBranches
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      return "Unknown date";
    }
  };

  const formatRelativeDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return "Unknown";
    }
  };

  const handleTabChange = (value: string) => {
    if (hasUnsavedChanges) {
      setPendingTab(value);
      setShowUnsavedChangesDialog(true);
    } else {
      setActiveTab(value);
    }
  };

  const handleSaveSettings = async () => {
    try {
      // Update the default branches in the repository context
      await updateDefaultBranches({
        development: developmentBranch,
        quality: qualityBranch,
        production: productionBranch
      });

      // Show success message
      toast.success("Settings saved successfully");
      
      // Reset unsaved changes state
      setHasUnsavedChanges(false);
      
      // Close the settings dialog if it's open
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    }
  };

  const handleDiscardChanges = () => {
    // Reset to original values
    if (repository?.defaultBranches) {
      setDevelopmentBranch(repository.defaultBranches.development);
      setQualityBranch(repository.defaultBranches.quality);
      setProductionBranch(repository.defaultBranches.production);
    }
    setHasUnsavedChanges(false);
    setShowUnsavedChangesDialog(false);
    
    // Switch to the pending tab
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleSaveAndSwitch = async () => {
    try {
      await handleSaveSettings();
      if (pendingTab) {
        setActiveTab(pendingTab);
        setPendingTab(null);
      }
    } catch (error) {
      // Error is already handled in handleSaveSettings
    }
  };

  if (loading) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center min-h-[500px] p-8 rounded-xl bg-gradient-to-br from-card/80 to-background/60 backdrop-blur-md border border-border/50 shadow-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center gap-8 w-full max-w-md">
          <div className="relative w-24 h-24">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="currentColor" 
                className="text-muted/20"
                strokeWidth="8" 
              />
              <motion.circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="currentColor" 
                className="text-primary"
                strokeWidth="8" 
                strokeLinecap="round"
                strokeDasharray="283"
                initial={{ strokeDashoffset: 283 }}
                animate={{ strokeDashoffset: 283 - (loadingProgress / 100) * 283 }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <motion.div 
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.1, 1] }}
              transition={{ duration: 0.8, times: [0, 0.5, 1] }}
            >
              <GitBranchPlus className="h-12 w-12 text-primary" />
            </motion.div>
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-semibold">{loadingStage}</h3>
            <p className="text-muted-foreground">Please wait while we process repository data</p>
          </div>
          
          <div className="w-full space-y-1">
            <Progress value={loadingProgress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Fetching data</span>
              <span>{Math.round(loadingProgress)}%</span>
            </div>
          </div>
          
          <div className="w-full space-y-8 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
            
            <Skeleton className="h-12 w-full" />
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-6 w-36" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
              <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Alert variant="destructive" className="max-w-lg mx-auto shadow-lg border-destructive/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      </motion.div>
    );
  }

  if (!repository || !repository.isConnected) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="branches">Branches</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {repoStats && (
            <>
              <motion.div
                className="col-span-1 md:col-span-3 lg:col-span-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass-card bg-gradient-to-br from-card/90 to-card/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                          {repository?.name}
                          <Badge variant="outline" className="capitalize">
                            {repoStats.visibility || 'public'}
                          </Badge>
                        </CardTitle>
                        {repoStats.description && (
                          <CardDescription className="mt-2">
                            {repoStats.description}
                          </CardDescription>
                        )}
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <BookOpen className="h-4 w-4 mr-2" />
                            View README
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>README.md</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="mt-4 rounded-md border p-4 bg-background">
                            {readmeContent ? (
                              <div className="prose dark:prose-invert max-w-none">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    code({node, inline, className, children, ...props}) {
                                      const match = /language-(\w+)/.exec(className || '');
                                      const language = match ? match[1] : '';
                                      
                                      if (!inline && language) {
                                        return (
                                          <div className="relative rounded-md overflow-hidden my-4">
                                            <div className="absolute top-0 right-0 px-2 py-1 text-xs text-muted-foreground bg-muted/80 rounded-bl">
                                              {language}
                                            </div>
                                            <SyntaxHighlighter
                                              language={language}
                                              style={vscDarkPlus}
                                              customStyle={{
                                                margin: 0,
                                                borderRadius: '0.375rem',
                                              }}
                                              PreTag="div"
                                              {...props}
                                            >
                                              {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                          </div>
                                        );
                                      }
                                      return <code className={className} {...props}>{children}</code>;
                                    },
                                    h1: ({node, ...props}) => (
                                      <h1 
                                        className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-border" 
                                        {...props} 
                                      />
                                    ),
                                    h2: ({node, ...props}) => (
                                      <h2 
                                        className="text-xl font-bold mt-5 mb-3" 
                                        {...props} 
                                      />
                                    ),
                                    h3: ({node, ...props}) => (
                                      <h3 
                                        className="text-lg font-bold mt-4 mb-2" 
                                        {...props} 
                                      />
                                    ),
                                    p: ({node, ...props}) => (
                                      <p 
                                        className="my-4 leading-7" 
                                        {...props} 
                                      />
                                    ),
                                    ul: ({node, ordered, ...props}) => (
                                      <ul 
                                        className="list-disc pl-6 my-4 space-y-2" 
                                        {...props} 
                                      />
                                    ),
                                    ol: ({node, ordered, ...props}) => (
                                      <ol 
                                        className="list-decimal pl-6 my-4 space-y-2" 
                                        {...props} 
                                      />
                                    ),
                                    li: ({node, ...props}) => (
                                      <li 
                                        className="my-1" 
                                        {...props} 
                                      />
                                    ),
                                    a: ({node, ...props}) => (
                                      <a 
                                        className="text-primary hover:underline" 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        {...props} 
                                      />
                                    ),
                                    blockquote: ({node, ...props}) => (
                                      <blockquote 
                                        className="border-l-4 border-primary/30 pl-4 my-6 italic text-muted-foreground"
                                        {...props} 
                                      />
                                    ),
                                    img: ({node, ...props}) => (
                                      <img 
                                        className="max-w-full h-auto rounded-lg my-6"
                                        {...props} 
                                      />
                                    ),
                                    table: ({node, ...props}) => (
                                      <div className="my-6 w-full overflow-x-auto">
                                        <table 
                                          className="min-w-full divide-y divide-border border" 
                                          {...props} 
                                        />
                                      </div>
                                    ),
                                    th: ({node, ...props}) => (
                                      <th 
                                        className="px-4 py-2 bg-muted font-medium text-left border-r last:border-r-0" 
                                        {...props} 
                                      />
                                    ),
                                    td: ({node, ...props}) => (
                                      <td 
                                        className="px-4 py-2 border-t border-r last:border-r-0" 
                                        {...props} 
                                      />
                                    ),
                                    pre: ({node, ...props}) => (
                                      <pre 
                                        className="bg-muted rounded-lg overflow-x-auto" 
                                        {...props} 
                                      />
                                    ),
                                  }}
                                >
                                  {readmeContent}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <div className="text-center text-muted-foreground py-8">
                                No README file found in the repository.
                              </div>
                            )}
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                </Card>
              </motion.div>

              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Card className="glass-card bg-gradient-to-br from-card/90 to-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <GitMergeIcon className="w-4 h-4 text-primary" />
                      Pull Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{repoStats.pullRequests?.open || 0}</div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                      <div className="flex justify-between">
                        <span>Open PRs</span>
                        <Badge variant="outline" className="text-xs">{repoStats.pullRequests?.open || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Closed PRs</span>
                        <Badge variant="outline" className="text-xs">{repoStats.pullRequests?.closed || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Merged PRs</span>
                        <Badge variant="outline" className="text-xs">{repoStats.pullRequests?.merged || 0}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="glass-card bg-gradient-to-br from-card/90 to-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <GitCommitIcon className="w-4 h-4 text-primary" />
                      Commits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{repoStats.totalCommits || "--"}</div>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                    {repoStats.defaultBranch && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Default: {repoStats.defaultBranch}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="glass-card bg-gradient-to-br from-card/90 to-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Contributors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{repoStats.contributors?.length || "--"}</div>
                    <p className="text-xs text-muted-foreground">Active contributors</p>
                    
                    {repoStats.contributors && repoStats.contributors.length > 0 && (
                      <div className="flex -space-x-2 mt-2 overflow-hidden">
                        {repoStats.contributors.slice(0, 5).map((contributor, i) => (
                          <img 
                            key={i}
                            src={contributor.avatar_url} 
                            alt={contributor.login}
                            title={`${contributor.login} (${contributor.contributions} contributions)`}
                            className="w-6 h-6 rounded-full border border-background"
                          />
                        ))}
                        {repoStats.contributors.length > 5 && (
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                            +{repoStats.contributors.length - 5}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="glass-card bg-gradient-to-br from-card/90 to-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {repoStats.lastUpdated && (
                        <div>
                          <div className="text-xs text-muted-foreground">Last updated:</div>
                          <div className="font-medium">{formatRelativeDate(repoStats.lastUpdated)}</div>
                        </div>
                      )}
                      
                      {repoStats.createdAt && (
                        <div>
                          <div className="text-xs text-muted-foreground">Created:</div>
                          <div className="font-medium">{formatDate(repoStats.createdAt)}</div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card bg-gradient-to-br from-card/90 to-card/60 md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Star className="w-4 h-4 text-primary" />
                      Repository Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Stars</div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="font-bold">{repoStats.stars || 0}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Forks</div>
                        <div className="flex items-center gap-1">
                          <GitFork className="w-3 h-3 text-blue-500" />
                          <span className="font-bold">{repoStats.forks || 0}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Issues</div>
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          <span className="font-bold">{repoStats.openIssues || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    {repoStats.language && (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-1">Primary Language</div>
                        <Badge>{repoStats.language}</Badge>
                      </div>
                    )}
                    
                    {repoStats.license && (
                      <div className="mt-3">
                        <div className="text-xs text-muted-foreground mb-1">License</div>
                        <Badge variant="outline">{repoStats.license}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {repoStats.releases && repoStats.releases.length > 0 && (
                  <Card className="glass-card bg-gradient-to-br from-card/90 to-card/60 md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Tag className="w-4 h-4 text-primary" />
                        Latest Releases
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {repoStats.releases.slice(0, 3).map((release: any, i: number) => (
                          <div key={i} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                            <div>
                              <div className="font-medium">{release.name || release.tag_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatRelativeDate(release.published_at)}
                              </div>
                            </div>
                            <Badge variant="secondary">{release.tag_name}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs w-full"
                        onClick={() => window.open(`https://github.com/${repository.owner}/${repository.name}/releases`, '_blank')}
                      >
                        View all releases
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                {repoStats.topics && repoStats.topics.length > 0 && (
                  <Card className="glass-card bg-gradient-to-br from-card/90 to-card/60 col-span-1 md:col-span-3 lg:col-span-4">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Hash className="w-4 h-4 text-primary" />
                        Topics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {repoStats.topics.map((topic, i) => (
                          <Badge key={i} variant="secondary">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="branches" className="space-y-6">
          {branches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Alert className="glass-card shadow-lg border border-border/50">
                <GitBranchPlus className="h-4 w-4" />
                <AlertTitle>No branches found</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>No feature/*, bugfix/*, or hotfix/* branches were found in this repository.</p>
                  <p className="text-sm text-muted-foreground">
                    Make sure your repository contains branches with these prefixes and that you have sufficient access permissions.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefresh}
                    className="transition-all duration-200 hover:shadow-md"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh Branches
                  </Button>
                </AlertDescription>
              </Alert>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <BulkActions />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <BranchTable />
              </motion.div>
            </>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Repository Settings</CardTitle>
              <CardDescription>
                Configure your repository's default branch names and other settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="development-branch">Development Branch Name</Label>
                  <Input
                    id="development-branch"
                    value={developmentBranch}
                    onChange={(e) => setDevelopmentBranch(e.target.value)}
                    placeholder="Development"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="quality-branch">Quality Branch Name</Label>
                  <Input
                    id="quality-branch"
                    value={qualityBranch}
                    onChange={(e) => setQualityBranch(e.target.value)}
                    placeholder="Quality"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="production-branch">Production Branch Name</Label>
                  <Input
                    id="production-branch"
                    value={productionBranch}
                    onChange={(e) => setProductionBranch(e.target.value)}
                    placeholder="Production"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <Button onClick={handleSaveSettings} className="w-full">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in the settings tab. Would you like to save them before switching tabs?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardChanges}>Discard Changes</AlertDialogCancel>
            <AlertDialogAction onClick={handleSaveAndSwitch}>Save Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
