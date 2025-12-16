import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetsApi } from "@/features/assets/api";
import { settingsApi } from "@/features/settings/api";
import { toast } from "@/hooks/use-toast";

export default function InventoryCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    asset_category_id: "",
    asset_name: "",
    asset_code: "",
    initial_stock: "",
    min_stock_level: "",
    unit_price: "",
    location: "",
    notes: "",
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

  const createMutation = useMutation({
    mutationFn: (data: any) => assetsApi.createInventoryItem(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast({
        title: "Success",
        description: `Inventory item ${response.data.asset_name || response.data.asset_code} created successfully`,
      });
      navigate('/it-assets/inventory');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create inventory item",
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
      initial_stock: formData.initial_stock ? parseInt(formData.initial_stock) : 0,
      min_stock_level: parseInt(formData.min_stock_level),
      unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
      location: formData.location || null,
      notes: formData.notes || null,
    };

    createMutation.mutate(inventoryData);
  };

  return (
    <div className="mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/it-assets/inventory')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Inventory Item</h1>
          <p className="text-muted-foreground mt-2">Create a new inventory item with stock tracking</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
            <CardDescription>Enter the basic details for the inventory item</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                placeholder="Auto-generated if left empty"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to auto-generate a code
              </p>
            </div>

            {/* Initial Stock */}
            <div>
              <Label htmlFor="initial_stock">Initial Stock Quantity</Label>
              <Input
                id="initial_stock"
                type="number"
                min="0"
                value={formData.initial_stock}
                onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Starting stock quantity (default: 0)
              </p>
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
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Item
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}