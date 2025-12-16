import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function RaiseTicket() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    ticket_type: "",
    asset_id: "",
    category: "",
    subject: "",
    description: "",
    priority: "medium",
  });

  // Fetch assets for selection (only assigned assets for employees)
  const { data: assetsData } = useQuery({
    queryKey: ['assets', 'my-assigned'],
    queryFn: () => assetsApi.getAll({ assigned_only: 'true' }),
  });

  const assets = assetsData?.data || [];

  const createTicketMutation = useMutation({
    mutationFn: (data: any) => assetsApi.createTicket(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['assets', 'tickets'] });
      toast({
        title: "Success",
        description: `Ticket ${response.data.ticket_number} created successfully`,
      });
      navigate('/my-it-assets');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.ticket_type || !formData.subject || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Ticket type, subject, and description are required",
        variant: "destructive",
      });
      return;
    }

    createTicketMutation.mutate({
      ticket_type: formData.ticket_type,
      asset_id: formData.asset_id || null,
      category: formData.category || null,
      subject: formData.subject,
      description: formData.description,
      priority: formData.priority,
    });
  };

  return (
    <div className="mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/my-it-assets')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Raise Ticket</h1>
          <p className="text-muted-foreground mt-2">Submit a request for IT asset support</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Information</CardTitle>
            <CardDescription>Provide details about your request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ticket_type">Ticket Type *</Label>
                <Select
                  value={formData.ticket_type}
                  onValueChange={(value) => setFormData({ ...formData, ticket_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ticket type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_request">New Device Request</SelectItem>
                    <SelectItem value="repair">Repair Request</SelectItem>
                    <SelectItem value="replacement">Replacement Request</SelectItem>
                    <SelectItem value="return">Device Return</SelectItem>
                    <SelectItem value="accessory_request">Accessory Request</SelectItem>
                    <SelectItem value="damage_report">Damage Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="asset_id">Related Asset (Optional)</Label>
              <Select
                value={formData.asset_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, asset_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset (if applicable)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {assets.map((asset: any) => (
                    <SelectItem key={asset.id} value={asset.id.toString()}>
                      {asset.asset_code} - {asset.brand} {asset.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Hardware, Software, Network"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief description of your request"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide detailed information about your request..."
                rows={6}
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/my-it-assets')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createTicketMutation.isPending}>
            {createTicketMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Submit Ticket
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
