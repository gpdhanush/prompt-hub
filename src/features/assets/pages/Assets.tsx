import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { 
  Package, 
  Edit, 
  Trash2, 
  Eye,
  MoreHorizontal,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { assetsApi } from "@/features/assets/api";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AssetsHeader } from "../components/AssetsHeader";
import { AssetsFilters } from "../components/AssetsFilters";
import { AssetsStats } from "../components/AssetsStats";
import PaginationControls from "@/shared/components/PaginationControls";
import { getStatusIcon, getStatusVariant } from "../utils/utils";
import { DEFAULT_PAGE_LIMIT } from "../utils/constants";
import { getCurrentUser } from "@/lib/auth";

export default function Assets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const currentUser = getCurrentUser();
  const canCreateAsset = ['Admin', 'Super Admin', 'Team Lead', 'Manager'].includes(currentUser?.role || '');
  
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_PAGE_LIMIT);
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['assets', 'categories'],
    queryFn: () => assetsApi.getCategories(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const assets = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const categories = categoriesData?.data || [];

  // Calculate stats with useMemo
  const stats = useMemo(() => {
    return {
      total: total,
      available: assets.filter((a: any) => a.status === 'available').length,
      assigned: assets.filter((a: any) => a.status === 'assigned').length,
      repair: assets.filter((a: any) => a.status === 'repair').length,
    };
  }, [assets, total]);

  const retireAssetMutation = useMutation({
    mutationFn: (assetId: number) => assetsApi.update(assetId, { status: 'retired' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast({
        title: "Success",
        description: "Asset retired successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to retire asset",
        variant: "destructive",
      });
    },
  });

  // Handlers with useCallback
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleCategoryFilterChange = useCallback((value: string) => {
    setCategoryFilter(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleView = useCallback((assetId: number) => {
    navigate(`/it-assets/assets/${assetId}`);
  }, [navigate]);

  const handleEdit = useCallback((assetId: number) => {
    navigate(`/it-assets/assets/${assetId}/edit`);
  }, [navigate]);

  const handleRetire = useCallback((assetId: number) => {
    retireAssetMutation.mutate(assetId);
  }, [retireAssetMutation]);

  const renderStatusIcon = useCallback((status: string) => {
    const IconComponent = getStatusIcon(status);
    return <IconComponent className="h-4 w-4" />;
  }, []);

  return (
    <div className="mx-auto p-6 space-y-6">
      <AssetsHeader canCreateAsset={canCreateAsset} />

      <AssetsStats
        total={stats.total}
        available={stats.available}
        assigned={stats.assigned}
        repair={stats.repair}
      />

      <AssetsFilters
        search={search}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={handleCategoryFilterChange}
        categories={categories}
      />

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
                        onClick={() => handleView(asset.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {renderStatusIcon(asset.status)}
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
                            {renderStatusIcon(asset.status)}
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
                              <DropdownMenuItem onClick={() => handleView(asset.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(asset.id)}>
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
                                          onClick={() => handleRetire(asset.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          disabled={retireAssetMutation.isPending}
                                        >
                                          {retireAssetMutation.isPending ? "Retiring..." : "Retire Asset"}
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
                  <PaginationControls
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
