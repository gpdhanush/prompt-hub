import { useState } from "react";
import { Plus, Search, MoreHorizontal, Check, X, Eye, Filter, Calendar } from "lucide-react";
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
import { StatusBadge, leaveStatusMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const leaves = [
  { id: "LV-001", employee: "Ravi Kumar", type: "Annual", startDate: "2025-12-20", endDate: "2025-12-27", duration: 5, status: "Pending" as const },
  { id: "LV-002", employee: "Priya Sharma", type: "Sick", startDate: "2025-12-10", endDate: "2025-12-11", duration: 2, status: "Approved" as const },
  { id: "LV-003", employee: "Amit Patel", type: "Personal", startDate: "2025-12-15", endDate: "2025-12-15", duration: 1, status: "Approved" as const },
  { id: "LV-004", employee: "Maria Garcia", type: "Annual", startDate: "2025-12-08", endDate: "2025-12-12", duration: 3, status: "Approved" as const },
  { id: "LV-005", employee: "David Wilson", type: "Sick", startDate: "2025-12-25", endDate: "2025-12-26", duration: 2, status: "Rejected" as const },
  { id: "LV-006", employee: "Lisa Anderson", type: "Personal", startDate: "2025-12-18", endDate: "2025-12-18", duration: 1, status: "Cancelled" as const },
];

export default function Leaves() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLeaves = leaves.filter(
    (l) =>
      l.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Leave Management
          </h1>
          <p className="text-muted-foreground">Track and approve employee leave requests</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Apply Leave
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{leaves.length}</div>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">
              {leaves.filter((l) => l.status === "Pending").length}
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">
              {leaves.filter((l) => l.status === "Approved").length}
            </div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {leaves.filter((l) => l.status === "Approved").reduce((acc, l) => acc + l.duration, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total Days (Approved)</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Leave Requests</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search leaves..."
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
                <TableHead>Leave ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeaves.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {l.id}
                  </TableCell>
                  <TableCell className="font-medium">{l.employee}</TableCell>
                  <TableCell>
                    <StatusBadge variant={l.type === "Sick" ? "error" : l.type === "Annual" ? "info" : "neutral"}>
                      {l.type}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(l.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(l.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>{l.duration} day{l.duration > 1 ? "s" : ""}</TableCell>
                  <TableCell>
                    <StatusBadge variant={leaveStatusMap[l.status]}>
                      {l.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {l.status === "Pending" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-status-success hover:text-status-success">
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-status-error hover:text-status-error">
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
