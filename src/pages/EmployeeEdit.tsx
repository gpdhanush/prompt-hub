import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Info, Upload, FileText, Trash2, Download, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";
import { employeesApi, usersApi, rolesApi, positionsApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { Loader2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getImageUrl } from "@/lib/imageUtils";

export default function EmployeeEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Get current user info to check permissions and filter Super Admin data
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isTeamLeader = currentUser?.role === 'Team Leader' || currentUser?.role === 'Team Lead';
  const canManage = ['Admin', 'Super Admin', 'Team Lead', 'Manager'].includes(currentUser?.role);

  const [formData, setFormData] = useState({
    // Basic user info
    name: "",
    email: "",
    password: "",
    mobile: "",
    date_of_birth: "",
    gender: "",
    
    // Employee basic info
    empCode: "",
    role: "",
    position: "",
    teamLeadId: "",
    date_of_joining: "",
    employee_status: "Active",
    
    // Salary & Finance (optional)
    bank_name: "",
    bank_account_number: "",
    ifsc_code: "",
    
    // Address & Emergency Details
    address1: "",
    address2: "",
    landmark: "",
    state: "",
    district: "",
    pincode: "",
    emergency_contact_name: "",
    emergency_contact_relation: "",
    emergency_contact_number: "",
    
    // Leave counts
    annual_leave_count: 0,
    sick_leave_count: 0,
    casual_leave_count: 0,
    
    // Profile
    profile_photo_url: "",
  });

  // Fetch employee data
  const { data: employeeData, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(Number(id)),
    enabled: !!id,
  });

  // Fetch users for team lead selection
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll({ page: 1, limit: 100 }),
  });

  // Fetch all roles
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
  });

  // Fetch available positions (filtered by hierarchy)
  const { data: positionsData } = useQuery({
    queryKey: ['available-positions'],
    queryFn: () => employeesApi.getAvailablePositions(),
  });

  const allUsers = usersData?.data || [];
  const allRoles = rolesData?.data || [];
  const availablePositions = positionsData?.data || [];
  
  // Filter out Super Admin users if current user is not Super Admin
  // Get Super Admin role name from database
  const superAdminRole = allRoles.find((r: any) => 
    r.name === 'Super Admin' || r.name === 'SuperAdmin' || r.name === 'Super Administrator'
  );
  const superAdminRoleName = superAdminRole?.name || 'Super Admin';
  
  const filteredUsers = isSuperAdmin 
    ? allUsers 
    : allUsers.filter((user: any) => user.role !== superAdminRoleName);
  
  // Filter roles based on current user's role and hierarchy
  // Get manager roles from database (reuse superAdminRole already declared above)
  
  const managerRoles = allRoles.filter((r: any) => {
    const managerNames = ['Admin', 'Team Lead', 'Team Leader', 'Manager', 'Accounts Manager', 'Office Manager', 'HR Manager'];
    return managerNames.includes(r.name);
  }).map((r: any) => r.name);
  
  const availableRoles = isTeamLeader
    ? allRoles.filter((role: any) => 
        role.name !== superAdminRoleName && 
        !managerRoles.includes(role.name)
      )
    : allRoles;
  
  // Get available reporting managers based on selected role and current user
  // Uses role hierarchy from roles table (reporting_person_role_id)
  const getAvailableReportingManagers = () => {
    const selectedRole = formData.role;
    const currentUserId = employeeData?.data?.user_id;
    
    if (!selectedRole) {
      return [];
    }
    
    // Find the selected role in allRoles to get its reporting_person_role_name
    const selectedRoleData = allRoles.find((role: any) => role.name === selectedRole);
    const reportingRoleName = selectedRoleData?.reporting_person_role_name;
    
    // If role has a reporting_person_role_name defined, use that
    if (reportingRoleName) {
      // Filter users to only show those with the reporting role
      return filteredUsers.filter((user: any) => 
        user.role === reportingRoleName && user.id !== currentUserId
      );
    }
    
    // Fallback to old logic if no reporting_person_role_name is defined
    const isManagerRole = managerRoles.includes(selectedRole);
    
    if (isManagerRole) {
      // When editing a manager role
      if (isSuperAdmin) {
        // Super Admin editing manager: Show Super Admin users
        return allUsers.filter((user: any) => 
          user.role === superAdminRoleName && user.id !== currentUserId
        );
      } else {
        // Other users editing manager: Show Admin or Super Admin (if visible)
        return filteredUsers.filter((user: any) => 
          (user.role === superAdminRoleName || managerRoles.includes(user.role)) && user.id !== currentUserId
        );
      }
    } else {
      // For other roles (Developer, Designer, Tester, etc. - Level 2)
      if (isSuperAdmin) {
        // Super Admin: Show all managers
        return filteredUsers.filter((user: any) => 
          managerRoles.includes(user.role) && user.id !== currentUserId
        );
      } else if (isTeamLeader) {
        // Team Leader editing employee: Show all managers
        return filteredUsers.filter((user: any) => 
          managerRoles.includes(user.role) && user.id !== currentUserId
        );
      } else {
        // Other roles (Admin, etc.): Show managers or Super Admin
        return filteredUsers.filter((user: any) => 
          (managerRoles.includes(user.role) || user.role === superAdminRoleName) && user.id !== currentUserId
        );
      }
    }
  };
  
  const availableReportingManagers = getAvailableReportingManagers();

  // Helper function to map role name to value (for form state)
  const roleNameToValue = (roleName: string): string => {
    // If role exists in API, use the role name directly
    if (allRoles.some((role: any) => role.name === roleName)) {
      return roleName;
    }
    // Otherwise, convert to lowercase with hyphens for backward compatibility
    return roleName.toLowerCase().replace(/\s+/g, "-");
  };

  // Helper function to map role value to role name
  const roleValueToName = (value: string): string => {
    // If value is already a role name (from API), return as is
    if (allRoles.some((role: any) => role.name === value)) {
      return value;
    }
    // Otherwise, try to map from old format
    const mapping: Record<string, string> = {
      'developer': 'Developer',
      'designer': 'Designer',
      'tester': 'Tester',
      'team-lead': 'Team Lead',
      'team-leader': 'Team Lead',
      'super-admin': 'Super Admin',
      'admin': 'Admin',
      'employee': 'Employee',
      'viewer': 'Viewer',
    };
    return mapping[value.toLowerCase()] || value;
  };

  // Helper function to format date from backend to YYYY-MM-DD
  const formatDateFromDB = (dateValue: string | null | undefined): string => {
    if (!dateValue) return "";
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    // If in ISO format, extract just the date part
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Invalid date, return empty
    }
    return "";
  };

  // Helper function to format date to YYYY-MM-DD for sending to backend
  const formatDateForDB = (dateValue: string | null | undefined): string | null => {
    if (!dateValue || dateValue === "") return null;
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    // If in ISO format, extract just the date part
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Invalid date, return null
    }
    return null;
  };

  // Load employee data into form
  useEffect(() => {
    if (employeeData?.data) {
      const emp = employeeData.data;
      setFormData({
        name: emp.name || "",
        email: emp.email || "",
        password: "", // Don't pre-fill password
        mobile: emp.mobile || "",
        role: emp.role || "", // Use role name directly from API
        position: emp.position || "", // Position name from API
        empCode: emp.emp_code || "",
        teamLeadId: emp.team_lead_user_id ? emp.team_lead_user_id.toString() : "",
        date_of_birth: formatDateFromDB(emp.date_of_birth),
        gender: emp.gender || "",
        date_of_joining: formatDateFromDB(emp.date_of_joining),
        employee_status: emp.employee_status || "Active",
        bank_name: emp.bank_name || "",
        bank_account_number: emp.bank_account_number || "",
        ifsc_code: emp.ifsc_code || "",
        address1: emp.address1 || "",
        address2: emp.address2 || "",
        landmark: emp.landmark || "",
        state: emp.state || "",
        district: emp.district || "",
        pincode: emp.pincode || "",
        emergency_contact_name: emp.emergency_contact_name || "",
        emergency_contact_relation: emp.emergency_contact_relation || "",
        emergency_contact_number: emp.emergency_contact_number || "",
        annual_leave_count: emp.annual_leave_count || 0,
        sick_leave_count: emp.sick_leave_count || 0,
        casual_leave_count: emp.casual_leave_count || 0,
        profile_photo_url: emp.profile_photo_url || "",
      });
    }
  }, [employeeData]);

  // Auto-select reporting manager based on role hierarchy when role changes (only if not already set)
  useEffect(() => {
    if (formData.role && allRoles.length > 0 && canManage) {
      const selectedRoleData = allRoles.find((role: any) => role.name === formData.role);
      const reportingRoleName = selectedRoleData?.reporting_person_role_name;
      
      if (reportingRoleName && !formData.teamLeadId) {
        // Find users with the reporting role
        const currentUserId = employeeData?.data?.user_id;
        const reportingManagers = filteredUsers.filter((user: any) => 
          user.role === reportingRoleName && user.id !== currentUserId
        );
        
        // Auto-select the first available reporting manager if there's exactly one
        if (reportingManagers.length === 1) {
          setFormData(prev => ({ ...prev, teamLeadId: reportingManagers[0].id.toString() }));
        }
      }
    }
  }, [formData.role, allRoles, filteredUsers, canManage]);

  // Document upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] = useState("");
  const [uploadDocumentNumber, setUploadDocumentNumber] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch documents
  const { data: documentsData, refetch: refetchDocuments } = useQuery({
    queryKey: ['employee-documents', id],
    queryFn: () => employeesApi.getDocuments(Number(id)),
    enabled: !!id,
  });

  const documents = documentsData?.data || [];

  // Upload document mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return employeesApi.uploadDocument(Number(id), formData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document uploaded successfully." });
      refetchDocuments();
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadDocumentType("");
      setUploadDocumentNumber("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to upload document.",
        variant: "destructive"
      });
    },
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: number) => {
      return employeesApi.deleteDocument(Number(id), docId);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document deleted successfully." });
      refetchDocuments();
      setShowDeleteDialog(false);
      setDeleteDocId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete document.",
        variant: "destructive"
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.",
          variant: "destructive"
        });
        return;
      }
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 10MB.",
          variant: "destructive"
        });
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUpload = () => {
    if (!uploadFile || !uploadDocumentType) {
      toast({
        title: "Validation Error",
        description: "Please select a file and document type.",
        variant: "destructive"
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('document_type', uploadDocumentType);
    if (uploadDocumentNumber) {
      formData.append('document_number', uploadDocumentNumber);
    }

    uploadDocumentMutation.mutate(formData);
  };

  const handleDeleteClick = (docId: number) => {
    setDeleteDocId(docId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteDocId) {
      deleteDocumentMutation.mutate(deleteDocId);
    }
  };

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

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Always include teamLeadId - convert empty string to null
      // Explicitly handle all cases to ensure it's always sent
      let teamLeadIdValue: string | null = null;
      if (data.teamLeadId && data.teamLeadId !== "" && data.teamLeadId !== "none") {
        teamLeadIdValue = data.teamLeadId;
      }
      
      logger.debug('Frontend - Preparing update data');
      logger.debug('teamLeadId from form:', data.teamLeadId);
      logger.debug('teamLeadIdValue to send:', teamLeadIdValue);
      
      const updateData: any = {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        position: data.position || null, // Position name
        empCode: data.empCode,
        teamLeadId: teamLeadIdValue, // Explicitly include, even if null
        date_of_birth: formatDateForDB(data.date_of_birth),
        gender: data.gender || null,
        date_of_joining: formatDateForDB(data.date_of_joining),
        employee_status: data.employee_status || 'Active',
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        ifsc_code: data.ifsc_code || null,
        address1: data.address1 || null,
        address2: data.address2 || null,
        landmark: data.landmark || null,
        state: data.state || null,
        district: data.district || null,
        pincode: data.pincode || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_relation: data.emergency_contact_relation || null,
        emergency_contact_number: data.emergency_contact_number || null,
        annual_leave_count: data.annual_leave_count || 0,
        sick_leave_count: data.sick_leave_count || 0,
        casual_leave_count: data.casual_leave_count || 0,
        profile_photo_url: data.profile_photo_url || null,
      };

      // Only include password if provided
      if (data.password) {
        updateData.password = data.password;
      }

      logger.debug('Frontend - Sending update request with data:', JSON.stringify(updateData, null, 2));
      return employeesApi.update(Number(id), updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Success", description: "Employee updated successfully." });
      navigate('/employees');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Name and email are required",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(formData);
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

  if (error || !employeeData?.data) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="text-destructive">Error loading employee details.</div>
          <Button onClick={() => navigate('/employees')} variant="outline">
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === employeeData.data.user_id;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/employees')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Employee</h1>
            <p className="text-muted-foreground">
              {isOwnProfile ? "Update your profile information" : "Update employee details"}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic User Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic User Information</CardTitle>
            <CardDescription>Login credentials and basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="password">Password {isOwnProfile && "(Leave blank to keep current)"}</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-4 w-4">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Password Requirements</DialogTitle>
                        <DialogDescription>
                          Your password must meet the following requirements:
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 py-4">
                        <div className="flex items-start gap-2">
                          <span className="text-sm">•</span>
                          <span className="text-sm">At least 8 characters long</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm">•</span>
                          <span className="text-sm">Contains at least one uppercase letter (A-Z)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm">•</span>
                          <span className="text-sm">Contains at least one lowercase letter (a-z)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm">•</span>
                          <span className="text-sm">Contains at least one number (0-9)</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-sm">•</span>
                          <span className="text-sm">Contains at least one special character (!@#$%^&*)</span>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter new password (optional)"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => {
                    // Only allow digits, max 10
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, mobile: digitsOnly });
                  }}
                  placeholder="Enter mobile number (10 digits)"
                  maxLength={10}
                />
              </div>
              <div className="grid gap-2">
                <Label>Date of Birth</Label>
                <DatePicker
                  value={formData.date_of_birth}
                  onChange={(date) => setFormData({ ...formData, date_of_birth: date })}
                  disabled={!canManage}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  disabled={!canManage}
                >
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
          </CardContent>
        </Card>

        {/* Employee Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Basic Information</CardTitle>
            <CardDescription>Employee-specific details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManage && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="empCode">Employee ID *</Label>
                    <Input
                      id="empCode"
                      value={formData.empCode}
                      onChange={(e) => setFormData({ ...formData, empCode: e.target.value })}
                      placeholder="EMP-0001"
                      required
                      disabled={!canManage}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">User Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                      disabled={!canManage}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.length > 0 ? (
                          availableRoles.map((role: any) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name}
                            </SelectItem>
                          ))
                        ) : (
                          // Fallback if roles not loaded - show all roles from API
                          allRoles.map((role: any) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="position">Position *</Label>
                    <Select
                      value={formData.position}
                      onValueChange={(value) => setFormData({ ...formData, position: value })}
                      disabled={!canManage}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Position" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePositions.length > 0 ? (
                          availablePositions.map((pos: any) => (
                            <SelectItem key={pos.id} value={pos.name}>
                              {pos.name} {pos.level !== undefined ? `(Level ${pos.level})` : ''}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>No positions available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reportsTo">Reports To *</Label>
                    <Select
                      value={formData.teamLeadId || "none"}
                      onValueChange={(value) => setFormData({ ...formData, teamLeadId: value === "none" ? "" : value })}
                      disabled={!canManage}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reporting manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (No Reporting Manager)</SelectItem>
                        {availableReportingManagers.map((lead: any) => (
                          <SelectItem key={lead.id} value={lead.id.toString()}>
                            {lead.name} ({lead.email}) - {lead.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Date of Joining</Label>
                    <DatePicker
                      value={formData.date_of_joining}
                      onChange={(date) => setFormData({ ...formData, date_of_joining: date })}
                      disabled={!canManage}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Reports To (Reporting Manager)</Label>
                    <Select
                      value={formData.teamLeadId || "none"}
                      onValueChange={(value) => setFormData({ ...formData, teamLeadId: value === "none" ? "" : value })}
                      disabled={!canManage}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reporting manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (No Reporting Manager)</SelectItem>
                        {availableReportingManagers.map((lead: any) => (
                          <SelectItem key={lead.id} value={lead.id.toString()}>
                            {lead.name} ({lead.email}) - {lead.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Employee Status *</Label>
                    <Select
                      value={formData.employee_status}
                      onValueChange={(value) => setFormData({ ...formData, employee_status: value })}
                      disabled={!canManage}
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
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Salary & Finance Info (Optional) - Only for admins */}
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Salary & Finance Information</CardTitle>
              <CardDescription>Bank account details required for salary processing and reimbursements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value.toUpperCase() })}
                    placeholder="Enter bank name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bank_account_number">Bank Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value.toUpperCase() })}
                    placeholder="Enter account number"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ifsc_code">IFSC Code</Label>
                  <Input
                    id="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    placeholder="Enter IFSC code"
                    maxLength={11}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Address & Emergency Details */}
        <Card>
          <CardHeader>
            <CardTitle>Address & Emergency Details</CardTitle>
            <CardDescription>Address and emergency contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="address1">Address Line 1</Label>
                <Input
                  id="address1"
                  value={formData.address1}
                  onChange={(e) => setFormData({ ...formData, address1: e.target.value.toUpperCase() })}
                  placeholder="Enter address line 1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address2">Address Line 2</Label>
                <Input
                  id="address2"
                  value={formData.address2}
                  onChange={(e) => setFormData({ ...formData, address2: e.target.value.toUpperCase() })}
                  placeholder="Enter address line 2"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="landmark">Landmark</Label>
                <Input
                  id="landmark"
                  value={formData.landmark}
                  onChange={(e) => setFormData({ ...formData, landmark: e.target.value.toUpperCase() })}
                  placeholder="Enter landmark"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  placeholder="Enter state"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value.toUpperCase() })}
                  placeholder="Enter district"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  type="tel"
                  value={formData.pincode}
                  onChange={(e) => {
                    // Only allow digits, max 6
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setFormData({ ...formData, pincode: digitsOnly });
                  }}
                  placeholder="Enter pincode (6 digits)"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value.toUpperCase() })}
                  placeholder="Enter emergency contact name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency_contact_relation">Emergency Contact Relation</Label>
                <Select
                  value={formData.emergency_contact_relation}
                  onValueChange={(value) => setFormData({ ...formData, emergency_contact_relation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Parent">Parent</SelectItem>
                    <SelectItem value="Sibling">Sibling</SelectItem>
                    <SelectItem value="Child">Child</SelectItem>
                    <SelectItem value="Friend">Friend</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency_contact_number">Emergency Contact Number</Label>
                <Input
                  id="emergency_contact_number"
                  type="tel"
                  value={formData.emergency_contact_number}
                  onChange={(e) => {
                    // Only allow digits, max 10
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, emergency_contact_number: digitsOnly });
                  }}
                  placeholder="Enter contact number (10 digits)"
                  maxLength={10}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave & Reimbursement - Only for admins */}
        {canManage && (
          <Card>
            <CardHeader>
              <CardTitle>Leave & Reimbursement</CardTitle>
              <CardDescription>Leave counts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="annual_leave_count">Annual Leave Count</Label>
                  <Input
                    id="annual_leave_count"
                    type="number"
                    min="0"
                    value={formData.annual_leave_count}
                    onChange={(e) => setFormData({ ...formData, annual_leave_count: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sick_leave_count">Sick Leave Count</Label>
                  <Input
                    id="sick_leave_count"
                    type="number"
                    min="0"
                    value={formData.sick_leave_count}
                    onChange={(e) => setFormData({ ...formData, sick_leave_count: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="casual_leave_count">Casual Leave Count</Label>
                  <Input
                    id="casual_leave_count"
                    type="number"
                    min="0"
                    value={formData.casual_leave_count}
                    onChange={(e) => setFormData({ ...formData, casual_leave_count: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Photo */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>Upload and crop your profile photo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploadCrop
              value={formData.profile_photo_url}
              onChange={(url) => setFormData({ ...formData, profile_photo_url: url })}
              aspect={1}
              disabled={!canManage && !isOwnProfile}
            />
            {canManage && employeeData?.data && (
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground pt-4 border-t">
                <div>
                  <Label>Created Date</Label>
                  <div>{employeeData.data.created_date ? new Date(employeeData.data.created_date).toLocaleString() : 'N/A'}</div>
                </div>
                <div>
                  <Label>Last Updated Date</Label>
                  <div>{employeeData.data.last_updated_date ? new Date(employeeData.data.last_updated_date).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Upload and manage employee documents (Images and PDFs only)</CardDescription>
              </div>
              {(canManage || isOwnProfile) && (
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <Button type="button">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Upload Document</DialogTitle>
                      <DialogDescription>
                        Upload a document (Image or PDF). Maximum file size: 10MB
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="document_type">Document Type *</Label>
                        <Select value={uploadDocumentType} onValueChange={setUploadDocumentType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select document type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                            <SelectItem value="PAN">PAN</SelectItem>
                            <SelectItem value="Bank Passbook">Bank Passbook</SelectItem>
                            <SelectItem value="Driving License">Driving License</SelectItem>
                            <SelectItem value="Passport">Passport</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="document_number">Document Number (Optional)</Label>
                        <Input
                          id="document_number"
                          value={uploadDocumentNumber}
                          onChange={(e) => setUploadDocumentNumber(e.target.value.toUpperCase())}
                          placeholder="Enter document number"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="file">File *</Label>
                        <div className="border-2 border-dashed border-border rounded-lg p-4">
                          <Input
                            id="file"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="cursor-pointer"
                          />
                          {uploadFile && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setShowUploadDialog(false);
                            setUploadFile(null);
                            setUploadDocumentType("");
                            setUploadDocumentNumber("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          className="flex-1"
                          onClick={handleUpload}
                          disabled={uploadDocumentMutation.isPending || !uploadFile || !uploadDocumentType}
                        >
                          {uploadDocumentMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium">{doc.document_type}</div>
                        {doc.document_number && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {doc.document_number}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatFileSize(doc.file_size || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                      {(canManage || isOwnProfile) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteClick(doc.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const url = getFileUrl(doc.file_path);
                          if (url) {
                            window.open(url, '_blank');
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
                        className="flex-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const url = getFileUrl(doc.file_path);
                          if (url) {
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = doc.file_name;
                            link.click();
                          }
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delete Document Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the document.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDocId(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  confirmDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteDocumentMutation.isPending}
              >
                {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/employees')}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
