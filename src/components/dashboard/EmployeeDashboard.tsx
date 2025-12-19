import { memo, useMemo, useCallback, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FolderKanban,
  CheckSquare,
  Bug,
  Loader2,
  User,
  X,
  Calendar,
  Gift,
  Clock,
  Timer,
  Play,
  Pause,
  Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { employeesApi } from "@/features/employees/api";
import { tasksApi } from "@/features/tasks/api";
import { bugsApi } from "@/features/bugs/api";
import { projectsApi } from "@/features/projects/api";
import { leavesApi } from "@/features/leaves/api";
import { holidaysApi } from "@/features/holidays/api";
import { getCurrentUser } from "@/lib/auth";
import { getProfilePhotoUrl } from "@/lib/imageUtils";
import { format } from "date-fns";

interface EmployeeDashboardProps {}

const EmployeeDashboard = memo(function EmployeeDashboard({}: EmployeeDashboardProps) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id;

  // State for leave notification
  const [dismissedLeaveNotifications, setDismissedLeaveNotifications] = useState<Set<number>>(
    new Set(JSON.parse(localStorage.getItem("dismissedLeaveNotifications") || "[]"))
  );
  const [showLeaveNotification, setShowLeaveNotification] = useState(true);

  // Fetch current employee record
  const { data: currentEmployeeData } = useQuery({
    queryKey: ["current-employee", currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const result = await employeesApi.getByUserId(currentUserId);
      return result?.data || null;
    },
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const currentEmployeeId = currentEmployeeData?.id;

  // Fetch total employees count
  const { data: employeesData } = useQuery({
    queryKey: ["employees-count"],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1 }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch current assigned projects
  const { data: projectsData } = useQuery({
    queryKey: ["my-projects", currentUserId],
    queryFn: () => projectsApi.getAll({ page: 1, limit: 100, my_projects: currentUserId }),
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch current assigned tasks
  const { data: tasksData } = useQuery({
    queryKey: ["my-tasks", currentUserId],
    queryFn: () => tasksApi.getAll({ page: 1, limit: 100, my_tasks: currentUserId }),
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch current assigned bugs
  const { data: bugsData } = useQuery({
    queryKey: ["my-bugs", currentUserId],
    queryFn: () => bugsApi.getAll({ page: 1, limit: 100, my_bugs: currentUserId }),
    enabled: !!currentUserId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch approved leaves for notification
  const { data: leavesData } = useQuery({
    queryKey: ["my-leaves", currentEmployeeId],
    queryFn: () => leavesApi.getAll({ page: 1, limit: 100 }),
    enabled: !!currentEmployeeId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Determine if current user is level 2 employee
  const isLevel2Employee = useMemo(() => {
    const level1Roles = ['Super Admin', 'Admin', 'Team Lead', 'Team Leader', 'Manager', 'HR Manager', 'Accounts Manager', 'Office Manager'];
    return currentUser?.role && !level1Roles.includes(currentUser.role);
  }, [currentUser]);

  // Fetch team members - for level 2: show level 1 users and their below users
  const { data: teamMembersData } = useQuery({
    queryKey: ["my-team-members", currentEmployeeData?.team_lead_id, currentEmployeeId, isLevel2Employee],
    queryFn: async () => {
      if (!currentEmployeeData || !currentEmployeeId) return { data: [] };
      
      try {
        const allEmployees = await employeesApi.getAll({ page: 1, limit: 1000, include_all: 'true' });
        const employees = allEmployees?.data || [];
        
        let teamMembers: any[] = [];
        
        if (isLevel2Employee) {
          // For level 2: show all employees with the same team lead (peers and level 1 employees)
          const teamLeadId = currentEmployeeData.team_lead_id || currentEmployeeData.team_lead_emp_id;
          
          if (teamLeadId) {
            // Get the team lead employee
            const teamLeadEmployee = employees.find((emp: any) => emp.id === teamLeadId);
            
            // Get all employees with the same team lead (peers and level 1 employees)
            const otherTeamMembers = employees.filter((emp: any) => {
              const empTeamLeadId = emp.team_lead_id || emp.team_lead_emp_id;
              return (
                empTeamLeadId === teamLeadId &&
                emp.id !== currentEmployeeId &&
                emp.id !== teamLeadId &&
                emp.id
              );
            });
            
            // Put team lead first, then others
            if (teamLeadEmployee) {
              teamMembers = [teamLeadEmployee, ...otherTeamMembers];
            } else {
              teamMembers = otherTeamMembers;
            }
          }
        } else {
          // For level 1: show colleagues (same team lead)
          const teamLeadId = currentEmployeeData.team_lead_id || currentEmployeeData.team_lead_emp_id;
          
          if (teamLeadId) {
            // Get the team lead employee
            const teamLeadEmployee = employees.find((emp: any) => emp.id === teamLeadId);
            
            const otherTeamMembers = employees.filter((emp: any) => {
              const empTeamLeadId = emp.team_lead_id || emp.team_lead_emp_id;
              return (
                empTeamLeadId === teamLeadId &&
                emp.id !== currentEmployeeId &&
                emp.id !== teamLeadId &&
                emp.id
              );
            });
            
            // Put team lead first, then others
            if (teamLeadEmployee) {
              teamMembers = [teamLeadEmployee, ...otherTeamMembers];
            } else {
              teamMembers = otherTeamMembers;
            }
          }
        }
        
        return { data: teamMembers };
      } catch (error) {
        console.error("Error fetching team members:", error);
        return { data: [] };
      }
    },
    enabled: !!currentEmployeeData && !!currentEmployeeId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch all employees for birthday calculation
  const { data: allEmployeesData } = useQuery({
    queryKey: ["all-employees-birthday"],
    queryFn: () => employeesApi.getAll({ page: 1, limit: 1000, include_all: 'true' }),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 120, // 2 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch holidays
  const { data: holidaysData } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => holidaysApi.getAll().catch(() => ({ data: [] })),
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const totalEmployees = employeesData?.pagination?.total || 0;
  const myProjects = projectsData?.data || [];
  const myTasks = tasksData?.data || [];
  const myBugs = bugsData?.data || [];
  const allLeaves = leavesData?.data || [];
  const teamMembers = teamMembersData?.data || [];
  const allEmployees = allEmployeesData?.data || [];
  const holidays = holidaysData?.data || [];

  // Get approved leave notification
  const approvedLeave = useMemo(() => {
    if (!currentEmployeeId) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allLeaves.find((leave: any) => {
      if (leave.employee_record_id !== currentEmployeeId) return false;
      if (leave.status !== "Approved") return false;
      if (dismissedLeaveNotifications.has(leave.id)) return false;

      const startDate = new Date(leave.start_date);
      startDate.setHours(0, 0, 0, 0);

      // Show if approved and start date hasn't passed yet
      return startDate >= today;
    });
  }, [allLeaves, currentEmployeeId, dismissedLeaveNotifications]);

  // Get team member birthdays for next 30 days
  const upcomingBirthdays = useMemo(() => {
    if (!allEmployees.length || !teamMembers.length) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Get team member IDs for faster lookup (include all team members)
    const teamMemberIds = new Set(teamMembers.map((tm: any) => tm.id));

    // Filter team members from all employees - check both by ID and ensure date_of_birth exists
    const myTeam = allEmployees.filter((emp: any) => {
      const isTeamMember = teamMemberIds.has(emp.id);
      const hasBirthday = emp.date_of_birth && emp.date_of_birth !== null && emp.date_of_birth !== '';
      return isTeamMember && hasBirthday;
    });

    if (myTeam.length === 0) {
      return [];
    }

    const birthdaysWithDates = myTeam
      .map((emp: any) => {
        try {
          const dob = new Date(emp.date_of_birth);
          if (isNaN(dob.getTime())) return null;

          const dobMonth = dob.getMonth();
          const dobDay = dob.getDate();

          // Calculate this year's birthday
          const thisYearBirthday = new Date(currentYear, dobMonth, dobDay);
          thisYearBirthday.setHours(0, 0, 0, 0);
          
          // Calculate next year's birthday
          const nextYearBirthday = new Date(currentYear + 1, dobMonth, dobDay);
          nextYearBirthday.setHours(0, 0, 0, 0);

          // Determine which birthday is next
          let nextBirthdayDate = thisYearBirthday;
          if (thisYearBirthday < today) {
            nextBirthdayDate = nextYearBirthday;
          }

          // Also include birthdays in the current month (all of them, not just upcoming)
          const isThisMonth = dobMonth === currentMonth;
          const isUpcomingThisMonth = isThisMonth && dobDay >= currentDay;
          const isPastThisMonth = isThisMonth && dobDay < currentDay;

          const daysUntil = Math.ceil(
            (nextBirthdayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          // Calculate days until birthday (for current month or future)
          let daysUntilBirthday = daysUntil;
          let birthdayDateToShow = nextBirthdayDate;
          
          if (isThisMonth) {
            if (isUpcomingThisMonth) {
              // Upcoming birthday this month
              daysUntilBirthday = dobDay - currentDay;
              birthdayDateToShow = thisYearBirthday;
            } else {
              // Past birthday this month, show next year's
              daysUntilBirthday = Math.ceil(
                (nextYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );
              birthdayDateToShow = nextYearBirthday;
            }
          }
          
          // Include birthdays within the next 30 days (0 to 30 days)
          if (daysUntilBirthday >= 0 && daysUntilBirthday <= 30) {
            return {
              employee: emp,
              birthdayDate: birthdayDateToShow,
              daysUntil: daysUntilBirthday,
            };
          }

          return null;
        } catch (error) {
          console.error("Error processing birthday for employee:", emp.id, error);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        // Sort by days until (ascending - closest first)
        return a.daysUntil - b.daysUntil;
      });

    return birthdaysWithDates;
  }, [allEmployees, teamMembers]);

  // Get next holiday
  const nextHoliday = useMemo(() => {
    if (!holidays.length) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingHolidays = holidays
      .filter((holiday: any) => {
        const holidayDate = new Date(holiday.date);
        holidayDate.setHours(0, 0, 0, 0);
        return holidayDate >= today;
      })
      .sort((a: any, b: any) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

    return upcomingHolidays.length > 0 ? upcomingHolidays[0] : null;
  }, [holidays]);

  // Handle dismiss leave notification
  const handleDismissLeaveNotification = useCallback(
    (leaveId: number) => {
      const newDismissed = new Set(dismissedLeaveNotifications);
      newDismissed.add(leaveId);
      setDismissedLeaveNotifications(newDismissed);
      localStorage.setItem(
        "dismissedLeaveNotifications",
        JSON.stringify(Array.from(newDismissed))
      );
      setShowLeaveNotification(false);
    },
    [dismissedLeaveNotifications]
  );

  // Check if approved leave start date has passed
  useEffect(() => {
    if (approvedLeave) {
      const startDate = new Date(approvedLeave.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);

      if (startDate < today) {
        handleDismissLeaveNotification(approvedLeave.id);
      }
    }
  }, [approvedLeave, handleDismissLeaveNotification]);

  // Format leave date
  const formatLeaveDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
        ? "rd"
        : "th";
    return `${day}${suffix} ${format(date, "MMMM yyyy")}`;
  };

  return (
    <>
      {/* Leave Approval Notification */}
      {approvedLeave && showLeaveNotification && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Your Leave Request on "{formatLeaveDate(approvedLeave.start_date)}" has been
                Approved!!!
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900"
                onClick={() => handleDismissLeaveNotification(approvedLeave.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards - Similar to Reimbursement style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-500/20 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Total Employees
                </Label>
                <div className="text-3xl font-bold text-blue-600 mt-2">{totalEmployees}</div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-500/20 shadow-lg bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Current Assigned Project
                </Label>
                <div className="text-3xl font-bold text-purple-600 mt-2">
                  {myProjects.length}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/20">
                <FolderKanban className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-yellow-500/20 shadow-lg bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Current Assigned Tasks
                </Label>
                <div className="text-3xl font-bold text-yellow-600 mt-2">{myTasks.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/20">
                <CheckSquare className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-500/20 shadow-lg bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent hover:shadow-xl transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground text-sm font-medium">
                  Current Assigned Bugs
                </Label>
                <div className="text-3xl font-bold text-red-600 mt-2">{myBugs.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-red-500/20">
                <Bug className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Team Members & Birthday & Holiday - Side by Side */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* My Team Members */}
        <Card className="glass-card border-2 border-blue-500/20 shadow-lg bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent hover:shadow-xl transition-all">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              My Team Members ({teamMembers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="p-3 rounded-xl bg-blue-500/10 w-fit mx-auto mb-3">
                  <Users className="h-8 w-8 text-blue-600/50" />
                </div>
                <p className="text-sm">No team members found</p>
              </div>
            ) : (
              <div className="space-y-0 max-h-[400px] overflow-y-auto">
                {teamMembers.map((member: any, index: number) => (
                  <div key={member.id}>
                    <div
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/employees/${member.id}/view`)}
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {member.profile_photo_url ? (
                          <img
                            src={getProfilePhotoUrl(member.profile_photo_url)}
                            alt={member.name}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <User className={`h-5 w-5 text-muted-foreground ${member.profile_photo_url ? 'hidden' : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.role || "Employee"} {member.position ? `• ${member.position}` : ""}
                        </p>
                      </div>
                    </div>
                    {index < teamMembers.length - 1 && (
                      <div className="border-b border-border/30 mx-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Birthdays - Next 30 Days */}
        {upcomingBirthdays.length > 0 ? (
          <Card className="glass-card border-2 border-pink-500/20 shadow-lg bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent hover:shadow-xl transition-all">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-600" />
                Team Birthdays ({upcomingBirthdays.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0 max-h-[400px] overflow-y-auto">
                {upcomingBirthdays.map((birthday: any, index: number) => (
                  <div key={birthday.employee.id}>
                    <div
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/employees/${birthday.employee.id}/view`)}
                    >
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {birthday.employee.profile_photo_url ? (
                          <img
                            src={getProfilePhotoUrl(birthday.employee.profile_photo_url)}
                            alt={birthday.employee.name}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <User className={`h-5 w-5 text-muted-foreground ${birthday.employee.profile_photo_url ? 'hidden' : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{birthday.employee.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground truncate">
                            {format(birthday.birthdayDate, "dd MMM yyyy")}
                          </p>
                          {birthday.daysUntil !== undefined && (
                            <Badge 
                              variant={birthday.daysUntil === 0 ? "default" : "secondary"}
                              className={`text-xs ${birthday.daysUntil === 0 ? 'bg-pink-600 text-white' : ''}`}
                            >
                              {birthday.daysUntil === 0 
                                ? "Today" 
                                : birthday.daysUntil === 1 
                                ? "Tomorrow" 
                                : `${birthday.daysUntil}d`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {index < upcomingBirthdays.length - 1 && (
                      <div className="border-b border-border/30 mx-3" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          // Show placeholder if no birthday found but team members exist
          teamMembers.length > 0 && (
            <Card className="glass-card opacity-50 border-2 border-pink-500/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-muted-foreground" />
                  Team Birthdays
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center py-8 text-muted-foreground">
                <div className="p-3 rounded-xl bg-pink-500/10 w-fit mx-auto mb-3">
                  <Gift className="h-8 w-8 text-pink-600/50" />
                </div>
                <p className="text-sm">No upcoming birthdays in next 30 days</p>
              </CardContent>
            </Card>
          )
        )}

        {/* Next Holiday */}
        {nextHoliday && (() => {
          const holidayDate = new Date(nextHoliday.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          holidayDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((holidayDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          return (
            <Card className="glass-card border-2 border-orange-500/20 shadow-lg bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent hover:shadow-xl transition-all">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Next Holiday
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-foreground mb-1 truncate">
                        {nextHoliday.holiday_name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{format(holidayDate, "dd MMM yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="p-3 rounded-xl bg-orange-500/20">
                        <Calendar className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                  
                  {daysUntil >= 0 && (
                    <div className="pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          {daysUntil === 0 
                            ? "Today!" 
                            : daysUntil === 1 
                            ? "Tomorrow" 
                            : `${daysUntil} days away`}
                        </span>
                        <Badge 
                          variant={daysUntil === 0 ? "default" : "secondary"}
                          className={daysUntil === 0 ? "bg-orange-600 text-white" : ""}
                        >
                          {daysUntil === 0 ? "Today" : `${daysUntil}d`}
                        </Badge>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full mt-4 border-orange-500/30 hover:bg-orange-500/10 hover:border-orange-500/50"
                    onClick={() => navigate("/holidays")}
                  >
                    View All Holidays
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>
    </>
  );
});

EmployeeDashboard.displayName = "EmployeeDashboard";

export default EmployeeDashboard;

