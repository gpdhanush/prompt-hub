import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, Calendar, FolderKanban, ChevronDown, ChevronUp, Loader2, TrendingUp, Users, FileText, Sparkles, Bug, CheckSquare2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { tasksApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { PageTitle } from "@/components/ui/page-title";

export default function Timesheet() {
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const isSuperAdmin = userRole === 'Super Admin';
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

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

  const { data: todaySummaryData } = useQuery({
    queryKey: ['timesheets-today-summary'],
    queryFn: () => tasksApi.getTodaySummary(),
  });

  const timesheets = timesheetsData?.data || [];
  const todaySummary = todaySummaryData?.data || {
    total_hours: 0,
    projects_count: 0,
    tasks_count: 0,
    bugs_count: 0,
    entries: []
  };

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

  const toggleDay = (dayKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dayKey)) {
        newSet.delete(dayKey);
      } else {
        newSet.add(dayKey);
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

  const totalDays = timesheets.reduce((sum: number, project: any) => 
    sum + (project.dailySummary?.length || 0), 0
  );

  // Group entries by date for each project
  const groupEntriesByDate = (entries: any[]) => {
    const grouped: Record<string, any[]> = {};
    entries.forEach(entry => {
      const dateKey = entry.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });
    return grouped;
  };

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageTitle
          title="Timesheet"
          icon={Clock}
          description={isSuperAdmin 
            ? "View all timesheet entries across all projects and employees"
            : "Track your daily work hours by project"}
        />
      </div>

      {/* Filters */}
      <Card className="border-2 border-primary/10 shadow-lg bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Calendar className="h-5 w-5 text-primary" />
            Filter by Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-semibold">Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger id="year" className="h-11">
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
              <Label htmlFor="month" className="text-sm font-semibold">Month</Label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger id="month" className="h-11">
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

      {/* Today's Summary */}
      {todaySummary && (todaySummary.projects_count > 0 || todaySummary.tasks_count > 0 || todaySummary.bugs_count > 0) && (
        <Card className="border-2 border-primary/30 shadow-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              Today's Work Summary
            </CardTitle>
            <CardDescription>Your work activity for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {parseFloat(todaySummary.total_hours || 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Total Hours</div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {todaySummary.projects_count || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Projects</div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {todaySummary.tasks_count || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Tasks</div>
              </div>
              <div className="text-center p-4 bg-background/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {todaySummary.bugs_count || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Bugs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Total Hours</Label>
                <div className="text-3xl font-bold text-primary mt-2">
                  {totalHours.toFixed(2)}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-primary/20">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/20 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Projects</Label>
                <div className="text-3xl font-bold text-blue-600 mt-2">
                  {timesheets.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/20">
                <FolderKanban className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/20 shadow-lg bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Work Days</Label>
                <div className="text-3xl font-bold text-green-600 mt-2">
                  {totalDays}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-green-500/20">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-500/20 shadow-lg bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">Entries</Label>
                <div className="text-3xl font-bold text-purple-600 mt-2">
                  {totalEntries}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/20">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Timesheets by Project */}
      {!isLoading && timesheets.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="p-4 rounded-full bg-muted/50 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Clock className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">No Timesheet Entries</p>
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
            const dailySummary = project.dailySummary || [];
            const entriesByDate = groupEntriesByDate(project.entries || []);

            return (
              <Card 
                key={project.project_id}
                className="border-2 border-border/50 shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card via-card/95 to-muted/10"
              >
                <CardHeader 
                  className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg"
                  onClick={() => toggleProject(project.project_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                        <FolderKanban className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1">{project.project_name}</CardTitle>
                        {project.project_code && (
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {project.project_code}
                            </Badge>
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-3xl font-bold text-primary">
                          {projectHours.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">Total Hours</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-semibold text-blue-600">
                          {project.task_count || 0}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">Tasks</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-semibold text-red-600">
                          {project.bug_count || 0}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">Bugs</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-semibold text-foreground">
                          {dailySummary.length}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">Days</div>
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
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-4">
                    {/* Daily Summary */}
                    {dailySummary.length > 0 && (
                      <div className="space-y-3 mb-6">
                        <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Daily Hours Breakdown
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {dailySummary.map((day: any) => {
                            const dayKey = `${project.project_id}-${day.date}`;
                            const isDayExpanded = expandedDays.has(dayKey);
                            const dayEntries = entriesByDate[day.date] || [];
                            const dailyHours = parseFloat(day.daily_hours || 0);

                            return (
                              <Card 
                                key={day.date}
                                className="border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                                onClick={() => toggleDay(dayKey)}
                              >
                                <CardContent className="pt-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="text-sm font-semibold text-foreground">
                                        {new Date(day.date).toLocaleDateString('en-US', {
                                          weekday: 'short',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {day.daily_entries} {day.daily_entries === 1 ? 'entry' : 'entries'}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-xl font-bold text-primary">
                                        {dailyHours.toFixed(2)}
                                      </div>
                                      <div className="text-xs text-muted-foreground">hrs</div>
                                    </div>
                                  </div>
                                  
                                  {isDayExpanded && dayEntries.length > 0 && (
                                    <div className="mt-3 pt-3 border-t space-y-2">
                                      {dayEntries.map((entry: any) => (
                                        <div
                                          key={entry.id}
                                          className="flex items-start justify-between p-2 bg-muted/30 rounded-lg text-xs"
                                        >
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {entry.bug_code && (
                                                <div className="flex items-center gap-1">
                                                  <Bug className="h-3 w-3 text-red-500" />
                                                  <span className="font-medium text-red-600">{entry.bug_code}</span>
                                                  {entry.bug_title && <span className="text-muted-foreground">- {entry.bug_title}</span>}
                                                </div>
                                              )}
                                              {entry.task_title && (
                                                <div className="flex items-center gap-1">
                                                  <CheckSquare2 className="h-3 w-3 text-blue-500" />
                                                  <span className="font-medium text-blue-600">{entry.task_title}</span>
                                                  {entry.task_code && <Badge variant="outline" className="text-xs">{entry.task_code}</Badge>}
                                                </div>
                                              )}
                                            </div>
                                            {isSuperAdmin && (
                                              <div className="text-muted-foreground mt-0.5">
                                                {entry.employee_name}
                                                {entry.emp_code && ` (${entry.emp_code})`}
                                              </div>
                                            )}
                                            {entry.notes && (
                                              <div className="text-muted-foreground mt-1 italic text-[10px]">
                                                {entry.notes}
                                              </div>
                                            )}
                                          </div>
                                          <div className="text-right ml-2">
                                            <div className="font-semibold text-primary">
                                              {parseFloat(entry.hours || 0).toFixed(2)}h
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tasks Summary */}
                    {project.tasks && project.tasks.length > 0 && (
                      <div className="space-y-2 pt-4 border-t mb-4">
                        <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
                          <CheckSquare2 className="h-4 w-4 text-blue-500" />
                          Tasks Summary
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {project.tasks.map((task: any) => (
                            <Card key={task.task_id} className="border border-blue-200/50">
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="font-semibold text-sm">{task.task_title}</div>
                                    {task.task_code && (
                                      <Badge variant="outline" className="text-xs mt-1">{task.task_code}</Badge>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {task.bug_count || 0} {task.bug_count === 1 ? 'bug' : 'bugs'} • {task.task_entries || 0} {task.task_entries === 1 ? 'entry' : 'entries'}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-blue-600">
                                      {parseFloat(task.task_hours || 0).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">hrs</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* All Entries List */}
                    {project.entries && project.entries.length > 0 && (
                      <div className="space-y-2 pt-4 border-t">
                        <Label className="text-sm font-semibold flex items-center gap-2 mb-3">
                          <FileText className="h-4 w-4 text-primary" />
                          All Timesheet Entries
                        </Label>
                        <div className="space-y-2">
                          {project.entries.map((entry: any) => (
                            <div
                              key={entry.id}
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 via-muted/30 to-transparent rounded-lg border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {entry.bug_code && (
                                    <div className="flex items-center gap-1">
                                      <Bug className="h-4 w-4 text-red-500" />
                                      <span className="font-semibold text-sm text-red-600">{entry.bug_code}</span>
                                      {entry.bug_title && <span className="text-sm text-muted-foreground">- {entry.bug_title}</span>}
                                    </div>
                                  )}
                                  {entry.task_title && (
                                    <div className="flex items-center gap-1">
                                      <CheckSquare2 className="h-4 w-4 text-blue-500" />
                                      <span className="font-semibold text-sm">{entry.task_title}</span>
                                      {entry.task_code && (
                                        <Badge variant="outline" className="text-xs">
                                          {entry.task_code}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(entry.date).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                  {isSuperAdmin && (
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {entry.employee_name}
                                      {entry.emp_code && ` (${entry.emp_code})`}
                                    </span>
                                  )}
                                </div>
                                {entry.notes && (
                                  <p className="text-xs text-muted-foreground mt-2 italic bg-background/50 p-2 rounded">
                                    {entry.notes}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-2xl font-bold text-primary">
                                  {parseFloat(entry.hours || 0).toFixed(2)}
                                </div>
                                <div className="text-xs text-muted-foreground font-medium">hours</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
