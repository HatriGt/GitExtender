import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GitBranch,
  AlertTriangle,
  ArrowLeftRight,
  Users,
  Tag,
  Milestone,
  FolderKanban,
  HelpCircle,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Branch, Repository } from "@/types/git";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import debounce from 'lodash/debounce';

interface MergeRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceBranch: Branch;
  targetBranches: string[];
  repository: Repository;
  onCreateMergeRequest: (data: {
    title: string;
    description: string;
    sourceBranch: string;
    targetBranch: string;
    reviewers?: string[];
    assignees?: string[];
    labels?: string[];
    projects?: string[];
    milestone?: string;
  }) => Promise<void>;
}

const CHANGE_TYPES = [
  { id: "new-feature", label: "New feature 💡" },
  { id: "bug-fix", label: "Bug fix 🐛" },
  { id: "other", label: "Other (please specify) 🤔" },
];

// Helper function to parse repository URL
const parseRepoUrl = (url: string): { owner: string; name: string } => {
  const cleanUrl = url
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .replace(/\.git$/, '')
    .replace(/^github\.com\//, '');
  
  const parts = cleanUrl.split('/').filter(Boolean);
  
  if (parts.length < 2) {
    throw new Error('Invalid repository URL format');
  }
  
  return {
    owner: parts[parts.length - 2],
    name: parts[parts.length - 1]
  };
};

export const MergeRequestDialog = ({
  isOpen,
  onClose,
  sourceBranch,
  targetBranches,
  repository,
  onCreateMergeRequest,
}: MergeRequestDialogProps) => {
  const [title, setTitle] = useState(sourceBranch.name);
  const [description, setDescription] = useState("");
  const [targetBranch, setTargetBranch] = useState(targetBranches[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canMerge, setCanMerge] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [template, setTemplate] = useState<string | null>(null);

  // Sidebar states
  const [reviewers, setReviewers] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [milestone, setMilestone] = useState<string>("");
  const [availableReviewers, setAvailableReviewers] = useState<any[]>([]);
  const [availableAssignees, setAvailableAssignees] = useState<any[]>([]);
  const [availableLabels, setAvailableLabels] = useState<any[]>([]);
  const [availableMilestones, setAvailableMilestones] = useState<any[]>([]);
  const [availableProjects, setAvailableProjects] = useState<any[]>([]);

  // Add search state for users
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search function for users
  const searchUsers = useCallback(
    debounce(async (query: string) => {
      if (!repository || !query.trim()) return;

      const { owner, name } = parseRepoUrl(repository.url);
      const token = repository.token;

      try {
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        };
        
        if (token) {
          headers.Authorization = `token ${token}`;
        }

        // Search for users in the organization and repository
        const searchResponse = await axios.get(
          `https://api.github.com/search/users?q=${query}+org:${owner}+type:user`,
          { headers }
        );

        // Get repository collaborators to filter search results
        const collaboratorsResponse = await axios.get(
          `https://api.github.com/repos/${owner}/${name}/collaborators`,
          { headers }
        );

        // Filter search results to only include repository collaborators
        const collaboratorLogins = new Set(collaboratorsResponse.data.map((c: any) => c.login));
        const filteredUsers = searchResponse.data.items.filter((user: any) => collaboratorLogins.has(user.login));

        setAvailableReviewers(filteredUsers);
        setAvailableAssignees(filteredUsers);
      } catch (error: any) {
        console.error('Error searching users:', error.response?.data || error.message);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [repository]
  );

  const handleSwapBranches = () => {
    const temp = targetBranch;
    setTargetBranch(sourceBranch.name);
  };

  // Fetch PR template and repository data when dialog opens
  useEffect(() => {
    const fetchData = async () => {
      if (!repository) return;
      
      const { owner, name } = parseRepoUrl(repository.url);
      const token = repository.token;
      
      try {
        const headers: Record<string, string> = {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        };
        
        if (token) {
          headers.Authorization = `token ${token}`;
        }

        // Check common template locations
        const templatePaths = [
          '.github/pull_request_template.md',
          '.github/PULL_REQUEST_TEMPLATE.md',
          'docs/pull_request_template.md',
          'PULL_REQUEST_TEMPLATE.md'
        ];

        for (const path of templatePaths) {
          try {
            const response = await axios.get(
              `https://api.github.com/repos/${owner}/${name}/contents/${path}`,
              { headers: { ...headers, Accept: 'application/vnd.github.raw' } }
            );
            if (response.data) {
              setTemplate(response.data);
              setDescription(response.data);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        try {
          // Fetch repository data in parallel using the correct endpoints
          const [
            membersResponse,
            labelsResponse,
            milestonesResponse,
            projectsResponse
          ] = await Promise.all([
            // Get repository members with push access (potential reviewers)
            axios.get(`https://api.github.com/repos/${owner}/${name}/collaborators?permission=push`, { headers }),
            // Get repository labels
            axios.get(`https://api.github.com/repos/${owner}/${name}/labels?per_page=100`, { headers }),
            // Get open milestones
            axios.get(`https://api.github.com/repos/${owner}/${name}/milestones?state=open&per_page=100`, { headers }),
            // Get repository projects
            axios.get(`https://api.github.com/repos/${owner}/${name}/projects`, { headers })
          ]);

          // Also fetch organization members if it's an org repository
          let orgMembers: any[] = [];
          try {
            const orgResponse = await axios.get(
              `https://api.github.com/orgs/${owner}/members?per_page=100`,
              { headers }
            );
            orgMembers = orgResponse.data;
          } catch (e) {
            // Not an org or no access, ignore
          }

          // Combine repo collaborators and org members for reviewers/assignees
          const allMembers = [...new Map([
            ...membersResponse.data,
            ...orgMembers
          ].map(item => [item.id, item])).values()];

          console.log('API Responses:', {
            members: allMembers,
            labels: labelsResponse.data,
            milestones: milestonesResponse.data,
            projects: projectsResponse.data
          });

          setAvailableReviewers(allMembers);
          setAvailableAssignees(allMembers);
          setAvailableLabels(labelsResponse.data);
          setAvailableMilestones(milestonesResponse.data);
          setAvailableProjects(projectsResponse.data);

        } catch (error: any) {
          console.error('Error fetching repository data:', error.response?.data || error.message);
          toast.error('Failed to fetch repository data. Please check your permissions.');
        }

      } catch (error: any) {
        console.error('Error in fetchData:', error.response?.data || error.message);
        toast.error('Failed to load repository data');
      }
    };

    fetchData();
  }, [isOpen, repository]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a title for the merge request");
      return;
    }

    if (!canMerge) {
      toast.error("Cannot create pull request due to merge conflicts");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateMergeRequest({
        title,
        description,
        sourceBranch: sourceBranch.name,
        targetBranch,
        reviewers,
        assignees,
        labels,
        projects,
        milestone,
      });
      toast.success("Merge request created successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to create merge request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[800px] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Pull Request</DialogTitle>
          <DialogDescription>
            Create a new pull request from {sourceBranch.name} to {targetBranch}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-7 gap-6 flex-grow overflow-hidden">
          {/* Main content - takes 5 columns */}
          <div className="col-span-5 overflow-y-auto pr-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Branch selection */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Select value={targetBranch} onValueChange={setTargetBranch}>
                  <SelectTrigger className="w-[200px]">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      <SelectValue placeholder="Select base branch" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {targetBranches.map((branch) => (
                      <SelectItem key={branch} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleSwapBranches}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <span className="text-sm font-medium">{sourceBranch.name}</span>
                </div>

                {!canMerge && (
                  <div className="flex items-center gap-2 text-destructive ml-auto">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Can't automatically merge.</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter pull request title"
                  required
                />
              </div>

              {/* Description with Write/Preview tabs */}
              <div className="space-y-2">
                <Tabs defaultValue="write" className="w-full">
                  <TabsList>
                    <TabsTrigger value="write">Write</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="write" className="mt-2">
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Leave a comment"
                      rows={15}
                      className="font-mono text-sm"
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-2">
                    <div className="prose dark:prose-invert max-w-none border rounded-md p-4 bg-muted/30">
                      <ReactMarkdown>{description}</ReactMarkdown>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </form>
          </div>

          {/* Sidebar - takes 2 columns */}
          <div className="col-span-2 space-y-6 overflow-y-auto">
            {/* Reviewers */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Reviewers
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for reviewers..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearching(true);
                    searchUsers(e.target.value);
                  }}
                  className="w-full"
                />
                <ScrollArea className="absolute w-full max-h-[200px] mt-1 bg-popover border rounded-md shadow-md z-50">
                  {isSearching ? (
                    <div className="p-2 text-sm text-muted-foreground">Searching...</div>
                  ) : availableReviewers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No users found</div>
                  ) : (
                    availableReviewers.map((reviewer) => (
                      <div
                        key={reviewer.id}
                        className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                        onClick={() => {
                          if (!reviewers.includes(reviewer.login)) {
                            setReviewers([...reviewers, reviewer.login]);
                          }
                        }}
                      >
                        <img
                          src={reviewer.avatar_url}
                          alt={reviewer.login}
                          className="w-5 h-5 rounded-full"
                        />
                        <span>{reviewer.login}</span>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </div>
              {reviewers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {reviewers.map((reviewer) => (
                    <Badge
                      key={reviewer}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {reviewer}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => setReviewers(reviewers.filter(r => r !== reviewer))}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Assignees - Similar to Reviewers */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assignees
              </Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for assignees..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearching(true);
                    searchUsers(e.target.value);
                  }}
                  className="w-full"
                />
                <ScrollArea className="absolute w-full max-h-[200px] mt-1 bg-popover border rounded-md shadow-md z-50">
                  {isSearching ? (
                    <div className="p-2 text-sm text-muted-foreground">Searching...</div>
                  ) : availableAssignees.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No users found</div>
                  ) : (
                    availableAssignees.map((assignee) => (
                      <div
                        key={assignee.id}
                        className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                        onClick={() => {
                          if (!assignees.includes(assignee.login)) {
                            setAssignees([...assignees, assignee.login]);
                          }
                        }}
                      >
                        <img
                          src={assignee.avatar_url}
                          alt={assignee.login}
                          className="w-5 h-5 rounded-full"
                        />
                        <span>{assignee.login}</span>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </div>
              {assignees.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {assignees.map((assignee) => (
                    <Badge
                      key={assignee}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {assignee}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => setAssignees(assignees.filter(a => a !== assignee))}
                      >
                        ×
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Labels */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Labels
              </Label>
              <div className="relative">
                <Select
                  value={labels[0] || "_empty"}
                  onValueChange={(value) => {
                    if (value !== "_empty" && !labels.includes(value)) {
                      setLabels([...labels, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add labels" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLabels.length === 0 ? (
                      <SelectItem value="_empty" disabled>
                        No labels available
                      </SelectItem>
                    ) : (
                      <>
                        <SelectItem value="_empty">
                          Select a label
                        </SelectItem>
                        {availableLabels.map((label) => (
                          <SelectItem
                            key={label.id}
                            value={label.name}
                            disabled={labels.includes(label.name)}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: `#${label.color}` }}
                              />
                              <span>{label.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {labels.map((label) => {
                    const labelData = availableLabels.find(l => l.name === label);
                    return (
                      <Badge
                        key={label}
                        variant="secondary"
                        className="flex items-center gap-1"
                        style={{
                          backgroundColor: labelData ? `#${labelData.color}` : undefined,
                          color: labelData?.color ? '#000000' : undefined
                        }}
                      >
                        {label}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => setLabels(labels.filter(l => l !== label))}
                        >
                          ×
                        </Button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Projects */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Projects
              </Label>
              <Select
                value={projects[0] || "_empty"}
                onValueChange={(value) => {
                  if (value !== "_empty") {
                    setProjects([value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add to project" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No projects available
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="_empty">
                        Select a project
                      </SelectItem>
                      {availableProjects.map((project) => (
                        <SelectItem key={project.id} value={project.name}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Milestone */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Milestone className="h-4 w-4" />
                Milestone
              </Label>
              <Select
                value={milestone || "_empty"}
                onValueChange={(value) => {
                  if (value !== "_empty") {
                    setMilestone(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Set milestone" />
                </SelectTrigger>
                <SelectContent>
                  {availableMilestones.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No milestones available
                    </SelectItem>
                  ) : (
                    <>
                      <SelectItem value="_empty">
                        Select a milestone
                      </SelectItem>
                      {availableMilestones.map((ms) => (
                        <SelectItem key={ms.id} value={ms.title}>
                          {ms.title}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Development info */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Development</h3>
              <div className="text-sm text-muted-foreground">
                <p>
                  Use{" "}
                  <code className="px-1 py-0.5 bg-muted rounded">
                    closes #issue
                  </code>{" "}
                  to automatically close issues
                </p>
              </div>
            </div>

            {/* Helpful resources */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Helpful resources
              </h3>
              <ul className="text-sm text-primary space-y-1">
                <li>
                  <a href="#" className="hover:underline">
                    GitHub Community Guidelines
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !canMerge}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Creating..." : "Create pull request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 