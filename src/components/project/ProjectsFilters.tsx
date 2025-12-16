import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_STATUSES } from "./constants";

interface ProjectsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string | null;
  onStatusFilterChange: (value: string | null) => void;
  viewFilter: 'all' | 'my';
  onViewFilterChange: (value: 'all' | 'my') => void;
}

export const ProjectsFilters = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  viewFilter,
  onViewFilterChange,
}: ProjectsFiltersProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>Search and filter projects</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by project name, project code, or ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select 
            value={statusFilter || "all"} 
            onValueChange={(value) => onStatusFilterChange(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {PROJECT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              variant={viewFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewFilterChange('all')}
            >
              All Projects
            </Button>
            <Button
              variant={viewFilter === 'my' ? 'default' : 'outline'}
              size="sm"
              onClick={() => onViewFilterChange('my')}
            >
              My Projects
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

