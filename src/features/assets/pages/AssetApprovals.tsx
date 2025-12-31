import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { assetsApi } from "@/features/assets/api";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentUser } from "@/lib/auth";

export default function AssetApprovals() {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "Super Admin";

  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedApproval, setSelectedApproval] = useState<any>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [comments, setComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch approvals
  const { data: approvalsData, isLoading, error } = useQuery({
    queryKey: ["approvals", page, limit, statusFilter, typeFilter],
    queryFn: () =>
      assetsApi.getApprovals({
        page,
        limit,
        status: statusFilter !== "all" ? statusFilter : undefined,
        request_type: typeFilter !== "all" ? typeFilter : undefined,
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const approvals = approvalsData?.data || [];
  const total = approvalsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Update approval mutation
  const updateApprovalMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      assetsApi.updateApproval(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      setIsActionDialogOpen(false);
      setSelectedApproval(null);
      setComments("");
      setRejectionReason("");
      toast({
        title: "Success",
        description: `Approval request ${actionType === "approve" ? "approved" : "rejected"} successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update approval request",
        variant: "destructive",
      });
    },
  });

  const handleAction = (approval: any, type: "approve" | "reject") => {
    setSelectedApproval(approval);
    setActionType(type);
    setIsActionDialogOpen(true);
  };

  const handleSubmitAction = () => {
    if (!selectedApproval) return;

    if (actionType === "reject" && !rejectionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Rejection reason is required",
        variant: "destructive",
      });
      return;
    }

    updateApprovalMutation.mutate({
      id: selectedApproval.id,
      data: {
        status: actionType === "approve" ? "approved" : "rejected",
        comments: comments || undefined,
        rejection_reason: actionType === "reject" ? rejectionReason : undefined,
      },
    });
  };

  const getRequestTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      assignment: "default",
      return: "secondary",
      maintenance: "outline",
      purchase: "default",
      disposal: "destructive",
    };
    return colors[type] || "default";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "warning";
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "cancelled":
        return "neutral";
      default:
        return "neutral";
    }
  };

  // Calculate stats
  const stats = {
    total: approvals.length,
    pending: approvals.filter((a: any) => a.status === "pending").length,
    approved: approvals.filter((a: any) => a.status === "approved").length,
    rejected: approvals.filter((a: any) => a.status === "rejected").length,
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CheckCircle className="h-8 w-8 text-primary" />
            Asset Approvals
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and manage asset approval requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All approval requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Approved requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Rejected requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by asset code, employee name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
                <SelectItem value="return">Return</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="disposal">Disposal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Approvals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="font-medium">Error loading approvals</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as any)?.message || "Failed to fetch approvals"}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading approvals...</p>
              </div>
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No approval requests</h3>
              <p className="text-muted-foreground">
                {search || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No approval requests found"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request Type</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Requested Date</TableHead>
                      <TableHead>Status</TableHead>
                      {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvals
                      .filter((approval: any) => {
                        if (!search) return true;
                        const searchLower = search.toLowerCase();
                        return (
                          approval.asset_code?.toLowerCase().includes(searchLower) ||
                          approval.employee_name?.toLowerCase().includes(searchLower) ||
                          approval.requested_by_name?.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((approval: any) => (
                        <TableRow key={approval.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Badge variant={getRequestTypeBadge(approval.request_type)}>
                              {approval.request_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {approval.asset_code ? (
                              <div>
                                <div className="font-medium">{approval.asset_code}</div>
                                <div className="text-sm text-muted-foreground">
                                  {approval.brand} {approval.model}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {approval.requested_by_name ? (
                              <div>
                                <div className="font-medium">{approval.requested_by_name}</div>
                                {approval.employee_name && (
                                  <div className="text-sm text-muted-foreground">
                                    {approval.emp_code} - {approval.employee_name}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {approval.requested_at
                              ? format(new Date(approval.requested_at), "MMM dd, yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(approval.status)}
                              <StatusBadge variant={getStatusVariant(approval.status)}>
                                {approval.status}
                              </StatusBadge>
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              {approval.status === "pending" && (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAction(approval, "approve")}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAction(approval, "reject")}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {approval.status !== "pending" && (
                                <span className="text-sm text-muted-foreground">
                                  {approval.approver_name && (
                                    <div className="text-xs">
                                      By: {approval.approver_name}
                                    </div>
                                  )}
                                  {approval.approved_at && (
                                    <div className="text-xs">
                                      {format(new Date(approval.approved_at), "MMM dd, yyyy")}
                                    </div>
                                  )}
                                </span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{" "}
                    records
                  </div>
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
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
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

      {/* Action Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Request" : "Reject Request"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Approve this asset request. You can add optional comments."
                : "Reject this asset request. Please provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedApproval && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Request Type:</span>
                  <span className="font-medium capitalize">{selectedApproval.request_type}</span>
                </div>
                {selectedApproval.asset_code && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Asset:</span>
                    <span className="font-medium">{selectedApproval.asset_code}</span>
                  </div>
                )}
                {selectedApproval.requested_by_name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested By:</span>
                    <span className="font-medium">{selectedApproval.requested_by_name}</span>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="comments">Comments (Optional)</Label>
              <Textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Add any comments or notes..."
                rows={3}
              />
            </div>
            {actionType === "reject" && (
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">
                  Rejection Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  rows={3}
                  required
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsActionDialogOpen(false);
                setComments("");
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={updateApprovalMutation.isPending}
              variant={actionType === "approve" ? "default" : "destructive"}
            >
              {updateApprovalMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : actionType === "approve" ? (
                "Approve"
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
