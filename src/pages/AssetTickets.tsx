import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ticket, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { assetsApi } from "@/lib/api";
import { format } from "date-fns";

export default function AssetTickets() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data, isLoading, error } = useQuery({
    queryKey: ['assets', 'tickets', page, limit, statusFilter],
    queryFn: () => assetsApi.getTickets({
      page,
      limit,
      status: statusFilter || undefined,
    }),
    retry: 1,
  });

  const tickets = data?.data || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asset Tickets</h1>
        <p className="text-muted-foreground mt-2">Manage all asset-related tickets and requests</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Select value={statusFilter || "all"} onValueChange={(value) => {
            setStatusFilter(value === "all" ? "" : value);
            setPage(1);
          }}>
            <SelectTrigger className="w-[180px]">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Tickets ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-destructive">
              <p className="font-medium">Error loading tickets</p>
              <p className="text-sm text-muted-foreground mt-2">
                {(error as any)?.message || 'Failed to fetch tickets. Please check your permissions.'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ticket className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No tickets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket: any) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                    <TableCell>
                      {ticket.employee_name} ({ticket.emp_code})
                    </TableCell>
                    <TableCell>{ticket.ticket_type.replace('_', ' ')}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={
                          ticket.priority === "urgent"
                            ? "error"
                            : ticket.priority === "high"
                            ? "warning"
                            : "info"
                        }
                      >
                        {ticket.priority}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={
                          ticket.status === "closed"
                            ? "success"
                            : ticket.status === "open"
                            ? "info"
                            : ticket.status === "rejected"
                            ? "error"
                            : "warning"
                        }
                      >
                        {ticket.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {ticket.created_at
                        ? format(new Date(ticket.created_at), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
