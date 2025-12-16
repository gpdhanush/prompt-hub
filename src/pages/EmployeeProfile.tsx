import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/features/employees/api";
import { getCurrentUser } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  CreditCard,
  FileText,
  Edit,
  Calendar,
  Briefcase,
  Home,
  Wallet,
  CalendarDays,
  FileCheck,
  ArrowLeft,
  MessageCircle,
  MessageSquare,
  CheckCircle,
  XCircle,
  Eye,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { getProfilePhotoUrl, getImageUrl } from "@/lib/imageUtils";
import { AttachmentList } from "@/components/ui/attachment-list";

export default function EmployeeProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Get current user info to check permissions
  const currentUser = getCurrentUser();
  const canManage = ['Admin', 'Super Admin', 'Team Lead', 'Manager'].includes(currentUser?.role || '');

  // Fetch employee data from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(Number(id)),
    enabled: !!id,
  });

  // Fetch documents
  const { data: documentsData, refetch: refetchDocuments } = useQuery({
    queryKey: ['employee-documents', id],
    queryFn: () => employeesApi.getDocuments(Number(id)),
    enabled: !!id,
  });

  const employee = data?.data;
  const documents = documentsData?.data || [];

  // Verify document mutation
  const verifyDocumentMutation = useMutation({
    mutationFn: async (docId: number) => {
      return employeesApi.verifyDocument(Number(id), docId);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document verified successfully." });
      refetchDocuments();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to verify document.",
        variant: "destructive"
      });
    },
  });

  // Unverify document mutation
  const unverifyDocumentMutation = useMutation({
    mutationFn: async (docId: number) => {
      return employeesApi.unverifyDocument(Number(id), docId);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document unverified successfully." });
      refetchDocuments();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to unverify document.",
        variant: "destructive"
      });
    },
  });

  // Format date helper
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-destructive">Error loading employee profile.</div>
          <Button variant="outline" onClick={() => {
            const fromEmployees = location.state?.from === '/employees' || 
                                  document.referrer.includes('/employees') && !document.referrer.includes('/employees/list');
            navigate(fromEmployees ? '/employees' : '/employees/list');
          }}>
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="default"
            size="icon"
            onClick={() => {
              const fromEmployees = location.state?.from === '/employees' || 
                                    document.referrer.includes('/employees') && !document.referrer.includes('/employees/list');
              navigate(fromEmployees ? '/employees' : '/employees/list');
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Employee Details</h1>
            <p className="font-mono text-primary font-semibold text-xl text-center">
              {employee.emp_code || `EMP-${String(employee.id).padStart(3, '0')}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/employees/${employee.id}/edit`)} variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Employee
          </Button>
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                {employee.profile_photo_url && (
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={getProfilePhotoUrl(employee.profile_photo_url || null)} />
                    <AvatarFallback className="text-lg">
                      {employee.name ? employee.name.split(" ").map((n: string) => n[0]).join("") : "E"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <CardTitle>{employee.name || "N/A"}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {employee.emp_code || `EMP-${employee.id}`}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* First Row: Name, Status, Role, Position in 4 columns */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Employee Name</Label>
                  <div className="text-sm font-medium mt-1">{employee.name || "N/A"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Status</Label>
                  <div className="mt-1">
                    <StatusBadge 
                      variant={(employee.employee_status || employee.status) === "Active" ? "success" : (employee.employee_status || employee.status) === "On Leave" ? "info" : "warning"}
                      className="text-xs"
                    >
                      {employee.employee_status || employee.status || "Active"}
                    </StatusBadge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Role</Label>
                  <div className="text-sm font-medium mt-1">{employee.role || "Not assigned"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Position</Label>
                  <div className="text-sm font-medium mt-1">{employee.position || "Not assigned"}</div>
                </div>
              </div>

              {/* Second Row: Date of Joining, Date of Birth in 2 columns */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Date of Joining</Label>
                  <div className="text-sm font-medium mt-1">{formatDate(employee.date_of_joining)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Date of Birth</Label>
                  <div className="text-sm font-medium mt-1">{formatDate(employee.date_of_birth)}</div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <Label className="text-muted-foreground text-sm">Contact Information</Label>
                <div className="grid grid-cols-2 gap-4 mt-1">
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-sm font-medium">{employee.email || "Not provided"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Mobile</div>
                    <div className="text-sm font-medium">{employee.mobile || "Not provided"}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Role</Label>
                  <div className="text-sm font-medium mt-1">{employee.role || "Not assigned"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Position</Label>
                  <div className="text-sm font-medium mt-1">{employee.position || "Not assigned"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Date of Joining</Label>
                  <div className="text-sm font-medium mt-1">{formatDate(employee.date_of_joining)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Employee Status</Label>
                  <div className="mt-1">
                    <StatusBadge 
                      variant={(employee.employee_status || employee.status) === "Active" ? "success" : (employee.employee_status || employee.status) === "On Leave" ? "info" : "warning"}
                      className="text-xs"
                    >
                      {employee.employee_status || employee.status || "Active"}
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-sm">Address Line 1</Label>
                <div className="text-sm mt-1">{employee.address1 || "Not provided"}</div>
              </div>
              {employee.address2 && (
                <div>
                  <Label className="text-muted-foreground text-sm">Address Line 2</Label>
                  <div className="text-sm mt-1">{employee.address2}</div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">State</Label>
                  <div className="text-sm mt-1">{employee.state || "Not provided"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">District</Label>
                  <div className="text-sm mt-1">{employee.district || "Not provided"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Pincode</Label>
                  <div className="text-sm mt-1">{employee.pincode || "Not provided"}</div>
                </div>
              </div>
              {employee.landmark && (
                <div>
                  <Label className="text-muted-foreground text-sm">Landmark</Label>
                  <div className="text-sm mt-1">{employee.landmark}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Bank Name</Label>
                  <div className="text-sm font-medium mt-1">{employee.bank_name || "Not provided"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Account Number</Label>
                  <div className="text-sm font-medium font-mono mt-1">
                    {employee.bank_account_number ? "••••" + employee.bank_account_number.slice(-4) : "Not provided"}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">IFSC Code</Label>
                  <div className="text-sm font-medium font-mono mt-1">{employee.ifsc_code || "Not provided"}</div>
                </div>
              </div>
              {employee.pf_uan_number && (
                <div>
                  <Label className="text-muted-foreground text-sm">PF UAN Number</Label>
                  <div className="text-sm font-medium mt-1">{employee.pf_uan_number}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          {documents.length > 0 && (
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
                                onClick={() => window.open(fileUrl, '_blank')}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  fetch(fileUrl)
                                    .then(res => res.blob())
                                    .then(blob => {
                                      const url = window.URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = doc.file_name;
                                      document.body.appendChild(a);
                                      a.click();
                                      window.URL.revokeObjectURL(url);
                                      document.body.removeChild(a);
                                    });
                                }}
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
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-sm">Date of Birth</Label>
                <div className="text-sm font-medium mt-1">{formatDate(employee.date_of_birth)}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Gender</Label>
                <div className="text-sm font-medium mt-1">{employee.gender || "Not provided"}</div>
              </div>
              {employee.district && (
                <div>
                  <Label className="text-muted-foreground text-sm">District</Label>
                  <div className="text-sm font-medium mt-1">{employee.district}</div>
                </div>
              )}
              {employee.teams_id && (
                <div>
                  <Label className="text-muted-foreground text-sm">Teams ID</Label>
                  <div className="text-sm font-medium mt-1">{employee.teams_id}</div>
                </div>
              )}
              {employee.whatsapp && (
                <div>
                  <Label className="text-muted-foreground text-sm">WhatsApp</Label>
                  <div className="text-sm font-medium mt-1">{employee.whatsapp}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Lead */}
          <Card>
            <CardHeader>
              <CardTitle>Team Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">{employee.team_lead_name || 'Unassigned'}</div>
                  {employee.team_lead_email && (
                    <div className="text-xs text-muted-foreground">{employee.team_lead_email}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave Balance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Leave Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-sm">Annual Leaves</Label>
                <div className="text-2xl font-bold mt-1">{employee.annual_leave_count || 0}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Sick Leaves</Label>
                <div className="text-2xl font-bold mt-1">{employee.sick_leave_count || 0}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Casual Leaves</Label>
                <div className="text-2xl font-bold mt-1">{employee.casual_leave_count || 0}</div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground text-sm">Contact Name</Label>
                <div className="text-sm font-medium mt-1">{employee.emergency_contact_name || "Not provided"}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Relation</Label>
                <div className="text-sm font-medium mt-1">{employee.emergency_contact_relation || "Not provided"}</div>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Contact Number</Label>
                <div className="text-sm font-medium mt-1">{employee.emergency_contact_number || "Not provided"}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
