import { useState, useEffect } from "react";
import { Play, Square, Clock, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { kanbanApi } from "../api";
import { toast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/auth";

interface TimeTrackingProps {
  taskId: number;
  estimatedTime?: number;
  actualTime?: number;
}

export function TimeTracking({ taskId, estimatedTime, actualTime }: TimeTrackingProps) {
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [manualTime, setManualTime] = useState(actualTime?.toString() || "0");
  const queryClient = useQueryClient();

  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const canAdjustTime = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Team Leader' || userRole === 'Team Lead';

  // Fetch time logs
  const { data: timeLogsData } = useQuery({
    queryKey: ['kanban-time-logs', taskId],
    queryFn: () => kanbanApi.getTimeLogs(taskId),
    staleTime: 1000 * 30, // 30 seconds
  });

  const timeLogs = timeLogsData?.data || [];

  // Check for active timer
  useEffect(() => {
    const activeLog = timeLogs.find((log: any) => log.is_active);
    if (activeLog) {
      setIsTimerRunning(true);
      const startTime = new Date(activeLog.started_at).getTime();
      const updateElapsed = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };
      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else {
      setIsTimerRunning(false);
      setElapsedTime(0);
    }
  }, [timeLogs]);

  const startMutation = useMutation({
    mutationFn: () => kanbanApi.startTimeTracking(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-time-logs', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban-board'] });
      toast({
        title: "Timer Started",
        description: "Time tracking has started.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start timer.",
        variant: "destructive",
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => kanbanApi.stopTimeTracking(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-time-logs', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban-board'] });
      toast({
        title: "Timer Stopped",
        description: "Time tracking has stopped.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to stop timer.",
        variant: "destructive",
      });
    },
  });

  const updateTimeMutation = useMutation({
    mutationFn: (time: number) => kanbanApi.updateActualTime(taskId, time),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-time-logs', taskId] });
      queryClient.invalidateQueries({ queryKey: ['kanban-board'] });
      setShowEditDialog(false);
      toast({
        title: "Success",
        description: "Actual time updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update time.",
        variant: "destructive",
      });
    },
  });

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatHours = (hours: number | undefined) => {
    if (!hours) return "0.00";
    return hours.toFixed(2);
  };

  const timeDifference = actualTime && estimatedTime ? actualTime - estimatedTime : null;
  const isOverrun = timeDifference && timeDifference > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Time Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estimated vs Actual */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Estimated</Label>
            <p className="text-sm font-medium">{formatHours(estimatedTime)}h</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Actual</Label>
            <p className={`text-sm font-medium ${isOverrun ? 'text-destructive' : ''}`}>
              {formatHours(actualTime)}h
            </p>
          </div>
        </div>

        {/* Difference */}
        {timeDifference !== null && (
          <div>
            <Label className="text-xs text-muted-foreground">Difference</Label>
            <p className={`text-sm font-medium ${isOverrun ? 'text-destructive' : 'text-green-600'}`}>
              {isOverrun ? '+' : ''}{formatHours(timeDifference)}h
              {isOverrun && <span className="ml-1 text-xs">(Overrun)</span>}
            </p>
          </div>
        )}

        {/* Timer Controls */}
        <div className="flex items-center gap-2">
          {isTimerRunning ? (
            <>
              <div className="flex-1 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-mono">{formatTime(elapsedTime)}</span>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => stopMutation.mutate()}
                disabled={stopMutation.isPending}
              >
                <Square className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-1" />
              Start Timer
            </Button>
          )}
        </div>

        {/* Manual Adjustment (TL/Admin only) */}
        {canAdjustTime && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setManualTime(actualTime?.toString() || "0");
              setShowEditDialog(true);
            }}
            className="w-full"
          >
            <Edit className="h-4 w-4 mr-1" />
            Adjust Time
          </Button>
        )}

        {/* Recent Time Logs */}
        {timeLogs.length > 0 && (
          <div className="pt-2 border-t">
            <Label className="text-xs text-muted-foreground mb-2 block">Recent Sessions</Label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {timeLogs.slice(0, 5).map((log: any) => (
                <div key={log.id} className="text-xs flex justify-between">
                  <span className="text-muted-foreground">
                    {new Date(log.started_at).toLocaleDateString()}
                  </span>
                  <span className="font-mono">
                    {log.duration_minutes ? `${(log.duration_minutes / 60).toFixed(2)}h` : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Time Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Actual Time</DialogTitle>
            <DialogDescription>
              Manually set the actual time spent on this task (in hours).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="actual-time">Actual Time (hours)</Label>
              <Input
                id="actual-time"
                type="number"
                step="0.01"
                min="0"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={updateTimeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateTimeMutation.mutate(parseFloat(manualTime) || 0)}
              disabled={updateTimeMutation.isPending}
            >
              {updateTimeMutation.isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

