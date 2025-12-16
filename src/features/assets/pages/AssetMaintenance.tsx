import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  FileText,
  Building2,
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
import { settingsApi } from "@/features/settings/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AssetMaintenance() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch maintenance records
  const { data: maintenanceData, isLoading, error } = useQuery({
    queryKey: ['maintenance', page, limit, statusFilter, typeFilter, search],
    queryFn: () => assetsApi.getMaintenance({
      page,
      limit,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      maintenance_type: typeFilter !== 'all' ? typeFilter : undefined,
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Fetch assets for dropdown
  const { data: assetsData } = useQuery({
    queryKey: ['assets', 'all'],
    queryFn: () => assetsApi.getAll({ limit: 1000 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch tickets for dropdown
  const { data: ticketsData } = useQuery({
    queryKey: ['assets', 'tickets', 'all'],
    queryFn: () => assetsApi.getTickets({ limit: 1000 }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch currency symbol from database
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const maintenance = maintenanceData?.data || [];
  const total = maintenanceData?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const assets = assetsData?.data || [];
  const tickets = ticketsData?.data || [];
  const currencySymbol = settingsData?.data?.currency_symbol || "$";

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch single maintenance record for view/edit
  const { data: maintenanceDetail } = useQuery({
    queryKey: ['maintenance', selectedMaintenance?.id],
    queryFn: () => assetsApi.getMaintenanceById(selectedMaintenance.id),
    enabled: !!selectedMaintenance && (isViewDialogOpen || isEditDialogOpen),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => assetsApi.createMaintenance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Maintenance record created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create maintenance record",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      assetsApi.updateMaintenance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      setIsEditDialogOpen(false);
      setSelectedMaintenance(null);
      toast({
        title: "Success",
        description: "Maintenance record updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update maintenance record",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => assetsApi.deleteMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance'] });
      toast({
        title: "Success",
        description: "Maintenance record deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete maintenance record",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'neutral';
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      repair: 'destructive',
      preventive: 'default',
      warranty: 'secondary',
      upgrade: 'outline',
    };
    return colors[type] || 'default';
  };

  // Calculate stats
  const stats = {
    total: maintenance.length,
    scheduled: maintenance.filter((m: any) => m.status === 'scheduled').length,
    inProgress: maintenance.filter((m: any) => m.status === 'in_progress').length,
    completed: maintenance.filter((m: any) => m.status === 'completed').length,
    totalCost: maintenance.reduce((sum: number, m: any) => sum + (parseFloat(m.cost) || 0), 0),
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-8 w-8 text-primary" />
            Maintenance Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Track and manage asset maintenance, repairs, and upgrades
          </p>
        </div>
        <Dialog 
          open={isCreateDialogOpen} 
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              // Reset form when dialog closes
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Maintenance
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule New Maintenance</DialogTitle>
              <DialogDescription>
                Create a new maintenance record for an asset
              </DialogDescription>
            </DialogHeader>
            {assets.length === 0 ? (
              <div className="py-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                <p className="text-lg font-semibold mb-2">No Assets Available</p>
                <p className="text-sm text-muted-foreground mb-4">
                  You need to create assets before scheduling maintenance.
                </p>
                <Button onClick={() => navigate('/it-assets')} variant="outline">
                  Go to Assets
                </Button>
              </div>
            ) : (
              <MaintenanceForm
                assets={assets}
                tickets={tickets}
                onSubmit={(data) => createMutation.mutate(data)}
                isLoading={createMutation.isPending}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All maintenance records</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Upcoming maintenance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Active maintenance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Finished maintenance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalCost)}
            </div>
            <p className="text-xs text-muted-foreground">All maintenance costs</p>
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
                placeholder="Search by asset code, vendor, or description..."
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
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
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
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="preventive">Preventive</SelectItem>
                <SelectItem value="warranty">Warranty</SelectItem>
                <SelectItem value="upgrade">Upgrade</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p className="font-medium">Error loading maintenance records</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as any)?.message || 'Failed to fetch maintenance records'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : maintenance.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No maintenance records</h3>
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Get started by scheduling your first maintenance'}
              </p>
              {!search && statusFilter === 'all' && typeFilter === 'all' && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Schedule Maintenance
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.map((record: any) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{record.asset_code}</div>
                              <div className="text-sm text-muted-foreground">
                                {record.brand} {record.model}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadge(record.maintenance_type) as any}>
                            {record.maintenance_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.vendor_name ? (
                            <div>
                              <div className="font-medium">{record.vendor_name}</div>
                              {record.vendor_contact && (
                                <div className="text-sm text-muted-foreground">
                                  {record.vendor_contact}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.start_date
                            ? format(new Date(record.start_date), "MMM dd, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {record.end_date
                            ? format(new Date(record.end_date), "MMM dd, yyyy")
                            : record.status === 'in_progress' ? (
                              <Badge variant="outline">Ongoing</Badge>
                            ) : (
                              "-"
                            )}
                        </TableCell>
                        <TableCell>
                          {record.cost ? (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">
                                {formatCurrency(parseFloat(record.cost))}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(record.status)}
                            <StatusBadge variant={getStatusVariant(record.status)}>
                              {record.status.replace('_', ' ')}
                            </StatusBadge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMaintenance(record);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMaintenance(record);
                                setIsEditDialogOpen(true);
                              }}
                              disabled={record.status === 'completed'}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  disabled={record.status === 'in_progress'}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Maintenance Record</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this maintenance record? This
                                    action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(record.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    {deleteMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Delete"
                                    )}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
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

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {maintenanceDetail?.data ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getStatusIcon(maintenanceDetail.data.status)}
                  Maintenance Record Details
                </DialogTitle>
                <DialogDescription>
                  View complete information about this maintenance record
                </DialogDescription>
              </DialogHeader>
              <MaintenanceView maintenance={maintenanceDetail.data} currencySymbol={currencySymbol} />
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {maintenanceDetail?.data ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit Maintenance Record</DialogTitle>
                <DialogDescription>
                  Update maintenance record information
                </DialogDescription>
              </DialogHeader>
              <MaintenanceForm
                assets={assets}
                tickets={tickets}
                maintenance={maintenanceDetail.data}
                onSubmit={(data) =>
                  updateMutation.mutate({ id: selectedMaintenance.id, data })
                }
                isLoading={updateMutation.isPending}
                onCancel={() => {
                  setIsEditDialogOpen(false);
                  setSelectedMaintenance(null);
                }}
              />
            </>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Maintenance Form Component
function MaintenanceForm({
  assets,
  tickets,
  maintenance,
  onSubmit,
  isLoading,
  onCancel,
}: {
  assets: any[];
  tickets: any[];
  maintenance?: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    asset_id: maintenance?.asset_id ? maintenance.asset_id.toString() : '',
    ticket_id: maintenance?.ticket_id ? maintenance.ticket_id.toString() : '',
    maintenance_type: maintenance?.maintenance_type || 'repair',
    vendor_name: maintenance?.vendor_name || '',
    vendor_contact: maintenance?.vendor_contact || '',
    cost: maintenance?.cost ? maintenance.cost.toString() : '',
    start_date: maintenance?.start_date
      ? format(new Date(maintenance.start_date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    end_date: maintenance?.end_date
      ? format(new Date(maintenance.end_date), 'yyyy-MM-dd')
      : '',
    status: maintenance?.status || 'scheduled',
    description: maintenance?.description || '',
    notes: maintenance?.notes || '',
  });

  // Reset form when maintenance prop changes (for edit mode)
  useEffect(() => {
    if (maintenance) {
      setFormData({
        asset_id: maintenance.asset_id ? maintenance.asset_id.toString() : '',
        ticket_id: maintenance.ticket_id ? maintenance.ticket_id.toString() : '',
        maintenance_type: maintenance.maintenance_type || 'repair',
        vendor_name: maintenance.vendor_name || '',
        vendor_contact: maintenance.vendor_contact || '',
        cost: maintenance.cost ? maintenance.cost.toString() : '',
        start_date: maintenance.start_date
          ? format(new Date(maintenance.start_date), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        end_date: maintenance.end_date
          ? format(new Date(maintenance.end_date), 'yyyy-MM-dd')
          : '',
        status: maintenance.status || 'scheduled',
        description: maintenance.description || '',
        notes: maintenance.notes || '',
      });
    } else {
      // Reset to defaults for new maintenance
      setFormData({
        asset_id: '',
        ticket_id: '',
        maintenance_type: 'repair',
        vendor_name: '',
        vendor_contact: '',
        cost: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: '',
        status: 'scheduled',
        description: '',
        notes: '',
      });
    }
  }, [maintenance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.asset_id || formData.asset_id === '' || !formData.maintenance_type || !formData.start_date) {
      toast({
        title: "Validation Error",
        description: "Asset, maintenance type, and start date are required",
        variant: "destructive",
      });
      return;
    }

    // Validate asset_id can be parsed
    const assetId = parseInt(formData.asset_id);
    if (isNaN(assetId)) {
      toast({
        title: "Validation Error",
        description: "Please select a valid asset",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      ...formData,
      asset_id: assetId,
      ticket_id: formData.ticket_id && formData.ticket_id !== '' && formData.ticket_id !== 'none' ? parseInt(formData.ticket_id) : null,
      cost: formData.cost && formData.cost !== '' ? parseFloat(formData.cost) : null,
      end_date: formData.end_date && formData.end_date !== '' ? formData.end_date : null,
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="asset_id">Asset *</Label>
          <Select
            value={formData.asset_id}
            onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Select asset" />
            </SelectTrigger>
            <SelectContent>
              {assets.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No assets available
                </div>
              ) : (
                assets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id.toString()}>
                    {asset.asset_code} - {asset.brand} {asset.model}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="maintenance_type">Maintenance Type *</Label>
          <Select
            value={formData.maintenance_type}
            onValueChange={(value) => setFormData({ ...formData, maintenance_type: value })}
            required
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="repair">Repair</SelectItem>
              <SelectItem value="preventive">Preventive</SelectItem>
              <SelectItem value="warranty">Warranty</SelectItem>
              <SelectItem value="upgrade">Upgrade</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            min={formData.start_date}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Cost</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vendor_name">Vendor Name</Label>
          <Input
            id="vendor_name"
            value={formData.vendor_name}
            onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
            placeholder="Vendor or service provider"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vendor_contact">Vendor Contact</Label>
          <Input
            id="vendor_contact"
            value={formData.vendor_contact}
            onChange={(e) => setFormData({ ...formData, vendor_contact: e.target.value })}
            placeholder="Phone or email"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ticket_id">Related Ticket (Optional)</Label>
        <Select
          value={formData.ticket_id && formData.ticket_id !== '' ? formData.ticket_id : "none"}
          onValueChange={(value) => setFormData({ ...formData, ticket_id: value === "none" ? "" : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select ticket (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {tickets.map((ticket) => (
              <SelectItem key={ticket.id} value={ticket.id.toString()}>
                {ticket.ticket_number} - {ticket.subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the maintenance work..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {maintenance ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            maintenance ? 'Update Maintenance' : 'Create Maintenance'
          )}
        </Button>
      </div>
    </form>
  );
}

// Maintenance View Component
function MaintenanceView({ maintenance, currencySymbol = "$" }: { maintenance: any; currencySymbol?: string }) {
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  return (
    <div className="space-y-6">
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="asset">Asset Info</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Maintenance Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="default">{maintenance.maintenance_type}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusBadge variant={
                  maintenance.status === 'scheduled' ? 'info' :
                  maintenance.status === 'in_progress' ? 'warning' :
                  maintenance.status === 'completed' ? 'success' : 'error'
                }>
                  {maintenance.status.replace('_', ' ')}
                </StatusBadge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date:</span>
                <span className="font-medium">
                  {format(new Date(maintenance.start_date), "MMM dd, yyyy")}
                </span>
              </div>
              {maintenance.end_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date:</span>
                  <span className="font-medium">
                    {format(new Date(maintenance.end_date), "MMM dd, yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {maintenance.vendor_name && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Vendor Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="font-medium">{maintenance.vendor_name}</span>
                </div>
                {maintenance.vendor_contact && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact:</span>
                    <span className="font-medium">{maintenance.vendor_contact}</span>
                  </div>
                )}
                {maintenance.cost && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(maintenance.cost))}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {maintenance.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{maintenance.description}</p>
              </CardContent>
            </Card>
          )}

          {maintenance.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{maintenance.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="asset" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Asset Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Asset Code:</span>
                <span className="font-medium">{maintenance.asset_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand:</span>
                <span className="font-medium">{maintenance.brand}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model:</span>
                <span className="font-medium">{maintenance.model}</span>
              </div>
              {maintenance.category_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">{maintenance.category_name}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {maintenance.ticket_number && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Related Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{maintenance.ticket_number}</span>
                </div>
                {maintenance.ticket_subject && (
                  <p className="text-sm text-muted-foreground mt-1">{maintenance.ticket_subject}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
