import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Lock, Camera, Save, Building2, Wallet, MapPin, Phone, Calendar, UserCircle, Eye, EyeOff, Upload, FileText, Download, Trash2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { authApi, employeesApi } from "@/lib/api";
import { logger } from "@/lib/logger";
import { ImageUploadCrop } from "@/components/ui/image-upload-crop";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getImageUrl } from "@/lib/imageUtils";

export default function ProfileSetup() {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const userId = currentUser?.id;

  const [formData, setFormData] = useState({
    // Basic User Information
    name: "",
    email: "",
    mobile: "",
    oldPassword: "",
    password: "",
    confirmPassword: "",
    
    // Employee Basic Information
    emp_code: "",
    date_of_birth: "",
    gender: "",
    date_of_joining: "",
    
    // Salary & Finance Information
    bank_name: "",
    bank_account_number: "",
    ifsc_code: "",
    pf_uan_number: "",
    
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
    
    // Profile Photo
    profile_photo_url: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    password: false,
    confirmPassword: false,
  });

  // Document upload state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocumentType, setUploadDocumentType] = useState("");
  const [uploadDocumentNumber, setUploadDocumentNumber] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<number | null>(null);

  // Fetch current user data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => authApi.getMe(),
    enabled: !!userId,
  });

  // Fetch employee data if exists
  const { data: employeeData } = useQuery({
    queryKey: ['employee-profile', userId],
    queryFn: () => employeesApi.getByUserId(userId!),
    enabled: !!userId,
    retry: false, // Don't retry if employee doesn't exist
  });

  // Fetch documents if employee exists
  const { data: documentsData, refetch: refetchDocuments } = useQuery({
    queryKey: ['employee-documents', employeeData?.data?.id],
    queryFn: () => employeesApi.getDocuments(employeeData!.data.id),
    enabled: !!employeeData?.data?.id,
  });

  const documents = documentsData?.data || [];

  useEffect(() => {
    if (userData?.data) {
      setFormData(prev => ({
        ...prev,
        // Basic User Information
        name: userData.data.name || "",
        email: userData.data.email || "",
        mobile: userData.data.mobile || "",
        
        // Employee Basic Information
        emp_code: employeeData?.data?.emp_code || "",
        date_of_birth: employeeData?.data?.date_of_birth || "",
        gender: employeeData?.data?.gender || "",
        date_of_joining: employeeData?.data?.date_of_joining || "",
        
        // Salary & Finance Information
        bank_name: employeeData?.data?.bank_name || "",
        bank_account_number: employeeData?.data?.bank_account_number || "",
        ifsc_code: employeeData?.data?.ifsc_code || "",
        pf_uan_number: employeeData?.data?.pf_uan_number || "",
        
        // Address & Emergency Details
        address1: employeeData?.data?.address1 || "",
        address2: employeeData?.data?.address2 || "",
        landmark: employeeData?.data?.landmark || "",
        state: employeeData?.data?.state || "",
        district: employeeData?.data?.district || "",
        pincode: employeeData?.data?.pincode || "",
        emergency_contact_name: employeeData?.data?.emergency_contact_name || "",
        emergency_contact_relation: employeeData?.data?.emergency_contact_relation || "",
        emergency_contact_number: employeeData?.data?.emergency_contact_number || "",
        
        // Profile Photo
        profile_photo_url: employeeData?.data?.profile_photo_url || "",
      }));
    }
  }, [userData, employeeData]);

  // Update password mutation (separate from profile update)
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: { oldPassword: string; password: string }) => {
      return await authApi.updateProfile({
        oldPassword: data.oldPassword,
        password: data.password,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password updated successfully." });
      setFormData(prev => ({ ...prev, oldPassword: "", password: "", confirmPassword: "" }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.oldPassword;
        delete newErrors.password;
        delete newErrors.confirmPassword;
        return newErrors;
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Failed to update password.";
      if (errorMessage.includes("Old password")) {
        setErrors(prev => ({ ...prev, oldPassword: errorMessage }));
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Document upload mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!employeeData?.data?.id) {
        throw new Error('Employee record not found');
      }
      return employeesApi.uploadDocument(employeeData.data.id, formData);
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
      if (!employeeData?.data?.id) {
        throw new Error('Employee record not found');
      }
      return employeesApi.deleteDocument(employeeData.data.id, docId);
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
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.",
          variant: "destructive"
        });
        return;
      }
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
    if (!uploadFile || !uploadDocumentType || !employeeData?.data?.id) {
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

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      // Update user profile
      const updatedUser = await authApi.updateProfile({
        name: data.name,
        email: data.email,
        mobile: data.mobile,
        ...(data.password && { password: data.password }),
      });

      // Update employee profile if exists
      if (employeeData?.data?.id) {
        // Always include all employee fields explicitly, even if null
        const employeeUpdateData: any = {
          // Employee Basic Information
          date_of_birth: data.date_of_birth || null,
          gender: data.gender || null,
          date_of_joining: data.date_of_joining || null,
          
          // Salary & Finance Information
          bank_name: data.bank_name || null,
          bank_account_number: data.bank_account_number || null,
          ifsc_code: data.ifsc_code || null,
          pf_uan_number: data.pf_uan_number || null,
          
          // Address & Emergency Details
          address1: data.address1 || null,
          address2: data.address2 || null,
          landmark: data.landmark || null,
          state: data.state || null,
          district: data.district || null,
          pincode: data.pincode || null,
          emergency_contact_name: data.emergency_contact_name || null,
          emergency_contact_relation: data.emergency_contact_relation || null,
          emergency_contact_number: data.emergency_contact_number || null,
          
          // Profile Photo
          profile_photo_url: data.profile_photo_url || null,
        };
        
        logger.debug('Sending employee update data:', JSON.stringify(employeeUpdateData, null, 2));
        await employeesApi.update(employeeData.data.id, employeeUpdateData);
      }

      // Update stored user data
      const { secureStorageWithCache } = await import('@/lib/secureStorage');
      await secureStorageWithCache.setItem('user', JSON.stringify({
        ...currentUser,
        name: updatedUser.data.name,
        email: updatedUser.data.email,
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] });
      queryClient.invalidateQueries({ queryKey: ['employee-profile', userId] });
      toast({ title: "Success", description: "Profile updated successfully." });
      setErrors({}); // Clear all errors on success
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // Validation helper functions
  const validateName = (name: string): string | null => {
    if (!name || !name.trim()) {
      return "Full Name is required.";
    }
    return null;
  };

  const validateEmail = (email: string): string | null => {
    if (!email || !email.trim()) {
      return "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Please enter a valid email address.";
    }
    return null;
  };

  const validateMobile = (mobile: string): string | null => {
    if (!mobile || !mobile.trim()) {
      return "Mobile Number is required.";
    }
    const mobileDigits = mobile.replace(/\D/g, ''); // Remove non-digits
    if (mobileDigits.length > 10) {
      return "Mobile number must be maximum 10 digits.";
    }
    if (mobileDigits.length > 0 && !/^\d{1,10}$/.test(mobileDigits)) {
      return "Mobile number must contain only numbers.";
    }
    return null;
  };
  
  const validatePincode = (pincode: string): string | null => {
    if (pincode && pincode.trim()) {
      const pincodeDigits = pincode.replace(/\D/g, ''); // Remove non-digits
      if (pincodeDigits.length > 6) {
        return "Pincode must be maximum 6 digits.";
      }
      if (pincodeDigits.length > 0 && !/^\d{1,6}$/.test(pincodeDigits)) {
        return "Pincode must contain only numbers.";
      }
    }
    return null;
  };
  
  const validateEmergencyContactNumber = (number: string): string | null => {
    if (number && number.trim()) {
      const contactDigits = number.replace(/\D/g, ''); // Remove non-digits
      if (contactDigits.length > 10) {
        return "Emergency contact number must be maximum 10 digits.";
      }
      if (contactDigits.length > 0 && !/^\d{1,10}$/.test(contactDigits)) {
        return "Emergency contact number must contain only numbers.";
      }
    }
    return null;
  };

  const validateDateOfBirth = (date: string): string | null => {
    if (!date) {
      return "Date of Birth is required.";
    }
    return null;
  };

  const validateGender = (gender: string): string | null => {
    if (!gender) {
      return "Gender is required.";
    }
    return null;
  };

  const validateDateOfJoining = (date: string): string | null => {
    if (!date) {
      return "Date of Joining is required.";
    }
    return null;
  };

  const validatePassword = (password: string): string | null => {
    if (!password || !password.trim()) {
      return "Password is required.";
    } else if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    } else if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter.";
    } else if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter.";
    } else if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number.";
    }
    return null;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
    if (!confirmPassword || !confirmPassword.trim()) {
      return "Please confirm your password.";
    } else if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    const newErrors: Record<string, string> = {};

    // Validate required fields
    const nameError = validateName(formData.name);
    if (nameError) newErrors.name = nameError;

    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    const mobileError = validateMobile(formData.mobile);
    if (mobileError) newErrors.mobile = mobileError;

    // Validate employee fields if employee data exists
    if (employeeData?.data) {
      const dobError = validateDateOfBirth(formData.date_of_birth);
      if (dobError) newErrors.date_of_birth = dobError;

      const genderError = validateGender(formData.gender);
      if (genderError) newErrors.gender = genderError;

      const dojError = validateDateOfJoining(formData.date_of_joining);
      if (dojError) newErrors.date_of_joining = dojError;
    }


    // If there are errors, set them and return
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Always include all fields explicitly, even if empty
    const updateData: any = {
      // Basic User Information
      name: formData.name,
      email: formData.email,
      mobile: formData.mobile || null,
    };
    
    // Always include employee fields if employee data exists
    if (employeeData?.data) {
      updateData.date_of_birth = formData.date_of_birth || null;
      updateData.gender = formData.gender || null;
      updateData.date_of_joining = formData.date_of_joining || null;
      updateData.bank_name = formData.bank_name || null;
      updateData.bank_account_number = formData.bank_account_number || null;
      updateData.ifsc_code = formData.ifsc_code || null;
      updateData.pf_uan_number = formData.pf_uan_number || null;
      updateData.address1 = formData.address1 || null;
      updateData.address2 = formData.address2 || null;
      updateData.landmark = formData.landmark || null;
      updateData.state = formData.state || null;
      updateData.district = formData.district || null;
      updateData.pincode = formData.pincode || null;
      updateData.emergency_contact_name = formData.emergency_contact_name || null;
      updateData.emergency_contact_relation = formData.emergency_contact_relation || null;
      updateData.emergency_contact_number = formData.emergency_contact_number || null;
      updateData.profile_photo_url = formData.profile_photo_url || null;
    }
    
    updateProfileMutation.mutate(updateData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8 text-muted-foreground" />
          Profile Setup
        </h1>
        <p className="text-muted-foreground">Manage your profile information and settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Basic User Information */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic User Information
            </CardTitle>
            <CardDescription>Update your basic account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const upperValue = e.target.value.toUpperCase();
                    setFormData({ ...formData, name: upperValue });
                    if (errors.name) {
                      const newErrors = { ...errors };
                      delete newErrors.name;
                      setErrors(newErrors);
                    }
                  }}
                  onBlur={(e) => {
                    const error = validateName(e.target.value);
                    if (error) {
                      setErrors({ ...errors, name: error });
                    } else if (errors.name) {
                      const newErrors = { ...errors };
                      delete newErrors.name;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter your full name"
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) {
                      const newErrors = { ...errors };
                      delete newErrors.email;
                      setErrors(newErrors);
                    }
                  }}
                  onBlur={(e) => {
                    const error = validateEmail(e.target.value);
                    if (error) {
                      setErrors({ ...errors, email: error });
                    } else if (errors.email) {
                      const newErrors = { ...errors };
                      delete newErrors.email;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter your email"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mobile">
                  Mobile Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => {
                    // Only allow digits, max 10
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, mobile: digitsOnly });
                    if (errors.mobile) {
                      const newErrors = { ...errors };
                      delete newErrors.mobile;
                      setErrors(newErrors);
                    }
                  }}
                  onBlur={(e) => {
                    const error = validateMobile(e.target.value);
                    if (error) {
                      setErrors({ ...errors, mobile: error });
                    } else if (errors.mobile) {
                      const newErrors = { ...errors };
                      delete newErrors.mobile;
                      setErrors(newErrors);
                    }
                  }}
                  placeholder="Enter your mobile number (10 digits)"
                  maxLength={10}
                  className={errors.mobile ? "border-destructive" : ""}
                />
                {errors.mobile && (
                  <p className="text-sm text-destructive">{errors.mobile}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Basic Information */}
        {employeeData?.data && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Employee Basic Information
              </CardTitle>
              <CardDescription>Your employee details and basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="emp_code">Employee Code</Label>
                  <Input
                    id="emp_code"
                    value={formData.emp_code}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date_of_birth">
                    Date of Birth <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    value={formData.date_of_birth}
                    onChange={(date) => {
                      setFormData({ ...formData, date_of_birth: date || "" });
                      const error = validateDateOfBirth(date || "");
                      if (error) {
                        setErrors({ ...errors, date_of_birth: error });
                      } else if (errors.date_of_birth) {
                        const newErrors = { ...errors };
                        delete newErrors.date_of_birth;
                        setErrors(newErrors);
                      }
                    }}
                  />
                  {errors.date_of_birth && (
                    <p className="text-sm text-destructive">{errors.date_of_birth}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gender">
                    Gender <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => {
                      setFormData({ ...formData, gender: value });
                      const error = validateGender(value);
                      if (error) {
                        setErrors({ ...errors, gender: error });
                      } else if (errors.gender) {
                        const newErrors = { ...errors };
                        delete newErrors.gender;
                        setErrors(newErrors);
                      }
                    }}
                  >
                    <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && (
                    <p className="text-sm text-destructive">{errors.gender}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date_of_joining">
                    Date of Joining <span className="text-destructive">*</span>
                  </Label>
                  <DatePicker
                    value={formData.date_of_joining}
                    onChange={(date) => {
                      setFormData({ ...formData, date_of_joining: date || "" });
                      const error = validateDateOfJoining(date || "");
                      if (error) {
                        setErrors({ ...errors, date_of_joining: error });
                      } else if (errors.date_of_joining) {
                        const newErrors = { ...errors };
                        delete newErrors.date_of_joining;
                        setErrors(newErrors);
                      }
                    }}
                  />
                  {errors.date_of_joining && (
                    <p className="text-sm text-destructive">{errors.date_of_joining}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Salary & Finance Information */}
        {employeeData?.data && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Salary & Finance Information
              </CardTitle>
              <CardDescription>Bank and financial details for payroll processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="pf_uan_number">PF UAN Number</Label>
                  <Input
                    id="pf_uan_number"
                    value={formData.pf_uan_number}
                    onChange={(e) => setFormData({ ...formData, pf_uan_number: e.target.value.toUpperCase() })}
                    placeholder="Enter PF UAN number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Address & Emergency Details */}
        {employeeData?.data && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address & Emergency Details
              </CardTitle>
              <CardDescription>Your address and emergency contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="mb-2 block">Address</Label>
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="address1" className="text-sm font-normal">Address Line 1</Label>
                    <Input
                      id="address1"
                      value={formData.address1}
                      onChange={(e) => setFormData({ ...formData, address1: e.target.value.toUpperCase() })}
                      placeholder="Enter address line 1"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address2" className="text-sm font-normal">Address Line 2</Label>
                    <Input
                      id="address2"
                      value={formData.address2}
                      onChange={(e) => setFormData({ ...formData, address2: e.target.value.toUpperCase() })}
                      placeholder="Enter address line 2"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="landmark" className="text-sm font-normal">Landmark</Label>
                    <Input
                      id="landmark"
                      value={formData.landmark}
                      onChange={(e) => setFormData({ ...formData, landmark: e.target.value.toUpperCase() })}
                      placeholder="Enter landmark"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="state" className="text-sm font-normal">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                        placeholder="Enter state"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="district" className="text-sm font-normal">District</Label>
                      <Input
                        id="district"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value.toUpperCase() })}
                        placeholder="Enter district"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pincode" className="text-sm font-normal">Pincode</Label>
                      <Input
                        id="pincode"
                        type="tel"
                        value={formData.pincode}
                        onChange={(e) => {
                          // Only allow digits, max 6
                          const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setFormData({ ...formData, pincode: digitsOnly });
                          if (errors.pincode) {
                            const newErrors = { ...errors };
                            delete newErrors.pincode;
                            setErrors(newErrors);
                          }
                        }}
                        onBlur={(e) => {
                          const error = validatePincode(e.target.value);
                          if (error) {
                            setErrors({ ...errors, pincode: error });
                          } else if (errors.pincode) {
                            const newErrors = { ...errors };
                            delete newErrors.pincode;
                            setErrors(newErrors);
                          }
                        }}
                        placeholder="Enter pincode (6 digits)"
                        maxLength={6}
                        className={errors.pincode ? "border-destructive" : ""}
                      />
                      {errors.pincode && (
                        <p className="text-sm text-destructive">{errors.pincode}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="mb-2 block">Emergency Contact</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emergency_contact_name" className="text-sm font-normal">Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value.toUpperCase() })}
                      placeholder="Enter contact name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergency_contact_relation" className="text-sm font-normal">Relation</Label>
                    <Select
                      value={formData.emergency_contact_relation}
                      onValueChange={(value) => setFormData({ ...formData, emergency_contact_relation: value })}
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
                    <Label htmlFor="emergency_contact_number" className="text-sm font-normal">Contact Number</Label>
                    <Input
                      id="emergency_contact_number"
                      type="tel"
                      value={formData.emergency_contact_number}
                      onChange={(e) => {
                        // Only allow digits, max 10
                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({ ...formData, emergency_contact_number: digitsOnly });
                        if (errors.emergency_contact_number) {
                          const newErrors = { ...errors };
                          delete newErrors.emergency_contact_number;
                          setErrors(newErrors);
                        }
                      }}
                      onBlur={(e) => {
                        const error = validateEmergencyContactNumber(e.target.value);
                        if (error) {
                          setErrors({ ...errors, emergency_contact_number: error });
                        } else if (errors.emergency_contact_number) {
                          const newErrors = { ...errors };
                          delete newErrors.emergency_contact_number;
                          setErrors(newErrors);
                        }
                      }}
                      placeholder="Enter contact number (10 digits)"
                      maxLength={10}
                      className={errors.emergency_contact_number ? "border-destructive" : ""}
                    />
                    {errors.emergency_contact_number && (
                      <p className="text-sm text-destructive">{errors.emergency_contact_number}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Photo */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Profile Photo
            </CardTitle>
            <CardDescription>Upload and manage your profile picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploadCrop
              value={formData.profile_photo_url}
              onChange={(url) => setFormData({ ...formData, profile_photo_url: url })}
              aspect={1}
            />
            <p className="text-sm text-muted-foreground pt-2">
              Recommended size: 400x400 pixels. Maximum file size: 5MB.
            </p>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="min-w-[120px]"
          >
            {updateProfileMutation.isPending ? (
              <>Updating...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Change Password - Separate Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure. Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              
              // Clear previous errors
              const passwordErrors: Record<string, string> = {};
              
              // Validate old password
              if (!formData.oldPassword || !formData.oldPassword.trim()) {
                passwordErrors.oldPassword = "Old password is required.";
              }
              
              // Validate password
              const passwordError = validatePassword(formData.password);
              if (passwordError) passwordErrors.password = passwordError;
              
              // Validate confirm password
              const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
              if (confirmPasswordError) passwordErrors.confirmPassword = confirmPasswordError;
              
              // If there are errors, set them and return
              if (Object.keys(passwordErrors).length > 0) {
                setErrors(prev => ({ ...prev, ...passwordErrors }));
                return;
              }
              
              // Update password
              updatePasswordMutation.mutate({
                oldPassword: formData.oldPassword,
                password: formData.password,
              });
            }}
            noValidate
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="oldPassword">
                  Old Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="oldPassword"
                    type={showPasswords.oldPassword ? "text" : "password"}
                    value={formData.oldPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, oldPassword: e.target.value });
                      if (errors.oldPassword) {
                        const newErrors = { ...errors };
                        delete newErrors.oldPassword;
                        setErrors(newErrors);
                      }
                    }}
                    onBlur={(e) => {
                      if (!e.target.value || !e.target.value.trim()) {
                        setErrors({ ...errors, oldPassword: "Old password is required." });
                      } else if (errors.oldPassword) {
                        const newErrors = { ...errors };
                        delete newErrors.oldPassword;
                        setErrors(newErrors);
                      }
                    }}
                    placeholder="Enter old password"
                    className={errors.oldPassword ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, oldPassword: !showPasswords.oldPassword })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.oldPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.oldPassword && (
                  <p className="text-sm text-destructive">{errors.oldPassword}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">
                  New Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPasswords.password ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      const newErrors = { ...errors };
                      if (errors.password) {
                        delete newErrors.password;
                      }
                      // Also clear confirmPassword error if passwords match
                      if (errors.confirmPassword && e.target.value === formData.confirmPassword) {
                        delete newErrors.confirmPassword;
                      }
                      setErrors(newErrors);
                    }}
                    onBlur={(e) => {
                      const error = validatePassword(e.target.value);
                      if (error) {
                        setErrors({ ...errors, password: error });
                      } else if (errors.password) {
                        const newErrors = { ...errors };
                        delete newErrors.password;
                        setErrors(newErrors);
                      }
                      // Also validate confirm password if it has a value
                      if (formData.confirmPassword) {
                        const confirmError = validateConfirmPassword(e.target.value, formData.confirmPassword);
                        if (confirmError) {
                          setErrors({ ...errors, confirmPassword: confirmError });
                        } else if (errors.confirmPassword && e.target.value === formData.confirmPassword) {
                          const newErrors = { ...errors };
                          delete newErrors.confirmPassword;
                          setErrors(newErrors);
                        }
                      }
                    }}
                    placeholder="Enter new password"
                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, password: !showPasswords.password })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.password ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">
                  Confirm New Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      const newErrors = { ...errors };
                      // Clear confirmPassword error if passwords match
                      if (e.target.value === formData.password && errors.confirmPassword) {
                        delete newErrors.confirmPassword;
                      }
                      setErrors(newErrors);
                    }}
                    onBlur={(e) => {
                      const error = validateConfirmPassword(formData.password, e.target.value);
                      if (error) {
                        setErrors({ ...errors, confirmPassword: error });
                      } else if (errors.confirmPassword) {
                        const newErrors = { ...errors };
                        delete newErrors.confirmPassword;
                        setErrors(newErrors);
                      }
                    }}
                    placeholder="Confirm new password"
                    className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords.confirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                type="submit"
                disabled={updatePasswordMutation.isPending}
                className="min-w-[120px]"
              >
                {updatePasswordMutation.isPending ? (
                  <>Updating...</>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Documents Section */}
      {employeeData?.data?.id && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Upload and manage your documents (Images and PDFs only)</CardDescription>
              </div>
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
                        {doc.verified ? (
                          <div className="flex items-center gap-1 mt-2">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600 font-medium">Verified</span>
                            {doc.verified_by_name && (
                              <span className="text-xs text-muted-foreground">
                                by {doc.verified_by_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mt-2">
                            <XCircle className="h-3 w-3 text-yellow-600" />
                            <span className="text-xs text-yellow-600 font-medium">Pending Verification</span>
                          </div>
                        )}
                      </div>
                      {!doc.verified && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteClick(doc.id)}
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
                        onClick={() => {
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
                        onClick={() => {
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
      )}

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
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteDocumentMutation.isPending}
            >
              {deleteDocumentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
