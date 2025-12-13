import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Loader2, Package, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { assetsApi } from "@/lib/api";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground mt-2">Manage all IT assets in your inventory</p>
        </div>
        <Button onClick={() => navigate('/it-assets/assets/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            </div>
            <Select value={statusFilter || "all"} onValueChange={(value) => {
              setStatusFilter(value === "all" ? "" : value);
              setPage(1);
            }}>
              <SelectTrigger className="w-[180px]">
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
            <Select value={categoryFilter || "all"} onValueChange={(value) => {
              setCategoryFilter(value === "all" ? "" : value);
              setPage(1);
            }}>
              <SelectTrigger className="w-[180px]">
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
          <CardTitle>Asset List ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              <p className="font-medium">Error loading assets</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as any)?.message || 'Failed to fetch assets. Please check your permissions.'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No assets found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Brand / Model</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset: any) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.asset_code}</TableCell>
                      <TableCell>{asset.category_name}</TableCell>
                      <TableCell>
                        {asset.brand} {asset.model}
                      </TableCell>
                      <TableCell>{asset.serial_number || "-"}</TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={
                            asset.status === "available"
                              ? "success"
                              : asset.status === "assigned"
                              ? "info"
                              : asset.status === "repair"
                              ? "warning"
                              : "error"
                          }
                        >
                          {asset.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        {asset.assigned_employee_name
                          ? `${asset.assigned_employee_name} (${asset.assigned_emp_code})`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {asset.purchase_date
                          ? format(new Date(asset.purchase_date), "MMM dd, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/it-assets/assets/${asset.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/it-assets/assets/${asset.id}/edit`)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          {asset.status !== 'retired' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Retire
                                </Button>
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
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
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
