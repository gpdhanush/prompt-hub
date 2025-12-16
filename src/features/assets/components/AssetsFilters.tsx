import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import SearchBar from "@/shared/components/SearchBar";
import FilterBar from "@/shared/components/FilterBar";

interface AssetsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: Array<{ id: number; name: string }>;
}

export const AssetsFilters = memo(function AssetsFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
}: AssetsFiltersProps) {
  const statusFilterOptions = [
    { value: "all", label: "All Statuses" },
    { value: "available", label: "Available" },
    { value: "assigned", label: "Assigned" },
    { value: "repair", label: "Repair" },
    { value: "damaged", label: "Damaged" },
    { value: "retired", label: "Retired" },
  ];

  const categoryFilterOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((cat) => ({ value: cat.id.toString(), label: cat.name })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Search and filter assets</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={onSearchChange}
              placeholder="Search by code, brand, model, or serial number..."
            />
          </div>
          <FilterBar
            filters={[
              {
                key: "status",
                label: "Status",
                value: statusFilter || "all",
                options: statusFilterOptions,
                onChange: (value) => onStatusFilterChange(value === "all" ? "" : value),
              },
              {
                key: "category",
                label: "Category",
                value: categoryFilter || "all",
                options: categoryFilterOptions,
                onChange: (value) => onCategoryFilterChange(value === "all" ? "" : value),
              },
            ]}
            showFilterIcon={true}
          />
        </div>
      </CardContent>
    </Card>
  );
});

