import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { employeesApi } from "@/features/employees/api";
import { Search, Users } from "lucide-react";
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
  teams_id?: string;
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Profile Photo - Left */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-lg group-hover:blur-xl transition-all"></div>
            <Avatar className="h-16 w-16 relative border-4 border-background shadow-md group-hover:shadow-lg transition-all">
              <AvatarImage 
                src={getProfilePhotoUrl(employee.profile_photo_url || null)} 
              />
              <AvatarFallback className="text-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground justify-center">
                {employee.name ? employee.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "E"}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Employee Details - Left Aligned */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* Name */}
            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {employee.name || "N/A"}
            </h3>
            
            {/* Employee ID */}
            {employee.emp_code && (
              <p className="text-sm text-muted-foreground">EMP ID: <span className="font-bold text-primary">{employee.emp_code}</span></p>
            )}
            
            {/* Role */}
            <Badge variant="outline" className="text-xs">
              {employee.role || "Employee"}
            </Badge>
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            <span className="text-primary">Employee Directory</span>
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
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {superAdmins.map((employee: Employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        </div>
      )}

      {/* Level 1 Employees - Second Row (no label) */}
      {level1Employees.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {level1Employees.map((employee: Employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        </div>
      )}

      {/* Level 2 Employees - Third Row (no label) */}
      {level2Employees.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
