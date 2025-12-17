import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  Filter, 
  FileText, 
  Download, 
  Eye, 
  RotateCcw, 
  X,
  Calendar,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Activity,
  Plus,
  Edit,
  Trash2,
  Globe,
  Clock,
  Server,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { auditLogsApi } from "@/features/audit-logs/api";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const actionColors: Record<string, "success" | "info" | "error" | "purple" | "neutral"> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "error",
  EXPORT: "purple",
  PREVIEW: "neutral",
  APPROVE: "success",
  REJECT: "error",
  VIEW: "neutral",
  RESTORE: "info",
} as const;

// Memoized Audit Log Row Component
const AuditLogRow = React.memo(({ 
  log,
  onViewDetails,
  onRestore,
}: {
  log: any;
  onViewDetails: (log: any) => void;
  onRestore: (log: any) => void;
}) => {
  const handleViewDetails = useCallback(() => {
    onViewDetails(log);
  }, [log, onViewDetails]);

  const handleRestore = useCallback(() => {
    onRestore(log);
  }, [log, onRestore]);

  const canRestore = ['UPDATE', 'DELETE'].includes(log.action) && log.before_data;

  return (
    <TableRow 
      key={log.id} 
      className="hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/3 hover:to-transparent transition-all duration-200 border-b border-border/30 group"
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">
              {new Date(log.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(log.created_at).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <span className="font-medium text-foreground">{log.user_name || 'System'}</span>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge variant={actionColors[log.action] || "neutral"} className="font-semibold">
          {log.action}
        </StatusBadge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{log.module}</span>
        </div>
      </TableCell>
      <TableCell>
        {log.item_id ? (
          <Badge variant="outline" className="font-mono text-xs bg-muted/30 border-border/50">
            #{log.item_id}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">N/A</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all"
            onClick={handleViewDetails}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canRestore && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-cyan-500/10 hover:text-cyan-600 transition-all"
              onClick={handleRestore}
              title="Restore"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

AuditLogRow.displayName = 'AuditLogRow';

export default function AuditLogs() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    action: "",
    module: "",
    userId: "",
    startDate: "",
    endDate: "",
  });

  // Fetch filter options - optimized query
  const { data: filterOptions } = useQuery({
    queryKey: ['audit-logs-filter-options'],
    queryFn: () => auditLogsApi.getFilterOptions(),
    staleTime: 1000 * 60 * 30, // 30 minutes (filter options rarely change)
    gcTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Memoized query params
  const queryParams = useMemo(() => {
    const params: any = { page, limit };
    if (searchQuery?.trim()) params.search = searchQuery;
    if (filters.action?.trim()) params.action = filters.action;
    if (filters.module?.trim()) params.module = filters.module;
    if (filters.userId?.trim()) params.userId = filters.userId;
    if (filters.startDate?.trim()) params.startDate = filters.startDate;
    if (filters.endDate?.trim()) params.endDate = filters.endDate;
    return params;
  }, [page, limit, searchQuery, filters]);

  // Fetch audit logs - optimized query
  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => auditLogsApi.getAll(queryParams),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 };
  const stats = data?.stats || { total: 0, creates: 0, updates: 0, deletes: 0 };

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (id: number) => auditLogsApi.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast({
        title: "Success",
        description: "Data restored successfully.",
      });
      setShowRestoreDialog(false);
      setSelectedLog(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore data.",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = useCallback(async (log: any) => {
    try {
      const response = await auditLogsApi.getById(log.id);
      setSelectedLog(response.data);
      setShowDetails(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load log details.",
        variant: "destructive",
      });
    }
  }, []);

  const handleRestore = useCallback((log: any) => {
    if (!['UPDATE', 'DELETE'].includes(log.action)) {
      toast({
        title: "Cannot Restore",
        description: "Only UPDATE and DELETE actions can be restored.",
        variant: "destructive",
      });
      return;
    }
    if (!log.before_data) {
      toast({
        title: "Cannot Restore",
        description: "No before_data available for restoration.",
        variant: "destructive",
      });
      return;
    }
    setSelectedLog(log);
    setShowRestoreDialog(true);
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const response = await auditLogsApi.exportCSV({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        action: filters.action || undefined,
        module: filters.module || undefined,
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Audit logs exported successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to export audit logs.",
        variant: "destructive",
      });
    }
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({
      action: "",
      module: "",
      userId: "",
      startDate: "",
      endDate: "",
    });
    setSearchQuery("");
  }, []);

  const hasActiveFilters = useMemo(() => 
    Object.values(filters).some(v => v !== "") || searchQuery !== "",
    [filters, searchQuery]
  );

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === "all" ? "" : value }));
  }, []);

  const handleDateFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1.5 ml-1">Track all system activities and changes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            className="bg-gradient-to-r from-background via-background to-muted/30 border-border/50 hover:from-primary/5 hover:to-primary/10 hover:border-primary/30 transition-all"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              {stats.total || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Total Entries</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                <Plus className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
              {stats.creates || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Creates</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                <Edit className="h-5 w-5 text-cyan-500" />
              </div>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-400 bg-clip-text text-transparent">
              {stats.updates || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Updates</p>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent shadow-lg hover:shadow-xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <div className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">
              {stats.deletes || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">Deletes</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="border-0 bg-gradient-to-br from-background via-background to-muted/20 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Filter className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Action</Label>
                <Select
                  value={filters.action || "all"}
                  onValueChange={(value) => handleFilterChange('action', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {filterOptions?.actions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Module</Label>
                <Select
                  value={filters.module || "all"}
                  onValueChange={(value) => handleFilterChange('module', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All modules</SelectItem>
                    {filterOptions?.modules.map((module) => (
                      <SelectItem key={module} value={module}>
                        {module}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>User</Label>
                <Select
                  value={filters.userId || "all"}
                  onValueChange={(value) => handleFilterChange('userId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {filterOptions?.users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>&nbsp;</Label>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 bg-gradient-to-br from-background via-background to-muted/20 shadow-lg">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">Activity Log</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Real-time system activity tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs, users, modules..."
                  className="pl-9 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className={`border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all ${showFilters ? 'bg-primary/10 border-primary/30' : ''}`}
              >
                <Filter className="h-4 w-4" />
              </Button>
              {hasActiveFilters && (
                <Badge variant="secondary" className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20">
                  <Filter className="h-3 w-3 mr-1.5" />
                  Active
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              Error loading audit logs. Please try again.
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No audit logs found.
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-border/50 bg-card/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-muted/50 via-muted/30 to-transparent border-b border-border/50">
                      <TableHead className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          Timestamp
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          User
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-foreground">Action</TableHead>
                      <TableHead className="font-semibold text-foreground">Module</TableHead>
                      <TableHead className="font-semibold text-foreground">Item</TableHead>
                      <TableHead className="font-semibold text-right text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <AuditLogRow
                        key={log.id}
                        log={log}
                        onViewDetails={handleViewDetails}
                        onRestore={handleRestore}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.min(pagination.totalPages, page + 1))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog - Lazy loaded for performance */}
      {showDetails && selectedLog && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-br from-background via-background to-muted/20">
            <DialogHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">Audit Log Details</DialogTitle>
                  <DialogDescription className="mt-1">
                    Complete information about this audit log entry
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Main Info Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-blue-500" />
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">User</Label>
                    </div>
                    <p className="font-semibold text-foreground">{selectedLog.user_name || 'System'}</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-purple-500" />
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Action</Label>
                    </div>
                    <StatusBadge variant={actionColors[selectedLog.action] || "neutral"} className="font-semibold">
                      {selectedLog.action}
                    </StatusBadge>
                  </CardContent>
                </Card>
                
                <Card className="border-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Module</Label>
                    </div>
                    <p className="font-semibold text-foreground">{selectedLog.module}</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-cyan-500" />
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Item ID</Label>
                    </div>
                    <p className="font-semibold text-foreground font-mono">{selectedLog.item_id || 'N/A'}</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-orange-500" />
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">IP Address</Label>
                    </div>
                    <p className="font-mono text-sm font-semibold text-foreground">{selectedLog.ip_address || 'N/A'}</p>
                  </CardContent>
                </Card>
                
                <Card className="border-0 bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-pink-500" />
                      <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Timestamp</Label>
                    </div>
                    <p className="font-semibold text-foreground">
                      {new Date(selectedLog.created_at).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {selectedLog.before_data && (
                <>
                  <Separator className="my-4" />
                  <Card className="border-0 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </div>
                        <CardTitle className="text-base font-semibold">Before Data</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-background/50 p-4 rounded-lg overflow-auto text-xs border border-border/30 font-mono">
                        {JSON.stringify(selectedLog.before_data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </>
              )}
              
              {selectedLog.after_data && (
                <>
                  <Separator className="my-4" />
                  <Card className="border-0 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-green-500/20 border border-green-500/30">
                          <Plus className="h-4 w-4 text-green-500" />
                        </div>
                        <CardTitle className="text-base font-semibold">After Data</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-background/50 p-4 rounded-lg overflow-auto text-xs border border-border/30 font-mono">
                        {JSON.stringify(selectedLog.after_data, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </>
              )}
              
              {selectedLog.user_agent && (
                <>
                  <Separator className="my-4" />
                  <Card className="border-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
                          <Server className="h-4 w-4 text-blue-500" />
                        </div>
                        <CardTitle className="text-base font-semibold">User Agent</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-mono break-all bg-background/50 p-3 rounded-lg border border-border/30">
                        {selectedLog.user_agent}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent className="border-0 bg-gradient-to-br from-background via-background to-muted/20">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                <RotateCcw className="h-5 w-5 text-cyan-500" />
              </div>
              <AlertDialogTitle className="text-xl font-semibold">Restore Data?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-3 pt-2">
              <p>This will restore the data from before the <strong>{selectedLog?.action}</strong> action.</p>
              <p className="text-muted-foreground">The current data will be replaced with the previous state.</p>
              <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm"><strong>Module:</strong> {selectedLog?.module}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm"><strong>Item ID:</strong> {selectedLog?.item_id}</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setSelectedLog(null)} className="border-border/50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedLog && restoreMutation.mutate(selectedLog.id)}
              disabled={restoreMutation.isPending}
              className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white border-0"
            >
              {restoreMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

