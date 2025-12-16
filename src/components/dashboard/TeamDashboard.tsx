import { memo, useMemo, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CheckSquare,
  Bug,
  Receipt,
  Activity,
  MessageSquare,
  Loader2,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { employeesApi } from "@/features/employees/api";
import { tasksApi } from "@/features/tasks/api";
import { bugsApi } from "@/features/bugs/api";
import { reimbursementsApi } from "@/features/reimbursements/api";
import { assetsApi } from "@/features/assets/api";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";
import ReminderCalendar from "./ReminderCalendar";

interface TeamDashboardProps {
  currencySymbol: string;
  formatCurrency: (amount: number) => string;
  formatTimeAgo: (date: string) => string;
}

const TeamDashboard = memo(function TeamDashboard({
  currencySymbol,
  formatCurrency,
  formatTimeAgo,
}: TeamDashboardProps) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [expandedTickets, setExpandedTickets] = useState<Set<number>>(new Set());

  // Fetch current user's employee record to get team members
  const { data: currentEmployeeData } = useQuery({
    queryKey: ["current-employee", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const result = await employeesApi.getByUserId(currentUser.id);
      return result?.data || null;
    },
    enabled: !!currentUser?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch team members
  const { data: teamMembersData, isLoading: isLoadingTeamMembers } = useQuery({
    queryKey: ["team-members", currentEmployeeData?.id],
    queryFn: async () => {
      if (!currentEmployeeData?.id) return { data: [] };
      const allEmployees = await employeesApi.getAll({ page: 1, limit: 1000 });
      const teamMembers =
        allEmployees?.data?.filter(
          (emp: any) => emp.team_lead_id === currentEmployeeData.id
        ) || [];
      return { data: teamMembers };
    },
    enabled: !!currentEmployeeData?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const teamMembers = useMemo(
    () => teamMembersData?.data || [],
    [teamMembersData]
  );
  const teamMemberUserIds = useMemo(
    () => teamMembers.map((emp: any) => emp.user_id).filter(Boolean),
    [teamMembers]
  );

  // Fetch recent team activity (tasks, bugs)
  const { data: teamTasksData } = useQuery({
    queryKey: ["team-tasks", teamMemberUserIds],
    queryFn: async () => {
      if (teamMemberUserIds.length === 0) return { data: [] };
      const allTasks = await tasksApi.getAll({ page: 1, limit: 10 });
      const teamTasks =
        allTasks?.data?.filter(
          (task: any) =>
            teamMemberUserIds.includes(task.assigned_to) ||
            teamMemberUserIds.includes(task.created_by)
        ) || [];
      return { data: teamTasks.slice(0, 5) };
    },
    enabled: teamMemberUserIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: teamBugsData } = useQuery({
    queryKey: ["team-bugs", teamMemberUserIds],
    queryFn: async () => {
      if (teamMemberUserIds.length === 0) return { data: [] };
      const allBugs = await bugsApi.getAll({ page: 1, limit: 10 });
      const teamBugs =
        allBugs?.data?.filter(
          (bug: any) =>
            teamMemberUserIds.includes(bug.assigned_to) ||
            teamMemberUserIds.includes(bug.created_by)
        ) || [];
      return { data: teamBugs.slice(0, 5) };
    },
    enabled: teamMemberUserIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch team claims (reimbursements)
  const { data: teamClaimsData, isLoading: isLoadingTeamClaims } = useQuery({
    queryKey: ["team-claims", currentEmployeeData?.id],
    queryFn: () => reimbursementsApi.getAll({ page: 1, limit: 10 }),
    enabled: !!currentEmployeeData?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch support tickets (without comments initially to avoid N+1)
  const teamMemberEmployeeIds = useMemo(
    () => teamMembers.map((emp: any) => emp.id).filter(Boolean),
    [teamMembers]
  );

  const { data: supportTicketsData } = useQuery({
    queryKey: ["support-tickets", teamMemberEmployeeIds],
    queryFn: async () => {
      if (teamMemberEmployeeIds.length === 0) return { data: [] };
      const allTickets = await assetsApi.getTickets({ page: 1, limit: 20 });
      const teamTickets =
        allTickets?.data?.filter((ticket: any) =>
          teamMemberEmployeeIds.includes(ticket.employee_id)
        ) || [];
      return { data: teamTickets.slice(0, 5) };
    },
    enabled: teamMemberEmployeeIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Fetch comments for a specific ticket (lazy loading)
  const fetchTicketComments = useCallback(
    async (ticketId: number) => {
      try {
        const comments = await assetsApi.getTicketComments(ticketId);
        return comments?.data?.slice(-3) || [];
      } catch {
        return [];
      }
    },
    []
  );

  const handleTicketClick = useCallback(
    async (ticketId: number) => {
      if (!expandedTickets.has(ticketId)) {
        setExpandedTickets((prev) => new Set(prev).add(ticketId));
      }
      navigate(`/it-assets/tickets/${ticketId}`);
    },
    [expandedTickets, navigate]
  );

  const teamTasks = useMemo(() => teamTasksData?.data || [], [teamTasksData]);
  const teamBugs = useMemo(() => teamBugsData?.data || [], [teamBugsData]);
  const teamClaims = useMemo(() => teamClaimsData?.data || [], [teamClaimsData]);
  const supportTickets = useMemo(
    () => supportTicketsData?.data || [],
    [supportTicketsData]
  );

  return (
    <>
      {/* Team Members & Calendar - Side by Side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Team Members */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                My Team ({teamMembers.length})
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/employees")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTeamMembers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No team members assigned</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.slice(0, 6).map((member: any) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/employees/${member.id}`)}
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      {member.profile_photo_url ? (
                        <img
                          src={member.profile_photo_url}
                          alt={member.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.role} • {member.position || "Employee"}
                      </p>
                    </div>
                    <StatusBadge
                      variant={
                        member.status === "Active" ? "success" : "neutral"
                      }
                      className="text-xs"
                    >
                      {member.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar for Reminders */}
        <ReminderCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
        />
      </div>

      {/* Recent Activity & Claims - Side by Side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Team Activity */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Team Activity
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/tasks")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Recent Tasks */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Recent Tasks
                </p>
                {teamTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No recent tasks
                  </p>
                ) : (
                  <div className="space-y-2">
                    {teamTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/tasks?task=${task.id}`)}
                      >
                        <CheckSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.assigned_to_name || "Unassigned"} •{" "}
                            {formatTimeAgo(task.created_at)}
                          </p>
                        </div>
                        <StatusBadge
                          variant={
                            task.status === "Completed"
                              ? "success"
                              : task.status === "In Progress"
                              ? "info"
                              : "neutral"
                          }
                          className="text-xs"
                        >
                          {task.status}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Bugs */}
              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Recent Bugs
                </p>
                {teamBugs.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    No recent bugs
                  </p>
                ) : (
                  <div className="space-y-2">
                    {teamBugs.map((bug: any) => (
                      <div
                        key={bug.id}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/bugs?bug=${bug.id}`)}
                      >
                        <Bug className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {bug.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {bug.assigned_to_name || "Unassigned"} •{" "}
                            {formatTimeAgo(bug.created_at)}
                          </p>
                        </div>
                        <StatusBadge
                          variant={
                            bug.status === "Resolved"
                              ? "success"
                              : bug.status === "In Progress"
                              ? "info"
                              : "neutral"
                          }
                          className="text-xs"
                        >
                          {bug.status}
                        </StatusBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Claims */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Team Claims
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/reimbursements")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingTeamClaims ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : teamClaims.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No claims from team members</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamClaims.slice(0, 5).map((claim: any) => (
                  <div
                    key={claim.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/reimbursements/${claim.id}`)}
                  >
                    <div className="p-1.5 rounded-md bg-green-50 dark:bg-green-950/20">
                      <Receipt className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium truncate">
                          {claim.employee_name || "Unknown"}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {claim.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-1">
                        {claim.category} • {formatCurrency(claim.amount || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(claim.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Support Replies - Only show tickets, comments loaded on demand */}
      {supportTickets.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Support Tickets
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/it-assets/tickets")}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {supportTickets.map((ticket: any) => (
                <div
                  key={ticket.id}
                  className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleTicketClick(ticket.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {ticket.subject || `Ticket #${ticket.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {ticket.employee_name || "Team Member"} •{" "}
                        {formatTimeAgo(ticket.created_at)}
                      </p>
                    </div>
                    <StatusBadge
                      variant={
                        ticket.status === "Resolved"
                          ? "success"
                          : ticket.status === "In Progress"
                          ? "info"
                          : "neutral"
                      }
                      className="text-xs ml-2"
                    >
                      {ticket.status}
                    </StatusBadge>
                  </div>
                  {/* Comments are now loaded on-demand when user clicks to view ticket */}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
});

TeamDashboard.displayName = "TeamDashboard";

export default TeamDashboard;

