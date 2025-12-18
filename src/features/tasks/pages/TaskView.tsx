import { useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Edit, CheckSquare, MessageSquare, History, Timer, Paperclip, Clock, AlertCircle, User, Calendar } from "lucide-react";
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
import { TaskCommentsSection } from "../components/TaskCommentsSection";
import { TaskHistorySection } from "../components/TaskHistorySection";
import { TaskTimesheetsSection } from "../components/TaskTimesheetsSection";
import { formatDate, getPriorityLabel } from "../utils/utils";

export default function TaskView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = usePermissions();
  const canEditTask = hasPermission('tasks.edit');

  const { data: taskData, isLoading, error } = useQuery({
    queryKey: ['task', id],
    queryFn: () => tasksApi.getById(Number(id)),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const task = taskData?.data;

  const handleBack = useCallback(() => {
    navigate('/tasks');
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate(`/tasks/${id}/edit`);
  }, [navigate, id]);

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
              <Button onClick={handleBack}>
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
            onClick={handleBack}
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
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Task
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="md:col-span-2 space-y-6">
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

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Task Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Priority */}
              <div>
                <Label className="text-muted-foreground text-sm">Priority</Label>
                <div className="mt-1">
                  <StatusBadge variant={taskPriorityMap[getPriorityLabel(task.priority)]} className="text-xs">
                    {getPriorityLabel(task.priority)}
                  </StatusBadge>
                </div>
              </div>

              {/* Stage */}
              <div>
                <Label className="text-muted-foreground text-sm">Stage</Label>
                <div className="mt-1">
                  <StatusBadge variant={taskStageMap[task.stage || 'Analysis']} className="text-xs">
                    {task.stage || 'Analysis'}
                  </StatusBadge>
                </div>
              </div>

              {/* Status */}
              <div>
                <Label className="text-muted-foreground text-sm">Status</Label>
                <div className="text-sm font-medium mt-1">{task.status || 'Open'}</div>
              </div>

              {/* Deadline */}
              <div>
                <Label className="text-muted-foreground text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Deadline
                </Label>
                <div className="text-sm font-medium mt-1">
                  {formatDate(task.deadline)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Team Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Assigned To */}
              {task.assigned_to_name && (
                <div>
                  <Label className="text-muted-foreground text-sm">Assigned To</Label>
                  <div className="text-sm font-medium mt-1">{task.assigned_to_name}</div>
                </div>
              )}

              {/* Developer */}
              <div>
                <Label className="text-muted-foreground text-sm">Developer</Label>
                <div className="text-sm font-medium mt-1">{task.developer_name || 'Not assigned'}</div>
              </div>

              {/* Designer */}
              <div>
                <Label className="text-muted-foreground text-sm">Designer</Label>
                <div className="text-sm font-medium mt-1">{task.designer_name || 'Not assigned'}</div>
              </div>

              {/* Tester */}
              <div>
                <Label className="text-muted-foreground text-sm">Tester</Label>
                <div className="text-sm font-medium mt-1">{task.tester_name || 'Not assigned'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
