import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Calendar, FolderKanban, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { tasksApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

export default function Timesheet() {
  const currentUser = getCurrentUser();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());

  // Generate year options (current year and 2 years back)
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Generate month options
  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const { data: timesheetsData, isLoading, error } = useQuery({
    queryKey: ['timesheets-by-project', selectedMonth, selectedYear],
    queryFn: () => tasksApi.getTimesheetsByProject({ 
      month: selectedMonth, 
      year: selectedYear 
    }),
  });

  const timesheets = timesheetsData?.data || [];

  const toggleProject = (projectId: number) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const totalHours = timesheets.reduce((sum: number, project: any) => 
    sum + parseFloat(project.total_hours || 0), 0
  );

  const totalEntries = timesheets.reduce((sum: number, project: any) => 
    sum + (project.entry_count || 0), 0
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-500">Error loading timesheets: {(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Clock className="h-8 w-8 text-primary" />
          Timesheet
        </h1>
        <p className="text-muted-foreground">
          View hours worked by project for the selected month
        </p>
      </div>

      {/* Filters */}
      <Card className="glass-card shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Filter by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="glass-card shadow-lg border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <Label className="text-muted-foreground text-sm">Total Hours</Label>
              <div className="text-3xl font-bold text-primary mt-1">
                {totalHours.toFixed(2)}
              </div>
            </div>
            <div className="text-center">
              <Label className="text-muted-foreground text-sm">Total Projects</Label>
              <div className="text-3xl font-bold text-primary mt-1">
                {timesheets.length}
              </div>
            </div>
            <div className="text-center">
              <Label className="text-muted-foreground text-sm">Total Entries</Label>
              <div className="text-3xl font-bold text-primary mt-1">
                {totalEntries}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Timesheets by Project */}
      {!isLoading && timesheets.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No timesheet entries found for {monthOptions.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && timesheets.length > 0 && (
        <div className="space-y-4">
          {timesheets.map((project: any) => {
            const isExpanded = expandedProjects.has(project.project_id);
            const projectHours = parseFloat(project.total_hours || 0);

            return (
              <Card 
                key={project.project_id}
                className="glass-card shadow-md border-0 bg-gradient-to-br from-card via-card/95 to-muted/20 hover:shadow-lg transition-shadow"
              >
                <CardHeader 
                  className="cursor-pointer"
                  onClick={() => toggleProject(project.project_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FolderKanban className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{project.project_name}</CardTitle>
                        {project.project_code && (
                          <CardDescription className="mt-1">
                            Code: {project.project_code}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {projectHours.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">hours</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">
                          {project.entry_count || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">entries</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleProject(project.project_id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && project.entries && project.entries.length > 0 && (
                  <CardContent>
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm font-semibold mb-3 block">Timesheet Entries</Label>
                      <div className="space-y-2">
                        {project.entries.map((entry: any) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50 hover:bg-muted/70 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{entry.task_title}</span>
                                {entry.task_code && (
                                  <span className="text-xs text-muted-foreground">
                                    ({entry.task_code})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>
                                  {new Date(entry.date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                                <span>{entry.employee_name}</span>
                                {entry.emp_code && (
                                  <span>({entry.emp_code})</span>
                                )}
                              </div>
                              {entry.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {entry.notes}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-lg font-semibold text-primary">
                                {parseFloat(entry.hours || 0).toFixed(2)}
                              </div>
                              <div className="text-xs text-muted-foreground">hours</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

