import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, User, Building, MapPin, CreditCard, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge, attendanceStatusMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

const employees = [
  { 
    id: "EMP-001", 
    name: "Ravi Kumar", 
    email: "ravi@example.com",
    mobile: "+1234567890",
    department: "Engineering", 
    tl: "Sarah Chen", 
    attendance: 96, 
    project: "E-Commerce Platform", 
    status: "Present" as const,
    empCode: "EMP001",
    photo: null,
    profileCompleted: false,
  },
  { 
    id: "EMP-002", 
    name: "Priya Sharma",
    email: "priya@example.com",
    mobile: "+1234567891",
    department: "Product", 
    tl: "John Smith", 
    attendance: 92, 
    project: "Mobile Banking App", 
    status: "Present" as const,
    empCode: "EMP002",
    photo: null,
    profileCompleted: true,
  },
  { 
    id: "EMP-003", 
    name: "Amit Patel",
    email: "amit@example.com",
    mobile: "+1234567892",
    department: "Engineering", 
    tl: "Sarah Chen", 
    attendance: 88, 
    project: "HR Management System", 
    status: "Present" as const,
    empCode: "EMP003",
    photo: null,
    profileCompleted: false,
  },
];

export default function Employees() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<typeof employees[0] | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Basic registration form (Admin only)
  const [basicForm, setBasicForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    role: "Employee",
    position: "",
    department: "",
  });

  // Extended profile form (TL/Manager can edit)
  const [profileForm, setProfileForm] = useState({
    empCode: "",
    photo: null as File | null,
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "India",
    },
    bank: {
      name: "",
      accountNumber: "",
      ifsc: "",
      branch: "",
    },
    pan: "",
    aadhaar: "",
  });

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddEmployee = () => {
    // API call here
    toast({
      title: "Success",
      description: "Employee registered successfully",
    });
    setShowAddDialog(false);
    setBasicForm({
      name: "",
      email: "",
      mobile: "",
      password: "",
      role: "Employee",
      position: "",
      department: "",
    });
  };

  const handleEditProfile = (emp: typeof employees[0]) => {
    setSelectedEmployee(emp);
    setProfileForm({
      empCode: emp.empCode,
      photo: null,
      address: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
      },
      bank: {
        name: "",
        accountNumber: "",
        ifsc: "",
        branch: "",
      },
      pan: "",
      aadhaar: "",
    });
    setShowEditDialog(true);
  };

  const handleSaveProfile = () => {
    // API call here
    toast({
      title: "Success",
      description: "Employee profile updated successfully",
    });
    setShowEditDialog(false);
  };

  const handleViewProfile = (emp: typeof employees[0]) => {
    navigate(`/employee-profile/${emp.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage employee records and attendance</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Employee</DialogTitle>
              <DialogDescription>
                Create a basic employee account. Additional details can be added later by TL/Manager.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={basicForm.name}
                  onChange={(e) => setBasicForm({ ...basicForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={basicForm.email}
                    onChange={(e) => setBasicForm({ ...basicForm, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mobile">Mobile *</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder="+1234567890"
                    value={basicForm.mobile}
                    onChange={(e) => setBasicForm({ ...basicForm, mobile: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Temporary Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Employee will change on first login"
                  value={basicForm.password}
                  onChange={(e) => setBasicForm({ ...basicForm, password: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={basicForm.role} onValueChange={(value) => setBasicForm({ ...basicForm, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Employee">Employee</SelectItem>
                      <SelectItem value="Team Lead">Team Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    placeholder="e.g., Developer, QA Engineer"
                    value={basicForm.position}
                    onChange={(e) => setBasicForm({ ...basicForm, position: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g., Engineering, QA"
                  value={basicForm.department}
                  onChange={(e) => setBasicForm({ ...basicForm, department: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAddEmployee}>
                  Register Employee
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Total Employees</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">
              {employees.filter((e) => e.status === "Present").length}
            </div>
            <p className="text-xs text-muted-foreground">Present Today</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-info">
              {employees.filter((e) => e.status === "On Leave").length}
            </div>
            <p className="text-xs text-muted-foreground">On Leave</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">
              {employees.filter((e) => !e.profileCompleted).length}
            </div>
            <p className="text-xs text-muted-foreground">Incomplete Profiles</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Employees</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emp ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {emp.id}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={emp.photo || undefined} />
                        <AvatarFallback className="text-xs">
                          {emp.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{emp.name}</span>
                      {!emp.profileCompleted && (
                        <StatusBadge variant="warning" className="text-[10px]">
                          Incomplete
                        </StatusBadge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell className="text-muted-foreground">{emp.tl}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={emp.attendance} 
                        className="h-2 w-16"
                      />
                      <span className={`text-xs ${
                        emp.attendance >= 95 ? "text-status-success" :
                        emp.attendance >= 85 ? "text-status-warning" :
                        "text-status-error"
                      }`}>
                        {emp.attendance}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={attendanceStatusMap[emp.status]}>
                      {emp.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewProfile(emp)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditProfile(emp)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog (TL/Manager can add additional details) */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee Profile</DialogTitle>
            <DialogDescription>
              Add additional details for {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="address">Address</TabsTrigger>
                <TabsTrigger value="bank">Bank</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={selectedEmployee.photo || undefined} />
                      <AvatarFallback>
                        {selectedEmployee.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Label htmlFor="photo-upload" asChild>
                        <Button variant="outline" as="span">
                          <Camera className="mr-2 h-4 w-4" />
                          Upload Photo
                        </Button>
                      </Label>
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setProfileForm({ ...profileForm, photo: file });
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emp-code">Employee ID</Label>
                    <Input
                      id="emp-code"
                      value={profileForm.empCode}
                      onChange={(e) => setProfileForm({ ...profileForm, empCode: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pan">PAN Number</Label>
                      <Input
                        id="pan"
                        value={profileForm.pan}
                        onChange={(e) => setProfileForm({ ...profileForm, pan: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="aadhaar">Aadhaar Number</Label>
                      <Input
                        id="aadhaar"
                        value={profileForm.aadhaar}
                        onChange={(e) => setProfileForm({ ...profileForm, aadhaar: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="address" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="address-line1">Address Line 1</Label>
                    <Input
                      id="address-line1"
                      value={profileForm.address.line1}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        address: { ...profileForm.address, line1: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address-line2">Address Line 2</Label>
                    <Input
                      id="address-line2"
                      value={profileForm.address.line2}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        address: { ...profileForm.address, line2: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={profileForm.address.city}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, city: e.target.value }
                        })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={profileForm.address.state}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, state: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="postal-code">Postal Code</Label>
                      <Input
                        id="postal-code"
                        value={profileForm.address.postalCode}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, postalCode: e.target.value }
                        })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={profileForm.address.country}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          address: { ...profileForm.address, country: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bank" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bank-name">Bank Name</Label>
                    <Input
                      id="bank-name"
                      value={profileForm.bank.name}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        bank: { ...profileForm.bank, name: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input
                      id="account-number"
                      value={profileForm.bank.accountNumber}
                      onChange={(e) => setProfileForm({
                        ...profileForm,
                        bank: { ...profileForm.bank, accountNumber: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="ifsc">IFSC Code</Label>
                      <Input
                        id="ifsc"
                        value={profileForm.bank.ifsc}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          bank: { ...profileForm.bank, ifsc: e.target.value }
                        })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="branch">Branch</Label>
                      <Input
                        id="branch"
                        value={profileForm.bank.branch}
                        onChange={(e) => setProfileForm({
                          ...profileForm,
                          bank: { ...profileForm.bank, branch: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-3">
                  {["Aadhaar", "PAN", "Bank Passbook"].map((docType) => (
                    <div key={docType} className="flex items-center justify-between rounded-lg border border-border p-4">
                      <span className="font-medium">{docType}</span>
                      <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSaveProfile}>
                  Save Profile
                </Button>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
