import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Ticket, History, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { assetsApi } from "@/features/assets/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function MyITAssets() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("devices");

  // Get assigned assets
  const { data: assignedAssets, isLoading: isLoadingAssets, error: assetsError } = useQuery({
    queryKey: ['assets', 'my-assigned'],
    queryFn: () => assetsApi.getAll({ assigned_only: 'true' }),
    retry: 1,
  });

  // Get my tickets
  const { data: ticketsData, isLoading: isLoadingTickets, error: ticketsError } = useQuery({
    queryKey: ['assets', 'tickets', 'my'],
    queryFn: () => assetsApi.getTickets({ my_tickets: 'true' }),
    retry: 1,
  });

  // Get assignment history
  const { data: assignmentsData, isLoading: isLoadingHistory, error: historyError } = useQuery({
    queryKey: ['assets', 'assignments', 'my'],
    queryFn: () => assetsApi.getAssignments({ status: '' }),
    retry: 1,
  });

  const assets = assignedAssets?.data || [];
  const tickets = ticketsData?.data || [];
  const assignments = assignmentsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My IT Assets</h1>
          <p className="text-muted-foreground mt-2">View your assigned devices and manage requests</p>
        </div>
        <Button onClick={() => navigate('/my-it-assets/raise-request')}>
          <Plus className="mr-2 h-4 w-4" />
          Raise Request
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="devices">
            <Package className="mr-2 h-4 w-4" />
            My Devices
          </TabsTrigger>
          <TabsTrigger value="tickets">
            <Ticket className="mr-2 h-4 w-4" />
            My Tickets
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="mr-2 h-4 w-4" />
            Asset History
          </TabsTrigger>
        </TabsList>

        {/* My Devices Tab */}
        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Devices</CardTitle>
            </CardHeader>
            <CardContent>
              {assetsError ? (
                <div className="text-center py-8 text-destructive">
                  <p className="font-medium">Error loading assets</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {(assetsError as any)?.message || 'Failed to fetch your assigned assets.'}
                  </p>
                </div>
              ) : isLoadingAssets ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No devices assigned to you</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Code</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.map((asset: any) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.asset_code}</TableCell>
                        <TableCell>{asset.category_name}</TableCell>
                        <TableCell>
                          {asset.brand} {asset.model}
                        </TableCell>
                        <TableCell>{asset.serial_number || "-"}</TableCell>
                        <TableCell>
                          {asset.assigned_date
                            ? format(new Date(asset.assigned_date), "MMM dd, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={
                              asset.condition_on_assign === "excellent"
                                ? "success"
                                : asset.condition_on_assign === "good"
                                ? "info"
                                : "warning"
                            }
                          >
                            {asset.condition_on_assign || "good"}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={asset.status === "assigned" ? "info" : "warning"}
                          >
                            {asset.status}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {ticketsError ? (
                <div className="text-center py-8 text-destructive">
                  <p className="font-medium">Error loading tickets</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {(ticketsError as any)?.message || 'Failed to fetch your tickets.'}
                  </p>
                </div>
              ) : isLoadingTickets ? (
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
        </TabsContent>

        {/* Asset History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignment History</CardTitle>
            </CardHeader>
            <CardContent>
              {historyError ? (
                <div className="text-center py-8 text-destructive">
                  <p className="font-medium">Error loading history</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {(historyError as any)?.message || 'Failed to fetch assignment history.'}
                  </p>
                </div>
              ) : isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No assignment history</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Code</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Returned Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment: any) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.asset_code}</TableCell>
                        <TableCell>
                          {assignment.brand} {assignment.model}
                        </TableCell>
                        <TableCell>
                          {assignment.assigned_date
                            ? format(new Date(assignment.assigned_date), "MMM dd, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {assignment.returned_date
                            ? format(new Date(assignment.returned_date), "MMM dd, yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            variant={
                              assignment.status === "active"
                                ? "info"
                                : assignment.status === "returned"
                                ? "success"
                                : "error"
                            }
                          >
                            {assignment.status}
                          </StatusBadge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
