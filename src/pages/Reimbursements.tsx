import { useState } from "react";
import { Plus, Search, MoreHorizontal, Check, X, Eye, Filter, DollarSign } from "lucide-react";
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
import { StatusBadge, reimbursementStatusMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const reimbursements = [
  { id: "CLM-001", employee: "Ravi Kumar", amount: 450, category: "Travel", submittedAt: "2025-12-08", status: "Pending" as const },
  { id: "CLM-002", employee: "Priya Sharma", amount: 125, category: "Meals", submittedAt: "2025-12-07", status: "Approved" as const },
  { id: "CLM-003", employee: "Amit Patel", amount: 890, category: "Equipment", submittedAt: "2025-12-06", status: "Processing" as const },
  { id: "CLM-004", employee: "Maria Garcia", amount: 75, category: "Software", submittedAt: "2025-12-05", status: "Paid" as const },
  { id: "CLM-005", employee: "David Wilson", amount: 320, category: "Travel", submittedAt: "2025-12-04", status: "Rejected" as const },
  { id: "CLM-006", employee: "Lisa Anderson", amount: 200, category: "Training", submittedAt: "2025-12-03", status: "Pending" as const },
];

export default function Reimbursements() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReimbursements = reimbursements.filter(
    (r) =>
      r.employee.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPending = reimbursements
    .filter((r) => r.status === "Pending")
    .reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-status-success" />
            Reimbursements
          </h1>
          <p className="text-muted-foreground">Manage expense claims and approvals</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Claim
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">${reimbursements.reduce((acc, r) => acc + r.amount, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total Claims</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-warning">${totalPending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Pending Amount</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">
              {reimbursements.filter((r) => r.status === "Paid").length}
            </div>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-error">
              {reimbursements.filter((r) => r.status === "Rejected").length}
            </div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">All Claims</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search claims..."
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
                <TableHead>Claim ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReimbursements.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-muted-foreground">
                    {r.id}
                  </TableCell>
                  <TableCell className="font-medium">{r.employee}</TableCell>
                  <TableCell className="font-semibold">${r.amount}</TableCell>
                  <TableCell>
                    <StatusBadge variant="neutral">{r.category}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(r.submittedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={reimbursementStatusMap[r.status]}>
                      {r.status}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.status === "Pending" && (
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
