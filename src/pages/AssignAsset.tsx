import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetsApi, employeesApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";

export default function AssignAsset() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    asset_id: "",
    employee_id: "",
    assigned_date: new Date().toISOString().split('T')[0],
    condition_on_assign: "good",
    notes: "",
  });

  // Fetch available assets (status = available)
  const { data: assetsData, isLoading: isLoadingAssets } = useQuery({
    queryKey: ['assets', 'available'],
    queryFn: () => assetsApi.getAll({ status: 'available', limit: 1000 }),
  });

  // Fetch employees
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1000 }),
  });

  const availableAssets = assetsData?.data?.filter((asset: any) => asset.status === 'available') || [];
  const employees = employeesData?.data || [];

  const assignMutation = useMutation({
    mutationFn: (data: any) => assetsApi.assignAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'assignments'] });
      toast({
        title: "Success",
        description: "Asset assigned successfully",
      });
      navigate('/it-assets/assignments');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign asset",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.asset_id || !formData.employee_id || !formData.assigned_date) {
      toast({
        title: "Validation Error",
        description: "Asset, Employee, and Assigned Date are required",
        variant: "destructive",
      });
      return;
    }

    const assignmentData = {
      asset_id: parseInt(formData.asset_id),
      employee_id: parseInt(formData.employee_id),
      assigned_date: formData.assigned_date,
      condition_on_assign: formData.condition_on_assign || 'good',
      notes: formData.notes || null,
    };

    assignMutation.mutate(assignmentData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/it-assets/assignments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Assign Asset</h1>
          <p className="text-muted-foreground mt-2">Assign an asset to an employee</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
            <CardDescription>Select asset and employee for assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="asset_id">Asset *</Label>
                {isLoadingAssets ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading assets...
                  </div>
                ) : (
                  <Select
                    value={formData.asset_id}
                    onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssets.length === 0 ? (
                        <SelectItem value="none" disabled>No available assets</SelectItem>
                      ) : (
                        availableAssets.map((asset: any) => (
                          <SelectItem key={asset.id} value={asset.id.toString()}>
                            {asset.asset_code} - {asset.brand} {asset.model} ({asset.category_name})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="employee_id">Employee *</Label>
                {isLoadingEmployees ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading employees...
                  </div>
                ) : (
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.length === 0 ? (
                        <SelectItem value="none" disabled>No employees found</SelectItem>
                      ) : (
                        employees.map((emp: any) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.emp_code} - {emp.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="assigned_date">Assigned Date *</Label>
                <DatePicker
                  value={formData.assigned_date}
                  onChange={(date) => setFormData({ ...formData, assigned_date: date || "" })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="condition_on_assign">Condition on Assign</Label>
                <Select
                  value={formData.condition_on_assign}
                  onValueChange={(value) => setFormData({ ...formData, condition_on_assign: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about the assignment"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/it-assets/assignments')}>
            Cancel
          </Button>
          <Button type="submit" disabled={assignMutation.isPending || availableAssets.length === 0}>
            {assignMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Assign Asset
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
