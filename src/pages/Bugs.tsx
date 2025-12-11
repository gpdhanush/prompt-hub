import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { bugsApi, tasksApi } from "@/lib/api";

export default function Bugs() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
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
    severity: "Minor",
    status: "Open",
    stepsToReproduce: "",
    expectedBehavior: "",
    actualBehavior: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Get current user info for role-based permissions
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userRole = currentUser?.role || '';
  
  // Tester, Admin, Team Lead, Employee can create, update, and view bugs
  const canCreateBug = (userRole === 'Tester' || userRole === 'Admin' || userRole === 'Team Lead' || userRole === 'Employee' || userRole === 'Super Admin');
  const canEditBug = (userRole === 'Tester' || userRole === 'Admin' || userRole === 'Team Lead' || userRole === 'Employee' || userRole === 'Super Admin');
  // Employee and Tester can only update status
  const canUpdateStatus = (userRole === 'Employee' || userRole === 'Tester');
  const canDeleteBug = (userRole === 'Team Lead' || userRole === 'Super Admin');

  // Fetch bugs from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['bugs', searchQuery],
    queryFn: () => bugsApi.getAll({ page: 1, limit: 100 }),
  });

  // Fetch tasks for dropdown
  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.getAll({ page: 1, limit: 100 }),
  });

  const bugs = data?.data || [];
  const tasks = tasksData?.data || [];

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
        severity: "Minor",
        status: "Open",
        stepsToReproduce: "",
        expectedBehavior: "",
        actualBehavior: "",
      });
      setAttachments([]);
    },
    onError: (error: any) => {
      console.error('Error creating bug:', error);
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
        severity: "Minor",
        status: "Open",
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
    setSelectedBug(bug);
    setShowViewDialog(true);
  };

  const handleEdit = (bug: any) => {
    setSelectedBug(bug);
    // Parse description to extract title if it contains title\n\ndescription format
    const descParts = bug.description?.split('\n\n') || [];
    const bugTitle = descParts.length > 1 ? descParts[0] : '';
    const bugDescription = descParts.length > 1 ? descParts.slice(1).join('\n\n') : bug.description || '';
    
    setBugForm({
      taskId: bug.task_id?.toString(),
      title: bugTitle,
      description: bugDescription,
      severity: bug.severity || "Minor",
      status: bug.status || "Open",
      stepsToReproduce: bug.steps_to_reproduce || "",
      expectedBehavior: bug.expected_behavior || "",
      actualBehavior: bug.actual_behavior || "",
    });
    setShowEditDialog(true);
  };

  const handleStatusUpdate = (bug: any) => {
    setSelectedBug(bug);
    setBugForm({ ...bugForm, status: bug.status || "Open" });
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

  const handleUpdateBug = () => {
    if (!selectedBug) return;
    
    updateBugMutation.mutate({
      id: selectedBug.id,
      data: {
        title: bugForm.title,
        description: bugForm.description,
        severity: bugForm.severity,
        status: bugForm.status,
      },
    });
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
                        <SelectItem value="Minor">Minor</SelectItem>
                        <SelectItem value="Major">Major</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
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
                        severity: "Minor",
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
              {bugs.filter((b: any) => b.status === "Passed" || b.status === "Closed").length}
            </div>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Bugs</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search bugs..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
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
                  <TableRow key={bug.id}>
                    <TableCell className="font-mono text-status-error font-medium">
                      {bug.bug_code || `BG-${bug.id}`}
                    </TableCell>
                    <TableCell className="font-mono text-primary">
                      {bug.task_id ? `#${bug.task_id}` : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {bug.title || bug.description || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {bug.reported_by_name || '-'}
                    </TableCell>
                    <TableCell>
                      {bug.assigned_to_name || '-'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={bugSeverityMap[bug.severity] || 'default'}>
                        {bug.severity || 'Minor'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={bugStatusMap[bug.status] || 'default'}>
                        {bug.status || 'Open'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
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
                          {canUpdateStatus && (
                            <DropdownMenuItem onClick={() => handleStatusUpdate(bug)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Update Status
                            </DropdownMenuItem>
                          )}
                          {canEditBug && !canUpdateStatus && (
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
                <div className="text-sm whitespace-pre-wrap">{selectedBug.description || "No description"}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Severity</Label>
                  <StatusBadge variant={bugSeverityMap[selectedBug.severity] || 'default'}>
                    {selectedBug.severity || 'Minor'}
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
                {canUpdateStatus && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setShowViewDialog(false);
                      handleStatusUpdate(selectedBug);
                    }}
                  >
                    Update Status
                  </Button>
                )}
                {canEditBug && !canUpdateStatus && (
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
            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="In Review">In Review</SelectItem>
                    <SelectItem value="Fixing">Fixing</SelectItem>
                    <SelectItem value="Retesting">Retesting</SelectItem>
                    <SelectItem value="Passed">Passed</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                    <SelectItem value="Duplicate">Duplicate</SelectItem>
                    <SelectItem value="Not a Bug">Not a Bug</SelectItem>
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

      {/* Update Status Dialog (for Employee and Tester) */}
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
