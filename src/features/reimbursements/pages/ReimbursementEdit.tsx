import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, DollarSign, Upload, X, FileText, Image as ImageIcon, Save } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { reimbursementsApi } from "@/features/reimbursements/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getImageUrl } from "@/lib/imageUtils";

const REIMBURSEMENT_CATEGORIES = [
  'Travel',
  'Meals',
  'Equipment',
  'Software',
  'Training',
  'Office Supplies',
  'Internet/Phone',
  'Other'
];

export default function ReimbursementEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
  });
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch currency symbol - optimized query
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
    staleTime: 1000 * 60 * 10, // 10 minutes (settings don't change often)
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Memoized derived values
  const currencySymbol = useMemo(() => settingsData?.data?.currency_symbol || "$", [settingsData?.data?.currency_symbol]);

  // Fetch reimbursement - optimized query
  const { data: reimbursementData, isLoading } = useQuery({
    queryKey: ['reimbursement', id],
    queryFn: () => reimbursementsApi.getById(Number(id)),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const reimbursement = useMemo(() => reimbursementData?.data, [reimbursementData?.data]);

  // Populate form when data loads
  useEffect(() => {
    if (reimbursement) {
      setFormData({
        amount: reimbursement.amount || '',
        category: reimbursement.category || '',
        description: reimbursement.description || '',
      });
      setExistingFiles(reimbursement.attachments || []);
    }
  }, [reimbursement]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => reimbursementsApi.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursement', id] });
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      toast({ title: "Success", description: "Reimbursement updated successfully." });
      navigate(`/reimbursements/${id}`);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update reimbursement.", variant: "destructive" });
    },
  });

  // Upload files mutation
  const uploadFilesMutation = useMutation({
    mutationFn: (files: File[]) => reimbursementsApi.uploadFiles(Number(id), files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursement', id] });
      toast({ title: "Success", description: "Files uploaded successfully." });
      setNewFiles([]);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to upload files.", variant: "destructive" });
    },
  });

  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: number) => reimbursementsApi.deleteAttachment(Number(id), attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursement', id] });
      setExistingFiles(prev => prev.filter(f => f.id !== attachmentId));
      toast({ title: "Success", description: "File deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete file.", variant: "destructive" });
    },
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFilesList = Array.from(e.target.files);
      const validFiles = newFilesList.filter(file => {
        const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
        return isValidType && isValidSize;
      });
      
      if (validFiles.length !== newFilesList.length) {
        toast({ title: "Warning", description: "Some files were skipped. Only images and PDFs up to 10MB are allowed.", variant: "destructive" });
      }
      
      setNewFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const removeNewFile = useCallback((index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const removeExistingFile = useCallback((attachmentId: number) => {
    deleteAttachmentMutation.mutate(attachmentId);
  }, [deleteAttachmentMutation]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    
    // Update reimbursement
    updateMutation.mutate({
      amount: formData.amount,
      category: formData.category,
      description: formData.description,
    });
    
    // Upload new files if any
    if (newFiles.length > 0) {
      uploadFilesMutation.mutate(newFiles);
    }
  }, [formData, newFiles, updateMutation, uploadFilesMutation]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }, []);

  // Memoized handlers for form fields
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, amount: e.target.value }));
    if (errors.amount) setErrors(prev => ({ ...prev, amount: '' }));
  }, [errors.amount]);

  const handleCategoryChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, category: value }));
    if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
  }, [errors.category]);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, description: e.target.value }));
  }, []);

  // Memoized navigation handler
  const handleNavigateBack = useCallback(() => {
    navigate(`/reimbursements/${id}`);
  }, [navigate, id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!reimbursement) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Reimbursement not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleNavigateBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500/20 to-green-600/10">
              <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            Edit Reimbursement Claim
          </h1>
          <p className="text-muted-foreground mt-1">Claim Code: {reimbursement.claim_code || `CLM-${reimbursement.id}`}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Claim Details</CardTitle>
                <CardDescription>Update the expense details for your reimbursement claim</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Amount ({currencySymbol}) *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={handleAmountChange}
                    className={errors.amount ? 'border-red-500' : ''}
                  />
                  {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {REIMBURSEMENT_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the expense..."
                    value={formData.description}
                    onChange={handleDescriptionChange}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Attachments</CardTitle>
                <CardDescription>Add or remove receipts, invoices, or supporting documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Files */}
                {existingFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Existing Files ({existingFiles.length})</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {existingFiles.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {file.mime_type?.startsWith('image/') ? (
                              <ImageIcon className="h-4 w-4 text-blue-600 shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-red-600 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.original_filename}</p>
                              <p className="text-xs text-muted-foreground">
                                {file.size ? formatFileSize(file.size) : ''}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-red-600 hover:text-red-700"
                            onClick={useCallback(() => removeExistingFile(file.id), [file.id, removeExistingFile])}
                            disabled={deleteAttachmentMutation.isPending}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload New Files */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload files</p>
                    <p className="text-xs text-muted-foreground mt-1">Images and PDFs only, max 10MB each</p>
                  </label>
                </div>

                {/* New Files Preview */}
                {newFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>New Files ({newFiles.length})</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {newFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {file.type.startsWith('image/') ? (
                              <ImageIcon className="h-4 w-4 text-blue-600 shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-red-600 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={useCallback(() => removeNewFile(index), [index, removeNewFile])}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleNavigateBack}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || uploadFilesMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                {updateMutation.isPending || uploadFilesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
