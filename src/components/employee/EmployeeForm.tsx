import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Info, Eye, EyeOff, Upload, FileText, Trash2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecureInput } from "@/components/ui/secure-input";
import { Label } from "@/components/ui/label";
import { useSecurityValidation } from "@/hooks/useSecurityValidation";
import { SecurityAlertDialog } from "@/components/SecurityAlertDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { rolesApi, positionsApi, rolePositionsApi } from "@/lib/api";
import { employeesApi } from "@/features/employees/api";
import { usersApi } from "@/features/users/api";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { getImageUrl } from "@/lib/imageUtils";
import { API_CONFIG } from "@/lib/config";
import { logger } from "@/lib/logger";
import { getItemSync, secureStorageWithCache } from "@/lib/secureStorage";
import { ProfilePhotoUpload } from "@/components/ui/profile-photo-upload";

interface EmployeeFormProps {
  employeeId?: number;
  mode: 'create' | 'edit';
}

interface EmployeeFormData {
  // Basic user info
  name: string;
  email: string;
  password: string;
  mobile: string;
  date_of_birth: string;
  gender: string;
  
  // Employee basic info
  empCode: string;
  role: string;
  position: string;
  teamLeadId: string;
  date_of_joining: string;
  employee_status: string;
  
  // Salary & Finance
  bank_name: string;
  bank_account_number: string;
  ifsc_code: string;
  pf_uan_number: string;
  
  // Address & Emergency Details
  address1: string;
  address2: string;
  landmark: string;
  state: string;
  district: string;
  pincode: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_number: string;
  
  // Contact Details
  teams_id: string;
  whatsapp: string;
  
  // Leave counts
  annual_leave_count: string;
  sick_leave_count: string;
  casual_leave_count: string;
  
  // Profile
  profile_photo_url: string;
}

interface ValidationErrors {
  [key: string]: string;
}

