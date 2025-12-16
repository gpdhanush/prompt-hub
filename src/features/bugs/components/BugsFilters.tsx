import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SearchBar from "@/shared/components/SearchBar";
import FilterBar from "@/shared/components/FilterBar";
import ViewToggle from "@/shared/components/ViewToggle";

interface BugsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  viewFilter: 'all' | 'my';
  onViewFilterChange: (value: 'all' | 'my') => void;
}

export const BugsFilters = memo(function BugsFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewFilter,
  onViewFilterChange,
}: BugsFiltersProps) {
  const statusFilterOptions = [
    { value: "All", label: "All Statuses" },
    { value: "Open", label: "Open" },
    { value: "In Progress", label: "In Progress" },
    { value: "Fixed", label: "Fixed" },
    { value: "Closed", label: "Closed" },
    { value: "Blocked", label: "Blocked" },
    { value: "Reopened", label: "Reopened" },
    { value: "Fixing", label: "Fixing" },
    { value: "Retesting", label: "Retesting" },
    { value: "Completed", label: "Completed" },
    { value: "Passed", label: "Passed" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Search and filter bugs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={onSearchChange}
              placeholder="Search by bug title, bug code, description, or ID..."
            />
          </div>
          <FilterBar
            filters={[
              {
                key: "status",
                label: "Status",
                value: statusFilter || "All",
                options: statusFilterOptions,
                onChange: onStatusFilterChange,
              },
            ]}
            showFilterIcon={true}
          />
          <ViewToggle
            value={viewFilter}
            onChange={onViewFilterChange}
            allLabel="All Bugs"
            myLabel="My Bugs"
          />
        </div>
      </CardContent>
    </Card>
  );
});

