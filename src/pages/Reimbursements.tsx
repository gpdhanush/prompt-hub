import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Check, X, Eye, Filter, DollarSign, FileText, Calendar, User, TrendingUp, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { reimbursementsApi } from "@/features/reimbursements/api";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTitle } from "@/components/ui/page-title";
import { PageSlug } from "@/components/ui/page-slug";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Reimbursements() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'Super Admin';
  const isLevel1 = ['Admin', 'Team Leader', 'Team Lead'].includes(userRole);
  const { hasPermission } = usePermissions();
  
  // Permission checks
  const canCreate = isSuperAdmin || hasPermission('reimbursements.create');
  const canApproveReject = isSuperAdmin || hasPermission('reimbursements.approve');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedReimbursement, setSelectedReimbursement] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch currency symbol from database
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const currencySymbol = settingsData?.data?.currency_symbol || "$";

  // Fetch reimbursements
  // Note: Backend automatically filters based on user level:
  // - Level 2: Only their own claims
  // - Level 1: Only claims from their direct reports
  // - Super Admin: All claims
  const { data: reimbursementsData, isLoading } = useQuery({
    queryKey: ['reimbursements', page, statusFilter, searchQuery],
    queryFn: () => reimbursementsApi.getAll({
      page,
      limit: 10,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: searchQuery || undefined,
    }),
  });

  const reimbursements = reimbursementsData?.data || [];
  const pagination = reimbursementsData?.pagination || { total: 0, totalPages: 0 };

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) => reimbursementsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      toast({ title: "Success", description: "Reimbursement approved successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to approve reimbursement.", variant: "destructive" });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => reimbursementsApi.reject(id, { rejection_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      toast({ title: "Success", description: "Reimbursement rejected." });
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedReimbursement(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to reject reimbursement.", variant: "destructive" });
    },
  });

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate stats
  const stats = {
    total: reimbursements.reduce((acc: number, r: any) => acc + parseFloat(r.amount || 0), 0),
    pending: reimbursements.filter((r: any) => r.status === 'Pending' || r.status === 'Waiting for Approval').reduce((acc: number, r: any) => acc + parseFloat(r.amount || 0), 0),
    approved: reimbursements.filter((r: any) => r.status === 'Level 1 Approved' || r.status === 'Super Admin Approved' || r.status === 'Approved').length,
    rejected: reimbursements.filter((r: any) => r.status === 'Level 1 Rejected' || r.status === 'Super Admin Rejected' || r.status === 'Rejected').length,
  };

  // Check if user can approve/reject (must have permission AND meet workflow conditions)
  const canApprove = (reimbursement: any) => {
    if (!canApproveReject) return false; // Must have permission first
    
    if (isSuperAdmin) {
      return reimbursement.current_approval_level === 'Super Admin' || reimbursement.current_approval_level === 'Level 1 Approved';
    }
    if (isLevel1) {
      return reimbursement.current_approval_level === 'Level 2' && reimbursement.status === 'Pending';
    }
    return false;
  };

  const handleApprove = (id: number) => {
    approveMutation.mutate(id);
  };

  const handleReject = (reimbursement: any) => {
    setSelectedReimbursement(reimbursement);
    setShowRejectDialog(true);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a rejection reason.", variant: "destructive" });
      return;
    }
    if (selectedReimbursement) {
      rejectMutation.mutate({ id: selectedReimbursement.id, reason: rejectionReason });
    }
  };

  // Get status variant
  const getStatusVariant = (status: string) => {
    const statusMap: Record<string, any> = {
      'Pending': 'warning',
      'Waiting for Approval': 'warning',
      'Level 1 Approved': 'info',
      'Level 1 Rejected': 'error',
      'Super Admin Approved': 'success',
      'Super Admin Rejected': 'error',
      'Approved': 'success',
      'Rejected': 'error',
      'Processing': 'info',
      'Paid': 'success',
    };
    return statusMap[status] || 'neutral';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <PageTitle 
            title="Reimbursements" 
            icon={DollarSign}
            description="Manage expense claims and multi-level approvals"
          />
        </div>
        {canCreate && (
          <Button 
            onClick={() => navigate('/reimbursements/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Claim
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-500/20 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Total Claims</Label>
                <div className="text-3xl font-bold text-blue-600 mt-2">
                  {formatCurrency(stats.total)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/20">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-500/20 shadow-lg bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Pending Amount</Label>
                <div className="text-3xl font-bold text-amber-600 mt-2">
                  {formatCurrency(stats.pending)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/20">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Approved</Label>
                <div className="text-3xl font-bold text-primary mt-2">
                  {stats.approved}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-primary/20">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-500/20 shadow-lg bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Rejected</Label>
                <div className="text-3xl font-bold text-red-600 mt-2">
                  {stats.rejected}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-red-500/20">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="text-lg">All Claims</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by claim code, employee, category..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Waiting for Approval">Waiting for Approval</SelectItem>
                  <SelectItem value="Level 1 Approved">Level 1 Approved</SelectItem>
                  <SelectItem value="Level 1 Rejected">Level 1 Rejected</SelectItem>
                  <SelectItem value="Super Admin Approved">Super Admin Approved</SelectItem>
                  <SelectItem value="Super Admin Rejected">Super Admin Rejected</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading reimbursements...</p>
              </div>
            </div>
          ) : reimbursements.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No reimbursement claims found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim Code</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Approval Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reimbursements.map((r: any) => (
                    <TableRow 
                      key={r.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/reimbursements/${r.id}`)}
                    >
                      <TableCell>
                        <p className="font-bold text-sm text-primary">
                          {r.claim_code || `CLM-${r.id}`}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-primary/10">
                            <User className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{r.employee_name || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">{r.emp_code || ''}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(parseFloat(r.amount || 0))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(r.submitted_at || r.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className="text-xs w-fit">
                            {r.current_approval_level || 'Level 2'}
                          </Badge>
                          {r.current_approval_level === 'Level 2' && r.pending_level_1_manager_name && (
                            <p className="text-xs text-muted-foreground">
                              Waiting for: {r.pending_level_1_manager_name}
                            </p>
                          )}
                          {r.current_approval_level === 'Super Admin' && (
                            <p className="text-xs text-muted-foreground">
                              Waiting for: Super Admin
                            </p>
                          )}
                          {r.current_approval_level === 'Completed' && (
                            <p className="text-xs text-muted-foreground">
                              Approval completed
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={getStatusVariant(r.status)}>
                          {r.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canApprove(r) && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(r.id);
                                }}
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(r);
                                }}
                                disabled={rejectMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/reimbursements/${r.id}`);
                              }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {r.attachment_count > 0 && (
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/reimbursements/${r.id}`);
                                }}>
                                  <FileText className="mr-2 h-4 w-4" />
                                  View Files ({r.attachment_count})
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
              
              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, pagination.total)} of {pagination.total} claims
                  </p>
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

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Reimbursement Claim</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this reimbursement claim. This will be visible to the employee.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason("");
              setSelectedReimbursement(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmReject}
              className="bg-red-600 hover:bg-red-700"
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Claim'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
