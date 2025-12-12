import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  
  // Convert string value to Date object
  // Handle empty strings and invalid dates
  let date: Date | undefined = undefined;
  if (value && value.trim() !== '') {
    try {
      const dateObj = new Date(value + 'T00:00:00');
      // Check if date is valid
      if (!isNaN(dateObj.getTime())) {
        date = dateObj;
      }
    } catch (e) {
      // Invalid date, keep as undefined
      date = undefined;
    }
  }
  
  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Format as YYYY-MM-DD
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      onChange(formattedDate);
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Button
            type="button"
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal pr-8",
              !date && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
          {date && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-transparent"
              onClick={handleClear}
            >
              <X className="h-3.5 w-3.5 opacity-50 hover:opacity-100" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 min-w-[280px]" align="start">
        <div className="p-3 border-b flex justify-between items-center">
          <span className="text-sm font-medium">Select Date</span>
          {date && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 px-2 text-xs"
            >
              Clear
            </Button>
          )}
        </div>
        <div className="p-3">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            initialFocus
            className="rounded-md border-0"
            captionLayout="dropdown"
            fromYear={1900}
            toYear={new Date().getFullYear() + 10}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
