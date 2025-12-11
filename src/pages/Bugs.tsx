import { useState } from "react";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, AlertCircle } from "lucide-react";
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
import { StatusBadge, bugSeverityMap, bugStatusMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const bugs = [
  { id: "BG-0023", taskId: "08342", reportedBy: "Maria Garcia", assignedTo: "Ravi Kumar", severity: "Critical" as const, status: "Open" as const, description: "Auth middleware fails on refresh token" },
  { id: "BG-0024", taskId: "08344", reportedBy: "David Wilson", assignedTo: "Amit Patel", severity: "Major" as const, status: "Fixing" as const, description: "Rate limiter blocks valid requests" },
  { id: "BG-0025", taskId: "08346", reportedBy: "Lisa Anderson", assignedTo: "John Smith", severity: "Minor" as const, status: "Retesting" as const, description: "Payment amount format issue" },
  { id: "BG-0026", taskId: "08343", reportedBy: "Amit Patel", assignedTo: "Priya Sharma", severity: "Major" as const, status: "In Review" as const, description: "Dashboard layout breaks on mobile" },
  { id: "BG-0027", taskId: "08345", reportedBy: "Sarah Chen", assignedTo: "Sarah Chen", severity: "Minor" as const, status: "Passed" as const, description: "Query optimization needed" },
  { id: "BG-0028", taskId: "08342", reportedBy: "John Smith", assignedTo: "Ravi Kumar", severity: "Critical" as const, status: "Duplicate" as const, description: "Same as BG-0023" },
];

export default function Bugs() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBugs = bugs.filter(
    (bug) =>
      bug.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bug.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertCircle className="h-8 w-8 text-status-error" />
            Bug Tracker
          </h1>
          <p className="text-muted-foreground">Track and resolve bugs across projects</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Report Bug
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{bugs.length}</div>
            <p className="text-xs text-muted-foreground">Total Bugs</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-error">
              {bugs.filter((b) => b.status === "Open").length}
            </div>
            <p className="text-xs text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">
              {bugs.filter((b) => b.status === "Fixing").length}
            </div>
            <p className="text-xs text-muted-foreground">Fixing</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-purple">
              {bugs.filter((b) => b.status === "Retesting").length}
            </div>
            <p className="text-xs text-muted-foreground">Retesting</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">
              {bugs.filter((b) => b.status === "Passed").length}
            </div>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Bugs</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search bugs..."
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
                <TableHead>Bug ID</TableHead>
                <TableHead>Task ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBugs.map((bug) => (
                <TableRow key={bug.id}>
                  <TableCell className="font-mono text-status-error font-medium">
                    {bug.id}
                  </TableCell>
                  <TableCell className="font-mono text-primary">
                    #{bug.taskId}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {bug.description}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{bug.reportedBy}</TableCell>
                  <TableCell>{bug.assignedTo}</TableCell>
                  <TableCell>
                    <StatusBadge variant={bugSeverityMap[bug.severity]}>
                      {bug.severity}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={bugStatusMap[bug.status]}>
                      {bug.status}
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
