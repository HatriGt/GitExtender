
import { useState } from "react";
import { useRepository } from "@/contexts/RepositoryContext";
import { Branch } from "@/types/git";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  GitBranch, 
  GitMerge, 
  ExternalLink, 
  Trash2, 
  MoreHorizontal, 
  Check,
  X,
  Info,
  AlertTriangle,
  Bug,
  Flame,
  Code,
  Zap
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

// Component to show merge status icon with tooltip
const MergeStatusIcon = ({ status }: { status: { isMerged: boolean, commitsBehind?: number, commitsAhead?: number } }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-center">
            {status.isMerged ? (
              <motion.div
                whileHover={{ scale: 1.2 }}
                transition={{ duration: 0.2 }}
              >
                <Check className="h-5 w-5 text-git-merged" />
              </motion.div>
            ) : (
              <motion.div
                whileHover={{ scale: 1.2 }}
                transition={{ duration: 0.2 }}
              >
                <X className="h-5 w-5 text-git-unmerged" />
              </motion.div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-card border shadow-md">
          <p className="font-medium">
            {status.isMerged 
              ? "Fully merged" 
              : "Not merged"}
          </p>
          {(status.commitsBehind !== undefined && status.commitsAhead !== undefined) && (
            <p className="text-xs text-muted">
              {status.commitsAhead > 0 && `${status.commitsAhead} commit${status.commitsAhead !== 1 ? 's' : ''} ahead. `}
              {status.commitsBehind > 0 && `${status.commitsBehind} commit${status.commitsBehind !== 1 ? 's' : ''} behind.`}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Component for branch type badge
const BranchTypeIcon = ({ type }: { type: Branch["type"] }) => {
  const getTypeIcon = () => {
    switch (type) {
      case "feature":
        return <Code className="h-3.5 w-3.5 mr-1.5" />;
      case "bugfix":
        return <Bug className="h-3.5 w-3.5 mr-1.5" />;
      case "hotfix":
        return <Flame className="h-3.5 w-3.5 mr-1.5" />;
      default:
        return <GitBranch className="h-3.5 w-3.5 mr-1.5" />;
    }
  };
  
  const getTypeClasses = () => {
    switch (type) {
      case "feature":
        return "branch-feature";
      case "bugfix":
        return "branch-bugfix";
      case "hotfix":
        return "branch-hotfix";
      default:
        return "bg-gray-50 text-gray-600 border-gray-300 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700";
    }
  };
  
  return (
    <motion.div 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeClasses()}`}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      {getTypeIcon()}
      {type}
    </motion.div>
  );
};

export const BranchTable = () => {
  const { 
    branches, 
    toggleBranchSelection, 
    areAllBranchesSelected, 
    toggleAllBranchSelection,
    createPullRequest,
    openPullRequestForm,
    deleteBranch,
    repository
  } = useRepository();
  
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterMerged, setFilterMerged] = useState<string | null>(null);
  const [branchDetailOpen, setBranchDetailOpen] = useState(false);
  const [selectedBranchDetail, setSelectedBranchDetail] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleCreatePR = (branch: Branch, targetBranch: string) => {
    createPullRequest(branch.name, targetBranch);
  };

  const handleOpenPR = (branch: Branch, targetBranch: string) => {
    openPullRequestForm(branch.name, targetBranch);
  };

  const handleDeleteConfirmation = (branch: Branch) => {
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  };

  const handleDeleteBranch = async () => {
    if (!branchToDelete) return;
    
    const isMerged = branchToDelete.status.every(s => s.isMerged);
    
    setIsDeleting(true);
    try {
      await deleteBranch(branchToDelete.name);
      toast.success(`Branch ${branchToDelete.name} deleted successfully`);
      setBranchToDelete(null);
      setDeleteDialogOpen(false);
      
      // If we were viewing branch details, close that dialog too
      if (selectedBranchDetail?.id === branchToDelete.id) {
        setBranchDetailOpen(false);
      }
    } catch (error) {
      toast.error(`Failed to delete branch: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredBranches = branches.filter(branch => {
    if (filterType && branch.type !== filterType) return false;
    
    if (filterMerged) {
      const allMerged = branch.status.every(s => s.isMerged);
      const anyMerged = branch.status.some(s => s.isMerged);
      
      if (filterMerged === 'all-merged' && !allMerged) return false;
      if (filterMerged === 'any-merged' && !anyMerged) return false;
      if (filterMerged === 'all-unmerged' && anyMerged) return false;
    }
    
    return true;
  });
  
  const openBranchDetails = (branch: Branch) => {
    setSelectedBranchDetail(branch);
    setBranchDetailOpen(true);
  };

  const tableRowVariants = {
    hidden: { opacity: 0 },
    visible: (i: number) => ({
      opacity: 1,
      transition: { delay: i * 0.05 }
    })
  };

  // Format date with better precision for recent updates
  const formatDate = (date: string) => {
    const dateObj = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `Today at ${format(dateObj, 'h:mm a')}`;
    } else if (diffInHours < 48) {
      return `Yesterday at ${format(dateObj, 'h:mm a')}`;
    } else {
      return formatDistanceToNow(dateObj, { addSuffix: true });
    }
  };

  return (
    <div className="w-full">
      <motion.div 
        className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-xl font-bold">Branches ({filteredBranches.length})</h2>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterType || 'all'} onValueChange={(value) => setFilterType(value === 'all' ? null : value)}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="bugfix">Bugfix</SelectItem>
              <SelectItem value="hotfix">Hotfix</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterMerged || 'all'} onValueChange={(value) => setFilterMerged(value === 'all' ? null : value)}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Filter by merge status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="all-merged">All Merged</SelectItem>
              <SelectItem value="any-merged">Any Merged</SelectItem>
              <SelectItem value="all-unmerged">All Unmerged</SelectItem>
            </SelectContent>
          </Select>
          
          {(filterType || filterMerged) && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 transition-all duration-200 hover:bg-muted" 
              onClick={() => {
                setFilterType(null);
                setFilterMerged(null);
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear filters</span>
            </Button>
          )}
        </div>
      </motion.div>
      
      <motion.div 
        className="rounded-xl border shadow-md overflow-hidden bg-card transition-all duration-300 hover:shadow-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox 
                  checked={areAllBranchesSelected && branches.length > 0} 
                  onCheckedChange={toggleAllBranchSelection}
                />
              </TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">Last Updated</TableHead>
              <TableHead className="hidden md:table-cell">Author</TableHead>
              <TableHead className="text-center">
                {repository?.defaultBranches.development}
              </TableHead>
              <TableHead className="text-center">
                {repository?.defaultBranches.quality}
              </TableHead>
              <TableHead className="text-center">
                {repository?.defaultBranches.production}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBranches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <GitBranch className="h-8 w-8 opacity-20" />
                    <p className="font-medium">No branches found</p>
                    <p className="text-sm">Try changing your filter settings</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredBranches.map((branch, index) => (
                <motion.tr
                  key={branch.id}
                  className="transition-all hover:bg-muted/30 cursor-default"
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={tableRowVariants}
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                >
                  <TableCell>
                    <Checkbox 
                      checked={branch.selected} 
                      onCheckedChange={() => toggleBranchSelection(branch.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <motion.button
                        onClick={() => openBranchDetails(branch)}
                        className="font-medium text-left hover:text-primary hover:underline transition-colors flex items-center gap-1"
                        whileHover={{ x: 2 }}
                        transition={{ duration: 0.2 }}
                      >
                        <GitBranch className="inline-block h-3.5 w-3.5 mr-1 opacity-70" />
                        {branch.name}
                      </motion.button>
                      <div className="md:hidden mt-1 flex flex-wrap gap-1">
                        <BranchTypeIcon type={branch.type} />
                      </div>
                      <div className="md:hidden mt-1 text-xs text-muted-foreground">
                        {formatDate(branch.lastUpdated)}
                        <span className="mx-1">•</span>
                        {branch.author}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <BranchTypeIcon type={branch.type} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap">
                    {formatDate(branch.lastUpdated)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6 border">
                        <AvatarImage src={branch.authorAvatar} alt={branch.author} />
                        <AvatarFallback className="text-xs">
                          {branch.author.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{branch.author}</span>
                    </div>
                  </TableCell>
                  
                  {/* Development status */}
                  <TableCell className="text-center">
                    <MergeStatusIcon 
                      status={branch.status.find(s => s.target === repository?.defaultBranches.development) || { isMerged: false }} 
                    />
                  </TableCell>
                  
                  {/* Quality status */}
                  <TableCell className="text-center">
                    <MergeStatusIcon 
                      status={branch.status.find(s => s.target === repository?.defaultBranches.quality) || { isMerged: false }} 
                    />
                  </TableCell>
                  
                  {/* Production status */}
                  <TableCell className="text-center">
                    <MergeStatusIcon 
                      status={branch.status.find(s => s.target === repository?.defaultBranches.production) || { isMerged: false }} 
                    />
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full hover:bg-primary/10"
                        onClick={() => openBranchDetails(branch)}
                      >
                        <Info className="h-3.5 w-3.5" />
                        <span className="sr-only">View branch details</span>
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 animate-in fade-in-0 zoom-in-95 shadow-md">
                          <DropdownMenuItem 
                            onClick={() => handleCreatePR(branch, repository?.defaultBranches.development || 'development')}
                            className="cursor-pointer"
                          >
                            <GitMerge className="h-4 w-4 mr-2" />
                            Merge to {repository?.defaultBranches.development}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleCreatePR(branch, repository?.defaultBranches.quality || 'quality')}
                            className="cursor-pointer"
                          >
                            <GitMerge className="h-4 w-4 mr-2" />
                            Merge to {repository?.defaultBranches.quality}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleCreatePR(branch, repository?.defaultBranches.production || 'production')}
                            className="cursor-pointer"
                          >
                            <GitMerge className="h-4 w-4 mr-2" />
                            Merge to {repository?.defaultBranches.production}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            onClick={() => handleOpenPR(branch, repository?.defaultBranches.development || 'development')}
                            className="cursor-pointer"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open PR Form
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            onClick={() => handleDeleteConfirmation(branch)}
                            className="text-destructive cursor-pointer group"
                          >
                            <Trash2 className="h-4 w-4 mr-2 group-hover:animate-wiggle" />
                            Delete Branch
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>
      
      {/* Branch details dialog */}
      <Dialog open={branchDetailOpen} onOpenChange={setBranchDetailOpen}>
        <DialogContent className="sm:max-w-[550px] shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <GitBranch className="h-5 w-5" />
              {selectedBranchDetail?.name}
            </DialogTitle>
            <DialogDescription>
              Branch details and merge status
            </DialogDescription>
          </DialogHeader>
          
          {selectedBranchDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Type</h4>
                  <BranchTypeIcon type={selectedBranchDetail.type} />
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-2">Last Updated</h4>
                  <p className="text-sm">
                    <time dateTime={selectedBranchDetail.lastUpdated}>
                      {format(new Date(selectedBranchDetail.lastUpdated), "MMMM d, yyyy")}
                    </time>
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(selectedBranchDetail.lastUpdated), "h:mm a")}
                    </span>
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-2">Author</h4>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 border">
                      <AvatarImage src={selectedBranchDetail.authorAvatar} alt={selectedBranchDetail.author} />
                      <AvatarFallback className="text-xs">
                        {selectedBranchDetail.author.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{selectedBranchDetail.author}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Merge Status</h4>
                <div className="space-y-2">
                  {selectedBranchDetail.status.map((status, index) => (
                    <motion.div 
                      key={status.target} 
                      className="flex items-center justify-between border p-3 rounded-lg shadow-sm hover:shadow-md transition-all"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.1 }}
                    >
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${status.isMerged ? 'bg-git-merged' : 'bg-git-unmerged'}`}></div>
                        <span>{status.target}</span>
                      </div>
                      <div className="flex items-center">
                        {status.isMerged ? (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-800">
                            <Check className="h-3 w-3 mr-1" /> Merged
                          </Badge>
                        ) : (
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-800">
                              <X className="h-3 w-3 mr-1" /> Not merged
                            </Badge>
                            {status.commitsAhead !== undefined && status.commitsBehind !== undefined && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {status.commitsAhead > 0 && <span>{status.commitsAhead} ahead</span>}
                                {status.commitsAhead > 0 && status.commitsBehind > 0 && ', '}
                                {status.commitsBehind > 0 && <span>{status.commitsBehind} behind</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenPR(selectedBranchDetail, repository?.defaultBranches.development || 'development')}
                  className="transition-all duration-200 hover:shadow"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open PR Form
                </Button>
                
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setBranchDetailOpen(false);
                    handleDeleteConfirmation(selectedBranchDetail);
                  }}
                  className="transition-all duration-200 hover:bg-destructive/90"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Branch
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[450px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Branch
            </AlertDialogTitle>
            <AlertDialogDescription>
              {branchToDelete && !branchToDelete.status.every(s => s.isMerged) ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Warning: This branch has unmerged changes</span>
                  </div>
                  <p>
                    Are you sure you want to delete <span className="font-medium">{branchToDelete?.name}</span>? This action cannot be undone
                    and any unmerged changes will be permanently lost.
                  </p>
                </div>
              ) : (
                <p>
                  Are you sure you want to delete <span className="font-medium">{branchToDelete?.name}</span>? This action cannot be undone.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteBranch();
              }}
              className="bg-destructive hover:bg-destructive/90 transition-colors"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                'Delete Branch'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
