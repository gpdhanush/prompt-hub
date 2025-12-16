import { useState, useEffect, memo } from "react";
import { format } from "date-fns";

interface ClockProps {
  selectedDate?: Date;
}

const Clock = memo(function Clock({ selectedDate }: ClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end">
      <div className="text-3xl font-bold text-foreground">
        {format(currentTime, "hh:mm:ss a")}
      </div>
      {selectedDate && (
        <div className="text-sm text-muted-foreground mt-1">
          {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </div>
      )}
    </div>
  );
});

Clock.displayName = "Clock";

export default Clock;

