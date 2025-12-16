import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SearchBar from "@/shared/components/SearchBar";
import FilterBar from "@/shared/components/FilterBar";

interface EmployeesFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  roles: Array<{ id: number; name: string }>;
}

export const EmployeesFilters = memo(function EmployeesFilters({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  roles,
}: EmployeesFiltersProps) {
  const roleFilterOptions = [
    { value: "all", label: "All Roles" },
    ...roles.map((role) => ({ value: role.name, label: role.name })),
  ];

  const statusFilterOptions = [
    { value: "all", label: "All Statuses" },
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
    { value: "Resigned", label: "Resigned" },
    { value: "Terminated", label: "Terminated" },
    { value: "Present", label: "Present" },
    { value: "Absent", label: "Absent" },
    { value: "On Leave", label: "On Leave" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Search and filter employees</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search by name, email, employee code, or mobile..."
            />
          </div>
          <FilterBar
            filters={[
              {
                key: "role",
                label: "Role",
                value: roleFilter || "all",
                options: roleFilterOptions,
                onChange: (value) => onRoleFilterChange(value === "all" ? "" : value),
              },
              {
                key: "status",
                label: "Status",
                value: statusFilter || "all",
                options: statusFilterOptions,
                onChange: (value) => onStatusFilterChange(value === "all" ? "" : value),
              },
            ]}
            showFilterIcon={true}
          />
        </div>
      </CardContent>
    </Card>
  );
});

