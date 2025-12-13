import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { assetsApi } from "@/lib/api";

export default function AssetAssignments() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["asset-assignments", page],
    queryFn: () =>
      assetsApi.getAssignments({
        page,
        limit,
      }),
  });

  const assignments = data?.data || [];
  const totalPages = data?.total || 1;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Asset Assignments</h1>
        <Button onClick={() => navigate("/it-assets/assignments/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Asset
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Assets</CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading assignments...
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No asset assignments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.asset_code} – {item.brand} {item.model}
                        </TableCell>
                        <TableCell>
                          {item.emp_code} – {item.employee_name}
                        </TableCell>
                        <TableCell>{item.assigned_date}</TableCell>
                        <TableCell className="capitalize">
                          {item.condition_on_assign}
                        </TableCell>
                        <TableCell className="capitalize">
                          {item.status}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
