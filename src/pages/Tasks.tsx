import { useState } from "react";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, Filter, MessageSquare, Paperclip } from "lucide-react";
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
import { StatusBadge, taskStageMap, taskPriorityMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tasks = [
  { id: "08342", title: "Implement auth middleware", assignedTo: "Ravi Kumar", priority: "High" as const, stage: "Development" as const, deadline: "2025-12-18", comments: 5, attachments: 2 },
  { id: "08343", title: "Design user dashboard", assignedTo: "Priya Sharma", priority: "Medium" as const, stage: "Documentation" as const, deadline: "2025-12-20", comments: 3, attachments: 1 },
  { id: "08344", title: "API rate limiting", assignedTo: "Amit Patel", priority: "High" as const, stage: "Testing" as const, deadline: "2025-12-15", comments: 8, attachments: 0 },
  { id: "08345", title: "Database optimization", assignedTo: "Sarah Chen", priority: "Low" as const, stage: "Analysis" as const, deadline: "2025-12-25", comments: 2, attachments: 3 },
  { id: "08346", title: "Payment integration", assignedTo: "John Smith", priority: "High" as const, stage: "Pre-Prod" as const, deadline: "2025-12-12", comments: 12, attachments: 4 },
  { id: "08347", title: "Email notifications", assignedTo: "Maria Garcia", priority: "Medium" as const, stage: "Production" as const, deadline: "2025-12-10", comments: 6, attachments: 1 },
  { id: "08348", title: "User profile page", assignedTo: "Ravi Kumar", priority: "Low" as const, stage: "Closed" as const, deadline: "2025-12-05", comments: 4, attachments: 2 },
];

const stages = ["All", "Analysis", "Documentation", "Development", "Testing", "Pre-Prod", "Production", "Closed"];

export default function Tasks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStage, setActiveStage] = useState("All");

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.id.includes(searchQuery);
    const matchesStage = activeStage === "All" || task.stage === activeStage;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground">Track and manage all tasks</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {/* Stage Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {stages.slice(1).map((stage) => {
          const count = tasks.filter((t) => t.stage === stage).length;
          return (
            <Card
              key={stage}
              className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                activeStage === stage ? "border-primary" : ""
              }`}
              onClick={() => setActiveStage(stage)}
            >
              <CardContent className="p-4">
                <div className="text-xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground truncate">{stage}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <Tabs value={activeStage} onValueChange={setActiveStage} className="w-full md:w-auto">
              <TabsList className="bg-muted/50">
                <TabsTrigger value="All">All</TabsTrigger>
                <TabsTrigger value="Development">Dev</TabsTrigger>
                <TabsTrigger value="Testing">Testing</TabsTrigger>
                <TabsTrigger value="Production">Prod</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
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
                <TableHead>Task ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-center">Activity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-mono text-primary font-medium">
                    #{task.id}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {task.title}
                  </TableCell>
                  <TableCell>{task.assignedTo}</TableCell>
                  <TableCell>
                    <StatusBadge variant={taskPriorityMap[task.priority]}>
                      {task.priority}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={taskStageMap[task.stage]}>
                      {task.stage}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(task.deadline).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1 text-xs">
                        <MessageSquare className="h-3 w-3" />
                        {task.comments}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        <Paperclip className="h-3 w-3" />
                        {task.attachments}
                      </span>
                    </div>
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
