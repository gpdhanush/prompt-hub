import { memo, useCallback } from "react";
import { MoreHorizontal, Edit, Trash2, Eye, User, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaginationControls from "@/shared/components/PaginationControls";
import { getProfilePhotoUrl } from "@/lib/imageUtils";
import type { Employee } from "../utils/utils";
import { EMPLOYEE_PAGE_LIMITS } from "../utils/constants";

interface EmployeesTableProps {
  employees: Employee[];
  isLoading: boolean;
  error: any;
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

export const EmployeesTable = memo(function EmployeesTable({
  employees,
  isLoading,
  error,
  searchQuery,
  roleFilter,
  statusFilter,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  onView,
  onEdit,
  onDelete,
}: EmployeesTableProps) {
  const handleRowClick = useCallback((employee: Employee) => {
    onView(employee);
  }, [onView]);

  const handleViewClick = useCallback((e: React.MouseEvent, employee: Employee) => {
    e.stopPropagation();
    onView(employee);
  }, [onView]);

  const handleEditClick = useCallback((e: React.MouseEvent, employee: Employee) => {
    e.stopPropagation();
    onEdit(employee);
  }, [onEdit]);

  const handleDeleteClick = useCallback((e: React.MouseEvent, employee: Employee) => {
    e.stopPropagation();
    onDelete(employee);
  }, [onDelete]);

  const getStatusVariant = useCallback((status?: string) => {
    if (status === "Active") return "success";
    if (status === "On Leave") return "info";
    return "warning";
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive font-semibold mb-2">Error loading employees</p>
            <p className="text-muted-foreground">Please try again later.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <User className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No employees found</h3>
            <p className="text-muted-foreground">
              {searchQuery || roleFilter || statusFilter
                ? 'Try adjusting your filters'
                : 'No employees available'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Employees ({total})</CardTitle>
            <CardDescription>List of all employees</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Emp. ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow
                  key={emp.id}
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleRowClick(emp)}
                >
                  <TableCell className="font-medium">
                    <span className="font-mono text-sm">{emp.emp_code || `EMP-${emp.id}`}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={getProfilePhotoUrl(emp.profile_photo_url || null)} />
                        <AvatarFallback className="text-xs">
                          {emp.name ? emp.name.split(" ").map((n: string) => n[0]).join("") : "E"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{emp.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{emp.email}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{emp.mobile || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {emp.role || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{emp.team_lead_name || "N/A"}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={getStatusVariant(emp.employee_status || emp.status)}>
                      {emp.employee_status || emp.status || "Active"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleViewClick(e, emp)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleEditClick(e, emp)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => handleDeleteClick(e, emp)}>
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
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} employees
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="page-limit" className="text-sm text-muted-foreground">
                  Rows per page:
                </Label>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    onLimitChange(Number(value));
                    onPageChange(1);
                  }}
                >
                  <SelectTrigger className="w-20" id="page-limit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_PAGE_LIMITS.map((limitValue) => (
                      <SelectItem key={limitValue} value={limitValue.toString()}>
                        {limitValue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

