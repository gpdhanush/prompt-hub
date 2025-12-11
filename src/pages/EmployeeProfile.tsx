import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { employeesApi } from "@/lib/api";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EmployeeProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("personal");
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch employee data from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(Number(id)),
    enabled: !!id,
  });

  const employee = data?.data;

  const [formData, setFormData] = useState({
    email: "",
    mobile: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    date_of_birth: "",
    gender: "",
    date_of_joining: "",
    address: "",
    bank_name: "",
    bank_account_number: "",
    ifsc_code: "",
    routing_number: "",
    pf_esi_applicable: false,
    pf_uan_number: "",
    government_id_number: "",
    emergency_contact_name: "",
    emergency_contact_number: "",
    profile_photo_url: "",
  });

  // Update form data when employee data loads
  useEffect(() => {
    if (employee) {
      setFormData({
        email: employee.email || "",
        mobile: employee.mobile || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        date_of_birth: employee.date_of_birth || "",
        gender: employee.gender || "",
        date_of_joining: employee.date_of_joining || "",
        address: employee.address || "",
        bank_name: employee.bank_name || "",
        bank_account_number: employee.bank_account_number || "",
        ifsc_code: employee.ifsc_code || "",
        routing_number: employee.routing_number || "",
        pf_esi_applicable: employee.pf_esi_applicable || false,
        pf_uan_number: employee.pf_uan_number || "",
        government_id_number: employee.government_id_number || "",
        emergency_contact_name: employee.emergency_contact_name || "",
        emergency_contact_number: employee.emergency_contact_number || "",
        profile_photo_url: employee.profile_photo_url || "",
      });
    }
  }, [employee]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }
    if (formData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    // API call here
    toast({
      title: "Success",
      description: "Password changed successfully",
    });
    setFormData((prev) => ({
      ...prev,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
  };

  const handleEmailMobileUpdate = () => {
    // API call here
    toast({
      title: "Success",
      description: "Email and mobile updated successfully",
    });
  };

  const handleAddressUpdate = () => {
    // API call here
    toast({
      title: "Success",
      description: "Address updated successfully",
    });
  };

  const handleBankUpdate = () => {
    // API call here
    toast({
      title: "Success",
      description: "Bank details updated successfully",
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      // API call here
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    }
  };

  const handleDocumentUpload = (type: string) => {
    // API call here
    toast({
      title: "Success",
      description: `${type} document uploaded successfully`,
    });
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employee Profile</h1>
          <p className="text-muted-foreground">View and manage employee information</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/employees/${employee.id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
          <Button variant="outline" onClick={() => navigate("/employees")}>
            Back to Employees
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={employee.profile_photo_url || employee.photo || undefined} />
                <AvatarFallback className="text-2xl">
                  {employee.name ? employee.name.split(" ").map((n: string) => n[0]).join("") : "E"}
                </AvatarFallback>
              </Avatar>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Photo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <Label htmlFor="photo-upload" className="cursor-pointer">
                        <Button variant="outline" type="button" className="w-full">
                          Select Photo
                        </Button>
                      </Label>
                      <p className="text-xs text-muted-foreground mt-2">
                        Max size: 5MB. Formats: JPG, PNG
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{employee.name || "N/A"}</h2>
              <p className="text-muted-foreground">{employee.emp_code || `EMP-${employee.id}`}</p>
              <div className="flex items-center gap-4 mt-2">
                <StatusBadge variant={(employee.employee_status || employee.status) === "Active" ? "success" : (employee.employee_status || employee.status) === "On Leave" ? "info" : "warning"}>
                  {employee.employee_status || employee.status || "Active"}
                </StatusBadge>
                {employee.role && (
                  <span className="text-sm text-muted-foreground">
                    {employee.role}
                  </span>
                )}
                {employee.department && (
                  <span className="text-sm text-muted-foreground">
                    {employee.department}
                  </span>
                )}
                {employee.team_lead_name && (
                  <span className="text-sm text-muted-foreground">
                    Team Lead: {employee.team_lead_name}
                  </span>
                )}
                {employee.is_team_lead && (
                  <StatusBadge variant="info" className="text-xs">
                    Team Lead
                  </StatusBadge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="leaves">Leaves</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Personal Information */}
        <TabsContent value="personal" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Update your email and mobile number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mobile"
                    type="tel"
                    className="pl-10"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange("mobile", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="government_id_number">Government ID Number</Label>
                <Input
                  id="government_id_number"
                  value={formData.government_id_number}
                  onChange={(e) => handleInputChange("government_id_number", e.target.value)}
                  placeholder="Aadhaar/PAN/Other ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency_contact_number">Emergency Contact Number</Label>
                <Input
                  id="emergency_contact_number"
                  type="tel"
                  value={formData.emergency_contact_number}
                  onChange={(e) => handleInputChange("emergency_contact_number", e.target.value)}
                />
              </div>
              <Button onClick={handleEmailMobileUpdate}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employment Information */}
        <TabsContent value="employment" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Employment Details</CardTitle>
              <CardDescription>Employment and joining information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date_of_joining">Date of Joining</Label>
                  <Input
                    id="date_of_joining"
                    type="date"
                    value={formData.date_of_joining}
                    onChange={(e) => handleInputChange("date_of_joining", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hire_date">Hire Date</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={employee.hire_date || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_team_lead"
                  checked={employee.is_team_lead || false}
                  disabled
                  className="rounded"
                />
                <Label htmlFor="is_team_lead">Team Lead</Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="employee_status">Employee Status</Label>
                <Select 
                  value={employee.employee_status || employee.status || "Active"} 
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    className="pl-10 pr-10"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    className="pl-10 pr-10"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange("newPassword", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    className="pl-10 pr-10"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={handlePasswordChange}>
                <Save className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Address */}
        <TabsContent value="address" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Address Details</CardTitle>
              <CardDescription>Update your residential address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="Enter your full address"
                  rows={4}
                />
              </div>
              <Button onClick={handleAddressUpdate}>
                <Save className="mr-2 h-4 w-4" />
                Save Address
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bank Details */}
        <TabsContent value="bank" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
              <CardDescription>Update your bank account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange("bank_name", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={(e) => handleInputChange("bank_account_number", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ifsc_code">IFSC Code</Label>
                  <Input
                    id="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={(e) => handleInputChange("ifsc_code", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="routing_number">Routing Number</Label>
                  <Input
                    id="routing_number"
                    value={formData.routing_number}
                    onChange={(e) => handleInputChange("routing_number", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pf_esi_applicable"
                  checked={formData.pf_esi_applicable}
                  onChange={(e) => handleInputChange("pf_esi_applicable", e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="pf_esi_applicable">PF/ESI Applicable</Label>
              </div>
              {formData.pf_esi_applicable && (
                <div className="grid gap-2">
                  <Label htmlFor="pf_uan_number">PF UAN Number</Label>
                  <Input
                    id="pf_uan_number"
                    value={formData.pf_uan_number}
                    onChange={(e) => handleInputChange("pf_uan_number", e.target.value)}
                    placeholder="Universal Account Number"
                  />
                </div>
              )}
              <Button onClick={handleBankUpdate}>
                <Save className="mr-2 h-4 w-4" />
                Save Bank Details
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaves */}
        <TabsContent value="leaves" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Leave Balance</CardTitle>
              <CardDescription>Current leave balances</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border border-border p-4">
                  <div className="text-2xl font-bold text-status-info">
                    {employee.annual_leave_count || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Annual Leaves</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="text-2xl font-bold text-status-warning">
                    {employee.sick_leave_count || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Sick Leaves</p>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="text-2xl font-bold text-status-success">
                    {employee.casual_leave_count || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Casual Leaves</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Uploaded Documents</CardTitle>
              <CardDescription>View and manage your uploaded documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {["Aadhaar", "PAN", "Bank Passbook"].map((docType) => {
                  // TODO: Fetch documents from API when document storage is implemented
                  const existingDoc = null;
                  return (
                    <div
                      key={docType}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                          <FileText className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{docType}</p>
                          {existingDoc ? (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-muted-foreground">
                                {existingDoc.fileName}
                              </span>
                              {existingDoc.verified ? (
                                <StatusBadge variant="success" className="text-[10px]">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Verified
                                </StatusBadge>
                              ) : (
                                <StatusBadge variant="warning" className="text-[10px]">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Pending
                                </StatusBadge>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">Not uploaded</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {existingDoc && (
                          <>
                            <Button variant="outline" size="sm">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove
                            </Button>
                          </>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <Upload className="mr-2 h-4 w-4" />
                              {existingDoc ? "Replace" : "Upload"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Upload {docType}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <Input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={() => handleDocumentUpload(docType)}
                                  className="hidden"
                                  id={`upload-${docType}`}
                                />
                                <Label htmlFor={`upload-${docType}`} className="cursor-pointer">
                                  <Button variant="outline" type="button" className="w-full">
                                    Select File
                                  </Button>
                                </Label>
                                <p className="text-xs text-muted-foreground mt-2">
                                  Max size: 10MB. Formats: PDF, JPG, PNG
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

