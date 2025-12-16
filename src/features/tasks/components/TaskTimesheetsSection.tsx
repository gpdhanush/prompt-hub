import { useState, useMemo, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Timer, FileText, CalendarDays, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ConfirmationDialog from "@/shared/components/ConfirmationDialog";
import { DatePicker } from "@/components/ui/date-picker";
import { tasksApi } from "@/features/tasks/api";
import { toast } from "@/hooks/use-toast";

interface TaskTimesheetsSectionProps {
  taskId: number;
}

export const TaskTimesheetsSection = memo(function TaskTimesheetsSection({ taskId }: TaskTimesheetsSectionProps) {
  const queryClient = useQueryClient();
  const [showAddTimesheet, setShowAddTimesheet] = useState(false);
  const [timesheetForm, setTimesheetForm] = useState({ date: '', hours: '', notes: '' });
  const [editingTimesheet, setEditingTimesheet] = useState<number | null>(null);
  const [showDeleteTimesheetDialog, setShowDeleteTimesheetDialog] = useState(false);
  const [timesheetToDelete, setTimesheetToDelete] = useState<number | null>(null);

  const { data: timesheetsData, isLoading } = useQuery({
    queryKey: ['task-timesheets', taskId],
    queryFn: () => tasksApi.getTimesheets(taskId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const timesheets = timesheetsData?.data || [];

  const totalHours = useMemo(() => {
    return timesheets.reduce((sum: number, ts: any) => sum + parseFloat(ts.hours || 0), 0);
  }, [timesheets]);

  const createTimesheetMutation = useMutation({
    mutationFn: (data: { date: string; hours: number; notes?: string }) =>
      tasksApi.createTimesheet(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-timesheets', taskId] });
      setTimesheetForm({ date: '', hours: '', notes: '' });
      setShowAddTimesheet(false);
      toast({ title: "Success", description: "Timesheet entry added successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add timesheet.", variant: "destructive" });
    },
  });

  const updateTimesheetMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { date?: string; hours?: number; notes?: string } }) =>
      tasksApi.updateTimesheet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-timesheets', taskId] });
      setEditingTimesheet(null);
      setTimesheetForm({ date: '', hours: '', notes: '' });
      toast({ title: "Success", description: "Timesheet updated successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update timesheet.", variant: "destructive" });
    },
  });

  const deleteTimesheetMutation = useMutation({
    mutationFn: (id: number) => tasksApi.deleteTimesheet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-timesheets', taskId] });
      toast({ title: "Success", description: "Timesheet deleted successfully." });
      setShowDeleteTimesheetDialog(false);
      setTimesheetToDelete(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete timesheet.", variant: "destructive" });
    },
  });

  const handleSubmitTimesheet = useCallback(() => {
    if (!timesheetForm.date || !timesheetForm.hours) {
      toast({ title: "Error", description: "Date and hours are required.", variant: "destructive" });
      return;
    }

    if (editingTimesheet) {
      updateTimesheetMutation.mutate({
        id: editingTimesheet,
        data: {
          date: timesheetForm.date,
          hours: parseFloat(timesheetForm.hours),
          notes: timesheetForm.notes || undefined,
        },
      });
    } else {
      createTimesheetMutation.mutate({
        date: timesheetForm.date,
        hours: parseFloat(timesheetForm.hours),
        notes: timesheetForm.notes || undefined,
      });
    }
  }, [timesheetForm, editingTimesheet, createTimesheetMutation, updateTimesheetMutation, toast]);

  const handleAddTimesheet = useCallback(() => {
    setShowAddTimesheet(true);
    setEditingTimesheet(null);
    setTimesheetForm({ date: '', hours: '', notes: '' });
  }, []);

  const handleEditTimesheet = useCallback((timesheet: any) => {
    setEditingTimesheet(timesheet.id);
    const dateValue = timesheet.date ? (timesheet.date.includes('T') ? timesheet.date.split('T')[0] : timesheet.date) : '';
    setTimesheetForm({
      date: dateValue,
      hours: timesheet.hours.toString(),
      notes: timesheet.notes || '',
    });
  }, []);

  const handleDeleteTimesheet = useCallback((timesheetId: number) => {
    setTimesheetToDelete(timesheetId);
    setShowDeleteTimesheetDialog(true);
  }, []);

  const confirmDeleteTimesheet = useCallback(() => {
    if (timesheetToDelete) {
      deleteTimesheetMutation.mutate(timesheetToDelete);
    }
  }, [timesheetToDelete, deleteTimesheetMutation]);

  const handleCloseDialog = useCallback(() => {
    setShowAddTimesheet(false);
    setEditingTimesheet(null);
    setTimesheetForm({ date: '', hours: '', notes: '' });
  }, []);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/40 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Hours</p>
                <p className="text-3xl font-bold text-primary">{totalHours.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Timer className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-blue-500/10 hover:border-blue-500/40 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Entries</p>
                <p className="text-3xl font-bold text-blue-600">{timesheets.length}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Timesheet Button */}
      <Button
        onClick={handleAddTimesheet}
        size="sm"
        variant="outline"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Timesheet Entry
      </Button>

      {/* Add/Edit Timesheet Dialog */}
      <Dialog open={showAddTimesheet || editingTimesheet !== null} onOpenChange={(open) => {
        if (!open) {
          handleCloseDialog();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTimesheet ? 'Update Timesheet' : 'Add Timesheet Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <DatePicker
                value={timesheetForm.date}
                onChange={(date) => setTimesheetForm({ ...timesheetForm, date })}
                placeholder="Select date"
              />
            </div>
            <div className="space-y-2">
              <Label>Hours *</Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                max="24"
                placeholder="e.g., 8.5"
                value={timesheetForm.hours}
                onChange={(e) => setTimesheetForm({ ...timesheetForm, hours: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="What did you work on?"
                value={timesheetForm.notes}
                onChange={(e) => setTimesheetForm({ ...timesheetForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitTimesheet}
                disabled={!timesheetForm.date || !timesheetForm.hours || createTimesheetMutation.isPending || updateTimesheetMutation.isPending}
              >
                {createTimesheetMutation.isPending || updateTimesheetMutation.isPending 
                  ? (editingTimesheet ? 'Updating...' : 'Saving...') 
                  : (editingTimesheet ? 'Update Timesheet' : 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Timesheets List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Clock className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : timesheets.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No timesheet entries yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {timesheets.map((timesheet: any) => (
            <Card 
              key={timesheet.id} 
              className="border-2 hover:border-primary/50 hover:shadow-md transition-all group"
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 border-2 border-primary/30 group-hover:border-primary/50 transition-all">
                    <Timer className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-base font-semibold">{timesheet.employee_name || 'Unknown'}</p>
                          <Badge variant="outline" className="text-xs">
                            {timesheet.hours} {timesheet.hours === 1 ? 'hour' : 'hours'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{new Date(timesheet.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditTimesheet(timesheet);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTimesheet(timesheet.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {timesheet.notes && (
                      <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-muted">
                        <p className="text-sm text-foreground">{timesheet.notes}</p>
                      </div>
                    )}
                    {timesheet.approved_by_name && (
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Approved by {timesheet.approved_by_name}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Timesheet Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteTimesheetDialog}
        onOpenChange={setShowDeleteTimesheetDialog}
        title="Delete Timesheet Entry"
        description="Are you sure you want to delete this timesheet entry? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={deleteTimesheetMutation.isPending}
        onConfirm={confirmDeleteTimesheet}
      />
    </div>
  );
});

