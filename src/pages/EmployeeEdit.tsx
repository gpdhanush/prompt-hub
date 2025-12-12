import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Info } from "lucide-react";
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
import { employeesApi, usersApi, rolesApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

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

  const allUsers = usersData?.data || [];
  const allRoles = rolesData?.data || [];
  
  // Filter out Super Admin users if current user is not Super Admin
  const filteredUsers = isSuperAdmin 
    ? allUsers 
    : allUsers.filter((user: any) => user.role !== 'Super Admin');
  
  // Filter roles based on current user's role
  // Team Leaders cannot create Super Admin or Admin roles (they are higher roles)
  const availableRoles = isTeamLeader
    ? allRoles.filter((role: any) => role.name !== 'Super Admin' && role.name !== 'Admin')
    : allRoles;
  
  // Get available reporting managers based on selected role and current user
  // Super Admin creating TL: Show Super Admin users
  // TL creating employee: Show all TL names
  const getAvailableReportingManagers = () => {
    const selectedRole = formData.role;
    const currentUserId = employeeData?.data?.user_id;
    
    if (selectedRole === 'Team Lead' || selectedRole === 'Team Leader') {
      // When editing a Team Leader role
      if (isSuperAdmin) {
        // Super Admin editing TL: Show Super Admin users
        return allUsers.filter((user: any) => 
          user.role === 'Super Admin' && user.id !== currentUserId
        );
      } else {
        // Other users editing TL: Show Admin or Super Admin (if visible)
        return filteredUsers.filter((user: any) => 
          (user.role === 'Super Admin' || user.role === 'Admin') && user.id !== currentUserId
        );
      }
    } else {
      // For other roles (Developer, Designer, Tester, etc.)
      if (isSuperAdmin) {
        // Super Admin: Show all Team Leaders
        return filteredUsers.filter((user: any) => 
          (user.role === 'Team Leader' || user.role === 'Team Lead') && user.id !== currentUserId
        );
      } else if (isTeamLeader) {
        // Team Leader editing employee: Show all TL names
        return filteredUsers.filter((user: any) => 
          (user.role === 'Team Leader' || user.role === 'Team Lead') && user.id !== currentUserId
        );
      } else {
        // Other roles (Admin, etc.): Show Team Leaders, Admin, or Super Admin
        return filteredUsers.filter((user: any) => 
          (user.role === 'Team Leader' || user.role === 'Team Lead' || user.role === 'Super Admin' || user.role === 'Admin') && user.id !== currentUserId
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

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      // Always include teamLeadId - convert empty string to null
      // Explicitly handle all cases to ensure it's always sent
      let teamLeadIdValue: string | null = null;
      if (data.teamLeadId && data.teamLeadId !== "" && data.teamLeadId !== "none") {
        teamLeadIdValue = data.teamLeadId;
      }
      
      console.log('Frontend - Preparing update data');
      console.log('teamLeadId from form:', data.teamLeadId);
      console.log('teamLeadIdValue to send:', teamLeadIdValue);
      
      const updateData: any = {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
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

      console.log('Frontend - Sending update request with data:', JSON.stringify(updateData, null, 2));
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="Enter mobile number"
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
                          // Fallback if roles not loaded (filtered based on user role)
                          <>
                            {!isTeamLeader && <SelectItem value="Super Admin">Super Admin</SelectItem>}
                            {!isTeamLeader && <SelectItem value="Admin">Admin</SelectItem>}
                            <SelectItem value="Team Lead">Team Lead</SelectItem>
                            <SelectItem value="Developer">Developer</SelectItem>
                            <SelectItem value="Designer">Designer</SelectItem>
                            <SelectItem value="Tester">Tester</SelectItem>
                            <SelectItem value="Employee">Employee</SelectItem>
                            <SelectItem value="Viewer">Viewer</SelectItem>
                          </>
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
                    <p className="text-xs text-muted-foreground">
                      {formData.role === 'Team Lead' || formData.role === 'Team Leader' ? (
                        <>
                          {isSuperAdmin ? (
                            <>
                              <strong>For Team Leader:</strong> Select a Super Admin as the reporting manager.
                              {availableReportingManagers.length === 0 && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠ No Super Admins found. Create one first or select "None" for now.
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <strong>For Team Leader:</strong> Select an Admin or Super Admin as your reporting manager.
                              {availableReportingManagers.length === 0 && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠ No Admins or Super Admins found. Create one first or select "None" for now.
                                </span>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {isSuperAdmin ? (
                            <>
                              Select a Team Leader this employee reports to.
                              {availableReportingManagers.length === 0 && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠ No Team Leaders found. Create one first or select "None" for now.
                                </span>
                              )}
                            </>
                          ) : isTeamLeader ? (
                            <>
                              Select a Team Leader this employee reports to.
                              {availableReportingManagers.length === 0 && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠ No Team Leaders found. Create one first or select "None" for now.
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              Select the team lead, admin, or manager this employee reports to.
                              {availableReportingManagers.length === 0 && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠ No team leads or managers found. Create one first or select "None" for now.
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </p>
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
                    <p className="text-xs text-muted-foreground">
                      {formData.role === 'Team Lead' || formData.role === 'Team Leader' ? (
                        <>
                          {isSuperAdmin ? (
                            <>
                              <strong>For Team Leader:</strong> Select a Super Admin as the reporting manager.
                              {availableReportingManagers.length === 0 && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠ No Super Admins found. Create one first or select "None" for now.
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <strong>For Team Leader:</strong> Select an Admin or Super Admin as your reporting manager.
                              {availableReportingManagers.length === 0 && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠ No Admins or Super Admins found. Create one first or select "None" for now.
                                </span>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          {isSuperAdmin ? (
                            <>
                              Select a Team Leader this employee reports to.
                              {availableReportingManagers.length === 0 && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠ No Team Leaders found. Create one first or select "None" for now.
                                </span>
                              )}
                            </>
                          ) : isTeamLeader ? (
                            <>
                              Select a Team Leader this employee reports to.
                              {availableReportingManagers.length === 0 && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠ No Team Leaders found. Create one first or select "None" for now.
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              Select the team lead, admin, or manager this employee reports to.
                              {availableReportingManagers.length === 0 && (
                                <span className="block mt-1 text-amber-600">
                                  ⚠ No team leads or managers found. Create one first or select "None" for now.
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </p>
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
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="Enter bank name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bank_account_number">Bank Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    placeholder="Enter account number"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ifsc_code">IFSC Code</Label>
                  <Input
                    id="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                    placeholder="Enter IFSC code"
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
                  onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                  placeholder="Enter address line 1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address2">Address Line 2</Label>
                <Input
                  id="address2"
                  value={formData.address2}
                  onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                  placeholder="Enter address line 2"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="landmark">Landmark</Label>
                <Input
                  id="landmark"
                  value={formData.landmark}
                  onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Enter state"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Enter district"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="Enter pincode"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
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
                  value={formData.emergency_contact_number}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_number: e.target.value })}
                  placeholder="Enter emergency contact number"
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
