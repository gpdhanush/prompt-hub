import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SearchBar from "@/shared/components/SearchBar";
import FilterBar from "@/shared/components/FilterBar";
import ViewToggle from "@/shared/components/ViewToggle";
import { PROJECT_STATUSES } from "../utils/constants";

interface ProjectsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  viewFilter: 'all' | 'my';
  onViewFilterChange: (value: 'all' | 'my') => void;
}

export const ProjectsFilters = memo(function ProjectsFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewFilter,
  onViewFilterChange,
}: ProjectsFiltersProps) {
  const statusFilterOptions = [
    { value: "all", label: "All Statuses" },
    ...PROJECT_STATUSES.map((status) => ({ value: status, label: status })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Search and filter projects</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search by project name, project code, or ID..."
            />
          </div>
          <FilterBar
            filters={[
              {
                key: "status",
                label: "Status",
                value: statusFilter || "all",
                options: statusFilterOptions,
                onChange: (value) => onStatusFilterChange(value === "all" ? null : value),
              },
            ]}
            showFilterIcon={true}
          />
          <ViewToggle
            value={viewFilter}
            onChange={onViewFilterChange}
            allLabel="All Projects"
            myLabel="My Projects"
          />
        </div>
      </CardContent>
    </Card>
  );
});
