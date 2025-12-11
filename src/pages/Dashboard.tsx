import {
  Users,
  FolderKanban,
  CheckSquare,
  Bug,
  Receipt,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const recentActivity = [
  { id: 1, user: "Ravi Kumar", action: "Completed task #08342", time: "2 min ago", type: "task" },
  { id: 2, user: "Priya Sharma", action: "Submitted reimbursement", time: "15 min ago", type: "reimbursement" },
  { id: 3, user: "Amit Patel", action: "Reported bug #BG-0023", time: "1 hour ago", type: "bug" },
  { id: 4, user: "Sarah Chen", action: "Generated AI prompt", time: "2 hours ago", type: "prompt" },
  { id: 5, user: "John Smith", action: "Updated project status", time: "3 hours ago", type: "project" },
];

const recentPrompts = [
  { id: 1, title: "Full System Architect", uses: 24, lastUsed: "Today" },
  { id: 2, title: "API Skeleton Generator", uses: 18, lastUsed: "Yesterday" },
  { id: 3, title: "DB Schema Template", uses: 15, lastUsed: "2 days ago" },
];

const topPerformers = [
  { name: "Ravi Kumar", tasks: 42, bugs: 3, score: 98 },
  { name: "Priya Sharma", tasks: 38, bugs: 5, score: 94 },
  { name: "Amit Patel", tasks: 35, bugs: 2, score: 92 },
  { name: "Sarah Chen", tasks: 33, bugs: 4, score: 89 },
];

export default function Dashboard() {
  // Get current user from localStorage
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const userName = currentUser?.name || 'User';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userName}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Employees"
          value="156"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Projects"
          value="24"
          icon={FolderKanban}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Tasks in Progress"
          value="89"
          icon={CheckSquare}
          trend={{ value: 5, isPositive: false }}
        />
        <StatCard
          title="Open Bugs"
          value="12"
          icon={Bug}
          trend={{ value: 15, isPositive: false }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Reimbursements"
          value="$4,250"
          icon={Receipt}
        />
        <StatCard
          title="Prompt Runs (7 days)"
          value="57"
          icon={Sparkles}
          trend={{ value: 23, isPositive: true }}
        />
        <StatCard
          title="Avg Resolution Time"
          value="2.4 days"
          icon={TrendingUp}
          trend={{ value: 18, isPositive: true }}
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {activity.user.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.user}</p>
                      <p className="text-xs text-muted-foreground">{activity.action}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Prompts */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Recent Prompts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{prompt.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {prompt.uses} uses • Last: {prompt.lastUsed}
                    </p>
                  </div>
                  <StatusBadge variant="info">{prompt.uses}</StatusBadge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Top Performers - This Month</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Tasks Completed</TableHead>
                <TableHead className="text-center">Bugs Fixed</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPerformers.map((performer, index) => (
                <TableRow key={performer.name}>
                  <TableCell>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      index === 0 ? "bg-status-warning text-status-warning-bg" :
                      index === 1 ? "bg-muted-foreground/30 text-foreground" :
                      index === 2 ? "bg-status-warning/50 text-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{performer.name}</TableCell>
                  <TableCell className="text-center">{performer.tasks}</TableCell>
                  <TableCell className="text-center">{performer.bugs}</TableCell>
                  <TableCell className="text-right">
                    <StatusBadge variant={performer.score >= 95 ? "success" : performer.score >= 90 ? "info" : "neutral"}>
                      {performer.score}
                    </StatusBadge>
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
