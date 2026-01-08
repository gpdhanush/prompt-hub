import React, { useState, useMemo, useCallback } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MoreHorizontal, Check, X, Eye, Filter, Calendar, Edit, Trash2, Loader2, User, Clock, CalendarDays, FileText, CheckCircle2, XCircle, AlertCircle, Download, FileSpreadsheet } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { leavesApi } from "@/features/leaves/api";
import { employeesApi } from "@/features/employees/api";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { exportToExcel, exportToPDF } from "@/utils/excelExport";

// Memoized Leave Row Component
const LeaveRow = React.memo(({
  leave,
  canApproveRejectLeave,
  canAcceptLeaves,
  canRejectLeaves,
  onView,
  onEdit,
  onDelete,
  onApprove,
  onReject,
}: {
  leave: any;
  canApproveRejectLeave: (leave: any) => boolean;
  canAcceptLeaves: boolean;
  canRejectLeaves: boolean;
  onView: (leave: any) => void;
  onEdit: (leave: any) => void;
  onDelete: (leave: any) => void;
  onApprove: (leave: any) => void;
  onReject: (leave: any) => void;
}) => {
  const canApproveReject = canApproveRejectLeave(leave);
  
  return (
    <TableRow
      key={leave.id}
      className="hover:bg-muted/50 cursor-pointer"
      onClick={() => onView(leave)}
    >
      <TableCell className="font-medium" onClick={(e) => e.stopPropagation()}>
        <span className="font-mono text-sm">LV-{String(leave.id).padStart(4, '0')}</span>
      </TableCell>

      <TableCell>
        <span className="text-sm capitalize">{leave.leave_type || 'N/A'}</span>
      </TableCell>

      <TableCell>
        <span className="text-sm">{new Date(leave.start_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })} - {new Date(leave.end_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}</span>
      </TableCell>

      <TableCell>
        <span className="text-sm">{leave.duration || 0} day{(leave.duration || 0) > 1 ? "s" : ""}</span>
      </TableCell>

      <TableCell>
        <StatusBadge variant={leaveStatusMap[leave.status as keyof typeof leaveStatusMap] || 'neutral'}>
          {leave.status}
        </StatusBadge>
      </TableCell>

      <TableCell>
        <span className="text-sm">{leave.approved_by_name || leave.approved_by || '-'}</span>
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-2">
          {leave.status === "Pending" && canApproveReject && (
            <>
              {canAcceptLeaves && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => onApprove(leave)}
                  title="Approve"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
              {canRejectLeaves && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onReject(leave)}
                  title="Reject"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(leave)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {leave.status === 'Pending' && (
                <DropdownMenuItem onClick={() => onEdit(leave)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {leave.status === 'Pending' && (
                <DropdownMenuItem 
                  onClick={() => onDelete(leave)}
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
  );
});

LeaveRow.displayName = 'LeaveRow';

export default function Leaves() {
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Get current user info
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const userId = currentUser?.id;
  
  // Use permission-based checks for leave actions
  const { hasPermission } = usePermissions();
  const canAcceptLeaves = hasPermission('leaves.accept') || userRole === 'Super Admin';
  const canRejectLeaves = hasPermission('leaves.reject') || userRole === 'Super Admin';
  const canApproveLeaves = canAcceptLeaves || canRejectLeaves;

  const [leaveForm, setLeaveForm] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [formErrors, setFormErrors] = useState({
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const queryClient = useQueryClient();

  // Get current user's employee record ID - optimized query
  const { data: currentEmployeeData } = useQuery({
    queryKey: ['current-employee', userId],
    queryFn: () => employeesApi.getByUserId(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const currentEmployeeId = currentEmployeeData?.data?.id;

  // Fetch all leaves - optimized query
  const { data: leavesData, isLoading } = useQuery({
    queryKey: ['leaves'],
    queryFn: () => leavesApi.getAll({ page: 1, limit: 10000 }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const allLeaves = leavesData?.data || [];
  
  // Memoized helper function to check if current user can approve/reject a leave
  const canApproveRejectLeave = useCallback((leave: any) => {
    if (!canApproveLeaves) return false;
    
    if (currentEmployeeId && leave.employee_record_id && currentEmployeeId === leave.employee_record_id) {
      return false;
    }
    
    const isTeamLeadLeave = leave.employee_role === 'Team Leader' || leave.employee_role === 'Team Lead';
    if (isTeamLeadLeave && userRole !== 'Super Admin') {
      if (currentEmployeeId && leave.team_lead_id && currentEmployeeId === leave.team_lead_id) {
        return true;
      }
      return false;
    }
    
    return true;
  }, [canApproveLeaves, currentEmployeeId, userRole]);

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

  const resetForm = useCallback(() => {
    setLeaveForm({
      leave_type: "",
      start_date: "",
      end_date: "",
      reason: "",
    });
    setFormErrors({
      leave_type: "",
      start_date: "",
      end_date: "",
      reason: "",
    });
  }, []);

  const validateForm = useCallback(() => {
    const errors = {
      leave_type: "",
      start_date: "",
      end_date: "",
      reason: "",
    };
    let isValid = true;

    if (!leaveForm.leave_type) {
      errors.leave_type = "Leave type is required";
      isValid = false;
    }
    if (!leaveForm.start_date) {
      errors.start_date = "Start date is required";
      isValid = false;
    }
    if (!leaveForm.end_date) {
      errors.end_date = "End date is required";
      isValid = false;
    }
    if (!leaveForm.reason || leaveForm.reason.trim() === "") {
      errors.reason = "Reason is required";
      isValid = false;
    }
    if (leaveForm.start_date && leaveForm.end_date) {
      const startDate = new Date(leaveForm.start_date);
      const endDate = new Date(leaveForm.end_date);
      if (endDate < startDate) {
        errors.end_date = "End date must be after start date";
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  }, [leaveForm]);

  const handleCreate = useCallback(() => {
    if (!validateForm()) {
      return;
    }
    createMutation.mutate(leaveForm);
  }, [leaveForm, createMutation, validateForm]);

  const handleEdit = useCallback((leave: any) => {
    setSelectedLeave(leave);
    setLeaveForm({
      leave_type: leave.leave_type || "",
      start_date: leave.start_date ? leave.start_date.split('T')[0] : "",
      end_date: leave.end_date ? leave.end_date.split('T')[0] : "",
      reason: leave.reason || "",
    });
    setShowEditDialog(true);
  }, []);

  const handleUpdate = useCallback(() => {
    if (!selectedLeave) return;
    if (!validateForm()) {
      return;
    }
    updateMutation.mutate({ id: selectedLeave.id, data: leaveForm });
  }, [selectedLeave, leaveForm, updateMutation, validateForm]);

  const handleDelete = useCallback((leave: any) => {
    setSelectedLeave(leave);
    setShowDeleteDialog(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (selectedLeave) {
      deleteMutation.mutate(selectedLeave.id);
    }
  }, [selectedLeave, deleteMutation]);

  const handleApprove = useCallback((leave: any) => {
    approveRejectMutation.mutate({ id: leave.id, status: 'Approved' });
  }, [approveRejectMutation]);

  const handleReject = useCallback((leave: any) => {
    setSelectedLeave(leave);
    setRejectionReason("");
    setShowRejectDialog(true);
  }, []);

  const confirmReject = useCallback(() => {
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
  }, [rejectionReason, selectedLeave, approveRejectMutation]);

  const handleView = useCallback((leave: any) => {
    setSelectedLeave(leave);
    setShowViewDialog(true);
  }, []);

  // Memoized client-side filtering
  const filteredLeaves = useMemo(() => {
    return allLeaves.filter((leave: any) => {
      const matchesSearch = !searchQuery ||
        (leave.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (leave.emp_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (leave.id?.toString() || '').includes(searchQuery);

      const matchesStatus = !statusFilter || statusFilter === "all" || leave.status === statusFilter;

      const matchesDateRange = (() => {
        if (!fromDate && !toDate) return true;

        const leaveStartDate = new Date(leave.start_date);
        const leaveEndDate = new Date(leave.end_date);

        let matchesFromDate = true;
        let matchesToDate = true;

        if (fromDate) {
          const fromDateObj = new Date(fromDate);
          // Check if leave period overlaps with or starts after the from date
          matchesFromDate = leaveEndDate >= fromDateObj || leaveStartDate >= fromDateObj;
        }

        if (toDate) {
          const toDateObj = new Date(toDate);
          // Check if leave period overlaps with or ends before the to date
          matchesToDate = leaveStartDate <= toDateObj || leaveEndDate <= toDateObj;
        }

        return matchesFromDate && matchesToDate;
      })();

      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [allLeaves, searchQuery, statusFilter, fromDate, toDate]);

  // Memoized client-side pagination
  const paginatedLeaves = useMemo(() => {
    return filteredLeaves.slice((page - 1) * limit, page * limit);
  }, [filteredLeaves, page, limit]);

  const total = filteredLeaves.length;
  const totalPages = Math.ceil(total / limit);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value === "all" ? "" : value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  // Export functions
  const handleExportExcel = useCallback(() => {
    try {
      if (filteredLeaves.length === 0) {
        toast({
          title: "No Data",
          description: "No leave records to export.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for export
      const exportData = filteredLeaves.map(leave => ({
        employee_name: leave.employee_name || 'N/A',
        emp_code: leave.emp_code || 'N/A',
        leave_type: leave.leave_type || 'N/A',
        start_date: leave.start_date,
        end_date: leave.end_date,
        duration: leave.duration || 0,
        status: leave.status || 'N/A',
        reason: leave.reason || 'N/A',
        approved_by_name: leave.approved_by_name || 'N/A',
        created_at: leave.created_at,
      }));

      exportToExcel(exportData, [
        { key: 'employee_name', header: 'Employee Name' },
        { key: 'emp_code', header: 'Employee Code' },
        { key: 'leave_type', header: 'Leave Type' },
        { key: 'start_date', header: 'Start Date' },
        { key: 'end_date', header: 'End Date' },
        { key: 'duration', header: 'Duration (Days)' },
        { key: 'status', header: 'Status' },
        { key: 'reason', header: 'Reason' },
        { key: 'approved_by_name', header: 'Approved By' },
        { key: 'created_at', header: 'Applied Date' },
      ], {
        filename: `leave_report_${new Date().toISOString().split('T')[0]}.xlsx`
      });

      toast({
        title: "Success",
        description: "Leave report exported to Excel successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export leave report.",
        variant: "destructive",
      });
    }
  }, [filteredLeaves]);

  const handleExportPDF = useCallback(() => {
    try {
      if (filteredLeaves.length === 0) {
        toast({
          title: "No Data",
          description: "No leave records to export.",
          variant: "destructive",
        });
        return;
      }

      // Prepare data for export
      const exportData = filteredLeaves.map(leave => ({
        employee_name: leave.employee_name || 'N/A',
        emp_code: leave.emp_code || 'N/A',
        leave_type: leave.leave_type || 'N/A',
        start_date: leave.start_date,
        end_date: leave.end_date,
        duration: leave.duration || 0,
        status: leave.status || 'N/A',
        reason: leave.reason || 'N/A',
        approved_by_name: leave.approved_by_name || 'N/A',
        created_at: leave.created_at,
      }));

      exportToPDF(exportData, [
        { key: 'employee_name', header: 'Employee Name' },
        { key: 'emp_code', header: 'Employee Code' },
        { key: 'leave_type', header: 'Leave Type' },
        { key: 'start_date', header: 'Start Date' },
        { key: 'end_date', header: 'End Date' },
        { key: 'duration', header: 'Duration (Days)' },
        { key: 'status', header: 'Status' },
        { key: 'reason', header: 'Reason' },
        { key: 'approved_by_name', header: 'Approved By' },
        { key: 'created_at', header: 'Applied Date' },
      ], {
        filename: `leave_report_${new Date().toISOString().split('T')[0]}.pdf`,
        title: `Leave Report - ${new Date().toLocaleDateString()}`
      });

      toast({
        title: "Success",
        description: "Leave report opened in print dialog for PDF export.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export leave report.",
        variant: "destructive",
      });
    }
  }, [filteredLeaves]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            Leave Management
          </h1>
          <p className="text-muted-foreground mt-2">
            {canApproveLeaves
              ? "Track and approve employee leave requests"
              : "View and manage your leave requests"}
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Apply Leave
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>Submit a new leave request</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreate();
              }}
              noValidate
            >
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor="leave-type"
                    className={formErrors.leave_type ? "text-destructive" : ""}
                  >
                    Leave Type *
                  </Label>
                  <Select
                    value={leaveForm.leave_type}
                    onValueChange={(value) => {
                      setLeaveForm({ ...leaveForm, leave_type: value });
                      setFormErrors({ ...formErrors, leave_type: "" });
                    }}
                  >
                    <SelectTrigger
                      className={
                        formErrors.leave_type ? "border-destructive" : ""
                      }
                    >
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Annual">Annual</SelectItem>
                      <SelectItem value="Sick">Sick</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.leave_type && (
                    <p className="text-sm text-destructive">
                      {formErrors.leave_type}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="start-date"
                      className={
                        formErrors.start_date ? "text-destructive" : ""
                      }
                    >
                      Start Date *
                    </Label>
                    <DatePicker
                      id="start-date"
                      value={leaveForm.start_date}
                      onChange={(date) => {
                        setLeaveForm({ ...leaveForm, start_date: date });
                        setFormErrors({ ...formErrors, start_date: "" });
                      }}
                      placeholder="Select start date"
                      className={
                        formErrors.start_date ? "border-destructive" : ""
                      }
                    />
                    {formErrors.start_date && (
                      <p className="text-sm text-destructive">
                        {formErrors.start_date}
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label
                      htmlFor="end-date"
                      className={formErrors.end_date ? "text-destructive" : ""}
                    >
                      End Date *
                    </Label>
                    <DatePicker
                      id="end-date"
                      value={leaveForm.end_date}
                      onChange={(date) => {
                        setLeaveForm({ ...leaveForm, end_date: date });
                        setFormErrors({ ...formErrors, end_date: "" });
                      }}
                      placeholder="Select end date"
                      className={
                        formErrors.end_date ? "border-destructive" : ""
                      }
                    />
                    {formErrors.end_date && (
                      <p className="text-sm text-destructive">
                        {formErrors.end_date}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label
                    htmlFor="reason"
                    className={formErrors.reason ? "text-destructive" : ""}
                  >
                    Reason *
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder="Enter reason for leave"
                    value={leaveForm.reason}
                    onChange={(e) => {
                      setLeaveForm({ ...leaveForm, reason: e.target.value });
                      setFormErrors({ ...formErrors, reason: "" });
                    }}
                    rows={4}
                    className={formErrors.reason ? "border-destructive" : ""}
                  />
                  {formErrors.reason && (
                    <p className="text-sm text-destructive">
                      {formErrors.reason}
                    </p>
                  )}
                </div>
              </div>
            </form>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter || "all"}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <DatePicker
                value={fromDate}
                onChange={(date) => {
                  setFromDate(date);
                  setPage(1);
                }}
                placeholder="From date"
              />
            </div>
            <div>
              <DatePicker
                value={toDate}
                onChange={(date) => {
                  setToDate(date);
                  setPage(1);
                }}
                placeholder="To date"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setFromDate("");
                setToDate("");
                setPage(1);
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leaves Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Leave Requests ({filteredLeaves.length})</CardTitle>
              <CardDescription>List of all leave requests</CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm">
                  <Download className="mr-2 h-4 w-4 text-white bg-primary" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  Loading leave requests...
                </p>
              </div>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                No leave requests found
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter
                  ? "Try adjusting your filters"
                  : "No leave requests available"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50 border-b-2 border-border border-primary">
                  <TableRow className="hover:bg-muted/30">
                    <TableHead className="w-[120px] font-semibold text-foreground border-r border-border/50 text-center">ID</TableHead>
                    <TableHead className="font-semibold text-foreground border-r border-border/50 text-center">Type</TableHead>
                    <TableHead className="font-semibold text-foreground border-r border-border/50 text-center">Start & End Date</TableHead>
                    <TableHead className="font-semibold text-foreground border-r border-border/50 text-center">Duration</TableHead>
                    <TableHead className="font-semibold text-foreground border-r border-border/50 text-center">Status</TableHead>
                    <TableHead className="font-semibold text-foreground border-r border-border/50 text-center">Approved By</TableHead>
                    <TableHead className="text-center w-[100px] font-semibold text-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeaves.map((leave: any) => (
                    <LeaveRow
                      key={leave.id}
                      leave={leave}
                      canApproveRejectLeave={canApproveRejectLeave}
                      canAcceptLeaves={canAcceptLeaves}
                      canRejectLeaves={canRejectLeaves}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} leave requests
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="page-limit"
                    className="text-sm text-muted-foreground"
                  >
                    Rows per page:
                  </Label>
                  <Select
                    value={limit.toString()}
                    onValueChange={(value) => handleLimitChange(Number(value))}
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
                {totalPages > 1 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Leave Request</DialogTitle>
            <DialogDescription>
              Update your leave request details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-leave-type">Leave Type *</Label>
              <Select
                value={leaveForm.leave_type}
                onValueChange={(value) =>
                  setLeaveForm({ ...leaveForm, leave_type: value })
                }
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
                  onChange={(date) =>
                    setLeaveForm({ ...leaveForm, start_date: date })
                  }
                  placeholder="Select start date"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-end-date">End Date *</Label>
                <DatePicker
                  id="edit-end-date"
                  value={leaveForm.end_date}
                  onChange={(date) =>
                    setLeaveForm({ ...leaveForm, end_date: date })
                  }
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
                onChange={(e) =>
                  setLeaveForm({ ...leaveForm, reason: e.target.value })
                }
                rows={4}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update Request"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog - Lazy loaded for performance */}
      {showViewDialog && selectedLeave && (
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
            <div className="space-y-6 py-2">
              {/* Header Section */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Leave ID
                    </p>
                    <p className="text-lg font-bold font-mono">
                      LV-{String(selectedLeave.id).padStart(4, "0")}
                    </p>
                  </div>
                </div>
                <div>
                  <StatusBadge
                    variant={
                      leaveStatusMap[
                        selectedLeave.status as keyof typeof leaveStatusMap
                      ] || "neutral"
                    }
                    className="text-sm px-3 py-1.5"
                  >
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
                {canApproveLeaves ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Employee
                      </Label>
                      <p className="text-sm font-medium">
                        {selectedLeave.employee_name || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Leave Type
                      </Label>
                      <p className="text-sm font-medium">
                        {selectedLeave.leave_type}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Duration
                      </Label>
                      <p className="text-sm font-medium">
                        {selectedLeave.duration || 0} day
                        {(selectedLeave.duration || 0) > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        Leave Type
                      </Label>
                      <p className="text-sm font-medium">
                        {selectedLeave.leave_type}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Duration
                      </Label>
                      <p className="text-sm font-medium">
                        {selectedLeave.duration || 0} day
                        {(selectedLeave.duration || 0) > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                )}
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
                    <Label className="text-xs font-medium text-muted-foreground">
                      Start Date
                    </Label>
                    <p className="text-sm font-semibold">
                      {new Date(selectedLeave.start_date).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                  <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                    <Label className="text-xs font-medium text-muted-foreground">
                      End Date
                    </Label>
                    <p className="text-sm font-semibold">
                      {new Date(selectedLeave.end_date).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
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
              {(selectedLeave.status === "Approved" ||
                selectedLeave.status === "Rejected") && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
                      {selectedLeave.status === "Approved" ? (
                        <CheckCircle2 className="h-4 w-4 text-status-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-status-error" />
                      )}
                      {selectedLeave.status === "Approved"
                        ? "Approval"
                        : "Rejection"}{" "}
                      Information
                    </h3>
                    {selectedLeave.status === "Approved" &&
                      selectedLeave.approved_by_name && (
                        <div className="p-4 bg-status-success/10 rounded-md border border-status-success/20">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-status-success" />
                            <Label className="text-xs font-medium text-muted-foreground">
                              Approved By
                            </Label>
                          </div>
                          <p className="text-sm font-semibold text-status-success">
                            {selectedLeave.approved_by_name}
                          </p>
                        </div>
                      )}
                    {selectedLeave.status === "Rejected" && (
                      <div className="space-y-3">
                        {selectedLeave.approved_by_name && (
                          <div className="p-4 bg-status-error/10 rounded-md border border-status-error/20">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle className="h-4 w-4 text-status-error" />
                              <Label className="text-xs font-medium text-muted-foreground">
                                Rejected By
                              </Label>
                            </div>
                            <p className="text-sm font-semibold text-status-error">
                              {selectedLeave.approved_by_name}
                            </p>
                          </div>
                        )}
                        {selectedLeave.rejection_reason && (
                          <div className="p-4 bg-status-error/10 rounded-md border border-status-error/20">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-4 w-4 text-status-error" />
                              <Label className="text-xs font-medium text-muted-foreground">
                                Rejection Reason
                              </Label>
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

              {/* Action Buttons for Level 1 Users */}
              {canApproveLeaves && selectedLeave.status === "Pending" && (
                <>
                  <Separator />
                  <div className="flex gap-3 pt-2">
                    {canAcceptLeaves && (
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleApprove(selectedLeave)}
                        disabled={approveRejectMutation.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {approveRejectMutation.isPending
                          ? "Approving..."
                          : "Approve"}
                      </Button>
                    )}
                    {canRejectLeaves && (
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setShowRejectDialog(true);
                        }}
                        disabled={approveRejectMutation.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              leave request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </AlertDialogCancel>
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
            <DialogDescription>
              Please provide a reason for rejecting this leave request
            </DialogDescription>
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
                disabled={
                  approveRejectMutation.isPending || !rejectionReason.trim()
                }
              >
                {approveRejectMutation.isPending
                  ? "Rejecting..."
                  : "Reject Leave"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

