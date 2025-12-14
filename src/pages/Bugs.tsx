import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, AlertCircle, X, Upload, FileText, Image as ImageIcon } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
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
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBug, setSelectedBug] = useState<any>(null);
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);
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
    queryKey: ['bugs', searchQuery, viewFilter, page],
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
      setShowReportDialog(false);
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

  const filteredBugs = bugs.filter(
    (bug: any) =>
      (bug.description?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
      (bug.title?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
      (bug.bug_code?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
      (bug.id?.toString().includes(searchQuery) || '')
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-status-error" />
            Bug Tracker
          </h1>
          <p className="text-muted-foreground">
            {userRole === 'Admin' ? 'View and track bugs across projects' : 'Track and resolve bugs across projects'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={viewFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewFilter('all')}
            >
              All Bugs
            </Button>
            <Button
              variant={viewFilter === 'my' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewFilter('my')}
            >
              My Bugs
            </Button>
          </div>
          {canCreateBug && (
          <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
            <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Report Bug
        </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Report New Bug</DialogTitle>
                <DialogDescription>
                  Provide details about the bug and attach supporting documents or images
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="task-id">Task (Optional)</Label>
                  <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !bugForm.taskId && "text-muted-foreground"
                        )}
                      >
                        {bugForm.taskId
                          ? tasks.find((task: any) => task.id.toString() === bugForm.taskId)
                            ? `${tasks.find((task: any) => task.id.toString() === bugForm.taskId)?.task_code || `#${tasks.find((task: any) => task.id.toString() === bugForm.taskId)?.id}`} - ${tasks.find((task: any) => task.id.toString() === bugForm.taskId)?.title}`
                            : "Select task..."
                          : "Select a task (optional)"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search tasks..." />
                        <CommandList>
                          <CommandEmpty>No tasks found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setBugForm({ ...bugForm, taskId: undefined });
                                setTaskPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !bugForm.taskId ? "opacity-100" : "opacity-0"
                                )}
                              />
                              None (No task)
                            </CommandItem>
                            {tasks.map((task: any) => (
                              <CommandItem
                                key={task.id}
                                value={`${task.task_code || task.id} ${task.title}`}
                                onSelect={() => {
                                  setBugForm({ ...bugForm, taskId: task.id.toString() });
                                  setTaskPopoverOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    bugForm.taskId === task.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {task.task_code || `#${task.id}`} - {task.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bug-title">Bug Title *</Label>
                  <Input
                    id="bug-title"
                    placeholder="Brief description of the bug"
                    value={bugForm.title}
                    onChange={(e) => setBugForm({ ...bugForm, title: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bug-description">Description *</Label>
                  <Textarea
                    id="bug-description"
                    placeholder="Detailed description of the bug"
                    value={bugForm.description}
                    onChange={(e) => setBugForm({ ...bugForm, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Select
                      value={bugForm.severity}
                      onValueChange={(value) => setBugForm({ ...bugForm, severity: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assigned-to">Assign To</Label>
                    <Select
                      value={bugForm.assigned_to || undefined}
                      onValueChange={(value) => setBugForm({ ...bugForm, assigned_to: value || "" })}
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
                <div className="grid gap-2">
                  <Label htmlFor="steps">Steps to Reproduce</Label>
                  <Textarea
                    id="steps"
                    placeholder="1. Step one&#10;2. Step two&#10;3. Step three"
                    value={bugForm.stepsToReproduce}
                    onChange={(e) => setBugForm({ ...bugForm, stepsToReproduce: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expected">Expected Behavior</Label>
                  <Textarea
                    id="expected"
                    placeholder="What should happen"
                    value={bugForm.expectedBehavior}
                    onChange={(e) => setBugForm({ ...bugForm, expectedBehavior: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="actual">Actual Behavior</Label>
                  <Textarea
                    id="actual"
                    placeholder="What actually happens"
                    value={bugForm.actualBehavior}
                    onChange={(e) => setBugForm({ ...bugForm, actualBehavior: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="attachments">Attachments (Images & Documents)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="attachments"
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.rtf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <Label htmlFor="attachments" asChild>
                      <Button variant="outline" type="button">
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Files
                      </Button>
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      Max 10MB per file. Images, PDF, Word, PPT, RTF only.
                    </span>
                  </div>
                  {attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border border-border p-2"
                        >
                          <div className="flex items-center gap-2">
                            {allowedImageTypes.includes(file.type) ? (
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <FileText className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="text-sm">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowReportDialog(false);
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
                    }}
                    disabled={createBugMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleReportBug}
                    disabled={createBugMutation.isPending}
                  >
                    {createBugMutation.isPending ? "Reporting..." : "Report Bug"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{bugs.length}</div>
            <p className="text-xs text-muted-foreground">Total Bugs</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-error">
              {bugs.filter((b: any) => b.status === "Open").length}
            </div>
            <p className="text-xs text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">
              {bugs.filter((b: any) => b.status === "Fixing").length}
            </div>
            <p className="text-xs text-muted-foreground">Fixing</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-purple">
              {bugs.filter((b: any) => b.status === "Retesting").length}
            </div>
            <p className="text-xs text-muted-foreground">Retesting</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">
              {bugs.filter((b: any) => b.status === "Completed" || b.status === "Passed" || b.status === "Closed").length}
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Bugs</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search bugs..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bug ID</TableHead>
                <TableHead>Task ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading bugs...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-destructive">
                    Error loading bugs. Please check your database connection.
                  </TableCell>
                </TableRow>
              ) : filteredBugs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No bugs found matching your search.' : 'No bugs found. Report your first bug to get started.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBugs.map((bug: any) => (
                  <TableRow 
                    key={bug.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/bugs/${bug.id}`)}
                  >
                    <TableCell className="font-mono font-bold text-primary" onClick={(e) => e.stopPropagation()}>
                      {bug.bug_code || `BG-${bug.id}`}
                    </TableCell>
                    <TableCell className="font-mono text-primary">
                      {bug.task_id ? (
                        <Button
                          variant="link"
                          className="p-0 h-auto font-mono text-primary hover:underline"
                          onClick={() => navigate(`/tasks?task=${bug.task_id}`)}
                        >
                          #{bug.task_id}
                        </Button>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {bug.title || (bug.description ? bug.description.charAt(0).toUpperCase() + bug.description.slice(1) : '-')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bug.reported_by_name || '-'}
                    </TableCell>
                    <TableCell>
                      {bug.assigned_to_name || '-'}
                    </TableCell>
                  <TableCell>
                      <StatusBadge variant={bugSeverityMap[bug.severity] || 'default'}>
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
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(bug)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                          {canEditBug && (
                            <DropdownMenuItem onClick={() => handleEdit(bug)}>
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
                ))
              )}
            </TableBody>
          </Table>
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              total={pagination.total}
              limit={limit}
            />
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
