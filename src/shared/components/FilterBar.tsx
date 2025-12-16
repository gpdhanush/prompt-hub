import { memo, useCallback } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  filters: Array<{
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }>;
  className?: string;
  showFilterIcon?: boolean;
}

const FilterBar = memo(function FilterBar({
  filters,
  className,
  showFilterIcon = true,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {showFilterIcon && (
        <Filter className="h-4 w-4 text-muted-foreground" />
      )}
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={filter.value}
          onValueChange={filter.onChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
});

FilterBar.displayName = "FilterBar";

export default FilterBar;

