import { useState } from "react";
import { Search, Filter, FileText, Download } from "lucide-react";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const auditLogs = [
  { id: 1, user: "Super Admin", action: "CREATE", module: "Prompt", item: "Full System Architect", timestamp: "2025-12-11T10:30:00Z" },
  { id: 2, user: "Ravi Kumar", action: "UPDATE", module: "Task", item: "#08342", timestamp: "2025-12-11T10:15:00Z" },
  { id: 3, user: "Admin", action: "EXPORT", module: "Prompt", item: "DB Schema Generator", timestamp: "2025-12-11T09:45:00Z" },
  { id: 4, user: "Priya Sharma", action: "APPROVE", module: "Reimbursement", item: "CLM-002", timestamp: "2025-12-11T09:30:00Z" },
  { id: 5, user: "Super Admin", action: "DELETE", module: "User", item: "test-user@example.com", timestamp: "2025-12-11T09:00:00Z" },
  { id: 6, user: "Sarah Chen", action: "PREVIEW", module: "Prompt", item: "API Skeleton Template", timestamp: "2025-12-11T08:45:00Z" },
  { id: 7, user: "Admin", action: "CREATE", module: "Project", item: "PRJ-007", timestamp: "2025-12-10T17:30:00Z" },
  { id: 8, user: "John Smith", action: "UPDATE", module: "Bug", item: "BG-0025", timestamp: "2025-12-10T16:45:00Z" },
];

const actionColors = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "error",
  EXPORT: "purple",
  PREVIEW: "neutral",
  APPROVE: "success",
  REJECT: "error",
} as const;

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.module.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-muted-foreground" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground">Track all system activities and changes</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Logs
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{auditLogs.length}</div>
            <p className="text-xs text-muted-foreground">Total Entries</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">
              {auditLogs.filter((l) => l.action === "CREATE").length}
            </div>
            <p className="text-xs text-muted-foreground">Creates</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-info">
              {auditLogs.filter((l) => l.action === "UPDATE").length}
            </div>
            <p className="text-xs text-muted-foreground">Updates</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-error">
              {auditLogs.filter((l) => l.action === "DELETE").length}
            </div>
            <p className="text-xs text-muted-foreground">Deletes</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Activity Log</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
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
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Item</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {new Date(log.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="font-medium">{log.user}</TableCell>
                  <TableCell>
                    <StatusBadge variant={actionColors[log.action as keyof typeof actionColors] || "neutral"}>
                      {log.action}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>{log.module}</TableCell>
                  <TableCell className="text-muted-foreground font-mono">
                    {log.item}
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
