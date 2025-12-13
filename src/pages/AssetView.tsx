import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Trash2, Loader2, Package, Calendar, DollarSign, Building2, MapPin, FileText, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { assetsApi } from "@/lib/api";
import { format } from "date-fns";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AssetView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', id],
    queryFn: () => assetsApi.getById(parseInt(id!)),
    enabled: !!id,
  });

  const asset = data?.data;

  const retireMutation = useMutation({
    mutationFn: () => assetsApi.update(parseInt(id!), { status: 'retired' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', id] });
      toast({
        title: "Success",
        description: "Asset retired successfully",
      });
      navigate('/it-assets/assets');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to retire asset",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Asset Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {(error as any)?.message || "The asset you're looking for doesn't exist."}
          </p>
          <Button onClick={() => navigate('/it-assets/assets')}>Back to Assets</Button>
        </div>
      </div>
    );
  }

  const categoryName = asset?.category_name?.toLowerCase() || "";
  const isLaptop = categoryName.includes('laptop');
  const isMobile = categoryName.includes('mobile');

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/it-assets/assets')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{asset.asset_code}</h1>
            <p className="text-muted-foreground mt-2">{asset.category_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/it-assets/assets/${asset.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          {asset.status !== 'retired' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Retire
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Retire Asset</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to retire this asset? This will mark it as retired and it will no longer be available for assignment.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => retireMutation.mutate()} 
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={retireMutation.isPending}
                  >
                    {retireMutation.isPending ? "Retiring..." : "Retire Asset"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Asset Code</div>
              <div className="text-lg font-semibold">{asset.asset_code}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
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
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Category</div>
              <div className="text-lg">{asset.category_name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Brand</div>
              <div className="text-lg">{asset.brand || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Model</div>
              <div className="text-lg">{asset.model || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Serial Number</div>
              <div className="text-lg">{asset.serial_number || "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase & Vendor Information */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase & Vendor Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Purchase Date
              </div>
              <div className="text-lg">
                {asset.purchase_date ? format(new Date(asset.purchase_date), "MMM dd, yyyy") : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Purchase Price
              </div>
              <div className="text-lg">
                {asset.purchase_price ? `$${parseFloat(asset.purchase_price).toLocaleString()}` : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Warranty Expiry
              </div>
              <div className="text-lg">
                {asset.warranty_expiry ? format(new Date(asset.warranty_expiry), "MMM dd, yyyy") : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Vendor Name
              </div>
              <div className="text-lg">{asset.vendor_name || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Vendor Contact</div>
              <div className="text-lg">{asset.vendor_contact || "-"}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </div>
              <div className="text-lg">{asset.location || "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device-Specific Details */}
      {isLaptop && asset.laptop_details && (
        <Card>
          <CardHeader>
            <CardTitle>Laptop Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">OS Type</div>
                <div className="text-lg capitalize">{asset.laptop_details.os_type || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">MAC Address</div>
                <div className="text-lg">{asset.laptop_details.mac_address || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Processor</div>
                <div className="text-lg">{asset.laptop_details.processor || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">RAM</div>
                <div className="text-lg">{asset.laptop_details.ram_gb ? `${asset.laptop_details.ram_gb} GB` : "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Storage</div>
                <div className="text-lg">
                  {asset.laptop_details.storage_gb ? `${asset.laptop_details.storage_gb} GB ${asset.laptop_details.storage_type || ""}` : "-"}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Screen Size</div>
                <div className="text-lg">{asset.laptop_details.screen_size || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Graphics Card</div>
                <div className="text-lg">{asset.laptop_details.graphics_card || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isMobile && asset.mobile_details && (
        <Card>
          <CardHeader>
            <CardTitle>Mobile Device Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Device Type</div>
                <div className="text-lg capitalize">{asset.mobile_details.device_type || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">IMEI 1</div>
                <div className="text-lg">{asset.mobile_details.imei_1 || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">IMEI 2</div>
                <div className="text-lg">{asset.mobile_details.imei_2 || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Storage</div>
                <div className="text-lg">{asset.mobile_details.storage_gb ? `${asset.mobile_details.storage_gb} GB` : "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Screen Size</div>
                <div className="text-lg">{asset.mobile_details.screen_size || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Battery Capacity</div>
                <div className="text-lg">{asset.mobile_details.battery_capacity || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLaptop && !isMobile && asset.accessory_details && (
        <Card>
          <CardHeader>
            <CardTitle>Accessory Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Specification</div>
                <div className="text-lg">{asset.accessory_details.specification || "-"}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Compatibility</div>
                <div className="text-lg">{asset.accessory_details.compatibility || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {asset.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Assignment History */}
      {asset.assignments && asset.assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Assignment History
            </CardTitle>
            <CardDescription>Previous assignments for this asset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {asset.assignments.map((assignment: any, index: number) => (
                <div key={assignment.id || index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {assignment.employee_name} ({assignment.emp_code})
                      </span>
                    </div>
                    <StatusBadge
                      variant={assignment.status === "active" ? "info" : "success"}
                    >
                      {assignment.status}
                    </StatusBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Assigned:</span>{" "}
                      {assignment.assigned_date
                        ? format(new Date(assignment.assigned_date), "MMM dd, yyyy")
                        : "-"}
                      {assignment.assigned_by_name && (
                        <span className="ml-2">by {assignment.assigned_by_name}</span>
                      )}
                    </div>
                    {assignment.returned_date && (
                      <div>
                        <span className="font-medium">Returned:</span>{" "}
                        {format(new Date(assignment.returned_date), "MMM dd, yyyy")}
                        {assignment.returned_to_name && (
                          <span className="ml-2">to {assignment.returned_to_name}</span>
                        )}
                      </div>
                    )}
                  </div>
                  {assignment.condition_on_assign && (
                    <div className="mt-2 text-sm">
                      <span className="font-medium">Condition on Assign:</span>{" "}
                      {assignment.condition_on_assign}
                    </div>
                  )}
                  {assignment.condition_on_return && (
                    <div className="mt-1 text-sm">
                      <span className="font-medium">Condition on Return:</span>{" "}
                      {assignment.condition_on_return}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
