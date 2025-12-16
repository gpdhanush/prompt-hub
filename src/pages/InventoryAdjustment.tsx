import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  Minus,
  Package,
  Loader2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { assetsApi } from "@/features/assets/api";
import { toast } from "@/hooks/use-toast";

const ADJUSTMENT_REASONS = [
  { value: "purchase", label: "Purchase/New Stock" },
  { value: "return", label: "Return from User" },
  { value: "transfer_in", label: "Transfer In" },
  { value: "correction", label: "Stock Correction" },
  { value: "damaged", label: "Damaged/Lost" },
  { value: "assigned", label: "Assigned to User" },
  { value: "transfer_out", label: "Transfer Out" },
  { value: "write_off", label: "Write Off" },
  { value: "other", label: "Other" }
];

export default function InventoryAdjustment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const itemId = parseInt(id || '0');

  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch inventory item details
  const { data: itemData, isLoading: itemLoading } = useQuery({
    queryKey: ['inventory-item', itemId],
    queryFn: () => assetsApi.getInventoryItem(itemId),
    enabled: itemId > 0,
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
  });

  const item = itemData?.data;

  // Stock adjustment mutation
  const adjustStockMutation = useMutation({
    mutationFn: (data: { quantity: number; reason: string; notes?: string }) =>
      assetsApi.adjustStock(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-item', itemId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-history'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });

      toast({
        title: "Success",
        description: "Stock adjusted successfully",
      });

      navigate('/it-assets/inventory');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to adjust stock",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Error",
        description: "Please select a reason for the adjustment",
        variant: "destructive",
      });
      return;
    }

    const finalQuantity = adjustmentType === 'add' ? qty : -qty;

    adjustStockMutation.mutate({
      quantity: finalQuantity,
      reason,
      notes: notes.trim() || undefined,
    });
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

  const currentStock = item.current_stock || 0;
  const minStock = item.min_stock_level || 0;
  const newStock = adjustmentType === 'add'
    ? currentStock + (parseInt(quantity) || 0)
    : currentStock - (parseInt(quantity) || 0);

  return (
    <div className="mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/it-assets/inventory')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Inventory
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Adjust Stock</h1>
          <p className="text-muted-foreground">{item.asset_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Item Details */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Item Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Asset Name</Label>
                <p className="text-sm text-muted-foreground">{item.asset_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Asset Code</Label>
                <p className="text-sm text-muted-foreground">{item.asset_code}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Category</Label>
                <p className="text-sm text-muted-foreground">{item.category_name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Current Stock</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-lg font-bold ${
                    currentStock <= minStock ? 'text-red-600' :
                    currentStock <= minStock * 1.5 ? 'text-orange-600' :
                    'text-green-600'
                  }`}>
                    {currentStock}
                  </span>
                  <StatusBadge
                    variant={
                      currentStock === 0 ? "error" :
                      currentStock <= minStock ? "warning" :
                      "success"
                    }
                  >
                    {currentStock === 0 ? "Out of Stock" :
                     currentStock <= minStock ? "Low Stock" :
                     "In Stock"}
                  </StatusBadge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Minimum Stock Level</Label>
                <p className="text-sm text-muted-foreground">{minStock}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adjustment Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Stock Adjustment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Adjustment Type */}
                <div>
                  <Label className="text-sm font-medium">Adjustment Type</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={adjustmentType === 'add' ? 'default' : 'outline'}
                      onClick={() => setAdjustmentType('add')}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stock
                    </Button>
                    <Button
                      type="button"
                      variant={adjustmentType === 'remove' ? 'default' : 'outline'}
                      onClick={() => setAdjustmentType('remove')}
                      className="flex-1"
                    >
                      <Minus className="h-4 w-4 mr-2" />
                      Remove Stock
                    </Button>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    required
                  />
                </div>

                {/* Reason */}
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Select value={reason} onValueChange={setReason} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason for adjustment" />
                    </SelectTrigger>
                    <SelectContent>
                      {ADJUSTMENT_REASONS.map((reasonOption) => (
                        <SelectItem key={reasonOption.value} value={reasonOption.value}>
                          {reasonOption.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this adjustment"
                    rows={3}
                  />
                </div>

                {/* Preview */}
                {quantity && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Stock Preview</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current Stock:</span>
                        <span className="ml-2 font-medium">{currentStock}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">After Adjustment:</span>
                        <span className={`ml-2 font-medium ${
                          newStock < 0 ? 'text-red-600' :
                          newStock <= minStock ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {newStock}
                        </span>
                      </div>
                    </div>
                    {newStock < 0 && (
                      <p className="text-sm text-red-600 mt-2">
                        Warning: This adjustment will result in negative stock
                      </p>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={adjustStockMutation.isPending || !quantity || !reason}
                  >
                    {adjustStockMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {adjustmentType === 'add' ? 'Add Stock' : 'Remove Stock'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}