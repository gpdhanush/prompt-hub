import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";

export default function AssetCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    asset_category_id: "",
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
    // Device-specific fields
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

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['assets', 'categories'],
    queryFn: () => assetsApi.getCategories(),
  });

  const categories = categoriesData?.data || [];
  const selectedCategory = categories.find((cat: any) => cat.id.toString() === formData.asset_category_id);
  const categoryName = selectedCategory?.name?.toLowerCase() || "";

  const createMutation = useMutation({
    mutationFn: (data: any) => assetsApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast({
        title: "Success",
        description: `Asset ${response.data.asset_code} created successfully`,
      });
      navigate('/it-assets/assets');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create asset",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.asset_category_id) {
      toast({
        title: "Validation Error",
        description: "Asset category is required",
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
      vendor_contact: formData.vendor_contact || null,
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
        graphics_card: formData.laptop_details.graphics_card || null,
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

    createMutation.mutate(assetData);
  };

  return (
    <div className="mx-auto p-6 space-y-6 ">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/it-assets/assets')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Asset</h1>
          <p className="text-muted-foreground mt-2">Add a new IT asset to the inventory</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Asset Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Asset Information</CardTitle>
            <CardDescription>General asset details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="asset_category_id">Asset Category *</Label>
                <Select
                  value={formData.asset_category_id}
                  onValueChange={(value) => setFormData({ ...formData, asset_category_id: value })}
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
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="serial_number">Serial Number</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Device serial number"
                />
              </div>
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
            </div>
            <div className="grid grid-cols-3 gap-4">
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Office, Warehouse, Floor 2"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes or remarks"
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Laptop Details */}
        {categoryName.includes('laptop') && (
          <Card>
            <CardHeader>
              <CardTitle>Laptop Details</CardTitle>
              <CardDescription>Laptop-specific specifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="os_type">OS Type *</Label>
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
        {categoryName.includes('mobile') && (
          <Card>
            <CardHeader>
              <CardTitle>Mobile Device Details</CardTitle>
              <CardDescription>Mobile device-specific specifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="device_type">Device Type *</Label>
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
        {!categoryName.includes('laptop') && !categoryName.includes('mobile') && (
          <Card>
            <CardHeader>
              <CardTitle>Accessory Details</CardTitle>
              <CardDescription>Accessory specifications</CardDescription>
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

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/it-assets/assets')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Asset
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
