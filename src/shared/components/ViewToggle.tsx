import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  value: "all" | "my";
  onChange: (value: "all" | "my") => void;
  allLabel?: string;
  myLabel?: string;
  className?: string;
}

const ViewToggle = memo(function ViewToggle({
  value,
  onChange,
  allLabel = "All",
  myLabel = "My",
  className,
}: ViewToggleProps) {
  const handleAllClick = useCallback(() => {
    onChange("all");
  }, [onChange]);

  const handleMyClick = useCallback(() => {
    onChange("my");
  }, [onChange]);

  return (
    <div className={cn("inline-flex rounded-md border", className)}>
      <Button
        variant={value === "all" ? "default" : "ghost"}
        size="sm"
        onClick={handleAllClick}
        className={cn(
          "rounded-r-none border-r",
          value === "all" ? "bg-primary text-primary-foreground" : ""
        )}
      >
        {allLabel}
      </Button>
      <Button
        variant={value === "my" ? "default" : "ghost"}
        size="sm"
        onClick={handleMyClick}
        className={cn(
          "rounded-l-none",
          value === "my" ? "bg-primary text-primary-foreground" : ""
        )}
      >
        {myLabel}
      </Button>
    </div>
  );
});

ViewToggle.displayName = "ViewToggle";

export default ViewToggle;

