import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2, Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { assetsApi, settingsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function InventoryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const itemId = parseInt(id || '0');

  const [formData, setFormData] = useState({
    asset_category_id: "",
    asset_name: "",
    asset_code: "",
    min_stock_level: "",
    unit_price: "",
    location: "",
    notes: "",
  });

  // Fetch inventory item
  const { data: itemData, isLoading: itemLoading } = useQuery({
    queryKey: ['inventory-item', itemId],
    queryFn: () => assetsApi.getInventoryItem(itemId),
    enabled: itemId > 0,
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['assets', 'categories'],
    queryFn: () => assetsApi.getCategories(),
  });

  // Fetch currency symbol from database
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const currencySymbol = settingsData?.data?.currency_symbol || "$";
  const categories = categoriesData?.data || [];
  const item = itemData?.data;

  // Populate form when item data is loaded
  useEffect(() => {
    if (item) {
      setFormData({
        asset_category_id: item.asset_category_id?.toString() || "",
        asset_name: item.asset_name || "",
        asset_code: item.asset_code || "",
        min_stock_level: item.min_stock_level?.toString() || "",
        unit_price: item.unit_price?.toString() || "",
        location: item.location || "",
        notes: item.notes || "",
      });
    }
  }, [item]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => assetsApi.updateInventoryItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast({
        title: "Success",
        description: "Inventory item updated successfully",
      });
      navigate('/it-assets/inventory');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update inventory item",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => assetsApi.deleteInventoryItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast({
        title: "Success",
        description: "Inventory item deleted successfully",
      });
      navigate('/it-assets/inventory');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete inventory item",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.asset_category_id) {
      toast({
        title: "Validation Error",
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.asset_name) {
      toast({
        title: "Validation Error",
        description: "Item name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.min_stock_level || parseInt(formData.min_stock_level) < 0) {
      toast({
        title: "Validation Error",
        description: "Minimum stock level must be 0 or greater",
        variant: "destructive",
      });
      return;
    }

    const inventoryData: any = {
      asset_category_id: parseInt(formData.asset_category_id),
      asset_name: formData.asset_name,
      asset_code: formData.asset_code || null,
      min_stock_level: parseInt(formData.min_stock_level),
      unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
      location: formData.location || null,
      notes: formData.notes || null,
    };

    updateMutation.mutate(inventoryData);
  };

  if (itemLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold">Item not found</h2>
          <Button onClick={() => navigate('/it-assets/inventory')} className="mt-4">
            Back to Inventory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/it-assets/inventory')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Inventory Item</h1>
            <p className="text-muted-foreground mt-2">Update inventory item details</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the inventory item
                "{item.asset_name}" and all associated stock history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
            <CardDescription>Update the details for this inventory item</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Stock (Read-only) */}
            <div>
              <Label>Current Stock</Label>
              <Input
                value={item.current_stock || 0}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Stock quantity cannot be changed here. Use "Adjust Stock" to modify quantities.
              </p>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.asset_category_id}
                onValueChange={(value) => setFormData({ ...formData, asset_category_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Item Name */}
            <div>
              <Label htmlFor="asset_name">Item Name *</Label>
              <Input
                id="asset_name"
                value={formData.asset_name}
                onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                placeholder="e.g., USB Cable, Mouse, Keyboard"
                required
              />
            </div>

            {/* Asset Code */}
            <div>
              <Label htmlFor="asset_code">Item Code</Label>
              <Input
                id="asset_code"
                value={formData.asset_code}
                onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                placeholder="Item code"
              />
            </div>

            {/* Minimum Stock Level */}
            <div>
              <Label htmlFor="min_stock_level">Minimum Stock Level *</Label>
              <Input
                id="min_stock_level"
                type="number"
                min="0"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                placeholder="10"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alert will be triggered when stock falls below this level
              </p>
            </div>

            {/* Unit Price */}
            <div>
              <Label htmlFor="unit_price">Unit Price ({currencySymbol})</Label>
              <Input
                id="unit_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Price per unit for valuation purposes
              </p>
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Warehouse A, Storage Room 1"
              />
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information about this inventory item"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/it-assets/inventory')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Update Item
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}