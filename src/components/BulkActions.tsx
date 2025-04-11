
import { useState } from "react";
import { useRepository } from "@/contexts/RepositoryContext";
import { Button } from "@/components/ui/button";
import { 
  GitMerge, 
  Trash2,
  Check,
  ChevronDown,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export const BulkActions = () => {
  const { selectedBranches, createPullRequest, deleteBranch, repository } = useRepository();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleBulkMerge = (targetBranch: string) => {
    if (!selectedBranches.length) return;
    
    try {
      // Open multiple browser tabs with PRs
      selectedBranches.forEach(branch => {
        createPullRequest(branch.name, targetBranch);
      });
      
      toast.success(`Opening PR forms for ${selectedBranches.length} branches to ${targetBranch}`);
    } catch (error) {
      toast.error(`Error creating PRs: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  const handleBulkDeleteConfirm = async () => {
    if (!selectedBranches.length) return;
    
    setIsDeleting(true);
    
    const failedBranches: string[] = [];
    const successCount = { value: 0 };
    
    // Delete branches one by one
    for (const branch of selectedBranches) {
      try {
        await deleteBranch(branch.name);
        successCount.value++;
        
        // Show intermediate progress for better UX
        if (selectedBranches.length > 3 && successCount.value % 3 === 0) {
          toast.info(`Deleted ${successCount.value} of ${selectedBranches.length} branches...`);
        }
      } catch (error) {
        console.error(`Failed to delete branch ${branch.name}:`, error);
        failedBranches.push(branch.name);
      }
    }
    
    if (failedBranches.length === 0) {
      toast.success(`Successfully deleted ${selectedBranches.length} branches`);
    } else {
      toast.error(`Failed to delete ${failedBranches.length} branches: ${failedBranches.join(', ')}`);
      if (successCount.value > 0) {
        toast.success(`Successfully deleted ${successCount.value} branches`);
      }
    }
    
    setIsDeleting(false);
    setDeleteDialogOpen(false);
  };

  const allSelectedMerged = selectedBranches.length > 0 && 
    selectedBranches.every(branch => 
      branch.status.every(status => status.isMerged)
    );
    
  const anyUnmergedBranches = selectedBranches.some(branch => 
    !branch.status.every(status => status.isMerged)
  );

  if (selectedBranches.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div 
        className="glass-card p-3 mb-4 shadow-md border rounded-lg bg-card/70 backdrop-blur-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, type: "spring" }}
            >
              <Check className="h-5 w-5 text-gitextender-primary" />
            </motion.div>
            <span className="font-medium">
              {selectedBranches.length} {selectedBranches.length === 1 ? 'branch' : 'branches'} selected
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="py-1 px-3 transition-all duration-200 hover:shadow-md"
                >
                  <GitMerge className="h-4 w-4 mr-2" />
                  Merge To
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="animate-in fade-in-0 zoom-in-95 shadow-lg">
                <DropdownMenuLabel>Target Branch</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem 
                    onClick={() => handleBulkMerge(repository?.defaultBranches.development || 'development')}
                    className="cursor-pointer"
                  >
                    {repository?.defaultBranches.development || 'development'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkMerge(repository?.defaultBranches.quality || 'quality')}
                    className="cursor-pointer"
                  >
                    {repository?.defaultBranches.quality || 'quality'}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkMerge(repository?.defaultBranches.production || 'production')}
                    className="cursor-pointer"
                  >
                    {repository?.defaultBranches.production || 'production'}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="transition-all duration-200 hover:shadow-md"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </motion.div>
      
      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[450px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete {selectedBranches.length} Branches
            </AlertDialogTitle>
            <AlertDialogDescription>
              {anyUnmergedBranches ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Warning: Some branches have unmerged changes</span>
                  </div>
                  <p>
                    Are you sure you want to delete {selectedBranches.length} branches? This action cannot be undone
                    and any unmerged changes will be permanently lost.
                  </p>
                </div>
              ) : (
                <p>
                  Are you sure you want to delete {selectedBranches.length} branches? This action cannot be undone.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDeleteConfirm();
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
                `Delete ${selectedBranches.length} Branches`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
