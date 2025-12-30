import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState, useEffect } from "react";
import { ArrowLeft, Loader2, Laptop, Calendar, DollarSign, Building2, MapPin, FileText, User, Clock, CheckCircle, AlertCircle, XCircle, Package, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { assetsApi } from "@/features/assets/api";
import { settingsApi } from "@/features/settings/api";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";

export default function MyDeviceView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);

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

  // Form state for editing
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    purchase_price: "",
    warranty_expiry: "",
    vendor_name: "",
    vendor_contact: "",
    location: "",
    notes: "",
    status: "available",
    laptop_details: {
      os_type: "",
      mac_address: "",
      processor: "",
      ram_gb: "",
      storage_gb: "",
      storage_type: "SSD",
      screen_size: "",
      graphics_card: "",
    },
    mobile_details: {
      device_type: "",
      imei_1: "",
      imei_2: "",
      storage_gb: "",
      screen_size: "",
      battery_capacity: "",
    },
    accessory_details: {
      specification: "",
      compatibility: "",
    },
  });

  // Populate form when asset data loads
  useEffect(() => {
    if (asset) {
      setFormData({
        brand: asset.brand || "",
        model: asset.model || "",
        serial_number: asset.serial_number || "",
        purchase_date: asset.purchase_date ? asset.purchase_date.split('T')[0] : "",
        purchase_price: asset.purchase_price?.toString() || "",
        warranty_expiry: asset.warranty_expiry ? asset.warranty_expiry.split('T')[0] : "",
        vendor_name: asset.vendor_name || "",
        vendor_contact: asset.vendor_contact || "",
        location: asset.location || "",
        notes: asset.notes || "",
        status: asset.status || "available",
        laptop_details: asset.laptop_details ? {
          os_type: asset.laptop_details.os_type || "",
          mac_address: asset.laptop_details.mac_address || "",
          processor: asset.laptop_details.processor || "",
          ram_gb: asset.laptop_details.ram_gb?.toString() || "",
          storage_gb: asset.laptop_details.storage_gb?.toString() || "",
          storage_type: asset.laptop_details.storage_type || "SSD",
          screen_size: asset.laptop_details.screen_size || "",
          graphics_card: asset.laptop_details.graphics_card || "",
        } : {
          os_type: "",
          mac_address: "",
          processor: "",
          ram_gb: "",
          storage_gb: "",
          storage_type: "SSD",
          screen_size: "",
          graphics_card: "",
        },
        mobile_details: asset.mobile_details ? {
          device_type: asset.mobile_details.device_type || "",
          imei_1: asset.mobile_details.imei_1 || "",
          imei_2: asset.mobile_details.imei_2 || "",
          storage_gb: asset.mobile_details.storage_gb?.toString() || "",
          screen_size: asset.mobile_details.screen_size || "",
          battery_capacity: asset.mobile_details.battery_capacity || "",
        } : {
          device_type: "",
          imei_1: "",
          imei_2: "",
          storage_gb: "",
          screen_size: "",
          battery_capacity: "",
        },
        accessory_details: asset.accessory_details ? {
          specification: asset.accessory_details.specification || "",
          compatibility: asset.accessory_details.compatibility || "",
        } : {
          specification: "",
          compatibility: "",
        },
      });
    }
  }, [asset]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => assetsApi.update(parseInt(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', id] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'my-assigned'] });
      setIsEditMode(false);
      toast({
        title: "Success",
        description: "Device updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update device",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const assetData: any = {
      brand: formData.brand || null,
      model: formData.model || null,
      serial_number: formData.serial_number || null,
      purchase_date: formData.purchase_date || null,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      warranty_expiry: formData.warranty_expiry || null,
      vendor_name: formData.vendor_name || null,
      vendor_contact: formData.vendor_contact || null,
      location: formData.location || null,
      notes: formData.notes || null,
      status: formData.status,
    };

    // Add device-specific details based on category
    if (isLaptop) {
      assetData.laptop_details = {
        os_type: formData.laptop_details.os_type || null,
        mac_address: formData.laptop_details.mac_address || null,
        processor: formData.laptop_details.processor || null,
        ram_gb: formData.laptop_details.ram_gb ? parseInt(formData.laptop_details.ram_gb) : null,
        storage_gb: formData.laptop_details.storage_gb ? parseInt(formData.laptop_details.storage_gb) : null,
        storage_type: formData.laptop_details.storage_type || null,
        screen_size: formData.laptop_details.screen_size || null,
        graphics_card: formData.laptop_details.graphics_card || null,
      };
    } else if (isMobile) {
      assetData.mobile_details = {
        device_type: formData.mobile_details.device_type || null,
        imei_1: formData.mobile_details.imei_1 || null,
        imei_2: formData.mobile_details.imei_2 || null,
        storage_gb: formData.mobile_details.storage_gb ? parseInt(formData.mobile_details.storage_gb) : null,
        screen_size: formData.mobile_details.screen_size || null,
        battery_capacity: formData.mobile_details.battery_capacity || null,
      };
    } else {
      assetData.accessory_details = {
        specification: formData.accessory_details.specification || null,
        compatibility: formData.accessory_details.compatibility || null,
      };
    }

    updateMutation.mutate(assetData);
  };

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
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <Button onClick={() => setIsEditMode(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Device
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditMode(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {isEditMode ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Core device details and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Asset Code</Label>
                  <div className="text-lg font-semibold font-mono">{asset.asset_code}</div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase">Category</Label>
                  <div>
                    <Badge variant="outline">{asset.category_name}</Badge>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g., Apple, Dell, HP"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., MacBook Pro, ThinkPad X1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="serial_number">Serial Number</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="Device serial number"
                  />
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <DatePicker
                    value={formData.purchase_date}
                    onChange={(date) => setFormData({ ...formData, purchase_date: date || "" })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="purchase_price">Purchase Price</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
                  <DatePicker
                    value={formData.warranty_expiry}
                    onChange={(date) => setFormData({ ...formData, warranty_expiry: date || "" })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vendor_name">Vendor Name</Label>
                  <Input
                    id="vendor_name"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    placeholder="Vendor/Supplier name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="vendor_contact">Vendor Contact</Label>
                  <Input
                    id="vendor_contact"
                    value={formData.vendor_contact}
                    onChange={(e) => setFormData({ ...formData, vendor_contact: e.target.value })}
                    placeholder="Vendor contact info"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Office, Warehouse, Floor 2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Laptop Details */}
          {isLaptop && (
            <Card>
              <CardHeader>
                <CardTitle>Laptop Specifications</CardTitle>
                <CardDescription>Hardware and software details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="os_type">OS Type</Label>
                    <Select
                      value={formData.laptop_details.os_type}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        laptop_details: { ...formData.laptop_details, os_type: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select OS" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mac">Mac</SelectItem>
                        <SelectItem value="windows">Windows</SelectItem>
                        <SelectItem value="linux">Linux</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mac_address">MAC Address</Label>
                    <Input
                      id="mac_address"
                      value={formData.laptop_details.mac_address}
                      onChange={(e) => setFormData({
                        ...formData,
                        laptop_details: { ...formData.laptop_details, mac_address: e.target.value }
                      })}
                      placeholder="XX:XX:XX:XX:XX:XX"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="processor">Processor</Label>
                    <Input
                      id="processor"
                      value={formData.laptop_details.processor}
                      onChange={(e) => setFormData({
                        ...formData,
                        laptop_details: { ...formData.laptop_details, processor: e.target.value }
                      })}
                      placeholder="e.g., Intel i7, Apple M1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ram_gb">RAM (GB)</Label>
                    <Input
                      id="ram_gb"
                      type="number"
                      value={formData.laptop_details.ram_gb}
                      onChange={(e) => setFormData({
                        ...formData,
                        laptop_details: { ...formData.laptop_details, ram_gb: e.target.value }
                      })}
                      placeholder="e.g., 8, 16, 32"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="storage_gb">Storage (GB)</Label>
                    <Input
                      id="storage_gb"
                      type="number"
                      value={formData.laptop_details.storage_gb}
                      onChange={(e) => setFormData({
                        ...formData,
                        laptop_details: { ...formData.laptop_details, storage_gb: e.target.value }
                      })}
                      placeholder="e.g., 256, 512, 1024"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="storage_type">Storage Type</Label>
                    <Select
                      value={formData.laptop_details.storage_type}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        laptop_details: { ...formData.laptop_details, storage_type: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SSD">SSD</SelectItem>
                        <SelectItem value="HDD">HDD</SelectItem>
                        <SelectItem value="NVMe">NVMe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="screen_size">Screen Size</Label>
                    <Input
                      id="screen_size"
                      value={formData.laptop_details.screen_size}
                      onChange={(e) => setFormData({
                        ...formData,
                        laptop_details: { ...formData.laptop_details, screen_size: e.target.value }
                      })}
                      placeholder='e.g., 13", 15.6"'
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="graphics_card">Graphics Card</Label>
                  <Input
                    id="graphics_card"
                    value={formData.laptop_details.graphics_card}
                    onChange={(e) => setFormData({
                      ...formData,
                      laptop_details: { ...formData.laptop_details, graphics_card: e.target.value }
                    })}
                    placeholder="e.g., NVIDIA RTX 3060, Integrated"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mobile Details */}
          {isMobile && (
            <Card>
              <CardHeader>
                <CardTitle>Mobile Device Specifications</CardTitle>
                <CardDescription>Device-specific details and identifiers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="device_type">Device Type</Label>
                    <Select
                      value={formData.mobile_details.device_type}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        mobile_details: { ...formData.mobile_details, device_type: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select device type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="android">Android</SelectItem>
                        <SelectItem value="iphone">iPhone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="imei_1">IMEI 1</Label>
                    <Input
                      id="imei_1"
                      value={formData.mobile_details.imei_1}
                      onChange={(e) => setFormData({
                        ...formData,
                        mobile_details: { ...formData.mobile_details, imei_1: e.target.value }
                      })}
                      placeholder="15-digit IMEI"
                      maxLength={15}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="imei_2">IMEI 2 (if dual SIM)</Label>
                    <Input
                      id="imei_2"
                      value={formData.mobile_details.imei_2}
                      onChange={(e) => setFormData({
                        ...formData,
                        mobile_details: { ...formData.mobile_details, imei_2: e.target.value }
                      })}
                      placeholder="15-digit IMEI"
                      maxLength={15}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="mobile_storage_gb">Storage (GB)</Label>
                    <Input
                      id="mobile_storage_gb"
                      type="number"
                      value={formData.mobile_details.storage_gb}
                      onChange={(e) => setFormData({
                        ...formData,
                        mobile_details: { ...formData.mobile_details, storage_gb: e.target.value }
                      })}
                      placeholder="e.g., 64, 128, 256"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mobile_screen_size">Screen Size</Label>
                    <Input
                      id="mobile_screen_size"
                      value={formData.mobile_details.screen_size}
                      onChange={(e) => setFormData({
                        ...formData,
                        mobile_details: { ...formData.mobile_details, screen_size: e.target.value }
                      })}
                      placeholder='e.g., 6.1", 6.7"'
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="battery_capacity">Battery Capacity</Label>
                    <Input
                      id="battery_capacity"
                      value={formData.mobile_details.battery_capacity}
                      onChange={(e) => setFormData({
                        ...formData,
                        mobile_details: { ...formData.mobile_details, battery_capacity: e.target.value }
                      })}
                      placeholder="e.g., 4000mAh"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Accessory Details */}
          {!isLaptop && !isMobile && (
            <Card>
              <CardHeader>
                <CardTitle>Accessory Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="specification">Specification</Label>
                  <Textarea
                    id="specification"
                    value={formData.accessory_details.specification}
                    onChange={(e) => setFormData({
                      ...formData,
                      accessory_details: { ...formData.accessory_details, specification: e.target.value }
                    })}
                    placeholder="Detailed specifications of the accessory"
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="compatibility">Compatibility</Label>
                  <Input
                    id="compatibility"
                    value={formData.accessory_details.compatibility}
                    onChange={(e) => setFormData({
                      ...formData,
                      accessory_details: { ...formData.accessory_details, compatibility: e.target.value }
                    })}
                    placeholder="e.g., USB-C, Lightning, Bluetooth 5.0"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </CardTitle>
              <CardDescription>Additional information and remarks</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or remarks"
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <>
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
        </>
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
