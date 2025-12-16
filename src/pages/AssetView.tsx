import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Trash2, Loader2, Package, Calendar, DollarSign, Building2, MapPin, FileText, User, Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { assetsApi, settingsApi } from "@/lib/api";
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

  // Fetch currency symbol from database
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const asset = data?.data;
  const currencySymbol = settingsData?.data?.currency_symbol || "$";

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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

  return (
    <div className="mx-auto p-6 space-y-6 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/it-assets/assets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{asset.asset_code}</h1>
                <p className="text-muted-foreground mt-1">{asset.category_name}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
         
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
          <CardDescription>Core asset details and identification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Asset Code</Label>
              <div className="text-lg font-semibold font-mono">{asset.asset_code}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Status</Label>
              <div>
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
                  <div className="flex items-center gap-2">
                    {getStatusIcon(asset.status)}
                    {asset.status}
                  </div>
                </StatusBadge>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Category</Label>
              <div>
                <Badge variant="outline">{asset.category_name}</Badge>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Brand</Label>
              <div className="text-lg font-medium">{asset.brand || "-"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Model</Label>
              <div className="text-lg font-medium">{asset.model || "-"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Serial Number</Label>
              <div className="text-lg font-mono text-muted-foreground">{asset.serial_number || "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase & Vendor Information */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase & Vendor Information</CardTitle>
          <CardDescription>Financial and vendor details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Purchase Date
              </Label>
              <div className="text-lg font-medium">
                {asset.purchase_date ? format(new Date(asset.purchase_date), "MMM dd, yyyy") : "-"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                <DollarSign className="h-3 w-3" />
                Purchase Price
              </Label>
              <div className="text-lg font-semibold">
                {asset.purchase_price ? formatCurrency(parseFloat(asset.purchase_price)) : "-"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Warranty Expiry
              </Label>
              <div className="text-lg font-medium">
                {asset.warranty_expiry ? format(new Date(asset.warranty_expiry), "MMM dd, yyyy") : "-"}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                <Building2 className="h-3 w-3" />
                Vendor Name
              </Label>
              <div className="text-lg font-medium">{asset.vendor_name || "-"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase">Vendor Contact</Label>
              <div className="text-lg font-medium">{asset.vendor_contact || "-"}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                <MapPin className="h-3 w-3" />
                Location
              </Label>
              <div className="text-lg font-medium">{asset.location || "-"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device-Specific Details */}
      {isLaptop && asset.laptop_details && (
        <Card>
          <CardHeader>
            <CardTitle>Laptop Specifications</CardTitle>
            <CardDescription>Hardware and software details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">OS Type</Label>
                <div className="text-lg font-medium capitalize">{asset.laptop_details.os_type || "-"}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">MAC Address</Label>
                <div className="text-lg font-mono text-muted-foreground">{asset.laptop_details.mac_address || "-"}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Processor</Label>
                <div className="text-lg font-medium">{asset.laptop_details.processor || "-"}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">RAM</Label>
                <div className="text-lg font-medium">{asset.laptop_details.ram_gb ? `${asset.laptop_details.ram_gb} GB` : "-"}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Storage</Label>
                <div className="text-lg font-medium">
                  {asset.laptop_details.storage_gb ? `${asset.laptop_details.storage_gb} GB ${asset.laptop_details.storage_type || ""}` : "-"}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Screen Size</Label>
                <div className="text-lg font-medium">{asset.laptop_details.screen_size || "-"}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Graphics Card</Label>
                <div className="text-lg font-medium">{asset.laptop_details.graphics_card || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isMobile && asset.mobile_details && (
        <Card>
          <CardHeader>
            <CardTitle>Mobile Device Specifications</CardTitle>
            <CardDescription>Device-specific details and identifiers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Device Type</Label>
                <div className="text-lg font-medium capitalize">{asset.mobile_details.device_type || "-"}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">IMEI 1</Label>
                <div className="text-lg font-mono text-muted-foreground">{asset.mobile_details.imei_1 || "-"}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">IMEI 2</Label>
                <div className="text-lg font-mono text-muted-foreground">{asset.mobile_details.imei_2 || "-"}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Storage</Label>
                <div className="text-lg font-medium">{asset.mobile_details.storage_gb ? `${asset.mobile_details.storage_gb} GB` : "-"}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Screen Size</Label>
                <div className="text-lg font-medium">{asset.mobile_details.screen_size || "-"}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground uppercase">Battery Capacity</Label>
                <div className="text-lg font-medium">{asset.mobile_details.battery_capacity || "-"}</div>
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
            <CardDescription>Additional information and remarks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{asset.notes}</p>
            </div>
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
            <CardDescription>Previous assignments and usage history for this asset</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {asset.assignments.map((assignment: any, index: number) => (
                <div key={assignment.id || index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {assignment.employee_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{assignment.employee_name}</p>
                        <p className="text-sm text-muted-foreground">{assignment.emp_code}</p>
                      </div>
                    </div>
                    <StatusBadge
                      variant={assignment.status === "active" ? "info" : "success"}
                    >
                      {assignment.status}
                    </StatusBadge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium">Assigned:</span>{" "}
                        {assignment.assigned_date
                          ? format(new Date(assignment.assigned_date), "MMM dd, yyyy")
                          : "-"}
                        {assignment.assigned_by_name && (
                          <span className="text-muted-foreground ml-2">by {assignment.assigned_by_name}</span>
                        )}
                      </div>
                    </div>
                    {assignment.returned_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">Returned:</span>{" "}
                          {format(new Date(assignment.returned_date), "MMM dd, yyyy")}
                          {assignment.returned_to_name && (
                            <span className="text-muted-foreground ml-2">to {assignment.returned_to_name}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {(assignment.condition_on_assign || assignment.condition_on_return) && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {assignment.condition_on_assign && (
                        <div className="text-sm">
                          <span className="font-medium">Condition on Assign:</span>{" "}
                          <Badge variant="outline">{assignment.condition_on_assign}</Badge>
                        </div>
                      )}
                      {assignment.condition_on_return && (
                        <div className="text-sm">
                          <span className="font-medium">Condition on Return:</span>{" "}
                          <Badge variant="outline">{assignment.condition_on_return}</Badge>
                        </div>
                      )}
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
