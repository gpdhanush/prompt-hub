import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SecureInput } from "@/components/ui/secure-input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { useSecurityValidation } from "@/hooks/useSecurityValidation";
import { SecurityAlertDialog } from "@/components/SecurityAlertDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assetsApi } from "@/features/assets/api";
import { toast } from "@/hooks/use-toast";
import { toTitleCase } from "@/lib/utils";

export default function SupportTicketCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    ticket_type: '',
    category: '',
    subject: '',
    description: '',
    priority: 'medium',
    asset_id: null as number | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { validateFormData, securityAlertProps } = useSecurityValidation();

  const createTicketMutation = useMutation({
    mutationFn: (data: any) => assetsApi.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      toast({
        title: "Success",
        description: "Support ticket created successfully",
      });
      navigate('/support');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.ticket_type || formData.ticket_type.trim() === '') {
      newErrors.ticket_type = 'Type is required';
    }

    if (!formData.subject || formData.subject.trim() === '') {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    // Validate and sanitize form data for security
    const sanitizedData = validateFormData(formData, ['subject', 'category', 'description']);
    
    createTicketMutation.mutate(sanitizedData);
  }, [formData, validateForm, validateFormData, createTicketMutation]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/support')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Ticket className="h-6 w-6 text-primary" />
              </div>
              Create New Support Ticket
            </h1>
            <p className="text-muted-foreground mt-2">
              Submit a new support ticket for IT assistance
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Information</CardTitle>
            <CardDescription>Provide details about your support request</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ticket_type" className="text-red-500">
                  Type *
                </Label>
                <Select
                  value={formData.ticket_type}
                  onValueChange={(value) => {
                    setFormData({ ...formData, ticket_type: value });
                    if (errors.ticket_type) {
                      setErrors({ ...errors, ticket_type: '' });
                    }
                  }}
                >
                  <SelectTrigger className={errors.ticket_type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_request">New Request</SelectItem>
                    <SelectItem value="repair">Repair</SelectItem>
                    <SelectItem value="replacement">Replacement</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="accessory_request">Accessory Request</SelectItem>
                    <SelectItem value="damage_report">Damage Report</SelectItem>
                  </SelectContent>
                </Select>
                {errors.ticket_type && (
                  <p className="text-sm text-red-500 mt-1">{errors.ticket_type}</p>
                )}
              </div>
              <div>
                <Label htmlFor="category">Ticket Type</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select ticket type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asset Issue">Asset Issue</SelectItem>
                    <SelectItem value="New Asset Request">New Asset Request</SelectItem>
                    <SelectItem value="Software Issue">Software Issue</SelectItem>
                    <SelectItem value="Network Issue">Network Issue</SelectItem>
                    <SelectItem value="Access Request">Access Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="subject" className="text-red-500">
                Subject *
              </Label>
              <SecureInput
                id="subject"
                fieldName="Subject"
                value={formData.subject}
                onChange={(e) => {
                  setFormData({ ...formData, subject: toTitleCase(e.target.value) });
                  if (errors.subject) {
                    setErrors({ ...errors, subject: '' });
                  }
                }}
                placeholder="Brief description of the issue"
                className={errors.subject ? 'border-red-500' : ''}
              />
              {errors.subject && (
                <p className="text-sm text-red-500 mt-1">{errors.subject}</p>
              )}
            </div>
            <div>
              <Label htmlFor="description" className="text-red-500">
                Description *
              </Label>
              <MarkdownEditor
                value={formData.description}
                onChange={(value) => {
                  setFormData({ ...formData, description: value });
                  if (errors.description) {
                    setErrors({ ...errors, description: '' });
                  }
                }}
                placeholder="Provide detailed information about your request or issue. You can use markdown formatting."
                rows={8}
                error={errors.description}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/support')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createTicketMutation.isPending}
          >
            {createTicketMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Create Ticket
              </>
            )}
          </Button>
        </div>
      </form>
      <SecurityAlertDialog {...securityAlertProps} />
    </div>
  );
}

