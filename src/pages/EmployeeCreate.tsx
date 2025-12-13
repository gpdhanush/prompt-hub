import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";
import { employeesApi, usersApi, rolesApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";

export default function EmployeeCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Get current user info to filter Super Admin data
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isTeamLeader = currentUser?.role === 'Team Leader' || currentUser?.role === 'Team Lead';

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
    
    if (selectedRole === 'Team Lead' || selectedRole === 'Team Leader') {
      // When creating a Team Leader role
      if (isSuperAdmin) {
        // Super Admin creating TL: Show Super Admin users
        return allUsers.filter((user: any) => 
          user.role === 'Super Admin'
        );
      } else {
        // Other users creating TL: Show Admin or Super Admin (if visible)
        return filteredUsers.filter((user: any) => 
          user.role === 'Super Admin' || user.role === 'Admin'
        );
      }
    } else {
      // For other roles (Developer, Designer, Tester, etc.)
      if (isSuperAdmin) {
        // Super Admin: Show all Team Leaders
        return filteredUsers.filter((user: any) => 
          user.role === 'Team Leader' || user.role === 'Team Lead'
        );
      } else if (isTeamLeader) {
        // Team Leader creating employee: Show all TL names
        return filteredUsers.filter((user: any) => 
          user.role === 'Team Leader' || user.role === 'Team Lead'
        );
      } else {
        // Other roles (Admin, etc.): Show Team Leaders, Admin, or Super Admin
        return filteredUsers.filter((user: any) => 
          user.role === 'Team Leader' || user.role === 'Team Lead' || user.role === 'Super Admin' || user.role === 'Admin'
        );
      }
    }
  };
  
  const availableReportingManagers = getAvailableReportingManagers();

  // Generate employee ID if not provided
  const generateEmpCode = () => {
    if (!formData.empCode) {
      const timestamp = Date.now().toString().slice(-6);
      setFormData({ ...formData, empCode: `EMP-${timestamp}` });
    }
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

  // Helper function to format date to YYYY-MM-DD
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Backend expects: name, email, mobile, password, role, position, empCode, teamLeadId
      // and all the new employee fields
      const employeeData = {
        name: data.name,
        email: data.email,
        password: data.password,
        mobile: data.mobile,
        role: data.role, // Role is already in correct format from API
        empCode: data.empCode,
        teamLeadId: data.teamLeadId && data.teamLeadId !== "" ? data.teamLeadId : null,
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
      
      return employeesApi.create(employeeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Success", description: "Employee created successfully." });
      navigate('/employees');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Name, email, and password are required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.empCode) {
      generateEmpCode();
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/employees')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Employee</h1>
            <p className="text-muted-foreground">Fill in all employee details</p>
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
            <div className="grid grid-cols-3 gap-4">
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
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="password">Password *</Label>
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
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
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
                />
              </div>
              <div className="grid gap-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
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
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="empCode">Employee ID *</Label>
                <Input
                  id="empCode"
                  value={formData.empCode}
                  onChange={(e) => setFormData({ ...formData, empCode: e.target.value })}
                  placeholder="EMP-0001"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">User Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
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
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Date of Joining</Label>
                <DatePicker
                  value={formData.date_of_joining}
                  onChange={(date) => setFormData({ ...formData, date_of_joining: date })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Employee Status *</Label>
                <Select
                  value={formData.employee_status}
                  onValueChange={(value) => setFormData({ ...formData, employee_status: value })}
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
          </CardContent>
        </Card>

        {/* Salary & Finance Info (Optional) */}
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
                  placeholder="Enter emergency contact number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave & Reimbursement */}
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
            />
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/employees')}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Creating..." : "Create Employee"}
          </Button>
        </div>
      </form>
    </div>
  );
}
