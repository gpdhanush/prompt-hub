import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Loader2, 
  Package, 
  Edit, 
  Trash2, 
  Eye,
  MoreHorizontal,
  Filter,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { assetsApi } from "@/features/assets/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
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

export default function Assets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', page, limit, search, statusFilter, categoryFilter],
    queryFn: () => assetsApi.getAll({
      page,
      limit,
      search: search || undefined,
      status: statusFilter || undefined,
      category_id: categoryFilter ? parseInt(categoryFilter) : undefined,
    }),
    retry: 1,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['assets', 'categories'],
    queryFn: () => assetsApi.getCategories(),
  });

  const assets = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'assigned':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'repair':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'damaged':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'retired':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'assigned':
        return 'info';
      case 'repair':
        return 'warning';
      case 'damaged':
      case 'retired':
        return 'error';
      default:
        return 'neutral';
    }
  };

  // Calculate stats
  const stats = {
    total: total,
    available: assets.filter((a: any) => a.status === 'available').length,
    assigned: assets.filter((a: any) => a.status === 'assigned').length,
    repair: assets.filter((a: any) => a.status === 'repair').length,
  };

  return (
    <div className="mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            Assets
          </h1>
          <p className="text-muted-foreground mt-2">Manage all IT assets in your inventory</p>
        </div>
        <Button onClick={() => navigate('/it-assets/assets/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <p className="text-xs text-muted-foreground">Ready for assignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.assigned}</div>
            <p className="text-xs text-muted-foreground">Currently in use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Repair</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.repair}</div>
            <p className="text-xs text-muted-foreground">Under maintenance</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter assets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code, brand, model, or serial number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select 
              value={statusFilter || "all"} 
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={categoryFilter || "all"} 
              onValueChange={(value) => {
                setCategoryFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesData?.data?.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Asset List ({total})</CardTitle>
              <CardDescription>All assets in the inventory</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="font-medium text-destructive">Error loading assets</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as any)?.message || 'Failed to fetch assets. Please check your permissions.'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No assets found</h3>
              <p className="text-muted-foreground">
                {search || statusFilter || categoryFilter
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first asset'}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Asset Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Brand / Model</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Purchase Date</TableHead>
                      <TableHead className="text-right w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset: any) => (
                      <TableRow 
                        key={asset.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/it-assets/assets/${asset.id}`)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(asset.status)}
                            <span className="font-mono text-sm">{asset.asset_code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{asset.category_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{asset.brand} {asset.model}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground font-mono">
                            {asset.serial_number || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(asset.status)}
                            <StatusBadge variant={getStatusVariant(asset.status)}>
                              {asset.status}
                            </StatusBadge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {asset.assigned_employee_name ? (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{asset.assigned_employee_name}</p>
                                <p className="text-xs text-muted-foreground">{asset.assigned_emp_code}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {asset.purchase_date
                              ? format(new Date(asset.purchase_date), "MMM dd, yyyy")
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/it-assets/assets/${asset.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/it-assets/assets/${asset.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Asset
                              </DropdownMenuItem>
                              {asset.status !== 'retired' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem 
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Retire Asset
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Retire Asset</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to retire asset {asset.asset_code}? This will mark it as retired and it will no longer be available for assignment.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={async () => {
                                            try {
                                              await assetsApi.update(asset.id, { status: 'retired' });
                                              queryClient.invalidateQueries({ queryKey: ['assets'] });
                                              toast({
                                                title: "Success",
                                                description: "Asset retired successfully",
                                              });
                                            } catch (error: any) {
                                              toast({
                                                title: "Error",
                                                description: error.message || "Failed to retire asset",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Retire Asset
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} assets
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
    </div>
  );
}
