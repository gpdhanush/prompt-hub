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
import { Loader2, Plus, Printer } from "lucide-react";
import { assetsApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AssetAssignments() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const limit = 10;
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

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
    <div className="mx-auto p-6 space-y-6">
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
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
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAssignment(item);
                              setPrintDialogOpen(true);
                            }}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>
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

      {/* Print Asset Sticker Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Print Asset Sticker Preview</DialogTitle>
            <DialogDescription>
              Preview the asset sticker before printing
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 bg-card">
                <div className="space-y-3">
                  <div className="text-lg font-semibold">
                    {selectedAssignment.category_name} - {selectedAssignment.brand} {selectedAssignment.model}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Company: {import.meta.env.VITE_COMPANY_NAME || 'Naethra Technologies Pvt Ltd'}
                  </div>
                  <div className="text-sm font-medium">
                    Tag: {selectedAssignment.asset_code}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Serial Number: {selectedAssignment.serial_number || 'N/A'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Assigned To: {selectedAssignment.employee_name} ({selectedAssignment.emp_code})
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPrintDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (selectedAssignment) {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(`
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <title>Asset Sticker - ${selectedAssignment.asset_code}</title>
                          <style>
                            @media print {
                              @page {
                                size: 3in 2in;
                                margin: 0.1in;
                              }
                              body {
                                margin: 0;
                                padding: 0;
                                font-family: Arial, sans-serif;
                                font-size: 10pt;
                              }
                            }
                            body {
                              margin: 0;
                              padding: 10px;
                              font-family: Arial, sans-serif;
                              font-size: 10pt;
                            }
                            .sticker {
                              border: 2px solid #000;
                              padding: 8px;
                              width: 2.8in;
                              height: 1.8in;
                              display: flex;
                              flex-direction: column;
                              justify-content: space-between;
                            }
                            .sticker-header {
                              font-weight: bold;
                              font-size: 11pt;
                              margin-bottom: 4px;
                            }
                            .sticker-company {
                              font-size: 9pt;
                              color: #666;
                              margin-bottom: 2px;
                            }
                            .sticker-tag {
                              font-weight: bold;
                              font-size: 12pt;
                              margin: 4px 0;
                            }
                            .sticker-details {
                              font-size: 8pt;
                              line-height: 1.4;
                            }
                            .sticker-assigned {
                              font-size: 8pt;
                              margin-top: 4px;
                            }
                          </style>
                        </head>
                        <body>
                          <div class="sticker">
                            <div>
                              <div class="sticker-header">${selectedAssignment.category_name} - ${selectedAssignment.brand} ${selectedAssignment.model}</div>
                                  <div class="sticker-company">Company: ${import.meta.env.VITE_COMPANY_NAME || 'Naethra Technologies Pvt Ltd'}</div>
                              <div class="sticker-tag">Tag: ${selectedAssignment.asset_code}</div>
                              <div class="sticker-details">
                                <div>Serial Number: ${selectedAssignment.serial_number || 'N/A'}</div>
                                <div class="sticker-assigned">Assigned To: ${selectedAssignment.employee_name} (${selectedAssignment.emp_code})</div>
                              </div>
                            </div>
                          </div>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => {
                      printWindow.print();
                    }, 250);
                  }
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
