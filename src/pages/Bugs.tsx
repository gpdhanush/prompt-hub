import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, AlertCircle, X, Upload, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, bugSeverityMap, bugStatusMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { bugsApi, tasksApi, usersApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { logger } from "@/lib/logger";

export default function Bugs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBug, setSelectedBug] = useState<any>(null);
  const [bugForm, setBugForm] = useState({
    taskId: undefined as string | undefined,
    title: "",
    description: "",
    severity: "Low",
    status: "Open",
    assigned_to: "",
    stepsToReproduce: "",
    expectedBehavior: "",
    actualBehavior: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Get current user info for role-based permissions
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const currentUserId = currentUser?.id;
  
  // Use permission-based checks instead of hardcoded roles
  const { hasPermission } = usePermissions();
  const canCreateBug = hasPermission('bugs.create');
  const canEditBug = hasPermission('bugs.edit');
  const canDeleteBug = hasPermission('bugs.delete');
  // Note: canUpdateStatus is role-specific and may need separate permission if needed
  const canUpdateStatus = hasPermission('bugs.edit'); // Using edit permission for status updates

  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch bugs from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['bugs', searchQuery, statusFilter, viewFilter, page],
    queryFn: () => bugsApi.getAll({ page, limit, my_bugs: viewFilter === 'my' ? currentUserId : undefined }),
  });

  // Fetch tasks for dropdown
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll({ page: 1, limit: 100 }),
  });

  // Fetch assignable users for assignment dropdown (all authenticated users can access this)
  const { data: assignableUsersData } = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () => usersApi.getAssignable(),
  });

  const bugs = data?.data || [];
  const pagination = data?.pagination || { total: 0, totalPages: 0 };
  const tasks = tasksData?.data || [];
  const assignableUsers = assignableUsersData?.data || [];

  // Fetch bug by ID if edit parameter is in URL
  const editBugId = searchParams.get('edit');
  const { data: editBugData } = useQuery({
    queryKey: ['bug', editBugId],
    queryFn: () => bugsApi.getById(Number(editBugId)),
    enabled: !!editBugId,
  });

  // Create bug mutation
  const createBugMutation = useMutation({
    mutationFn: (formData: FormData) => bugsApi.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs'] });
      toast({ title: "Success", description: "Bug reported successfully." });
      setShowEditDialog(false);
      setBugForm({
        taskId: undefined,
        title: "",
        description: "",
        severity: "Low",
        status: "Open",
        assigned_to: "",
        stepsToReproduce: "",
        expectedBehavior: "",
        actualBehavior: "",
      });
      setAttachments([]);
    },
    onError: (error: any) => {
      logger.error('Error creating bug:', error);
      if (error.status === 401) {
        toast({ 
          title: "Authentication Required", 
          description: "Please login to continue.",
          variant: "destructive",
        });
        window.location.href = '/login';
      } else if (error.status === 403) {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to create bugs.",
          variant: "destructive",
        });
      } else {
        const errorMessage = error.message || error.error || "Failed to report bug. Please check the console for details.";
        toast({ 
          title: "Error", 
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  // Update bug mutation
  const updateBugMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => bugsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs'] });
      toast({ title: "Success", description: "Bug updated successfully." });
      setShowEditDialog(false);
      setShowStatusDialog(false);
      setSelectedBug(null);
      setBugForm({
        taskId: undefined,
        title: "",
        description: "",
        severity: "Low",
        status: "Open",
        assigned_to: "",
        stepsToReproduce: "",
        expectedBehavior: "",
        actualBehavior: "",
      });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({ 
          title: "Authentication Required", 
          description: "Please login to continue.",
          variant: "destructive",
        });
        window.location.href = '/login';
      } else if (error.status === 403) {
        toast({ 
          title: "Access Denied", 
          description: error.message || "You don't have permission to update bugs.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to update bug." });
      }
    },
  });

  // Delete bug mutation
  const deleteBugMutation = useMutation({
    mutationFn: bugsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs'] });
      toast({ title: "Success", description: "Bug deleted successfully." });
      setShowDeleteDialog(false);
      setSelectedBug(null);
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({ 
          title: "Authentication Required", 
          description: "Please login to continue.",
          variant: "destructive",
        });
        window.location.href = '/login';
      } else if (error.status === 403) {
        toast({ 
          title: "Access Denied", 
          description: "You don't have permission to delete bugs.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message || "Failed to delete bug." });
      }
    },
  });

  // Handlers
  const handleView = (bug: any) => {
    navigate(`/bugs/${bug.id}`);
  };

  const handleEdit = useCallback((bug: any) => {
    setSelectedBug(bug);
    // Parse description to extract title if it contains title\n\ndescription format
    const descParts = bug.description?.split('\n\n') || [];
    const bugTitle = descParts.length > 1 ? descParts[0] : '';
    const bugDescription = descParts.length > 1 ? descParts.slice(1).join('\n\n') : bug.description || '';
    
    setBugForm({
      taskId: bug.task_id?.toString(),
      title: bugTitle,
      description: bugDescription,
      severity: bug.severity || "Low",
      status: bug.status || "Open",
      assigned_to: bug.assigned_to?.toString() || "",
      stepsToReproduce: bug.steps_to_reproduce || "",
      expectedBehavior: bug.expected_behavior || "",
      actualBehavior: bug.actual_behavior || "",
    });
    setShowEditDialog(true);
  }, []);

  // Handle edit parameter from URL
  useEffect(() => {
    if (editBugId && editBugData?.data) {
      const bug = editBugData.data;
      handleEdit(bug);
      // Remove edit parameter from URL
      setSearchParams((params) => {
        params.delete('edit');
        return params;
      });
    }
  }, [editBugId, editBugData, handleEdit, setSearchParams]);

  // Handle edit parameter from URL
  useEffect(() => {
    if (editBugId && editBugData?.data) {
      const bug = editBugData.data;
      handleEdit(bug);
      // Remove edit parameter from URL
      setSearchParams((params) => {
        params.delete('edit');
        return params;
      });
    }
  }, [editBugId, editBugData]);

  const handleStatusUpdate = (bug: any) => {
    setSelectedBug(bug);
    setBugForm({ ...bugForm, status: bug.status || "Open", assigned_to: bug.assigned_to?.toString() || "" });
    setShowStatusDialog(true);
  };

  const handleDelete = (bug: any) => {
    setSelectedBug(bug);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedBug) {
      deleteBugMutation.mutate(selectedBug.id);
    }
  };

  const formatFullDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", { 
      year: "numeric",
      month: "long", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleUpdateBug = () => {
    if (!selectedBug) return;
    
    // Handle assigned_to: convert empty string to null, otherwise parse as integer
    const assignedToValue = bugForm.assigned_to && bugForm.assigned_to !== '' && bugForm.assigned_to !== '__none__' 
      ? parseInt(bugForm.assigned_to) 
      : null;
    
    logger.debug('Updating bug:', {
      id: selectedBug.id,
      assigned_to: bugForm.assigned_to,
      assignedToValue: assignedToValue,
      userRole: userRole
    });
    
    // Developer, Designer, Tester can only update status and assigned_to
    // Admin, Team Lead, Super Admin can update all fields
    if (canUpdateStatus) {
      // Developer, Designer, Tester: only update status and assigned_to
      updateBugMutation.mutate({
        id: selectedBug.id,
        data: {
          status: bugForm.status,
          assigned_to: assignedToValue,
        },
      });
    } else {
      // Admin, Team Lead, Super Admin: update all fields
      updateBugMutation.mutate({
        id: selectedBug.id,
        data: {
          title: bugForm.title,
          description: bugForm.description,
          severity: bugForm.severity,
          status: bugForm.status,
          assigned_to: assignedToValue,
        },
      });
    }
  };

  const handleUpdateStatus = () => {
    if (!selectedBug) return;
    
    updateBugMutation.mutate({
      id: selectedBug.id,
      data: {
        status: bugForm.status,
      },
    });
  };

  // Allowed file types: images and documents (PDF, Word, PPT, RTF)
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedDocTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/rtf',
    'text/rtf'
  ];
  const allowedTypes = [...allowedImageTypes, ...allowedDocTypes];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach((file) => {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(`${file.name} - Invalid file type`);
        return;
      }
      
      // Check file size
      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name} - File too large (max 10MB)`);
        return;
      }
      
      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid Files",
        description: invalidFiles.join(', '),
        variant: "destructive",
      });
    }

    setAttachments((prev) => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReportBug = () => {
    if (!bugForm.title || !bugForm.description) {
      toast({
        title: "Validation Error",
        description: "Title and description are required",
        variant: "destructive",
      });
      return;
    }

    // Create FormData for multipart/form-data request
    const formData = new FormData();
    
    // Add form fields
    if (bugForm.taskId) {
      formData.append('task_id', bugForm.taskId);
    }
    formData.append('title', bugForm.title);
    formData.append('description', bugForm.description);
    formData.append('severity', bugForm.severity);
    formData.append('status', 'Open');
    // Always send assigned_to, even if empty (backend will handle null)
    formData.append('assigned_to', bugForm.assigned_to || '');
    if (bugForm.stepsToReproduce) {
      formData.append('steps_to_reproduce', bugForm.stepsToReproduce);
    }
    if (bugForm.expectedBehavior) {
      formData.append('expected_behavior', bugForm.expectedBehavior);
    }
    if (bugForm.actualBehavior) {
      formData.append('actual_behavior', bugForm.actualBehavior);
    }
    
    // Add attachments
    attachments.forEach((file) => {
      formData.append('attachments', file);
    });
    
    createBugMutation.mutate(formData);
  };

  // Filter bugs based on search query and status filter
  const filteredBugs = bugs.filter((bug: any) => {
    const matchesSearch = bug.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.bug_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.id?.toString().includes(searchQuery);
    
    const matchesStatus = statusFilter === "All" || bug.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
   

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            Bug Tracker
          </h1>
          <p className="text-muted-foreground mt-2">
            {userRole === 'Admin' ? 'View and track bugs across projects' : 'Track and resolve bugs across projects'}
          </p>
        </div>
        {canCreateBug && (
          <Button onClick={() => navigate('/bugs/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Report Bug
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter bugs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by bug title, bug code, description, or ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select 
              value={statusFilter || "All"} 
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Fixed">Fixed</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="Reopened">Reopened</SelectItem>
                  <SelectItem value="Fixing">Fixing</SelectItem>
                  <SelectItem value="Retesting">Retesting</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Passed">Passed</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewFilter('all');
                    setPage(1);
                  }}
                >
                  All Bugs
                </Button>
                <Button
                  variant={viewFilter === 'my' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setViewFilter('my');
                    setPage(1);
                  }}
                >
                  My Bugs
                </Button>
              </div>
          </div>
        </CardContent>
      </Card>

      {/* Bugs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bugs ({filteredBugs.length})</CardTitle>
              <CardDescription>List of all bugs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="text-destructive font-semibold mb-2">Error loading bugs</p>
              <p className="text-sm text-muted-foreground">Please check your database connection.</p>
            </div>
          ) : filteredBugs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No bugs found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "All"
                  ? 'Try adjusting your filters'
                  : 'No bugs available'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Bug ID</TableHead>
                    <TableHead>Task ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBugs.map((bug: any) => (
                    <TableRow 
                      key={bug.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/bugs/${bug.id}`)}
                    >
                      <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono text-sm">{bug.bug_code || `BG-${bug.id}`}</span>
                      </TableCell>
                      <TableCell>
                        {bug.task_id ? (
                          <Button
                            variant="link"
                            className="p-0 h-auto font-mono text-sm text-primary hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tasks?task=${bug.task_id}`);
                            }}
                          >
                            #{bug.task_id}
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{bug.title || (bug.description ? bug.description.charAt(0).toUpperCase() + bug.description.slice(1) : '-')}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={bug.severity === 'Critical' ? 'error' : bug.severity === 'High' ? 'warning' : bug.severity === 'Medium' ? 'info' : 'neutral'}>
                          {bug.severity || 'Low'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={bugStatusMap[bug.status] || 'default'}>
                          {bug.status || 'Open'}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(bug)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {canEditBug && (
                              <DropdownMenuItem onClick={() => navigate(`/bugs/${bug.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDeleteBug && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(bug)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {filteredBugs.length > 0 && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} bugs
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="page-limit" className="text-sm text-muted-foreground">
                    Rows per page:
                  </Label>
                  <Select
                    value={limit.toString()}
                    onValueChange={(value) => {
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20" id="page-limit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Bug Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bug Details</DialogTitle>
            <DialogDescription>
              View bug information and details
            </DialogDescription>
          </DialogHeader>
          {selectedBug && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Bug ID</Label>
                <div className="font-mono text-sm">{selectedBug.bug_code || `BG-${selectedBug.id}`}</div>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Description</Label>
                <div className="text-sm whitespace-pre-wrap">{selectedBug.description ? selectedBug.description.charAt(0).toUpperCase() + selectedBug.description.slice(1) : "No description"}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Severity</Label>
                  <StatusBadge variant={bugSeverityMap[selectedBug.severity] || 'default'}>
                    {selectedBug.severity || 'Low'}
                  </StatusBadge>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Status</Label>
                  <StatusBadge variant={bugStatusMap[selectedBug.status] || 'default'}>
                    {selectedBug.status || 'Open'}
                  </StatusBadge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Reported By</Label>
                  <div className="text-sm">{selectedBug.reported_by_name || '-'}</div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Assigned To</Label>
                  <div className="text-sm">{selectedBug.assigned_to_name || '-'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Created By</Label>
                  <div className="text-sm">
                    {selectedBug.reported_by_name || 'N/A'}
                    {selectedBug.created_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatFullDate(selectedBug.created_at)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Last Updated By</Label>
                  <div className="text-sm">
                    {selectedBug.updated_by_name || selectedBug.reported_by_name || 'N/A'}
                    {selectedBug.updated_at && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatFullDate(selectedBug.updated_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {selectedBug.steps_to_reproduce && (
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Steps to Reproduce</Label>
                  <div className="text-sm whitespace-pre-wrap">{selectedBug.steps_to_reproduce}</div>
                </div>
              )}
              {selectedBug.expected_behavior && (
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Expected Behavior</Label>
                  <div className="text-sm whitespace-pre-wrap">{selectedBug.expected_behavior}</div>
                </div>
              )}
              {selectedBug.actual_behavior && (
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Actual Behavior</Label>
                  <div className="text-sm whitespace-pre-wrap">{selectedBug.actual_behavior}</div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowViewDialog(false)}
                >
                  Close
                </Button>
                {canEditBug && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setShowViewDialog(false);
                      handleEdit(selectedBug);
                    }}
                  >
                    Edit Bug
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Bug Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Bug</DialogTitle>
            <DialogDescription>
              Update bug information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Only Admin, Team Lead, Super Admin can edit title, description, and severity */}
            {!canUpdateStatus && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-bug-title">Bug Title *</Label>
                  <Input
                    id="edit-bug-title"
                    placeholder="Brief description of the bug"
                    value={bugForm.title}
                    onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-bug-description">Description *</Label>
                  <Textarea
                    id="edit-bug-description"
                    placeholder="Detailed description of the bug"
                    value={bugForm.description}
                    onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-bug-severity">Severity</Label>
                  <Select
                    value={bugForm.severity}
                    onValueChange={(value) => setBugForm({ ...bugForm, severity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Minor">Minor</SelectItem>
                      <SelectItem value="Major">Major</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {/* All users can update status and assigned_to */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-bug-status">Status</Label>
                <Select
                  value={bugForm.status}
                  onValueChange={(value) => setBugForm({ ...bugForm, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Duplicate">Duplicate</SelectItem>
                    <SelectItem value="Not a Bug">Not a Bug</SelectItem>
                    <SelectItem value="TBD">TBD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-bug-assigned-to">Assign To</Label>
                <Select
                  value={bugForm.assigned_to || undefined}
                  onValueChange={(value) => setBugForm({ ...bugForm, assigned_to: value === "__none__" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {assignableUsers.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEditDialog(false);
                  setSelectedBug(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateBug}
                disabled={updateBugMutation.isPending}
              >
                {updateBugMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog (for Developer, Designer, and Tester) */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Bug Status</DialogTitle>
            <DialogDescription>
              Update the status of this bug
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="status-bug-status">Status</Label>
              <Select
                value={bugForm.status}
                onValueChange={(value) => setBugForm({ ...bugForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Fixing">Fixing</SelectItem>
                  <SelectItem value="Retesting">Retesting</SelectItem>
                  <SelectItem value="Passed">Passed</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Duplicate">Duplicate</SelectItem>
                  <SelectItem value="Not a Bug">Not a Bug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowStatusDialog(false);
                  setSelectedBug(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdateStatus}
                disabled={updateBugMutation.isPending}
              >
                {updateBugMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the bug{" "}
              <span className="font-semibold">{selectedBug?.bug_code || `BG-${selectedBug?.id}`}</span> and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedBug(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteBugMutation.isPending}
            >
              {deleteBugMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

