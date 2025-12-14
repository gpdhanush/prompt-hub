import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Check, X, Eye, Filter, Calendar, Edit, Trash2, Loader2, User, Clock, CalendarDays, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { StatusBadge, leaveStatusMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { leavesApi, employeesApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";

export default function Leaves() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Get current user info
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const userId = currentUser?.id;
  
  // Use permission-based checks for leave actions
  const { hasPermission } = usePermissions();
  const canAcceptLeaves = hasPermission('leaves.accept') || userRole === 'Super Admin';
  const canRejectLeaves = hasPermission('leaves.reject') || userRole === 'Super Admin';
  const canApproveLeaves = canAcceptLeaves || canRejectLeaves; // Can do either action

  const [leaveForm, setLeaveForm] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const queryClient = useQueryClient();

  // Get current user's employee record ID
  const { data: currentEmployeeData } = useQuery({
    queryKey: ['current-employee', userId],
    queryFn: () => employeesApi.getByUserId(userId!),
    enabled: !!userId,
  });

  const currentEmployeeId = currentEmployeeData?.data?.id;

  // Fetch leaves
  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['leaves', page],
    queryFn: () => leavesApi.getAll({ page, limit }),
  });

  const leaves = leavesData?.data || [];
  const pagination = leavesData?.pagination || { total: 0, totalPages: 0 };
  
  // Helper function to check if current user can approve/reject a leave
  const canApproveRejectLeave = (leave: any) => {
    // If user doesn't have permissions, they can't approve/reject
    if (!canApproveLeaves) return false;
    
    // If leave belongs to current user (TL creating leave for themselves), hide buttons
    if (currentEmployeeId && leave.employee_record_id && currentEmployeeId === leave.employee_record_id) {
      return false;
    }
    
    // For Team Lead leaves, only their reporting person or Super Admin can approve/reject
    const isTeamLeadLeave = leave.employee_role === 'Team Leader' || leave.employee_role === 'Team Lead';
    if (isTeamLeadLeave && userRole !== 'Super Admin') {
      // Check if current user is the reporting person (team lead) of the leave requester
      if (currentEmployeeId && leave.team_lead_id && currentEmployeeId === leave.team_lead_id) {
        return true; // Current user is the reporting person
      }
      return false; // Not the reporting person
    }
    
    return true; // Regular leave or Super Admin
  };

  // Create leave mutation
  const createMutation = useMutation({
    mutationFn: leavesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast({ title: "Success", description: "Leave request submitted successfully." });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to submit leave request.", variant: "destructive" });
    },
  });

  // Update leave mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => leavesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast({ title: "Success", description: "Leave request updated successfully." });
      setShowEditDialog(false);
      setSelectedLeave(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update leave request.", variant: "destructive" });
    },
  });

  // Delete leave mutation
  const deleteMutation = useMutation({
    mutationFn: leavesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast({ title: "Success", description: "Leave request deleted successfully." });
      setShowDeleteDialog(false);
      setSelectedLeave(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete leave request.", variant: "destructive" });
    },
  });

  // Approve/Reject mutation
  const approveRejectMutation = useMutation({
    mutationFn: ({ id, status, rejection_reason }: { id: number; status: string; rejection_reason?: string }) => 
      leavesApi.update(id, { status, approved_by: userId, rejection_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast({ title: "Success", description: "Leave request status updated successfully." });
      setShowRejectDialog(false);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update leave status.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setLeaveForm({
      leave_type: "",
      start_date: "",
      end_date: "",
      reason: "",
    });
  };

  const handleCreate = () => {
    if (!leaveForm.leave_type || !leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    createMutation.mutate(leaveForm);
  };

  const handleEdit = (leave: any) => {
    setSelectedLeave(leave);
    setLeaveForm({
      leave_type: leave.leave_type || "",
      start_date: leave.start_date ? leave.start_date.split('T')[0] : "",
      end_date: leave.end_date ? leave.end_date.split('T')[0] : "",
      reason: leave.reason || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!selectedLeave) return;
    if (!leaveForm.leave_type || !leaveForm.start_date || !leaveForm.end_date || !leaveForm.reason) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: selectedLeave.id, data: leaveForm });
  };

  const handleDelete = (leave: any) => {
    setSelectedLeave(leave);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (selectedLeave) {
      deleteMutation.mutate(selectedLeave.id);
    }
  };

  const handleApprove = (leave: any) => {
    approveRejectMutation.mutate({ id: leave.id, status: 'Approved' });
  };

  const handleReject = (leave: any) => {
    setSelectedLeave(leave);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a reason for rejection.", variant: "destructive" });
      return;
    }
    if (selectedLeave) {
      approveRejectMutation.mutate({ 
        id: selectedLeave.id, 
        status: 'Rejected',
        rejection_reason: rejectionReason.trim()
      });
    }
  };

  const handleView = (leave: any) => {
    setSelectedLeave(leave);
    setShowViewDialog(true);
  };

  const filteredLeaves = leaves.filter(
    (l: any) =>
      (l.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.emp_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.id?.toString() || '').includes(searchQuery)
  );

  const stats = {
    total: pagination.total || 0,
    pending: leaves.filter((l: any) => l.status === 'Pending').length,
    approved: leaves.filter((l: any) => l.status === 'Approved').length,
    totalDays: leaves
      .filter((l: any) => l.status === 'Approved')
      .reduce((acc: number, l: any) => acc + (l.duration || 0), 0),
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Leave Management
          </h1>
          <p className="text-muted-foreground">
            {canApproveLeaves ? "Track and approve employee leave requests" : "View and manage your leave requests"}
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>Submit a new leave request</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="leave-type">Leave Type *</Label>
                <Select
                  value={leaveForm.leave_type}
                  onValueChange={(value) => setLeaveForm({ ...leaveForm, leave_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual">Annual</SelectItem>
                    <SelectItem value="Sick">Sick</SelectItem>
                    <SelectItem value="Personal">Personal</SelectItem>
                    <SelectItem value="Emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="start-date">Start Date *</Label>
                  <DatePicker
                    id="start-date"
                    value={leaveForm.start_date}
                    onChange={(date) => setLeaveForm({ ...leaveForm, start_date: date })}
                    placeholder="Select start date"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="end-date">End Date *</Label>
                  <DatePicker
                    id="end-date"
                    value={leaveForm.end_date}
                    onChange={(date) => setLeaveForm({ ...leaveForm, end_date: date })}
                    placeholder="Select end date"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for leave"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.totalDays}</div>
            <p className="text-xs text-muted-foreground">Total Days (Approved)</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Leave Requests</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search leaves..."
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No leave requests found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Leave ID</TableHead>
                    {canApproveLeaves && <TableHead>Employee</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeaves.map((l: any) => (
                    <TableRow 
                      key={l.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleView(l)}
                    >
                      <TableCell className="font-mono font-bold text-primary" onClick={(e) => e.stopPropagation()}>
                        LV-{String(l.id).padStart(4, '0')}
                      </TableCell>
                      {canApproveLeaves && (
                        <TableCell className="font-medium">{l.employee_name || 'N/A'}</TableCell>
                      )}
                      <TableCell>
                        <StatusBadge variant={l.leave_type === "Sick" ? "error" : l.leave_type === "Annual" ? "info" : "neutral"}>
                          {l.leave_type}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(l.start_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(l.end_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{l.duration || 0} day{(l.duration || 0) > 1 ? "s" : ""}</TableCell>
                      <TableCell>
                        <StatusBadge variant={leaveStatusMap[l.status as keyof typeof leaveStatusMap] || 'neutral'}>
                          {l.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {l.status === "Pending" && canApproveRejectLeave(l) && (
                            <>
                              {canAcceptLeaves && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-status-success hover:text-status-success"
                                  onClick={() => handleApprove(l)}
                                  disabled={approveRejectMutation.isPending}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              {canRejectLeaves && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-status-error hover:text-status-error"
                                  onClick={() => handleReject(l)}
                                  disabled={approveRejectMutation.isPending}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(l)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {l.status === 'Pending' && (
                                <DropdownMenuItem onClick={() => handleEdit(l)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {l.status === 'Pending' && (
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(l)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
            <DialogDescription>Update your leave request details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-leave-type">Leave Type *</Label>
              <Select
                value={leaveForm.leave_type}
                onValueChange={(value) => setLeaveForm({ ...leaveForm, leave_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Annual">Annual</SelectItem>
                  <SelectItem value="Sick">Sick</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-start-date">Start Date *</Label>
                    <DatePicker
                      id="edit-start-date"
                      value={leaveForm.start_date}
                      onChange={(date) => setLeaveForm({ ...leaveForm, start_date: date })}
                      placeholder="Select start date"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-end-date">End Date *</Label>
                    <DatePicker
                      id="edit-end-date"
                      value={leaveForm.end_date}
                      onChange={(date) => setLeaveForm({ ...leaveForm, end_date: date })}
                      placeholder="Select end date"
                    />
                  </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-reason">Reason *</Label>
              <Textarea
                id="edit-reason"
                placeholder="Enter reason for leave"
                value={leaveForm.reason}
                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-primary" />
              Leave Request Details
            </DialogTitle>
            <DialogDescription className="text-base">
              View complete information about this leave request
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-6 py-2">
              {/* Header Section */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Leave ID</p>
                    <p className="text-lg font-bold font-mono">LV-{String(selectedLeave.id).padStart(4, '0')}</p>
                  </div>
                </div>
                <div>
                  <StatusBadge variant={leaveStatusMap[selectedLeave.status as keyof typeof leaveStatusMap] || 'neutral'} className="text-sm px-3 py-1.5">
                    {selectedLeave.status}
                  </StatusBadge>
                </div>
              </div>

              <Separator />

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {canApproveLeaves && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Employee
                      </Label>
                      <p className="text-sm font-medium">{selectedLeave.employee_name || 'N/A'}</p>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Leave Type
                    </Label>
                    <p className="text-sm font-medium">{selectedLeave.leave_type}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Duration
                    </Label>
                    <p className="text-sm font-medium">
                      {selectedLeave.duration || 0} day{(selectedLeave.duration || 0) > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Date Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                    <Label className="text-xs font-medium text-muted-foreground">Start Date</Label>
                    <p className="text-sm font-semibold">
                      {new Date(selectedLeave.start_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                    <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
                    <p className="text-sm font-semibold">
                      {new Date(selectedLeave.end_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Reason */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Reason
                </h3>
                <div className="p-4 bg-muted/30 rounded-md border">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {selectedLeave.reason}
                  </p>
                </div>
              </div>

              {/* Approval/Rejection Information */}
              {(selectedLeave.status === 'Approved' || selectedLeave.status === 'Rejected') && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                      {selectedLeave.status === 'Approved' ? (
                        <CheckCircle2 className="h-4 w-4 text-status-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-status-error" />
                      )}
                      {selectedLeave.status === 'Approved' ? 'Approval' : 'Rejection'} Information
                    </h3>
                    {selectedLeave.status === 'Approved' && selectedLeave.approved_by_name && (
                      <div className="p-4 bg-status-success/10 rounded-md border border-status-success/20">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-status-success" />
                          <Label className="text-xs font-medium text-muted-foreground">Approved By</Label>
                        </div>
                        <p className="text-sm font-semibold text-status-success">{selectedLeave.approved_by_name}</p>
                      </div>
                    )}
                    {selectedLeave.status === 'Rejected' && (
                      <div className="space-y-3">
                        {selectedLeave.approved_by_name && (
                          <div className="p-4 bg-status-error/10 rounded-md border border-status-error/20">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle className="h-4 w-4 text-status-error" />
                              <Label className="text-xs font-medium text-muted-foreground">Rejected By</Label>
                            </div>
                            <p className="text-sm font-semibold text-status-error">{selectedLeave.approved_by_name}</p>
                          </div>
                        )}
                        {selectedLeave.rejection_reason && (
                          <div className="p-4 bg-status-error/10 rounded-md border border-status-error/20">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-4 w-4 text-status-error" />
                              <Label className="text-xs font-medium text-muted-foreground">Rejection Reason</Label>
                            </div>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-status-error font-medium">
                              {selectedLeave.rejection_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the leave request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this leave request</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter reason for rejection"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                A reason is required when rejecting a leave request.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                onClick={confirmReject}
                disabled={approveRejectMutation.isPending || !rejectionReason.trim()}
              >
                {approveRejectMutation.isPending ? "Rejecting..." : "Reject Leave"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
