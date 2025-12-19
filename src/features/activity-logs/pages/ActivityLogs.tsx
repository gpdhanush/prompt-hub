import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Calendar, FileText, RefreshCw } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { activityLogsApi } from "../api";
import { Pagination } from "@/components/ui/pagination";

const DEFAULT_PAGE_LIMIT = 20;

// Date formatting utility
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  VIEW: "bg-gray-100 text-gray-800",
  EXPORT: "bg-purple-100 text-purple-800",
};

export default function ActivityLogs() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateError, setDateError] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      'activity-logs',
      page,
      searchQuery,
      moduleFilter,
      startDate,
      endDate,
    ],
    queryFn: () =>
      activityLogsApi.getActivityLogs({
        page,
        limit: DEFAULT_PAGE_LIMIT,
        search: searchQuery || undefined,
        module: moduleFilter !== "All" ? moduleFilter : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    staleTime: 1000 * 30, // 30 seconds
    enabled: !dateError, // Don't fetch if there's a date error
  });

  const logs = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: DEFAULT_PAGE_LIMIT, total: 0, totalPages: 0 };

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const validateDates = (start: string, end: string) => {
    if (start && end) {
      const startDateObj = new Date(start);
      const endDateObj = new Date(end);
      if (endDateObj < startDateObj) {
        setDateError("End date cannot be earlier than start date");
        return false;
      }
    }
    setDateError("");
    return true;
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setPage(1);
    if (value && endDate) {
      validateDates(value, endDate);
    } else {
      setDateError("");
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setPage(1);
    if (startDate && value) {
      validateDates(startDate, value);
    } else {
      setDateError("");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setModuleFilter("All");
    setStartDate("");
    setEndDate("");
    setDateError("");
    setPage(1);
  };

  // Get unique modules from logs for filters
  const uniqueModules = Array.from(new Set(logs.map((log: any) => log.module).filter(Boolean)));

  // Extract item names from after_data or before_data
  const getItemName = useCallback((log: any): string => {
    if (!log.item_id) return "-";
    
    // Try to get name from after_data first, then before_data
    const data = log.after_data || log.before_data;
    if (data) {
      // Common field names for item names
      const nameFields = ['title', 'name', 'task_title', 'project_name', 'bug_title'];
      for (const field of nameFields) {
        if (data[field]) {
          return data[field];
        }
      }
    }
    
    // Fallback to item_id if no name found
    return `#${log.item_id}`;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Activity Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            View your activity history and actions
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter activity logs by search, action, module, or date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by module or action..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Modules</SelectItem>
                {uniqueModules.map((module: string) => (
                  <SelectItem key={module} value={module}>
                    {module}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker
              value={startDate}
              onChange={handleStartDateChange}
              placeholder="Start Date"
              id="start-date"
            />
            <DatePicker
              value={endDate}
              onChange={handleEndDateChange}
              placeholder="End Date"
              id="end-date"
            />
          </div>
          {dateError && (
            <div className="mt-2 text-sm text-destructive">
              {dateError}
            </div>
          )}
          {(searchQuery || moduleFilter !== "All" || startDate || endDate) && (
            <div className="mt-4">
              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>
            Showing {pagination.total} activity log(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Loading activity logs...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">Error loading activity logs. Please try again.</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No activity logs found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Item Type</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {formatDate(log.created_at)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.module}</TableCell>
                        <TableCell>{log.item_type || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{getItemName(log)}</span>
                            {log.item_id && (
                              <span className="text-xs text-muted-foreground">ID: {log.item_id}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.ip_address || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

