import { useQuery } from "@tanstack/react-query";
import { Package, ClipboardList, Wrench, Ticket, Calendar, TrendingUp, Loader2 } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { assetsApi } from "@/lib/api";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";

export default function ITAssetDashboard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['assets', 'dashboard', 'stats'],
    queryFn: () => assetsApi.getDashboardStats(),
  });

  const stats = statsData?.data || {
    total_assets: 0,
    assigned_assets: 0,
    available_assets: 0,
    repair_assets: 0,
    pending_tickets: 0,
    warranty_expiring: 0,
    recent_assignments: [],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">IT Asset Management</h1>
        <p className="text-muted-foreground mt-2">Overview of your IT assets and assignments</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Assets"
          value={stats.total_assets}
          icon={Package}
          description="All assets in inventory"
        />
        <StatCard
          title="Assigned"
          value={stats.assigned_assets}
          icon={ClipboardList}
          description="Currently assigned"
          trend={stats.assigned_assets > 0 ? "up" : "neutral"}
        />
        <StatCard
          title="Available"
          value={stats.available_assets}
          icon={Package}
          description="Ready to assign"
        />
        <StatCard
          title="Under Repair"
          value={stats.repair_assets}
          icon={Wrench}
          description="Assets in repair"
        />
        <StatCard
          title="Pending Tickets"
          value={stats.pending_tickets}
          icon={Ticket}
          description="Open tickets"
        />
        <StatCard
          title="Warranty Expiring"
          value={stats.warranty_expiring}
          icon={Calendar}
          description="Next 30 days"
        />
      </div>

      {/* Recent Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Recently Assigned Devices</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recent_assignments && stats.recent_assignments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Code</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Condition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent_assignments.map((assignment: any) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">{assignment.asset_code}</TableCell>
                    <TableCell>
                      {assignment.brand} {assignment.model}
                    </TableCell>
                    <TableCell>
                      {assignment.employee_name} ({assignment.emp_code})
                    </TableCell>
                    <TableCell>
                      {assignment.assigned_date
                        ? format(new Date(assignment.assigned_date), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={
                          assignment.condition_on_assign === "excellent"
                            ? "success"
                            : assignment.condition_on_assign === "good"
                            ? "info"
                            : assignment.condition_on_assign === "fair"
                            ? "warning"
                            : "error"
                        }
                      >
                        {assignment.condition_on_assign || "good"}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent assignments
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
