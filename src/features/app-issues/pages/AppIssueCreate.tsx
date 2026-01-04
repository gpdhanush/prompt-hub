import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Bug, MessageSquare, FileText, Shield, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { appIssuesApi } from '../api';
import { APP_ISSUE_TYPES } from '../utils/constants';
import { PageTitle } from '@/components/ui/page-title';

export default function AppIssueCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    issue_type: 'bug' as 'bug' | 'feedback',
    is_anonymous: false,
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: async () => {
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('issue_type', formData.issue_type);
      submitData.append('is_anonymous', formData.is_anonymous.toString());

      attachments.forEach(file => {
        submitData.append('attachments', file);
      });

      return appIssuesApi.create(submitData);
    },
    onSuccess: (data) => {
      console.log('Issue created successfully:', data);
      // Invalidate queries to ensure lists update immediately
      queryClient.invalidateQueries({ queryKey: ['my-app-issues'] });
      queryClient.invalidateQueries({ queryKey: ['admin-app-issues'] });
      queryClient.invalidateQueries({ queryKey: ['browse-app-issues'] });

      toast({
        title: 'Success',
        description: 'App issue created successfully!',
      });
      navigate('/app-issues');
    },
    onError: (error: any) => {
      console.error('Issue creation error:', error);
      toast({
        title: 'Error',
        description: error?.response?.data?.error || error?.message || 'Failed to create app issue',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      createMutation.mutate();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `${file.name} is larger than 10MB`,
          variant: 'destructive',
        });
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported file type`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    });

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/app-issues")}
            className="flex items-center gap-2 hover:bg-muted/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Issues
          </Button>
        </div>

        {/* Hero Section */}
        {/* <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <AlertCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Report an App Issue
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Help us improve by reporting bugs or sharing your feedback about the
            application
          </p>
        </div> */}

        {/* Main Form Card */}
        <Card className="shadow-xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <CardHeader className="pb-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Report an App Issue</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Provide clear information to help us understand and resolve
                  your issue
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Issue Type Selection */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">
                  What type of issue are you reporting?
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {APP_ISSUE_TYPES.map((type) => (
                    <div
                      key={type.value}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          issue_type: type.value as "bug" | "feedback",
                        }))
                      }
                      className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        formData.issue_type === type.value
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border hover:border-primary/50 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${
                            type.value === "bug"
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {type.value === "bug" ? (
                            <Bug className="h-5 w-5" />
                          ) : (
                            <MessageSquare className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {type.label}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {type.value === "bug"
                              ? "Report technical issues or errors"
                              : "Share suggestions or feedback"}
                          </p>
                        </div>
                      </div>
                      {formData.issue_type === type.value && (
                        <div className="absolute top-4 right-4">
                          <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                            <CheckCircle className="h-3 w-3 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* <Separator /> */}

              {/* Basic Information */}
              <div className="space-y-2">
                {/* <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-orange-100 text-orange-600 rounded-lg">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Basic Information</h3>
                    <p className="text-sm text-muted-foreground">Tell us about your issue</p>
                  </div>
                </div> */}

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">
                      Issue Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="e.g., Login button not working on mobile"
                      className={`h-11 ${
                        errors.title
                          ? "border-destructive focus:border-destructive"
                          : ""
                      }`}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium"
                    >
                      Detailed Description{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Please provide as much detail as possible about the issue, including:&#10;&#10;• What were you trying to do?&#10;• What happened instead?&#10;• Steps to reproduce the issue&#10;• Any error messages you saw"
                      rows={8}
                      className={`resize-none ${
                        errors.description
                          ? "border-destructive focus:border-destructive"
                          : ""
                      }`}
                    />
                    {errors.description && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* <Separator /> */}

              {/* Attachments Section */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-6">
                  <Label htmlFor="attachments" className="text-sm font-medium">
                    Attachments (Optional)
                  </Label>
                  <input
                    type="file"
                    id="attachments"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Label htmlFor="attachments" className="cursor-pointer">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 text-center">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        Click to upload files
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, GIF, PDF, DOC, DOCX, TXT (max 10MB each)
                      </p>
                    </div>
                  </Label>

                  {attachments.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Selected Files ({attachments.length})
                      </Label>
                      <div className="space-y-2">
                        {attachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <div className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 rounded">
                                <FileText className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {file.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Privacy Settings */}
                <div className="space-y-6">
                  <Alert className="border-primary/20 bg-primary/5">
                    {/* <Shield className="h-4 w-4" /> */}
                    <AlertDescription>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="anonymous"
                            checked={formData.is_anonymous}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({
                                ...prev,
                                is_anonymous: checked as boolean,
                              }))
                            }
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label
                              htmlFor="anonymous"
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Submit anonymously
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Hide your identity from administrators
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg">
                          <strong>Note:</strong> Even if submitted anonymously,
                          you will still receive notifications and replies about
                          this issue. Only your identity is hidden from the
                          admin interface.
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>

              {/* Submit Actions */}
              <div className="pt-6 border-t">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 h-12 text-base font-semibold"
                  >
                    {createMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Creating Issue...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Submit Issue
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/app-issues")}
                    disabled={createMutation.isPending}
                    className="h-12 px-8"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
