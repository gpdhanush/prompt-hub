import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeesApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import {
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Building,
  CreditCard,
  FileText,
  Upload,
  Camera,
  Save,
  Eye,
  EyeOff,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Edit,
  Calendar,
  Briefcase,
  Shield,
  Home,
  Wallet,
  CalendarDays,
  FileCheck,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { getProfilePhotoUrl, getImageUrl } from "@/lib/imageUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function EmployeeProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("personal");

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
    if (!dateString) return "Not provided";
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading employee profile...</div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error loading employee profile. Please try again.</div>
        <Button variant="outline" onClick={() => navigate("/employees")} className="ml-4">
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/employees")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Employee Profile
            </h1>
            <p className="text-muted-foreground mt-1">View and manage employee information</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/employees/${employee.id}/edit`)} className="shadow-md">
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Profile Header Card with Gradient */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden">
        <CardContent className="pt-8 pb-8">
          <div className="flex items-start gap-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-xl"></div>
              <Avatar className="h-32 w-32 relative border-4 border-background shadow-xl">
                <AvatarImage 
                  src={getProfilePhotoUrl(employee.profile_photo_url || employee.photo || null)} 
                />
                <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                  {employee.name ? employee.name.split(" ").map((n: string) => n[0]).join("") : "E"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-3xl font-bold mb-1">{employee.name || "N/A"}</h2>
                <p className="text-muted-foreground text-lg">{employee.emp_code || `EMP-${employee.id}`}</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge variant={(employee.employee_status || employee.status) === "Active" ? "success" : (employee.employee_status || employee.status) === "On Leave" ? "info" : "warning"}>
                  {employee.employee_status || employee.status || "Active"}
                </StatusBadge>
                {employee.role && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <Briefcase className="h-3.5 w-3.5" />
                    {employee.role}
                  </div>
                )}
                {employee.team_lead_name && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-foreground text-sm">
                    <User className="h-3.5 w-3.5" />
                    Reports to: {employee.team_lead_name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 w-full justify-start overflow-x-auto">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="employment" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Employment
          </TabsTrigger>
          <TabsTrigger value="address" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Address
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Bank Details
          </TabsTrigger>
          <TabsTrigger value="leaves" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Leaves
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-primary/5 via-background to-primary/5">
              <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                      <p className="text-base font-semibold break-words">{employee.email || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <Phone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Mobile Number</p>
                      <p className="text-base font-semibold">{employee.mobile || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Date of Birth</p>
                      <p className="text-base font-semibold">{formatDate(employee.date_of_birth)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <User className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Gender</p>
                      <p className="text-base font-semibold">{employee.gender || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-500/5 via-background to-orange-500/5">
              <CardHeader className="border-b bg-gradient-to-r from-orange-500/10 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-orange-500" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <User className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Contact Name</p>
                    <p className="text-base font-semibold">{employee.emergency_contact_name || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <User className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Relation</p>
                    <p className="text-base font-semibold">{employee.emergency_contact_relation || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <Phone className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Contact Number</p>
                    <p className="text-base font-semibold">{employee.emergency_contact_number || "Not provided"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employment Information */}
        <TabsContent value="employment" className="space-y-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500/5 via-background to-blue-500/5">
            <CardHeader className="border-b bg-gradient-to-r from-blue-500/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <Calendar className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Date of Joining</p>
                    <p className="text-base font-semibold">{formatDate(employee.date_of_joining)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Employee Status</p>
                    <StatusBadge variant={(employee.employee_status || employee.status) === "Active" ? "success" : "warning"}>
                      {employee.employee_status || employee.status || "Active"}
                    </StatusBadge>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <Briefcase className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Role</p>
                    <p className="text-base font-semibold">{employee.role || "Not assigned"}</p>
                  </div>
                </div>
                {employee.team_lead_name && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors md:col-span-3">
                    <User className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Reports To</p>
                      <p className="text-base font-semibold">{employee.team_lead_name}</p>
                    </div>
                  </div>
                )}
                {employee.is_team_lead && (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 md:col-span-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <StatusBadge variant="info">Team Lead</StatusBadge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Address */}
        <TabsContent value="address" className="space-y-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500/5 via-background to-green-500/5">
            <CardHeader className="border-b bg-gradient-to-r from-green-500/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-green-500" />
                Address & Emergency Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Address Line 1</p>
                      <p className="text-base font-semibold">{employee.address1 || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Address Line 2</p>
                      <p className="text-base font-semibold">{employee.address2 || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Landmark</p>
                      <p className="text-base font-semibold">{employee.landmark || "Not provided"}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">State</p>
                      <p className="text-base font-semibold">{employee.state || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">District</p>
                      <p className="text-base font-semibold">{employee.district || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                    <MapPin className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Pincode</p>
                      <p className="text-base font-semibold">{employee.pincode || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Details */}
        <TabsContent value="bank" className="space-y-6">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-500/5 via-background to-purple-500/5">
            <CardHeader className="border-b bg-gradient-to-r from-purple-500/10 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-purple-500" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <Building className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Bank Name</p>
                    <p className="text-base font-semibold">{employee.bank_name || "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <CreditCard className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Account Number</p>
                    <p className="text-base font-semibold font-mono">{employee.bank_account_number ? "••••" + employee.bank_account_number.slice(-4) : "Not provided"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-background/50 hover:bg-background transition-colors">
                  <FileText className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">IFSC Code</p>
                    <p className="text-base font-semibold font-mono">{employee.ifsc_code || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaves */}
        <TabsContent value="leaves" className="space-y-6">
          <Card className="shadow-md border-0">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                Leave Balance
              </CardTitle>
              <CardDescription>Current leave balances</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 hover:border-primary/40 transition-all hover:shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <CalendarDays className="h-8 w-8 text-primary/60" />
                  </div>
                  <div className="text-4xl font-bold text-primary mb-1">
                    {employee.annual_leave_count || 0}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Annual Leaves</p>
                </div>
                <div className="rounded-xl border-2 border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-orange-500/10 p-6 hover:border-orange-500/40 transition-all hover:shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <CalendarDays className="h-8 w-8 text-orange-500/60" />
                  </div>
                  <div className="text-4xl font-bold text-orange-500 mb-1">
                    {employee.sick_leave_count || 0}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Sick Leaves</p>
                </div>
                <div className="rounded-xl border-2 border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10 p-6 hover:border-green-500/40 transition-all hover:shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <CalendarDays className="h-8 w-8 text-green-500/60" />
                  </div>
                  <div className="text-4xl font-bold text-green-500 mb-1">
                    {employee.casual_leave_count || 0}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Casual Leaves</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="space-y-6">
          <Card className="shadow-md border-0">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Uploaded Documents
              </CardTitle>
              <CardDescription>View and manage your uploaded documents</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No documents uploaded yet</p>
                  <p className="text-sm mt-2">Documents will appear here once uploaded</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.map((doc: any) => {
                    const formatFileSize = (bytes: number) => {
                      if (bytes === 0) return '0 Bytes';
                      const k = 1024;
                      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                      const i = Math.floor(Math.log(bytes) / Math.log(k));
                      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
                    };

                    const getFileUrl = (filePath: string) => {
                      return getImageUrl(filePath);
                    };

                    const isImage = doc.mime_type?.startsWith('image/');
                    const fileUrl = getFileUrl(doc.file_path);

                    return (
                      <div
                        key={doc.id}
                        className="flex items-start justify-between rounded-xl border-2 border-border p-5 hover:border-primary/40 hover:shadow-md transition-all bg-card"
                      >
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex-shrink-0">
                            {isImage ? (
                              <FileText className="h-7 w-7 text-primary" />
                            ) : (
                              <FileText className="h-7 w-7 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-lg">{doc.document_type}</p>
                            {doc.document_number && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {doc.document_number}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {doc.file_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                • {formatFileSize(doc.file_size || 0)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                • {new Date(doc.uploaded_at).toLocaleDateString()}
                              </span>
                            </div>
                            {doc.verified ? (
                              <StatusBadge variant="success" className="text-xs mt-2">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Verified
                              </StatusBadge>
                            ) : (
                              <StatusBadge variant="warning" className="text-xs mt-2">
                                <XCircle className="mr-1 h-3 w-3" />
                                Pending Verification
                              </StatusBadge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shadow-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (fileUrl) {
                                window.open(fileUrl, '_blank');
                              }
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shadow-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (fileUrl) {
                                const link = document.createElement('a');
                                link.href = fileUrl;
                                link.download = doc.file_name;
                                link.target = '_blank';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                          {canManage && (
                            <>
                              {!doc.verified ? (
                                <Button
                                  type="button"
                                  variant="default"
                                  size="sm"
                                  className="shadow-sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    verifyDocumentMutation.mutate(doc.id);
                                  }}
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
                                  className="shadow-sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    unverifyDocumentMutation.mutate(doc.id);
                                  }}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

