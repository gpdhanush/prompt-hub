import { useState } from "react";
import { Search, Filter, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, attendanceStatusMap } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const attendance = [
  { id: 1, employee: "Ravi Kumar", date: "2025-12-11", checkIn: "09:05", checkOut: "18:30", status: "Present" as const, location: "Office" },
  { id: 2, employee: "Priya Sharma", date: "2025-12-11", checkIn: "08:45", checkOut: "17:45", status: "Present" as const, location: "Remote" },
  { id: 3, employee: "Amit Patel", date: "2025-12-11", checkIn: "09:15", checkOut: "-", status: "Present" as const, location: "Office" },
  { id: 4, employee: "Maria Garcia", date: "2025-12-11", checkIn: "-", checkOut: "-", status: "On Leave" as const, location: "-" },
  { id: 5, employee: "David Wilson", date: "2025-12-11", checkIn: "-", checkOut: "-", status: "Absent" as const, location: "-" },
  { id: 6, employee: "Lisa Anderson", date: "2025-12-11", checkIn: "08:30", checkOut: "17:30", status: "Present" as const, location: "Office" },
  { id: 7, employee: "Sarah Chen", date: "2025-12-11", checkIn: "09:00", checkOut: "-", status: "Present" as const, location: "Remote" },
  { id: 8, employee: "John Smith", date: "2025-12-11", checkIn: "10:15", checkOut: "-", status: "Present" as const, location: "Office" },
];

export default function Attendance() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAttendance = attendance.filter(
    (a) => a.employee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = attendance.filter((a) => a.status === "Present").length;
  const onLeaveCount = attendance.filter((a) => a.status === "On Leave").length;
  const absentCount = attendance.filter((a) => a.status === "Absent").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            Attendance
          </h1>
          <p className="text-muted-foreground">Track daily employee attendance</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Today</p>
          <p className="text-lg font-semibold">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{attendance.length}</div>
            <p className="text-xs text-muted-foreground">Total Employees</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-success">{presentCount}</div>
            <p className="text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-info">{onLeaveCount}</div>
            <p className="text-xs text-muted-foreground">On Leave</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-status-error">{absentCount}</div>
            <p className="text-xs text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Today's Attendance</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAttendance.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.employee}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(a.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                  <TableCell className={a.checkIn === "-" ? "text-muted-foreground" : ""}>
                    {a.checkIn}
                  </TableCell>
                  <TableCell className={a.checkOut === "-" ? "text-muted-foreground" : ""}>
                    {a.checkOut}
                  </TableCell>
                  <TableCell>
                    {a.location !== "-" && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {a.location}
                      </span>
                    )}
                    {a.location === "-" && <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge variant={attendanceStatusMap[a.status]}>
                      {a.status}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
