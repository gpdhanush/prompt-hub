import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SearchBar from "@/shared/components/SearchBar";
import FilterBar from "@/shared/components/FilterBar";
import ViewToggle from "@/shared/components/ViewToggle";
import { TASK_STAGES } from "../utils/constants";

interface TasksFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  viewFilter: 'all' | 'my';
  onViewFilterChange: (value: 'all' | 'my') => void;
}

export const TasksFilters = memo(function TasksFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewFilter,
  onViewFilterChange,
}: TasksFiltersProps) {
  const stageFilterOptions = [
    { value: "All", label: "All Stages" },
    ...TASK_STAGES.map((stage) => ({ value: stage, label: stage })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Search and filter tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search by task title, task code, or ID..."
            />
          </div>
          <FilterBar
            filters={[
              {
                key: "stage",
                label: "Stage",
                value: statusFilter || "All",
                options: stageFilterOptions,
                onChange: onStatusFilterChange,
              },
            ]}
            showFilterIcon={true}
          />
          <ViewToggle
            value={viewFilter}
            onChange={onViewFilterChange}
            allLabel="All Tasks"
            myLabel="My Tasks"
          />
        </div>
      </CardContent>
    </Card>
  );
});

