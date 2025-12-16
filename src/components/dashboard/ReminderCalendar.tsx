import { memo, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { remindersApi } from "@/features/reminders/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface ReminderCalendarProps {
  selectedDate: Date | undefined;
  onDateSelect: (date: Date | undefined) => void;
}

const ReminderCalendar = memo(function ReminderCalendar({
  selectedDate,
  onDateSelect,
}: ReminderCalendarProps) {
  const queryClient = useQueryClient();
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: "",
    description: "",
    reminder_time: "",
    reminder_type: "other",
  });

  // Fetch reminders for the current month
  const currentMonth = selectedDate || new Date();
  const startOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  const endOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );

  const { data: remindersData } = useQuery({
    queryKey: [
      "reminders",
      format(startOfMonth, "yyyy-MM-dd"),
      format(endOfMonth, "yyyy-MM-dd"),
    ],
    queryFn: () =>
      remindersApi.getAll({
        start_date: format(startOfMonth, "yyyy-MM-dd"),
        end_date: format(endOfMonth, "yyyy-MM-dd"),
      }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const reminders = remindersData?.data || [];

  // Normalize reminder dates to yyyy-MM-dd format for comparison
  const normalizeDate = useCallback((dateStr: string) => {
    if (!dateStr) return "";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return format(date, "yyyy-MM-dd");
  }, []);

  // Get reminders for selected date
  const selectedDateReminders = useMemo(() => {
    if (!selectedDate) return [];
    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    return reminders.filter((r: any) => {
      const reminderDate = normalizeDate(r.reminder_date);
      return reminderDate === selectedDateStr;
    });
  }, [selectedDate, reminders, normalizeDate]);

  // Create modifiers for calendar to mark dates with reminders
  const reminderDates = useMemo(() => {
    return reminders
      .map((r: any) => {
        try {
          const dateStr = normalizeDate(r.reminder_date);
          return dateStr ? new Date(dateStr) : null;
        } catch {
          return null;
        }
      })
      .filter((date): date is Date => date !== null);
  }, [reminders, normalizeDate]);

  // Create reminder mutation
  const createReminderMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      reminder_date: string;
      reminder_time: string;
      reminder_type?: string;
    }) => remindersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      setShowReminderDialog(false);
      setReminderForm({
        title: "",
        description: "",
        reminder_time: "",
        reminder_type: "other",
      });
    },
  });

  const handleAddReminder = useCallback(() => {
    if (!selectedDate) return;
    setShowReminderDialog(true);
  }, [selectedDate]);

  const handleSubmitReminder = useCallback(() => {
    if (!selectedDate || !reminderForm.title || !reminderForm.reminder_time)
      return;

    const reminderDate = format(selectedDate, "yyyy-MM-dd");
    createReminderMutation.mutate({
      title: reminderForm.title,
      description: reminderForm.description || undefined,
      reminder_date: reminderDate,
      reminder_time: reminderForm.reminder_time,
      reminder_type: reminderForm.reminder_type,
    });
  }, [selectedDate, reminderForm, createReminderMutation]);

  return (
    <>
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Calendar
          </CardTitle>
          <CardDescription className="text-xs">
            Select a date to add reminders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Calendar on the left */}
            <div className="flex flex-col lg:w-1/2">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateSelect}
                className="rounded-md border-0"
                modifiers={{
                  hasReminder: reminderDates,
                }}
                modifiersClassNames={{
                  hasReminder: "bg-primary/20 text-primary font-semibold",
                }}
              />
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleAddReminder}
                  disabled={!selectedDate}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Add Reminder
                </Button>
              </div>
            </div>
            {/* Reminders on the right */}
            <div className="lg:w-1/2 lg:border-l lg:pl-6 pt-4 lg:pt-0">
              {selectedDate ? (
                <>
                  <p className="text-sm font-semibold mb-3">
                    Reminders for {format(selectedDate, "MMM d, yyyy")}
                  </p>
                  {selectedDateReminders.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {selectedDateReminders.map((reminder: any) => (
                        <div
                          key={reminder.id}
                          className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors border"
                        >
                          <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {reminder.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {reminder.reminder_time} • {reminder.reminder_type}
                            </p>
                            {reminder.description && (
                              <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                                {reminder.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-sm text-muted-foreground text-center">
                        No reminders for {format(selectedDate, "MMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    Select a date to view reminders
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reminder Dialog */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>
              {selectedDate &&
                `Set a reminder for ${format(selectedDate, "EEEE, MMMM d, yyyy")}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Team Meeting, Client Call"
                value={reminderForm.title}
                onChange={(e) =>
                  setReminderForm({ ...reminderForm, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={reminderForm.reminder_time}
                onChange={(e) =>
                  setReminderForm({
                    ...reminderForm,
                    reminder_time: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={reminderForm.reminder_type}
                onValueChange={(value) =>
                  setReminderForm({ ...reminderForm, reminder_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="important_date">Important Date</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any additional notes..."
                value={reminderForm.description}
                onChange={(e) =>
                  setReminderForm({
                    ...reminderForm,
                    description: e.target.value,
                  })
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReminderDialog(false);
                setReminderForm({
                  title: "",
                  description: "",
                  reminder_time: "",
                  reminder_type: "other",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReminder}
              disabled={
                !reminderForm.title ||
                !reminderForm.reminder_time ||
                createReminderMutation.isPending
              }
            >
              {createReminderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Reminder"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

ReminderCalendar.displayName = "ReminderCalendar";

export default ReminderCalendar;

