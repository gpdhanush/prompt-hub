import { useQuery } from "@tanstack/react-query";
import { 
  Package, 
  ClipboardList, 
  Wrench, 
  Ticket, 
  Calendar, 
  TrendingUp, 
  Loader2,
  LayoutDashboard,
  Plus,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  AlertTriangle,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { assetsApi } from "@/lib/api";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/status-badge";
import { useNavigate } from "react-router-dom";

export default function ITAssetDashboard() {
  const navigate = useNavigate();
  
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

  const utilizationRate = stats.total_assets > 0 
    ? Math.round((stats.assigned_assets / stats.total_assets) * 100) 
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            IT Asset Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive overview of your IT assets, assignments, and operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/it-assets/assets/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Asset
          </Button>
          <Button onClick={() => navigate('/it-assets/assignments/new')}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Assign Asset
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_assets || 0}</div>
            <p className="text-xs text-muted-foreground">
              All assets in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.assigned_assets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently in use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available_assets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready to assign
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Repair</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.repair_assets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Assets in repair
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending_tickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              Open tickets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warranty Expiring</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.warranty_expiring || 0}</div>
            <p className="text-xs text-muted-foreground">
              Next 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Insights */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Utilization Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{utilizationRate}%</div>
            <div className="mt-2 w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${utilizationRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.assigned_assets} of {stats.total_assets} assets assigned
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate('/it-assets/tickets')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                Active Tickets
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pending_tickets || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate('/it-assets/maintenance')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Maintenance
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.repair_assets || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Assets in repair
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate('/it-assets/inventory')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                Inventory
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.available_assets || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Available for assignment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Recently Assigned Devices
              </CardTitle>
              <CardDescription className="mt-1">
                Latest asset assignments and their current status
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/it-assets/assignments')}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent_assignments.map((assignment: any) => (
                  <TableRow 
                    key={assignment.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => assignment.asset_id && navigate(`/it-assets/assets/${assignment.asset_id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {assignment.asset_code}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{assignment.brand} {assignment.model}</div>
                        <div className="text-sm text-muted-foreground">{assignment.category_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{assignment.employee_name}</div>
                          <div className="text-sm text-muted-foreground">{assignment.emp_code}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {assignment.assigned_date
                          ? format(new Date(assignment.assigned_date), "MMM dd, yyyy")
                          : "-"}
                      </div>
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
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">No recent assignments</p>
              <p className="text-sm mt-1">Assignments will appear here once assets are assigned to employees</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/it-assets/assignments/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Assign Asset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate('/it-assets/assets')}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                View All Assets
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate('/it-assets/assignments')}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                View Assignments
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate('/it-assets/tickets')}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Ticket className="h-4 w-4" />
                View Tickets
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={() => navigate('/it-assets/maintenance')}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Maintenance
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
