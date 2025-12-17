import { memo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/features/employees/api";
import { getCurrentUser } from "@/lib/auth";
import { Loader2, FileText, CheckCircle, XCircle, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { getImageUrl } from "@/lib/imageUtils";

interface EmployeeDocumentsProps {
  employeeId: number;
  documents: any[];
}

export const EmployeeDocuments = memo(({ employeeId, documents }: EmployeeDocumentsProps) => {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const canManage = ['Admin', 'Super Admin', 'Team Lead', 'Manager'].includes(currentUser?.role || '');

  const verifyDocumentMutation = useMutation({
    mutationFn: async (docId: number) => {
      return employeesApi.verifyDocument(employeeId, docId);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document verified successfully." });
      queryClient.invalidateQueries({ queryKey: ['employee-documents', employeeId] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to verify document.",
        variant: "destructive"
      });
    },
  });

  const unverifyDocumentMutation = useMutation({
    mutationFn: async (docId: number) => {
      return employeesApi.unverifyDocument(employeeId, docId);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document unverified successfully." });
      queryClient.invalidateQueries({ queryKey: ['employee-documents', employeeId] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to unverify document.",
        variant: "destructive"
      });
    },
  });

  const handleViewDocument = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const handleDownloadDocument = (fileUrl: string, fileName: string) => {
    fetch(fileUrl)
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
  };

  if (documents.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents ({documents.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc: any) => {
            const fileUrl = getImageUrl(doc.file_path);
            return (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">{doc.document_type}</div>
                    {doc.document_number && (
                      <div className="text-xs text-muted-foreground">{doc.document_number}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.verified ? (
                    <StatusBadge variant="success" className="text-xs">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Verified
                    </StatusBadge>
                  ) : (
                    <StatusBadge variant="warning" className="text-xs">
                      <XCircle className="mr-1 h-3 w-3" />
                      Pending
                    </StatusBadge>
                  )}
                  {fileUrl && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleViewDocument(fileUrl)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadDocument(fileUrl, doc.file_name)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {canManage && (
                    <>
                      {!doc.verified ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => verifyDocumentMutation.mutate(doc.id)}
                          disabled={verifyDocumentMutation.isPending}
                        >
                          {verifyDocumentMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Verify
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => unverifyDocumentMutation.mutate(doc.id)}
                          disabled={unverifyDocumentMutation.isPending}
                        >
                          {unverifyDocumentMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="mr-2 h-4 w-4" />
                          )}
                          Unverify
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

EmployeeDocuments.displayName = 'EmployeeDocuments';

