import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Calendar,
  Users,
  CheckSquare,
  Bug,
  Clock,
  Award,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const leaderboardData = [
  { rank: 1, name: "Ravi Kumar", tasks: 42, bugs: 3, score: 98, productivity: 95 },
  { rank: 2, name: "Priya Sharma", tasks: 38, bugs: 5, score: 94, productivity: 92 },
  { rank: 3, name: "Amit Patel", tasks: 35, bugs: 2, score: 92, productivity: 90 },
  { rank: 4, name: "Sarah Chen", tasks: 33, bugs: 4, score: 89, productivity: 88 },
  { rank: 5, name: "John Smith", tasks: 30, bugs: 6, score: 85, productivity: 85 },
  { rank: 6, name: "Mike Johnson", tasks: 28, bugs: 3, score: 83, productivity: 82 },
  { rank: 7, name: "Emily Davis", tasks: 25, bugs: 5, score: 80, productivity: 78 },
  { rank: 8, name: "David Wilson", tasks: 22, bugs: 4, score: 77, productivity: 75 },
];

const projectStats = [
  { name: "Admin Dashboard System", progress: 65, tasks: 45, bugs: 12, members: 8 },
  { name: "E-Commerce Platform", progress: 45, tasks: 32, bugs: 8, members: 6 },
  { name: "Mobile App", progress: 10, tasks: 5, bugs: 2, members: 4 },
];

const taskMetrics = {
  total: 89,
  completed: 56,
  inProgress: 23,
  pending: 10,
  completionRate: 62.9,
  avgResolutionTime: "2.4 days",
};

const bugMetrics = {
  total: 24,
  open: 12,
  fixed: 8,
  rejected: 4,
  fixRate: 33.3,
  avgFixTime: "1.8 days",
};

export default function Reports() {
  const [period, setPeriod] = useState("month");
  const [metric, setMetric] = useState("tasks");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Reports & Leaderboard
          </h1>
          <p className="text-muted-foreground">Analytics, metrics, and performance reports</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Task Completion Rate</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskMetrics.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {taskMetrics.completed} of {taskMetrics.total} tasks
            </p>
            <div className="mt-2 flex items-center text-xs">
              <TrendingUp className="mr-1 h-3 w-3 text-status-success" />
              <span className="text-status-success">+5.2% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bug Fix Rate</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bugMetrics.fixRate}%</div>
            <p className="text-xs text-muted-foreground">
              {bugMetrics.fixed} of {bugMetrics.total} bugs fixed
            </p>
            <div className="mt-2 flex items-center text-xs">
              <TrendingUp className="mr-1 h-3 w-3 text-status-success" />
              <span className="text-status-success">+2.1% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskMetrics.avgResolutionTime}</div>
            <p className="text-xs text-muted-foreground">Task completion time</p>
            <div className="mt-2 flex items-center text-xs">
              <TrendingDown className="mr-1 h-3 w-3 text-status-success" />
              <span className="text-status-success">-0.3 days improvement</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaderboardData[0].name}</div>
            <p className="text-xs text-muted-foreground">Score: {leaderboardData[0].score}</p>
            <div className="mt-2 flex items-center text-xs">
              <Target className="mr-1 h-3 w-3 text-status-warning" />
              <span className="text-status-warning">{leaderboardData[0].productivity}% productivity</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leaderboard" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="projects">Project Reports</TabsTrigger>
          <TabsTrigger value="tasks">Task Analytics</TabsTrigger>
          <TabsTrigger value="bugs">Bug Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Employee Leaderboard - {period.charAt(0).toUpperCase() + period.slice(1)}</CardTitle>
              <CardDescription>Top performers based on tasks completed, bugs fixed, and productivity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-center">Tasks</TableHead>
                    <TableHead className="text-center">Bugs Fixed</TableHead>
                    <TableHead className="text-center">Productivity</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardData.map((employee) => (
                    <TableRow key={employee.rank}>
                      <TableCell>
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                          employee.rank === 1 ? "bg-status-warning text-status-warning-bg" :
                          employee.rank === 2 ? "bg-muted-foreground/30 text-foreground" :
                          employee.rank === 3 ? "bg-status-warning/50 text-foreground" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {employee.rank}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell className="text-center">{employee.tasks}</TableCell>
                      <TableCell className="text-center">{employee.bugs}</TableCell>
                      <TableCell className="text-center">
                        <StatusBadge variant={employee.productivity >= 90 ? "success" : employee.productivity >= 80 ? "info" : "neutral"}>
                          {employee.productivity}%
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge variant={employee.score >= 95 ? "success" : employee.score >= 90 ? "info" : "neutral"}>
                          {employee.score}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Project Performance</CardTitle>
              <CardDescription>Progress and metrics for all active projects</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-center">Tasks</TableHead>
                    <TableHead className="text-center">Bugs</TableHead>
                    <TableHead className="text-center">Members</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectStats.map((project) => (
                    <TableRow key={project.name}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{project.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{project.tasks}</TableCell>
                      <TableCell className="text-center">{project.bugs}</TableCell>
                      <TableCell className="text-center">{project.members}</TableCell>
                      <TableCell className="text-right">
                        <StatusBadge variant={project.progress >= 80 ? "success" : project.progress >= 50 ? "info" : "warning"}>
                          {project.progress >= 80 ? "On Track" : project.progress >= 50 ? "In Progress" : "Planning"}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Completed</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-status-success" style={{ width: `${(taskMetrics.completed / taskMetrics.total) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium">{taskMetrics.completed}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">In Progress</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-status-info" style={{ width: `${(taskMetrics.inProgress / taskMetrics.total) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium">{taskMetrics.inProgress}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pending</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-status-warning" style={{ width: `${(taskMetrics.pending / taskMetrics.total) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium">{taskMetrics.pending}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Task Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Tasks</span>
                  <span className="font-medium">{taskMetrics.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">{taskMetrics.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Resolution Time</span>
                  <span className="font-medium">{taskMetrics.avgResolutionTime}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bugs" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Bug Status Distribution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Open</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-status-error" style={{ width: `${(bugMetrics.open / bugMetrics.total) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium">{bugMetrics.open}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fixed</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-status-success" style={{ width: `${(bugMetrics.fixed / bugMetrics.total) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium">{bugMetrics.fixed}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Rejected</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-32 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-status-neutral" style={{ width: `${(bugMetrics.rejected / bugMetrics.total) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium">{bugMetrics.rejected}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Bug Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Bugs</span>
                  <span className="font-medium">{bugMetrics.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fix Rate</span>
                  <span className="font-medium">{bugMetrics.fixRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Avg Fix Time</span>
                  <span className="font-medium">{bugMetrics.avgFixTime}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

