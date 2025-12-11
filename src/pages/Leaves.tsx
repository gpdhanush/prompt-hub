import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Check, X, Eye, Filter, Calendar, Edit, Trash2, Loader2 } from "lucide-react";
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
import { leavesApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";

export default function Leaves() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  // Get current user info
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userRole = currentUser?.role || '';
  const userId = currentUser?.id;
  const canApproveLeaves = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Team Lead';

  const [leaveForm, setLeaveForm] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const queryClient = useQueryClient();

  // Fetch leaves
  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['leaves', page],
    queryFn: () => leavesApi.getAll({ page, limit }),
  });

  const leaves = leavesData?.data || [];
  const pagination = leavesData?.pagination || { total: 0, totalPages: 0 };

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
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      leavesApi.update(id, { status, approved_by: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast({ title: "Success", description: "Leave request status updated successfully." });
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
    approveRejectMutation.mutate({ id: leave.id, status: 'Rejected' });
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
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search leaves..."
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
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-muted-foreground">
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canApproveLeaves && l.status === "Pending" && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-status-success hover:text-status-success"
                                onClick={() => handleApprove(l)}
                                disabled={approveRejectMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-status-error hover:text-status-error"
                                onClick={() => handleReject(l)}
                                disabled={approveRejectMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
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
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} requests
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {selectedLeave && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Leave ID</Label>
                  <p className="font-mono">LV-{String(selectedLeave.id).padStart(4, '0')}</p>
                </div>
                {canApproveLeaves && (
                  <div>
                    <Label className="text-muted-foreground">Employee</Label>
                    <p className="font-medium">{selectedLeave.employee_name || 'N/A'}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Leave Type</Label>
                  <p>{selectedLeave.leave_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Duration</Label>
                  <p>{selectedLeave.duration || 0} day{(selectedLeave.duration || 0) > 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p>{new Date(selectedLeave.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p>{new Date(selectedLeave.end_date).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <StatusBadge variant={leaveStatusMap[selectedLeave.status as keyof typeof leaveStatusMap] || 'neutral'}>
                    {selectedLeave.status}
                  </StatusBadge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="mt-1 whitespace-pre-wrap">{selectedLeave.reason}</p>
              </div>
              {selectedLeave.approved_by_name && (
                <div>
                  <Label className="text-muted-foreground">Approved By</Label>
                  <p>{selectedLeave.approved_by_name}</p>
                </div>
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
    </div>
  );
}
