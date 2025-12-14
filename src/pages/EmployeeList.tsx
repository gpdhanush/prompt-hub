import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { employeesApi } from "@/lib/api";
import { Search, Mail, Phone, MapPin, MessageCircle, MessageSquare, User, Shield, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getProfilePhotoUrl } from "@/lib/imageUtils";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/useDebounce";

type Employee = {
  id: number;
  emp_code: string;
  name: string;
  email: string;
  mobile: string;
  gender: string;
  district: string;
  skype?: string;
  whatsapp?: string;
  profile_photo_url?: string;
  role: string;
  position?: string;
};

export default function EmployeeList() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchQuery = useDebounce(searchInput, 800);

  // Fetch all employees - no pagination, get all, include super admins
  // Only search if query is at least 3 characters or empty (to show all)
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees-list', debouncedSearchQuery],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1000, search: debouncedSearchQuery, include_all: 'true' }),
    enabled: debouncedSearchQuery.length === 0 || debouncedSearchQuery.length >= 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const allEmployees = (data as any)?.data || [];

  // Memoize filtered results to prevent unnecessary re-renders
  const { superAdmins, level1Employees, level2Employees } = useMemo(() => {
    const superAdmins = allEmployees.filter((emp: Employee) => emp.role === 'Super Admin');
    const level1Roles = ['Team Lead', 'Team Leader', 'Admin', 'Manager', 'HR Manager', 'Accounts Manager', 'Office Manager'];
    const level1Employees = allEmployees.filter((emp: Employee) => {
      return level1Roles.includes(emp.role);
    });
    const level2Employees = allEmployees.filter((emp: Employee) => {
      return emp.role !== 'Super Admin' && !level1Roles.includes(emp.role);
    });
    return { superAdmins, level1Employees, level2Employees };
  }, [allEmployees]);


  const EmployeeCard = ({ employee }: { employee: Employee }) => (
    <Card 
      className="hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50 group"
      onClick={() => navigate(`/employees/${employee.id}/view`)}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Profile Photo */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-lg group-hover:blur-xl transition-all"></div>
            <Avatar className="h-20 w-20 relative border-4 border-background shadow-md group-hover:shadow-lg transition-all">
              <AvatarImage 
                src={getProfilePhotoUrl(employee.profile_photo_url || null)} 
              />
              <AvatarFallback className="text-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                {employee.name ? employee.name.split(" ").map((n: string) => n[0]).join("") : "E"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Employee Details */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Name and Role */}
            <div>
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors truncate">
                {employee.name || "N/A"}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {employee.role || "Employee"}
                </Badge>
                {employee.emp_code && (
                  <span className="text-xs text-muted-foreground">#{employee.emp_code}</span>
                )}
              </div>
            </div>

            {/* Contact Information Grid */}
            <div className="grid grid-cols-1 gap-2">
              {/* Email */}
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-muted-foreground truncate">{employee.email || "N/A"}</span>
              </div>

              {/* Mobile */}
              {employee.mobile && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{employee.mobile}</span>
                </div>
              )}

              {/* Gender */}
              {employee.gender && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground capitalize">{employee.gender}</span>
                </div>
              )}

              {/* District */}
              {employee.district && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{employee.district}</span>
                </div>
              )}

              {/* Skype */}
              {employee.skype && (
                <div className="flex items-center gap-2 text-sm">
                  <MessageCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{employee.skype}</span>
                </div>
              )}

              {/* WhatsApp */}
              {employee.whatsapp && (
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">{employee.whatsapp}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading employees...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive font-semibold mb-2">Error loading employees</p>
              <p className="text-muted-foreground">Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Employee Directory
          </h1>
          <p className="text-muted-foreground mt-1">View all employees across all roles and levels</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <Input
            ref={searchInputRef}
            placeholder="Search by name, email, or employee code..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
            autoComplete="off"
            type="text"
            id="employee-search-input"
          />
        </div>
      </div>

      {/* Super Admins Section - First Row */}
      {superAdmins.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {superAdmins.map((employee: Employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        </div>
      )}

      {/* Level 1 Employees - Second Row (no label) */}
      {level1Employees.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {level1Employees.map((employee: Employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        </div>
      )}

      {/* Level 2 Employees - Third Row (no label) */}
      {level2Employees.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {level2Employees.map((employee: Employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {superAdmins.length === 0 && level1Employees.length === 0 && level2Employees.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">No employees found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {debouncedSearchQuery ? "Try adjusting your search query" : "No employees in the system yet"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
