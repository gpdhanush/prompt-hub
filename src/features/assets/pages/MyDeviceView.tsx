import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { ArrowLeft, Loader2, Laptop, Calendar, DollarSign, Building2, MapPin, FileText, User, Clock, CheckCircle, AlertCircle, XCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { assetsApi } from "@/features/assets/api";
import { settingsApi } from "@/features/settings/api";
import { format } from "date-fns";

export default function MyDeviceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch asset - optimized query
  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', id],
    queryFn: () => assetsApi.getById(parseInt(id!)),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch currency symbol from database - optimized query
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 1000 * 60 * 10, // 10 minutes (settings don't change often)
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Memoized derived values
  const asset = useMemo(() => data?.data, [data?.data]);
  const currencySymbol = useMemo(() => settingsData?.data?.currency_symbol || "$", [settingsData?.data?.currency_symbol]);

  // Format currency helper - memoized
  const formatCurrency = useCallback((amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currencySymbol]);

  // Memoized derived values - must be before early returns
  const categoryName = useMemo(() => asset?.category_name?.toLowerCase() || "", [asset?.category_name]);
  const isLaptop = useMemo(() => categoryName.includes('laptop'), [categoryName]);
  const isMobile = useMemo(() => categoryName.includes('mobile'), [categoryName]);

  const getStatusIcon = useCallback((status: string) => {
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
  }, []);

  // Memoized navigation handler
  const handleNavigateBack = useCallback(() => {
    navigate('/my-devices');
  }, [navigate]);

  // Early returns after all hooks
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
          <Laptop className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Device Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {(error as any)?.message || "The device you're looking for doesn't exist or you don't have access to it."}
          </p>
          <Button onClick={handleNavigateBack}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 space-y-6 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleNavigateBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Laptop className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{asset.asset_code}</h1>
                <p className="text-muted-foreground mt-1">{asset.category_name}</p>
              </div>
            </div>
          </div>
        </div>
        
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Core device details and identification</CardDescription>
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
                  <div className="flex items-center gap-2 uppercase">
                    {/* {getStatusIcon(asset.status)} */}
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
            <CardDescription>Previous assignments and usage history for this device</CardDescription>
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
