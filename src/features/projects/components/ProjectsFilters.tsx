import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SearchBar from "@/shared/components/SearchBar";
import FilterBar from "@/shared/components/FilterBar";
import ViewToggle from "@/shared/components/ViewToggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PROJECT_STATUSES } from "../utils/constants";

interface ProjectsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  viewFilter: 'all' | 'my';
  onViewFilterChange: (value: 'all' | 'my') => void;
  pageSize: number;
  onPageSizeChange: (value: number) => void;
}

export const ProjectsFilters = memo(function ProjectsFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewFilter,
  onViewFilterChange,
  pageSize,
  onPageSizeChange,
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
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search by project name, project code, or ID..."
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <FilterBar
              filters={[
                {
                  key: "status",
                  label: "Status",
                  value: statusFilter || "all",
                  options: statusFilterOptions,
                  onChange: (value) =>
                    onStatusFilterChange(value === "all" ? null : value),
                },
              ]}
              showFilterIcon={true}
            />
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Page Size:</label>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => onPageSizeChange(parseInt(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ViewToggle
              value={viewFilter}
              onChange={onViewFilterChange}
              allLabel="All Projects"
              myLabel="My Projects"
            />

          </div>
        </div>
      </CardContent>
    </Card>
  );
});
