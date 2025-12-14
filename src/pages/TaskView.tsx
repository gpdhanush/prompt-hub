import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, CheckSquare, User, Clock, CalendarDays, FileText, AlertCircle, Target, Users, Calendar, History, Timer, MessageSquare, Download, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, taskStageMap, taskPriorityMap } from "@/components/ui/status-badge";
import { tasksApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";
import { TaskCommentsSection, TaskHistorySection, TaskTimesheetsSection } from "./Tasks";

export default function TaskView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = usePermissions();
  const canEditTask = hasPermission('tasks.edit');
  const currentUser = getCurrentUser();

  const { data: taskData, isLoading, error } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getById(Number(id)),
    enabled: !!id,
  });

  const task = taskData?.data;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatFullDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  const getPriorityLabel = (priority?: string) => {
    if (!priority) return "Medium";
    if (priority === "Med") return "Medium";
    return priority;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Clock className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading task...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-semibold mb-2">Task not found</p>
              <p className="text-muted-foreground mb-4">The task you're looking for doesn't exist or has been deleted.</p>
              <Button onClick={() => navigate('/tasks')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tasks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/tasks')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CheckSquare className="h-8 w-8 text-primary" />
              Task Details
            </h1>
            <p className="text-muted-foreground mt-1">
              {task.task_code ? `Task #${task.task_code}` : `Task #${task.id}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEditTask && (
            <Button onClick={() => navigate(`/tasks/${id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Task
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50">
          <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Details</TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Comments</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">History</TabsTrigger>
          <TabsTrigger value="timesheets" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Timesheets</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{task.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {task.task_code ? `Task #${task.task_code}` : `Task #${task.id}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge variant={taskPriorityMap[getPriorityLabel(task.priority)]} className="text-sm px-3 py-1.5">
                    {getPriorityLabel(task.priority)}
                  </StatusBadge>
                  <StatusBadge variant={taskStageMap[task.stage || 'Analysis']} className="text-sm px-3 py-1.5">
                    {task.stage || 'Analysis'}
                  </StatusBadge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Description</Label>
                <div className="p-4 bg-muted/30 rounded-md border">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {task.description || "No description provided"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Information Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Deadline
                  </Label>
                  <p className="text-sm font-semibold">
                    {formatDate(task.deadline)}
                  </p>
                </div>
                <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Status
                  </Label>
                  <p className="text-sm font-semibold">{task.status || 'Open'}</p>
                </div>
                <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Created At
                  </Label>
                  <p className="text-sm font-semibold">
                    {formatFullDate(task.created_at)}
                  </p>
                </div>
                <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                  <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Last Updated
                  </Label>
                  <p className="text-sm font-semibold">
                    {formatFullDate(task.updated_at)}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Team Assignment */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Assignment
                </Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Developer
                    </Label>
                    <p className="text-sm font-medium">{task.developer_name || 'Not assigned'}</p>
                  </div>
                  <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Designer
                    </Label>
                    <p className="text-sm font-medium">{task.designer_name || 'Not assigned'}</p>
                  </div>
                  <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      Tester
                    </Label>
                    <p className="text-sm font-medium">{task.tester_name || 'Not assigned'}</p>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {task.attachments && task.attachments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments ({task.attachments.length})
                    </Label>
                    <div className="grid gap-2">
                      {task.attachments.map((attachment: any) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{attachment.original_filename}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size || 0)}</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(attachment.path, '_blank')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Audit Information */}
              <div className="space-y-4">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Audit Information
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                    <Label className="text-xs font-medium text-muted-foreground">Created By</Label>
                    <p className="text-sm font-medium">{task.created_by_name || 'N/A'}</p>
                    {task.created_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFullDate(task.created_at)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5 p-3 bg-muted/30 rounded-md border">
                    <Label className="text-xs font-medium text-muted-foreground">Last Updated By</Label>
                    <p className="text-sm font-medium">
                      {task.updated_by_name || task.created_by_name || 'N/A'}
                    </p>
                    {task.updated_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatFullDate(task.updated_at)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaskCommentsSection taskId={task.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaskHistorySection taskId={task.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timesheets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Timesheets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TaskTimesheetsSection taskId={task.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
