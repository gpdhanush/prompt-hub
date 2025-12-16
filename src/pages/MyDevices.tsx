import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Laptop, 
  Plus, 
  Loader2, 
  Package,
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Edit,
  Eye,
  Save,
  Search,
  Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PageTitle } from "@/components/ui/page-title";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { assetsApi } from "@/features/assets/api";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";

export default function MyDevices() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const [formData, setFormData] = useState({
    asset_category_id: "",
    brand: "",
    model: "",
    serial_number: "",
    purchase_date: "",
    purchase_price: "",
    warranty_expiry: "",
    vendor_name: "",
    location: "",
    notes: "",
    // Device-specific fields
    laptop_details: {
      os_type: "",
      mac_address: "",
      processor: "",
      ram_gb: "",
      storage_gb: "",
      storage_type: "SSD",
      screen_size: "",
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

  // Fetch assigned assets
  const { data: assignedAssets, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['assets', 'my-assigned'],
    queryFn: () => assetsApi.getAll({ assigned_only: 'true' }),
    retry: 1,
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['assets', 'categories'],
    queryFn: () => assetsApi.getCategories(),
  });

  const assets = assignedAssets?.data || [];
  const categories = categoriesData?.data || [];
  const selectedCategory = categories.find((cat: any) => cat.id.toString() === formData.asset_category_id);
  const categoryName = selectedCategory?.name?.toLowerCase() || "";

  // Filter assets based on search and filters
  const filteredAssets = assets.filter((asset: any) => {
    const matchesSearch = !searchQuery || 
      asset.asset_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.category_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || asset.status === statusFilter;
    
    const matchesCategory = !categoryFilter || asset.category_name === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const createAndAssignMutation = useMutation({
    mutationFn: async (data: any) => {
      // First create the asset
      const assetResponse = await assetsApi.createEmployeeAsset(data);
      // The backend will auto-assign it, so we just need to return the response
      return assetResponse;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'my-assigned'] });
      setIsAddDialogOpen(false);
      // Reset form
      setFormData({
        asset_category_id: "",
        brand: "",
        model: "",
        serial_number: "",
        purchase_date: "",
        purchase_price: "",
        warranty_expiry: "",
        vendor_name: "",
        location: "",
        notes: "",
        laptop_details: {
          os_type: "",
          mac_address: "",
          processor: "",
          ram_gb: "",
          storage_gb: "",
          storage_type: "SSD",
          screen_size: "",
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
      toast({
        title: "Success",
        description: `Device ${response.data?.asset_code || 'created'} added and assigned to you successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add device",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.asset_category_id) {
      toast({
        title: "Validation Error",
        description: "Device category is required",
        variant: "destructive",
      });
      return;
    }

    const assetData: any = {
      asset_category_id: parseInt(formData.asset_category_id),
      brand: formData.brand || null,
      model: formData.model || null,
      serial_number: formData.serial_number || null,
      purchase_date: formData.purchase_date || null,
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
      warranty_expiry: formData.warranty_expiry || null,
      vendor_name: formData.vendor_name || null,
      location: formData.location || null,
      notes: formData.notes || null,
    };

    // Add device-specific details based on category
    if (categoryName.includes('laptop')) {
      assetData.laptop_details = {
        os_type: formData.laptop_details.os_type || null,
        mac_address: formData.laptop_details.mac_address || null,
        processor: formData.laptop_details.processor || null,
        ram_gb: formData.laptop_details.ram_gb ? parseInt(formData.laptop_details.ram_gb) : null,
        storage_gb: formData.laptop_details.storage_gb ? parseInt(formData.laptop_details.storage_gb) : null,
        storage_type: formData.laptop_details.storage_type || null,
        screen_size: formData.laptop_details.screen_size || null,
      };
    } else if (categoryName.includes('mobile')) {
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

    createAndAssignMutation.mutate(assetData);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'available':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageTitle
          title="My Devices"
          icon={Laptop}
          description="View your assigned devices and add devices you're currently holding"
        />
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Device
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Your Device</DialogTitle>
              <DialogDescription>
                Add a device you're currently holding. It will be added to the asset list and assigned to you.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="asset_category_id">Device Category *</Label>
                      <Select
                        value={formData.asset_category_id}
                        onValueChange={(value) => setFormData({ ...formData, asset_category_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="brand">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="e.g., Apple, Dell, HP"
                      />
                    </div>
                    <div>
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder="e.g., MacBook Pro, ThinkPad X1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="serial_number">Serial Number</Label>
                      <Input
                        id="serial_number"
                        value={formData.serial_number}
                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                        placeholder="Device serial number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="purchase_date">Purchase Date</Label>
                      <DatePicker
                        value={formData.purchase_date}
                        onChange={(date) => setFormData({ ...formData, purchase_date: date || "" })}
                        placeholder="Select purchase date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="warranty_expiry">Warranty Expiry</Label>
                      <DatePicker
                        value={formData.warranty_expiry}
                        onChange={(date) => setFormData({ ...formData, warranty_expiry: date || "" })}
                        placeholder="Select warranty expiry date"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about the device"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Device-Specific Details */}
              {categoryName.includes('laptop') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Laptop Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="os_type">OS Type</Label>
                        <Input
                          id="os_type"
                          value={formData.laptop_details.os_type}
                          onChange={(e) => setFormData({
                            ...formData,
                            laptop_details: { ...formData.laptop_details, os_type: e.target.value }
                          })}
                          placeholder="e.g., Windows 11, macOS"
                        />
                      </div>
                      <div>
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
                      <div>
                        <Label htmlFor="processor">Processor</Label>
                        <Input
                          id="processor"
                          value={formData.laptop_details.processor}
                          onChange={(e) => setFormData({
                            ...formData,
                            laptop_details: { ...formData.laptop_details, processor: e.target.value }
                          })}
                          placeholder="e.g., Intel i7, AMD Ryzen 7"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ram_gb">RAM (GB)</Label>
                        <Input
                          id="ram_gb"
                          type="number"
                          value={formData.laptop_details.ram_gb}
                          onChange={(e) => setFormData({
                            ...formData,
                            laptop_details: { ...formData.laptop_details, ram_gb: e.target.value }
                          })}
                          placeholder="16"
                        />
                      </div>
                      <div>
                        <Label htmlFor="storage_gb">Storage (GB)</Label>
                        <Input
                          id="storage_gb"
                          type="number"
                          value={formData.laptop_details.storage_gb}
                          onChange={(e) => setFormData({
                            ...formData,
                            laptop_details: { ...formData.laptop_details, storage_gb: e.target.value }
                          })}
                          placeholder="512"
                        />
                      </div>
                      <div>
                        <Label htmlFor="screen_size">Screen Size</Label>
                        <Input
                          id="screen_size"
                          value={formData.laptop_details.screen_size}
                          onChange={(e) => setFormData({
                            ...formData,
                            laptop_details: { ...formData.laptop_details, screen_size: e.target.value }
                          })}
                          placeholder="e.g., 14 inch, 15.6 inch"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {categoryName.includes('mobile') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Mobile Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="device_type">Device Type</Label>
                        <Input
                          id="device_type"
                          value={formData.mobile_details.device_type}
                          onChange={(e) => setFormData({
                            ...formData,
                            mobile_details: { ...formData.mobile_details, device_type: e.target.value }
                          })}
                          placeholder="e.g., Smartphone, Tablet"
                        />
                      </div>
                      <div>
                        <Label htmlFor="imei_1">IMEI 1</Label>
                        <Input
                          id="imei_1"
                          value={formData.mobile_details.imei_1}
                          onChange={(e) => setFormData({
                            ...formData,
                            mobile_details: { ...formData.mobile_details, imei_1: e.target.value }
                          })}
                          placeholder="15-digit IMEI"
                        />
                      </div>
                      <div>
                        <Label htmlFor="imei_2">IMEI 2 (if dual SIM)</Label>
                        <Input
                          id="imei_2"
                          value={formData.mobile_details.imei_2}
                          onChange={(e) => setFormData({
                            ...formData,
                            mobile_details: { ...formData.mobile_details, imei_2: e.target.value }
                          })}
                          placeholder="15-digit IMEI"
                        />
                      </div>
                      <div>
                        <Label htmlFor="storage_gb">Storage (GB)</Label>
                        <Input
                          id="storage_gb"
                          type="number"
                          value={formData.mobile_details.storage_gb}
                          onChange={(e) => setFormData({
                            ...formData,
                            mobile_details: { ...formData.mobile_details, storage_gb: e.target.value }
                          })}
                          placeholder="128"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!categoryName.includes('laptop') && !categoryName.includes('mobile') && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Accessory Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="specification">Specification</Label>
                      <Textarea
                        id="specification"
                        value={formData.accessory_details.specification}
                        onChange={(e) => setFormData({
                          ...formData,
                          accessory_details: { ...formData.accessory_details, specification: e.target.value }
                        })}
                        placeholder="Device specifications"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="compatibility">Compatibility</Label>
                      <Input
                        id="compatibility"
                        value={formData.accessory_details.compatibility}
                        onChange={(e) => setFormData({
                          ...formData,
                          accessory_details: { ...formData.accessory_details, compatibility: e.target.value }
                        })}
                        placeholder="Compatible devices/models"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createAndAssignMutation.isPending}>
                  {createAndAssignMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Add Device
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter devices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by asset code, brand, model, serial number, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select 
              value={statusFilter || "all"} 
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="repair">Repair</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={categoryFilter || "all"} 
              onValueChange={(value) => {
                setCategoryFilter(value === "all" ? "" : value);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Devices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Assigned Devices ({filteredAssets.length})</CardTitle>
              <CardDescription>Devices currently assigned to you</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingAssets ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading devices...</p>
              </div>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <Laptop className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery || statusFilter || categoryFilter ? "No devices found" : "No devices assigned"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter || categoryFilter
                  ? 'Try adjusting your filters'
                  : 'Add a device you\'re currently holding using the "Add Device" button'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Asset Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.map((asset: any) => (
                    <TableRow 
                      key={asset.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/my-devices/${asset.id}`)}
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
                          <div className="font-medium">{asset.brand} {asset.model}</div>
                          {asset.serial_number && (
                            <div className="text-sm text-muted-foreground">SN: {asset.serial_number}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{asset.serial_number || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={asset.status === "assigned" ? "info" : "warning"}
                        >
                          {asset.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => navigate(`/my-devices/${asset.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
