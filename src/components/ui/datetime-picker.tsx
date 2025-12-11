import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateTimePickerProps {
  value?: string; // YYYY-MM-DDTHH:mm format (ISO datetime-local)
  onChange: (datetime: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled = false,
  className,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [dateValue, setDateValue] = React.useState<string>("");
  const [timeValue, setTimeValue] = React.useState<string>("");
  
  // Parse value into date and time components
  React.useEffect(() => {
    if (value && value.trim() !== '') {
      try {
        // Handle both YYYY-MM-DDTHH:mm and YYYY-MM-DD HH:mm formats
        const dateTimeStr = value.includes('T') ? value : value.replace(' ', 'T');
        const dateTime = new Date(dateTimeStr);
        if (!isNaN(dateTime.getTime())) {
          setDateValue(format(dateTime, 'yyyy-MM-dd'));
          setTimeValue(format(dateTime, 'HH:mm'));
        }
      } catch (e) {
        // Invalid date, keep empty
        setDateValue("");
        setTimeValue("");
      }
    } else {
      setDateValue("");
      setTimeValue("");
    }
  }, [value]);
  
  // Convert string date to Date object
  let date: Date | undefined = undefined;
  if (dateValue && dateValue.trim() !== '') {
    try {
      const dateObj = new Date(dateValue + 'T00:00:00');
      if (!isNaN(dateObj.getTime())) {
        date = dateObj;
      }
    } catch (e) {
      date = undefined;
    }
  }
  
  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      setDateValue(formattedDate);
      updateDateTime(formattedDate, timeValue);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTimeValue(newTime);
    updateDateTime(dateValue, newTime);
  };

  const updateDateTime = (date: string, time: string) => {
    if (date && time) {
      const datetime = `${date}T${time}`;
      onChange(datetime);
    } else if (date) {
      onChange(`${date}T00:00`);
    } else if (time) {
      const today = format(new Date(), 'yyyy-MM-dd');
      onChange(`${today}T${time}`);
    }
  };

  const formatDisplayDateTime = () => {
    if (!dateValue && !timeValue) return null;
    if (dateValue && timeValue) {
      try {
        const dt = new Date(`${dateValue}T${timeValue}`);
        return format(dt, "PPP 'at' h:mm a");
      } catch (e) {
        return `${dateValue} ${timeValue}`;
      }
    }
    if (dateValue) {
      try {
        const dt = new Date(dateValue + 'T00:00:00');
        return format(dt, "PPP");
      } catch (e) {
        return dateValue;
      }
    }
    return timeValue;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateValue && !timeValue && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplayDateTime() || <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
              className="rounded-md border-0"
            />
          </div>
          <div className="space-y-2 border-t pt-2">
            <Label>Time</Label>
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="w-full"
            />
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDateValue("");
                setTimeValue("");
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
