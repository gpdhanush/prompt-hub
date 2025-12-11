import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { employeesApi, usersApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function EmployeeCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    // Basic user info
    name: "",
    email: "",
    password: "",
    mobile: "",
    role: "developer",
    
    // Employee basic info
    empCode: "",
    department: "",
    teamLeadId: "",
    date_of_birth: "",
    gender: "",
    date_of_joining: "",
    is_team_lead: false,
    employee_status: "Active",
    
    // Salary & Finance (optional)
    bank_name: "",
    bank_account_number: "",
    ifsc_code: "",
    routing_number: "",
    pf_esi_applicable: false,
    pf_uan_number: "",
    
    // Identity & Documentation
    government_id_number: "",
    address: "",
    emergency_contact_name: "",
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

  const allUsers = usersData?.data || [];
  const teamLeads = allUsers.filter((user: any) => 
    user.role === 'Team Lead' || user.role === 'Super Admin' || user.role === 'Admin'
  );

  // Generate employee ID if not provided
  const generateEmpCode = () => {
    if (!formData.empCode) {
      const timestamp = Date.now().toString().slice(-6);
      setFormData({ ...formData, empCode: `EMP-${timestamp}` });
    }
  };

  // Helper function to map role value to role name
  const roleValueToName = (value: string): string => {
    const mapping: Record<string, string> = {
      'developer': 'Developer',
      'designer': 'Designer',
      'tester': 'Tester',
      'team-lead': 'Team Lead',
    };
    return mapping[value] || value;
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
      // Backend expects: name, email, mobile, password, role, position, department, empCode, teamLeadId
      // and all the new employee fields
      const employeeData = {
        name: data.name,
        email: data.email,
        password: data.password,
        mobile: data.mobile,
        role: roleValueToName(data.role), // Convert to role name
        department: data.department,
        empCode: data.empCode,
        teamLeadId: data.teamLeadId && data.teamLeadId !== "" ? data.teamLeadId : null,
        date_of_birth: formatDateForDB(data.date_of_birth),
        gender: data.gender || null,
        date_of_joining: formatDateForDB(data.date_of_joining),
        is_team_lead: data.is_team_lead || false,
        employee_status: data.employee_status || 'Active',
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        ifsc_code: data.ifsc_code || null,
        routing_number: data.routing_number || null,
        pf_esi_applicable: data.pf_esi_applicable || false,
        pf_uan_number: data.pf_uan_number || null,
        government_id_number: data.government_id_number || null,
        address: data.address || null,
        emergency_contact_name: data.emergency_contact_name || null,
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter password"
                  required
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
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="tester">Tester</SelectItem>
                  <SelectItem value="team-lead">Team Lead</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Enter department"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Date of Joining</Label>
                <DatePicker
                  value={formData.date_of_joining}
                  onChange={(date) => setFormData({ ...formData, date_of_joining: date })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Team Lead</Label>
                <Select
                  value={formData.teamLeadId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, teamLeadId: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teamLeads.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id.toString()}>
                        {lead.name} ({lead.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_team_lead"
                  checked={formData.is_team_lead}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_team_lead: checked })}
                />
                <Label htmlFor="is_team_lead">Is Team Lead?</Label>
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
            <CardDescription>Optional but recommended</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value })}
                  placeholder="Enter IFSC code"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="routing_number">Routing Number</Label>
                <Input
                  id="routing_number"
                  value={formData.routing_number}
                  onChange={(e) => setFormData({ ...formData, routing_number: e.target.value })}
                  placeholder="Enter routing number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="pf_esi_applicable"
                  checked={formData.pf_esi_applicable}
                  onCheckedChange={(checked) => setFormData({ ...formData, pf_esi_applicable: checked })}
                />
                <Label htmlFor="pf_esi_applicable">PF/ESI Applicable?</Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pf_uan_number">PF/UAN Number</Label>
                <Input
                  id="pf_uan_number"
                  value={formData.pf_uan_number}
                  onChange={(e) => setFormData({ ...formData, pf_uan_number: e.target.value })}
                  placeholder="Enter PF/UAN number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identity & Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>Identity & Documentation</CardTitle>
            <CardDescription>Government ID and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="government_id_number">Government ID No. (PAN / SSN last 4 digits)</Label>
              <Input
                id="government_id_number"
                value={formData.government_id_number}
                onChange={(e) => setFormData({ ...formData, government_id_number: e.target.value })}
                placeholder="Enter government ID number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter full address"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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

        {/* Profile & System Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Profile & System Metadata</CardTitle>
            <CardDescription>Profile photo and system information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="profile_photo_url">Profile Photo URL</Label>
              <Input
                id="profile_photo_url"
                value={formData.profile_photo_url}
                onChange={(e) => setFormData({ ...formData, profile_photo_url: e.target.value })}
                placeholder="Enter profile photo URL"
              />
            </div>
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