export default function EmployeeForm({ employeeId, mode }: EmployeeFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isTeamLeader = currentUser?.role === 'Team Leader' || currentUser?.role === 'Team Lead';
  const canManage = ['Admin', 'Super Admin', 'Team Lead', 'Manager'].includes(currentUser?.role || '');

  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const { securityAlertProps } = useSecurityValidation();
  
  // Document upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadDocumentType, setUploadDocumentType] = useState("");
  const [uploadDocumentNumber, setUploadDocumentNumber] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    email: "",
    password: "",
    mobile: "",
    date_of_birth: "",
    gender: "",
    empCode: "",
    role: "",
    position: "",
    teamLeadId: "",
    date_of_joining: "",
    employee_status: "Active",
    bank_name: "",
    bank_account_number: "",
    ifsc_code: "",
    pf_uan_number: "",
    address1: "",
    address2: "",
    landmark: "",
    state: "",
    district: "",
    pincode: "",
    emergency_contact_name: "",
    emergency_contact_relation: "",
    emergency_contact_number: "",
    teams_id: "",
    whatsapp: "",
    annual_leave_count: "0",
    sick_leave_count: "0",
    casual_leave_count: "0",
    profile_photo_url: "",
  });

  // Fetch employee data (for edit mode)
  const { data: employeeData, isLoading: isLoadingEmployee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => employeesApi.getById(Number(employeeId)),
    enabled: !!employeeId && mode === 'edit',
  });

  // Fetch users, roles, positions
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getForDropdown({ limit: 100 }),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.getAll(),
  });

  const { data: positionsData } = useQuery({
    queryKey: ['available-positions'],
    queryFn: () => employeesApi.getAvailablePositions(),
  });

  const allUsers = usersData?.data || [];
  const allRoles = rolesData?.data || [];
  const allPositions = positionsData?.data || [];

  // Filter roles based on user permissions
  const availableRoles = allRoles.filter((role: any) => {
    if (isSuperAdmin) return true;
    return role.name !== 'Super Admin';
  });

  // Fetch role-position mappings
  const selectedRole = allRoles.find((r: any) => r.name === formData.role);
  const { data: rolePositionsData, isLoading: isLoadingPositions } = useQuery({
    queryKey: ['role-positions', selectedRole?.id],
    queryFn: () => rolePositionsApi.getByRole(selectedRole.id),
    enabled: !!selectedRole?.id && !!formData.role,
  });

  const rolePositions = rolePositionsData?.data || [];
  
  // Filter positions based on role mapping
  // rolePositions contains positions with is_mapped flag (1 or 0)
  const availablePositions = formData.role && rolePositions.length > 0
    ? rolePositions
        .filter((rp: any) => {
          // Filter to only show positions that are mapped (is_mapped === 1 or true)
          const isMapped = rp.is_mapped;
          return isMapped === 1 || isMapped === true || isMapped === '1';
        })
        .map((rp: any) => {
          // Map to full position objects from allPositions to ensure we have complete data
          const fullPosition = allPositions.find((p: any) => p.id === rp.id);
          return fullPosition || rp;
        })
        .filter((p: any) => p !== undefined && p !== null)
    : formData.role && rolePositions.length === 0 && !isLoadingPositions
    ? (
        // Fallback: if no role->position mappings exist, show common level-2 positions
        (() => {
          const keywords = ['dev', 'developer', 'qa', 'tester', 'designer', 'engineer', 'employee'];
          return allPositions.filter((p: any) => {
            const name = (p.name || '').toString().toLowerCase();
            return keywords.some(k => name.includes(k));
          });
        })()
      ) // No specific mappings, but provide sensible fallback
    : formData.role && isLoadingPositions
    ? [] // Loading positions
    : !formData.role
    ? allPositions // Show all positions if no role selected
    : allPositions; // Fallback: show all positions

  // Get available reporting managers
  const getAvailableReportingManagers = () => {
    const filteredUsers = isSuperAdmin ? allUsers : allUsers.filter((u: any) => u.role !== 'Super Admin');
    const managerRoles = ['Admin', 'Team Lead', 'Team Leader', 'Manager'];
    const superAdminRoleName = 'Super Admin';
    const currentUserId = employeeData?.data?.user_id;
    
    if (!selectedRole) return [];
    
    const selectedRoleData = allRoles.find((role: any) => role.name === selectedRole);
    const reportingRoleName = selectedRoleData?.reporting_person_role_name;
    
    if (reportingRoleName) {
      return filteredUsers.filter((user: any) => 
        user.role === reportingRoleName && user.id !== currentUserId
      );
    }
    
    const isManagerRole = managerRoles.includes(selectedRole);
    
    if (isManagerRole) {
      if (isSuperAdmin) {
        return allUsers.filter((user: any) => 
          user.role === superAdminRoleName && user.id !== currentUserId
        );
      } else {
        return filteredUsers.filter((user: any) => 
          (user.role === superAdminRoleName || managerRoles.includes(user.role)) && user.id !== currentUserId
        );
      }
    } else {
      if (isSuperAdmin) {
        return filteredUsers.filter((user: any) => 
          managerRoles.includes(user.role) && user.id !== currentUserId
        );
      } else if (isTeamLeader) {
        return filteredUsers.filter((user: any) => 
          managerRoles.includes(user.role) && user.id !== currentUserId
        );
      } else {
        return filteredUsers.filter((user: any) => 
          (managerRoles.includes(user.role) || user.role === superAdminRoleName) && user.id !== currentUserId
        );
      }
    }
  };

  const availableReportingManagers = getAvailableReportingManagers();

  // Fetch documents (for edit mode)
  const { data: documentsData, refetch: refetchDocuments } = useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: () => employeesApi.getDocuments(Number(employeeId)),
    enabled: !!employeeId && mode === 'edit',
  });

  const documents = documentsData?.data || [];

  // Load employee data (edit mode)
  useEffect(() => {
    if (employeeData?.data && mode === 'edit') {
      const emp = employeeData.data;
      setFormData({
        name: emp.name || "",
        email: emp.email || "",
        password: "",
        mobile: emp.mobile || "",
        role: emp.role || "",
        position: emp.position || "",
        empCode: emp.emp_code || "",
        teamLeadId: emp.team_lead_user_id ? emp.team_lead_user_id.toString() : "",
        date_of_birth: formatDateFromDB(emp.date_of_birth),
        gender: emp.gender || "",
        date_of_joining: formatDateFromDB(emp.date_of_joining),
        employee_status: emp.employee_status || "Active",
        bank_name: emp.bank_name || "",
        bank_account_number: emp.bank_account_number || "",
        ifsc_code: emp.ifsc_code || "",
        pf_uan_number: emp.pf_uan_number || "",
        address1: emp.address1 || "",
        address2: emp.address2 || "",
        landmark: emp.landmark || "",
        state: emp.state || "",
        district: emp.district || "",
        pincode: emp.pincode || "",
        emergency_contact_name: emp.emergency_contact_name || "",
        emergency_contact_relation: emp.emergency_contact_relation || "",
        emergency_contact_number: emp.emergency_contact_number || "",
        teams_id: emp.teams_id || emp.skype || "",
        whatsapp: emp.whatsapp || "",
        annual_leave_count: String(emp.annual_leave_count || 0),
        sick_leave_count: String(emp.sick_leave_count || 0),
        casual_leave_count: String(emp.casual_leave_count || 0),
        profile_photo_url: emp.profile_photo_url || "",
      });
    }
  }, [employeeData, mode]);

  // Clear position when role changes
  useEffect(() => {
    if (formData.role) {
      setFormData(prev => ({ ...prev, position: "" }));
    }
  }, [formData.role]);

  // Generate employee code (create mode)
  useEffect(() => {
    if (mode === 'create' && !formData.empCode) {
      generateEmpCode();
    }
  }, [mode]);

  const generateEmpCode = async () => {
    try {
      const response = await employeesApi.getAll({ page: 1, limit: 1 });
      const count = response.pagination?.total || 0;
      const newCode = `NTPL${String(count + 1).padStart(4, '0')}`;
      setFormData(prev => ({ ...prev, empCode: newCode }));
    } catch (error) {
      const newCode = `NTPL${String(Date.now()).slice(-4)}`;
      setFormData(prev => ({ ...prev, empCode: newCode }));
    }
  };

  const formatDateFromDB = (dateValue: string | null | undefined): string => {
    if (!dateValue) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}
    return "";
  };

  const formatDateForDB = (dateValue: string | null | undefined): string | null => {
    if (!dateValue || dateValue === "") return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}
    return null;
  };

  // Custom validation
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Required fields
    if (!formData.name.trim()) errors.name = "Name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    if (mode === 'create' && !formData.password) errors.password = "Password is required";
    if (mode === 'create' && !formData.mobile.trim()) errors.mobile = "Mobile number is required";
    if (!formData.empCode.trim()) errors.empCode = "Employee ID is required";
    if (!formData.role) errors.role = "Role is required";
    if (!formData.position) errors.position = "Position is required";

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }

    // Password validation (create mode)
    if (mode === 'create' && formData.password) {
      if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      } else if (!/(?=.*[a-z])/.test(formData.password)) {
        errors.password = "Password must contain at least one lowercase letter";
      } else if (!/(?=.*[A-Z])/.test(formData.password)) {
        errors.password = "Password must contain at least one uppercase letter";
      } else if (!/(?=.*[0-9])/.test(formData.password)) {
        errors.password = "Password must contain at least one number";
      } else if (!/(?=.*[!@#$%^&*])/.test(formData.password)) {
        errors.password = "Password must contain at least one special character";
      }
    }

    // Mobile validation
    if (mode === 'create' && !formData.mobile.trim()) {
      errors.mobile = "Mobile number is required";
    } else if (formData.mobile && formData.mobile.length !== 10) {
      errors.mobile = "Mobile number must be 10 digits";
    }

    // Leave counts validation (numbers only, no decimals)
    if (formData.annual_leave_count && !/^\d+$/.test(formData.annual_leave_count)) {
      errors.annual_leave_count = "Only whole numbers allowed";
    }
    if (formData.sick_leave_count && !/^\d+$/.test(formData.sick_leave_count)) {
      errors.sick_leave_count = "Only whole numbers allowed";
    }
    if (formData.casual_leave_count && !/^\d+$/.test(formData.casual_leave_count)) {
      errors.casual_leave_count = "Only whole numbers allowed";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle input change with validation
  const handleInputChange = (field: keyof EmployeeFormData, value: string) => {
    // Clear error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle leave count input (numbers only, no decimals)
  const handleLeaveCountChange = (field: 'annual_leave_count' | 'sick_leave_count' | 'casual_leave_count', value: string) => {
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, [field]: digitsOnly }));
    
    // Clear error
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle profile photo change (receives URL from ProfilePhotoUpload component)
  const handleProfilePhotoChange = (url: string) => {
    setFormData(prev => ({ ...prev, profile_photo_url: url }));
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const employeeData = {
        name: data.name,
        email: data.email,
        password: data.password,
        mobile: data.mobile,
        role: data.role,
        position: data.position || null,
        empCode: data.empCode,
        teamLeadId: data.teamLeadId && data.teamLeadId !== "" ? data.teamLeadId : null,
        date_of_birth: formatDateForDB(data.date_of_birth),
        gender: data.gender || null,
        date_of_joining: formatDateForDB(data.date_of_joining),
        employee_status: data.employee_status || 'Active',
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        ifsc_code: data.ifsc_code || null,
        pf_uan_number: data.pf_uan_number || null,
        address1: data.address1 || null,
        address2: data.address2 || null,
        landmark: data.landmark || null,
        state: data.state || null,
        district: data.district || null,
        pincode: data.pincode || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_relation: data.emergency_contact_relation || null,
        emergency_contact_number: data.emergency_contact_number || null,
        teams_id: data.teams_id || null,
        whatsapp: data.whatsapp || null,
        annual_leave_count: parseInt(data.annual_leave_count) || 0,
        sick_leave_count: parseInt(data.sick_leave_count) || 0,
        casual_leave_count: parseInt(data.casual_leave_count) || 0,
        profile_photo_url: data.profile_photo_url || null,
      };
      
      return employeesApi.create(employeeData);
    },
    onSuccess: async () => {

      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
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

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const updateData: any = {
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        role: data.role,
        position: data.position || null,
        empCode: data.empCode,
        teamLeadId: data.teamLeadId && data.teamLeadId !== "" ? data.teamLeadId : null,
        date_of_birth: formatDateForDB(data.date_of_birth),
        gender: data.gender || null,
        date_of_joining: formatDateForDB(data.date_of_joining),
        employee_status: data.employee_status || 'Active',
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        ifsc_code: data.ifsc_code || null,
        pf_uan_number: data.pf_uan_number || null,
        address1: data.address1 || null,
        address2: data.address2 || null,
        landmark: data.landmark || null,
        state: data.state || null,
        district: data.district || null,
        pincode: data.pincode || null,
        emergency_contact_name: data.emergency_contact_name || null,
        emergency_contact_relation: data.emergency_contact_relation || null,
        emergency_contact_number: data.emergency_contact_number || null,
        teams_id: data.teams_id || null,
        whatsapp: data.whatsapp || null,
        annual_leave_count: parseInt(data.annual_leave_count) || 0,
        sick_leave_count: parseInt(data.sick_leave_count) || 0,
        casual_leave_count: parseInt(data.casual_leave_count) || 0,
      };

      if (data.password) {
        updateData.password = data.password;
      }

      return employeesApi.update(Number(employeeId), updateData);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employees-list'] });
      queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
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

  // Document upload mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (uploadFormData: FormData) => {
      return employeesApi.uploadDocument(Number(employeeId!), uploadFormData);
    },
    onSuccess: () => {
      refetchDocuments();
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadDocumentType("");
      setUploadDocumentNumber("");
      toast({ title: "Success", description: "Document uploaded successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document.",
        variant: "destructive",
      });
    },
  });

  // Document delete mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: number) => {
      return employeesApi.deleteDocument(Number(employeeId!), docId);
    },
    onSuccess: () => {
      refetchDocuments();
      setShowDeleteDialog(false);
      setDeleteDocId(null);
      toast({ title: "Success", description: "Document deleted successfully." });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trim name and address fields before validation/submission
    const trimmedData: EmployeeFormData = {
      ...formData,
      name: formData.name.trim(),
      address1: formData.address1.trim(),
      address2: formData.address2.trim(),
      landmark: formData.landmark.trim(),
      state: formData.state.trim(),
      district: formData.district.trim(),
    };

    // Update form data with trimmed values
    setFormData(trimmedData);

    // Use trimmed data for validation
    const originalFormData = formData;
    // Temporarily set formData to trimmedData for validation
    const tempFormData = { ...formData, ...trimmedData };
    
    // Validate with trimmed data by checking trimmedData directly
    const errors: ValidationErrors = {};

    // Required fields
    if (!trimmedData.name.trim()) errors.name = "Name is required";
    if (!trimmedData.email.trim()) errors.email = "Email is required";
    if (mode === 'create' && !trimmedData.password) errors.password = "Password is required";
    if (mode === 'create' && !trimmedData.mobile.trim()) errors.mobile = "Mobile number is required";
    if (!trimmedData.empCode.trim()) errors.empCode = "Employee ID is required";
    if (!trimmedData.role) errors.role = "Role is required";
    if (!trimmedData.position) errors.position = "Position is required";

    // Email validation
    if (trimmedData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedData.email)) {
      errors.email = "Invalid email format";
    }

    // Password validation (create mode)
    if (mode === 'create' && trimmedData.password) {
      if (trimmedData.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      } else if (!/(?=.*[a-z])/.test(trimmedData.password)) {
        errors.password = "Password must contain at least one lowercase letter";
      } else if (!/(?=.*[A-Z])/.test(trimmedData.password)) {
        errors.password = "Password must contain at least one uppercase letter";
      } else if (!/(?=.*[0-9])/.test(trimmedData.password)) {
        errors.password = "Password must contain at least one number";
      } else if (!/(?=.*[!@#$%^&*])/.test(trimmedData.password)) {
        errors.password = "Password must contain at least one special character";
      }
    }

    // Mobile validation
    if (mode === 'create' && !trimmedData.mobile.trim()) {
      errors.mobile = "Mobile number is required";
    } else if (trimmedData.mobile && trimmedData.mobile.length !== 10) {
      errors.mobile = "Mobile number must be 10 digits";
    }

    // Leave counts validation (numbers only, no decimals)
    if (trimmedData.annual_leave_count && !/^\d+$/.test(trimmedData.annual_leave_count)) {
      errors.annual_leave_count = "Only whole numbers allowed";
    }
    if (trimmedData.sick_leave_count && !/^\d+$/.test(trimmedData.sick_leave_count)) {
      errors.sick_leave_count = "Only whole numbers allowed";
    }
    if (trimmedData.casual_leave_count && !/^\d+$/.test(trimmedData.casual_leave_count)) {
      errors.casual_leave_count = "Only whole numbers allowed";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form.",
        variant: "destructive",
      });
      return;
    }

    setValidationErrors({});

    if (mode === 'create') {
      createMutation.mutate(trimmedData);
    } else {
      updateMutation.mutate(trimmedData);
    }
  };

  const handleDocumentUpload = () => {
    if (!uploadFile || !uploadDocumentType) {
      toast({
        title: "Validation Error",
        description: "Please select a file and document type.",
        variant: "destructive",
      });
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('file', uploadFile);
    uploadFormData.append('document_type', uploadDocumentType);
    if (uploadDocumentNumber) {
      uploadFormData.append('document_number', uploadDocumentNumber);
    }

    uploadDocumentMutation.mutate(uploadFormData);
  };

  // Mandatory field label component
  const MandatoryLabel = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
    <Label htmlFor={htmlFor} className="text-red-500">
      {children} *
    </Label>
  );

  if (mode === 'edit' && isLoadingEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading employee data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/employees')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {mode === 'create' ? 'Create New Employee' : 'Edit Employee'}
            </h1>
            <p className="text-muted-foreground">
              {mode === 'create' ? 'Fill in all employee details' : 'Update employee information'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Photo Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>Upload employee profile picture</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfilePhotoUpload
              value={formData.profile_photo_url}
              onChange={handleProfilePhotoChange}
              name={formData.name}
            />
          </CardContent>
        </Card>

        {/* Basic User Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic User Information</CardTitle>
            <CardDescription>Login credentials and basic details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Reordered: name, date of birth, gender, mobile, whatsapp, teams id, email, password */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <MandatoryLabel htmlFor="name">Full Name</MandatoryLabel>
                <SecureInput
                  id="name"
                  fieldName="Full Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value.toUpperCase())}
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim();
                    if (trimmed !== e.target.value) {
                      handleInputChange('name', trimmed);
                    }
                  }}
                  placeholder="Enter full name"
                />
                {validationErrors.name && (
                  <p className="text-sm text-destructive">{validationErrors.name}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Date of Birth</Label>
                <DatePicker
                  value={formData.date_of_birth}
                  onChange={(date) => setFormData(prev => ({ ...prev, date_of_birth: date }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
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
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                {mode === 'create' ? (
                  <MandatoryLabel htmlFor="mobile">Mobile</MandatoryLabel>
                ) : (
                  <Label htmlFor="mobile">Mobile</Label>
                )}
                <SecureInput
                  id="mobile"
                  fieldName="Mobile"
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, mobile: digitsOnly }));
                  }}
                  placeholder="Enter mobile number (10 digits)"
                  maxLength={10}
                />
                {validationErrors.mobile && (
                  <p className="text-sm text-destructive">{validationErrors.mobile}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <SecureInput
                  id="whatsapp"
                  fieldName="WhatsApp"
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, whatsapp: digitsOnly }));
                  }}
                  placeholder="Enter WhatsApp number (10 digits)"
                  maxLength={10}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teams_id">Teams ID</Label>
                <SecureInput
                  id="teams_id"
                  fieldName="Teams ID"
                  type="text"
                  value={formData.teams_id}
                  onChange={(e) => handleInputChange('teams_id', e.target.value)}
                  placeholder="Enter Teams ID"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <MandatoryLabel htmlFor="email">Email</MandatoryLabel>
                <SecureInput
                  id="email"
                  fieldName="Email"
                  type="text"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
                {validationErrors.email && (
                  <p className="text-sm text-destructive">{validationErrors.email}</p>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <MandatoryLabel htmlFor="password">Password</MandatoryLabel>
                  {mode === 'create' && (
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
                  )}
                </div>
                <div className="relative">
                  <SecureInput
                    id="password"
                    fieldName="Password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder={mode === 'create' ? "Enter password" : "Leave blank to keep current password"}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {validationErrors.password && (
                  <p className="text-sm text-destructive">{validationErrors.password}</p>
                )}
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
                <MandatoryLabel htmlFor="empCode">Employee ID</MandatoryLabel>
                <SecureInput
                  id="empCode"
                  fieldName="Employee ID"
                  value={formData.empCode}
                  onChange={(e) => handleInputChange('empCode', e.target.value.toUpperCase())}
                  placeholder="NTPL0001"
                />
                {validationErrors.empCode && (
                  <p className="text-sm text-destructive">{validationErrors.empCode}</p>
                )}
              </div>
              <div className="grid gap-2">
                <MandatoryLabel htmlFor="role">User Role</MandatoryLabel>
                <Select
                  value={formData.role}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, role: value, position: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role: any) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.role && (
                  <p className="text-sm text-destructive">{validationErrors.role}</p>
                )}
              </div>
              <div className="grid gap-2">
                <MandatoryLabel htmlFor="position">Position</MandatoryLabel>
                <Select
                  value={formData.position}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, position: value }))}
                  disabled={!formData.role || isLoadingPositions}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingPositions ? "Loading positions..." : formData.role ? "Select Position" : "Select role first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingPositions ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading positions...</div>
                    ) : availablePositions.length > 0 ? (
                      availablePositions.map((pos: any) => (
                        <SelectItem key={pos.id} value={pos.name}>
                          {pos.name} {pos.level !== undefined ? `(Level ${pos.level})` : ''}
                        </SelectItem>
                      ))
                    ) : formData.role ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">No positions available for this role</div>
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Select a role first</div>
                    )}
                  </SelectContent>
                </Select>
                {validationErrors.position && (
                  <p className="text-sm text-destructive">{validationErrors.position}</p>
                )}
              </div>
            </div>
            {/* Reports To, DOJ, Emp Status in a row */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <MandatoryLabel htmlFor="reportsTo">Reports To</MandatoryLabel>
                <Select
                  value={formData.teamLeadId || "none"}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, teamLeadId: value === "none" ? "" : value }))}
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
              <div className="grid gap-2">
                <Label>Date of Joining</Label>
                <DatePicker
                  value={formData.date_of_joining}
                  onChange={(date) => setFormData(prev => ({ ...prev, date_of_joining: date }))}
                />
              </div>
              <div className="grid gap-2">
                <MandatoryLabel htmlFor="employee_status">Employee Status</MandatoryLabel>
                <Select
                  value={formData.employee_status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, employee_status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Resigned">Resigned</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary & Finance Information */}
        <Card>
          <CardHeader>
            <CardTitle>Salary & Finance Information</CardTitle>
            <CardDescription>Bank account details required for salary processing and reimbursements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <SecureInput
                  id="bank_name"
                  fieldName="Bank Name"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value.toUpperCase())}
                  placeholder="Enter bank name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bank_account_number">Bank Account Number</Label>
                <SecureInput
                  id="bank_account_number"
                  fieldName="Bank Account Number"
                  value={formData.bank_account_number}
                  onChange={(e) => handleInputChange('bank_account_number', e.target.value.toUpperCase())}
                  placeholder="Enter account number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <SecureInput
                  id="ifsc_code"
                  fieldName="IFSC Code"
                  value={formData.ifsc_code}
                  onChange={(e) => handleInputChange('ifsc_code', e.target.value.toUpperCase())}
                  placeholder="Enter IFSC code"
                  maxLength={11}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pf_uan_number">UAN Number</Label>
                <SecureInput
                  id="pf_uan_number"
                  fieldName="UAN Number"
                  value={formData.pf_uan_number}
                  onChange={(e) => handleInputChange('pf_uan_number', e.target.value.toUpperCase())}
                  placeholder="Enter UAN number"
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
                <SecureInput
                  id="address1"
                  fieldName="Address Line 1"
                  value={formData.address1}
                  onChange={(e) => handleInputChange('address1', e.target.value.toUpperCase())}
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim();
                    if (trimmed !== e.target.value) {
                      handleInputChange('address1', trimmed);
                    }
                  }}
                  placeholder="Enter address line 1"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address2">Address Line 2</Label>
                <SecureInput
                  id="address2"
                  fieldName="Address Line 2"
                  value={formData.address2}
                  onChange={(e) => handleInputChange('address2', e.target.value.toUpperCase())}
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim();
                    if (trimmed !== e.target.value) {
                      handleInputChange('address2', trimmed);
                    }
                  }}
                  placeholder="Enter address line 2"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="landmark">Landmark</Label>
                <SecureInput
                  id="landmark"
                  fieldName="Landmark"
                  value={formData.landmark}
                  onChange={(e) => handleInputChange('landmark', e.target.value.toUpperCase())}
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim();
                    if (trimmed !== e.target.value) {
                      handleInputChange('landmark', trimmed);
                    }
                  }}
                  placeholder="Enter landmark"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <SecureInput
                  id="state"
                  fieldName="State"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value.toUpperCase())}
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim();
                    if (trimmed !== e.target.value) {
                      handleInputChange('state', trimmed);
                    }
                  }}
                  placeholder="Enter state"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="district">District</Label>
                <SecureInput
                  id="district"
                  fieldName="District"
                  value={formData.district}
                  onChange={(e) => handleInputChange('district', e.target.value.toUpperCase())}
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim();
                    if (trimmed !== e.target.value) {
                      handleInputChange('district', trimmed);
                    }
                  }}
                  placeholder="Enter district"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pincode">Pincode</Label>
                <SecureInput
                  id="pincode"
                  fieldName="Pincode"
                  value={formData.pincode}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setFormData(prev => ({ ...prev, pincode: digitsOnly }));
                  }}
                  placeholder="Enter pincode"
                  maxLength={6}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <SecureInput
                  id="emergency_contact_name"
                  fieldName="Emergency Contact Name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleInputChange('emergency_contact_name', e.target.value.toUpperCase())}
                  placeholder="Enter emergency contact name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency_contact_relation">Relation</Label>
                <Select
                  value={formData.emergency_contact_relation}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, emergency_contact_relation: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Father">Father</SelectItem>
                    <SelectItem value="Mother">Mother</SelectItem>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Sibling">Sibling</SelectItem>
                    <SelectItem value="Son">Son</SelectItem>
                    <SelectItem value="Daughter">Daughter</SelectItem>
                    <SelectItem value="Friend">Friend</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency_contact_number">Emergency Contact Number</Label>
                <SecureInput
                  id="emergency_contact_number"
                  fieldName="Emergency Contact Number"
                  type="text"
                  value={formData.emergency_contact_number}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData(prev => ({ ...prev, emergency_contact_number: digitsOnly }));
                  }}
                  placeholder="Enter emergency contact number"
                  maxLength={10}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave & Reimbursement */}
        <Card>
          <CardHeader>
            <CardTitle>Leave & Reimbursement</CardTitle>
            <CardDescription>Leave balance information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="annual_leave_count">Annual Leave Count</Label>
                <SecureInput
                  id="annual_leave_count"
                  fieldName="Annual Leave Count"
                  type="text"
                  value={formData.annual_leave_count}
                  onChange={(e) => handleLeaveCountChange('annual_leave_count', e.target.value)}
                  placeholder="Enter annual leave count"
                />
                {validationErrors.annual_leave_count && (
                  <p className="text-sm text-destructive">{validationErrors.annual_leave_count}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sick_leave_count">Sick Leave Count</Label>
                <SecureInput
                  id="sick_leave_count"
                  fieldName="Sick Leave Count"
                  type="text"
                  value={formData.sick_leave_count}
                  onChange={(e) => handleLeaveCountChange('sick_leave_count', e.target.value)}
                  placeholder="Enter sick leave count"
                />
                {validationErrors.sick_leave_count && (
                  <p className="text-sm text-destructive">{validationErrors.sick_leave_count}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="casual_leave_count">Casual Leave Count</Label>
                <SecureInput
                  id="casual_leave_count"
                  fieldName="Casual Leave Count"
                  type="text"
                  value={formData.casual_leave_count}
                  onChange={(e) => handleLeaveCountChange('casual_leave_count', e.target.value)}
                  placeholder="Enter casual leave count"
                />
                {validationErrors.casual_leave_count && (
                  <p className="text-sm text-destructive">{validationErrors.casual_leave_count}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Section - Only in edit mode */}
        {mode === 'edit' && employeeId && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Upload and manage employee documents</CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={() => setShowUploadDialog(true)}
                  variant="outline"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No documents uploaded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.document_type}</p>
                          {doc.document_number && (
                            <p className="text-sm text-muted-foreground">
                              Number: {doc.document_number}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.verified ? (
                          <span className="text-xs text-green-600">Verified</span>
                        ) : (
                          <span className="text-xs text-yellow-600">Pending</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteDocId(doc.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/employees')}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {mode === 'create' ? 'Create Employee' : 'Update Employee'}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload a document for this employee. Supported formats: PDF, JPG, PNG.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="document_type">Document Type *</Label>
              <Select
                value={uploadDocumentType}
                onValueChange={setUploadDocumentType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                  <SelectItem value="PAN">PAN</SelectItem>
                  <SelectItem value="Passport">Passport</SelectItem>
                  <SelectItem value="Driving License">Driving License</SelectItem>
                  <SelectItem value="Voter ID">Voter ID</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document_number">Document Number</Label>
              <SecureInput
                id="document_number"
                fieldName="Document Number"
                value={uploadDocumentNumber}
                onChange={(e) => setUploadDocumentNumber(e.target.value.toUpperCase())}
                placeholder="Enter document number (optional)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="document_file">File *</Label>
              <input
                id="document_file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
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
              onClick={handleDocumentUpload}
              disabled={uploadDocumentMutation.isPending}
            >
              {uploadDocumentMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Document Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDocId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDocId) {
                  deleteDocumentMutation.mutate(deleteDocId);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SecurityAlertDialog {...securityAlertProps} />
    </div>
  );
}
