import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetsApi } from "@/features/assets/api";
import { toast } from "@/hooks/use-toast";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

export default function ReturnAsset() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    returned_date: new Date().toISOString().split('T')[0],
    condition_on_return: "good",
    notes: "",
  });

  // Fetch assignment details
  const { data: assignmentsData, isLoading: isLoadingAssignment, error: assignmentError } = useQuery({
    queryKey: ['assets', 'assignments', 'all'],
    queryFn: async () => {
      const allAssignments = await assetsApi.getAssignments({ limit: 1000 });
      const assignment = allAssignments.data.find((a: any) => a.id.toString() === id);
      if (!assignment) {
        throw new Error('Assignment not found');
      }
      return { data: assignment };
    },
    enabled: !!id,
  });

  const assignment = assignmentsData?.data;

  useEffect(() => {
    if (assignment) {
      setFormData({
        returned_date: new Date().toISOString().split('T')[0],
        condition_on_return: assignment.condition_on_assign || "good",
        notes: "",
      });
    }
  }, [assignment]);

  const returnMutation = useMutation({
    mutationFn: (data: any) => assetsApi.returnAsset(parseInt(id!), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', 'assignments'] });
      toast({
        title: "Success",
        description: "Asset returned successfully",
      });
      navigate('/it-assets/assignments');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to return asset",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.returned_date) {
      toast({
        title: "Validation Error",
        description: "Returned date is required",
        variant: "destructive",
      });
      return;
    }

    const returnData = {
      returned_date: formData.returned_date,
      condition_on_return: formData.condition_on_return || 'good',
      notes: formData.notes || null,
    };

    returnMutation.mutate(returnData);
  };

  if (isLoadingAssignment) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (assignmentError || !assignment) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Assignment Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {(assignmentError as any)?.message || "The assignment you're looking for doesn't exist or may have been returned."}
          </p>
          <Button onClick={() => navigate('/it-assets/assignments')}>Back to Assignments</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/it-assets/assignments')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Return Asset</h1>
          <p className="text-muted-foreground mt-2">Return an assigned asset</p>
        </div>
      </div>

      {/* Assignment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Asset</div>
              <div className="text-lg font-semibold">
                {assignment.asset_code} - {assignment.brand} {assignment.model}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Employee</div>
              <div className="text-lg font-semibold">
                {assignment.employee_name} ({assignment.emp_code})
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Assigned Date</div>
              <div className="text-lg">
                {assignment.assigned_date
                  ? format(new Date(assignment.assigned_date), "MMM dd, yyyy")
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Condition on Assign</div>
              <div className="text-lg capitalize">{assignment.condition_on_assign || "good"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Return Details</CardTitle>
            <CardDescription>Provide return information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="returned_date">Returned Date *</Label>
                <DatePicker
                  value={formData.returned_date}
                  onChange={(date) => setFormData({ ...formData, returned_date: date || "" })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="condition_on_return">Condition on Return</Label>
                <Select
                  value={formData.condition_on_return}
                  onValueChange={(value) => setFormData({ ...formData, condition_on_return: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
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
                placeholder="Additional notes about the return"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/it-assets/assignments')}>
            Cancel
          </Button>
          <Button type="submit" disabled={returnMutation.isPending}>
            {returnMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Returning...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Return Asset
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
