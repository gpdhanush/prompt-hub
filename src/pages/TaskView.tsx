import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, CheckSquare, User, Clock, CalendarDays, FileText, AlertCircle, Target, Users, Calendar, History, Timer, MessageSquare, Paperclip } from "lucide-react";
import { AttachmentList } from "@/components/ui/attachment-list";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, taskStageMap, taskPriorityMap } from "@/components/ui/status-badge";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { tasksApi } from "@/features/tasks/api";
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
    <div className="mx-auto p-6 space-y-6 ">
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
      <div className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
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
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Description</Label>
                <div className="p-4 bg-muted/30 rounded-md border">
                  {task.description ? (
                    <MarkdownRenderer content={task.description} className="text-sm" />
                  ) : (
                    <p className="text-sm text-muted-foreground">No description provided</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* First Row: Priority, Stage, Status, Deadline in 4 columns */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Priority</Label>
                  <div className="mt-1">
                    <StatusBadge variant={taskPriorityMap[getPriorityLabel(task.priority)]} className="text-xs">
                      {getPriorityLabel(task.priority)}
                    </StatusBadge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Stage</Label>
                  <div className="mt-1">
                    <StatusBadge variant={taskStageMap[task.stage || 'Analysis']} className="text-xs">
                      {task.stage || 'Analysis'}
                    </StatusBadge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Status</Label>
                  <div className="text-sm font-medium mt-1">{task.status || 'Open'}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Deadline</Label>
                  <div className="text-sm font-medium mt-1">
                    {formatDate(task.deadline)}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Team Assignment */}
              <div>
                <Label className="text-muted-foreground text-sm">Team Assignment</Label>
                <div className="grid grid-cols-3 gap-4 mt-1">
                  <div>
                    <Label className="text-muted-foreground text-xs">Developer</Label>
                    <div className="text-sm font-medium mt-1">{task.developer_name || 'Not assigned'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Designer</Label>
                    <div className="text-sm font-medium mt-1">{task.designer_name || 'Not assigned'}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Tester</Label>
                    <div className="text-sm font-medium mt-1">{task.tester_name || 'Not assigned'}</div>
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
                    <AttachmentList
                      attachments={task.attachments}
                      showLabel={false}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        {/* Comments Section */}
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

        {/* History Section */}
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

        {/* Timesheets Section */}
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
      </div>
    </div>
  );
}
