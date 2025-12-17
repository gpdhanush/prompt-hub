import { useCallback, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { employeesApi } from "@/features/employees/api";
import { Loader2 } from "lucide-react";
import {
  Edit,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { getProfilePhotoUrl } from "@/lib/imageUtils";
import { EmployeeDocuments } from "@/features/employees/components/EmployeeDocuments";
import { EmployeeAddress } from "@/features/employees/components/EmployeeAddress";
import { EmployeeBankDetails } from "@/features/employees/components/EmployeeBankDetails";
import { EmployeeEmploymentDetails } from "@/features/employees/components/EmployeeEmploymentDetails";
import { EmployeePersonalInfo } from "@/features/employees/components/EmployeePersonalInfo";
import { EmployeeTeamLead } from "@/features/employees/components/EmployeeTeamLead";
import { EmployeeLeaveBalance } from "@/features/employees/components/EmployeeLeaveBalance";
import { EmployeeEmergencyContact } from "@/features/employees/components/EmployeeEmergencyContact";

export default function EmployeeProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  // Fetch employee data from API
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(Number(id)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch documents
  const { data: documentsData } = useQuery({
    queryKey: ['employee-documents', id],
    queryFn: () => employeesApi.getDocuments(Number(id)),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const employee = data?.data;
  const documents = documentsData?.data || [];

  // Format date helper
  const formatDate = useCallback((dateString: string | null | undefined) => {
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
  }, []);

  // Derived values
  const employeeStatus = useMemo(() => employee?.employee_status || employee?.status || "Active", [employee]);
  const statusVariant = useMemo(() => 
    employeeStatus === "Active" ? "success" : employeeStatus === "On Leave" ? "info" : "warning",
    [employeeStatus]
  );
  const empCode = useMemo(() => 
    employee?.emp_code || `EMP-${String(employee?.id || '').padStart(3, '0')}`,
    [employee]
  );
  const profilePhotoUrl = useMemo(() => 
    employee?.profile_photo_url ? getProfilePhotoUrl(employee.profile_photo_url) : null,
    [employee]
  );
  const avatarInitials = useMemo(() => 
    employee?.name ? employee.name.split(" ").map((n: string) => n[0]).join("") : "E",
    [employee]
  );
  const fromEmployees = useMemo(() => 
    location.state?.from === '/employees' || 
    (document.referrer.includes('/employees') && !document.referrer.includes('/employees/list')),
    [location.state]
  );

  const handleBackClick = useCallback(() => {
    navigate(fromEmployees ? '/employees' : '/employees/list');
  }, [navigate, fromEmployees]);

  const handleEditClick = useCallback(() => {
    if (employee?.id) {
      navigate(`/employees/${employee.id}/edit`);
    }
  }, [navigate, employee?.id]);

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
          <Button variant="outline" onClick={handleBackClick}>
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
            onClick={handleBackClick}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Employee Details</h1>
            <p className="font-mono text-primary font-semibold text-xl text-center">
              {empCode}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleEditClick} variant="outline">
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
                {profilePhotoUrl && (
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profilePhotoUrl} />
                    <AvatarFallback className="text-lg">
                      {avatarInitials}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <CardTitle>{employee.name || "N/A"}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {empCode}
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
                      variant={statusVariant}
                      className="text-xs"
                    >
                      {employeeStatus}
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
          <EmployeeEmploymentDetails
            role={employee.role}
            position={employee.position}
            date_of_joining={employee.date_of_joining}
            employee_status={employee.employee_status}
            status={employee.status}
            formatDate={formatDate}
          />

          {/* Address */}
          <EmployeeAddress
            address1={employee.address1}
            address2={employee.address2}
            state={employee.state}
            district={employee.district}
            pincode={employee.pincode}
            landmark={employee.landmark}
          />

          {/* Bank Details */}
          <EmployeeBankDetails
            bank_name={employee.bank_name}
            bank_account_number={employee.bank_account_number}
            ifsc_code={employee.ifsc_code}
            pf_uan_number={employee.pf_uan_number}
          />

          {/* Documents */}
          <EmployeeDocuments
            employeeId={Number(id)}
            documents={documents}
          />
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Personal Information */}
          <EmployeePersonalInfo
            date_of_birth={employee.date_of_birth}
            gender={employee.gender}
            district={employee.district}
            teams_id={employee.teams_id}
            whatsapp={employee.whatsapp}
            formatDate={formatDate}
          />

          {/* Team Lead */}
          <EmployeeTeamLead
            team_lead_name={employee.team_lead_name}
            team_lead_email={employee.team_lead_email}
          />

          {/* Leave Balance */}
          <EmployeeLeaveBalance
            annual_leave_count={employee.annual_leave_count}
            sick_leave_count={employee.sick_leave_count}
            casual_leave_count={employee.casual_leave_count}
          />

          {/* Emergency Contact */}
          <EmployeeEmergencyContact
            emergency_contact_name={employee.emergency_contact_name}
            emergency_contact_relation={employee.emergency_contact_relation}
            emergency_contact_number={employee.emergency_contact_number}
          />
        </div>
      </div>
    </div>
  );
}
