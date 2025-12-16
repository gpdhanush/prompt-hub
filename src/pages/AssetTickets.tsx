import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  Ticket, 
  Loader2, 
  Search, 
  Filter,
  Eye,
  MoreHorizontal,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { assetsApi } from "@/features/assets/api";
import { format } from "date-fns";
import { getCurrentUser } from "@/lib/auth";

export default function AssetTickets() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Get current user to check if they're admin
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', 'tickets', page, limit, statusFilter, isAdmin, searchQuery],
    queryFn: () => assetsApi.getTickets({
      page,
      limit,
      status: statusFilter || undefined,
      my_tickets: isAdmin ? 'false' : 'true', // Non-admins see only their tickets
    }),
    retry: 1,
  });

  const tickets = data?.data || [];
  const total = data?.total || 0;

  // Client-side filtering for search and priority
  const filteredTickets = tickets.filter((ticket: any) => {
    const matchesSearch = !searchQuery || 
      ticket.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.employee_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = !priorityFilter || ticket.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Ticket className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'closed':
      case 'resolved':
        return 'success';
      case 'open':
        return 'info';
      case 'rejected':
        return 'error';
      case 'in_progress':
      case 'approved':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      case 'low':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Ticket className="h-6 w-6 text-primary" />
            </div>
            Asset Tickets
          </h1>
          <p className="text-muted-foreground mt-2">
            {isAdmin ? 'Manage all asset-related tickets and requests' : 'View your asset-related tickets and requests'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/support/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ticket number, subject, or employee..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select 
              value={statusFilter || "all"} 
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={priorityFilter || "all"} 
              onValueChange={(value) => {
                setPriorityFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tickets ({filteredTickets.length})</CardTitle>
              <CardDescription>List of all asset-related tickets</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <p className="font-medium text-destructive">Error loading tickets</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as any)?.message || 'Failed to fetch tickets. Please check your permissions.'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="mx-auto h-16 w-16 mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No tickets found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter || priorityFilter
                  ? 'Try adjusting your filters'
                  : 'No tickets available'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Ticket #</TableHead>
                    <TableHead>Subject</TableHead>
                    {isAdmin && <TableHead>Employee</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket: any) => (
                    <TableRow
                      key={ticket.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/it-assets/tickets/${ticket.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ticket.status)}
                          <span className="font-mono text-sm">{ticket.ticket_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{ticket.subject}</p>
                          {ticket.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {ticket.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{ticket.employee_name}</p>
                              <p className="text-xs text-muted-foreground">{ticket.emp_code}</p>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {ticket.ticket_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={getPriorityVariant(ticket.priority)}>
                          {ticket.priority}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(ticket.status)}
                          <StatusBadge variant={getStatusVariant(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
                          </StatusBadge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {ticket.created_at
                            ? format(new Date(ticket.created_at), "MMM dd, yyyy")
                            : "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/it-assets/tickets/${ticket.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            {isAdmin && ticket.status === 'open' && (
                              <>
                                <DropdownMenuItem 
                                  onClick={() => navigate(`/it-assets/tickets/${ticket.id}?action=approve`)}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => navigate(`/it-assets/tickets/${ticket.id}?action=reject`)}
                                  className="text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} tickets
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
