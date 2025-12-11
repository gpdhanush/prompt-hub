import { useState } from "react";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const employees = [
  { id: "EMP-001", name: "Ravi Kumar", department: "Engineering", tl: "Sarah Chen", attendance: 96, project: "E-Commerce Platform", status: "Present" as const },
  { id: "EMP-002", name: "Priya Sharma", department: "Product", tl: "John Smith", attendance: 92, project: "Mobile Banking App", status: "Present" as const },
  { id: "EMP-003", name: "Amit Patel", department: "Engineering", tl: "Sarah Chen", attendance: 88, project: "HR Management System", status: "Present" as const },
  { id: "EMP-004", name: "Maria Garcia", department: "QA", tl: "Ravi Kumar", attendance: 94, project: "E-Commerce Platform", status: "On Leave" as const },
  { id: "EMP-005", name: "David Wilson", department: "Engineering", tl: "Sarah Chen", attendance: 78, project: "Analytics Dashboard", status: "Absent" as const },
  { id: "EMP-006", name: "Lisa Anderson", department: "Design", tl: "John Smith", attendance: 100, project: "Customer Portal", status: "Present" as const },
];

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage employee records and attendance</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Employee
        </Button>
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
            <div className="text-2xl font-bold text-status-error">
              {employees.filter((e) => e.status === "Absent").length}
            </div>
            <p className="text-xs text-muted-foreground">Absent</p>
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
                <TableHead>Department</TableHead>
                <TableHead>Team Lead</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Current Project</TableHead>
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
                  <TableCell className="font-medium">{emp.name}</TableCell>
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
                  <TableCell className="text-muted-foreground max-w-[150px] truncate">
                    {emp.project}
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
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
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
    </div>
  );
}
