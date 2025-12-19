import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { holidaysApi } from "../api";
import { getCurrentUser } from "@/lib/auth";
import { format } from "date-fns";
import ConfirmationDialog from "@/shared/components/ConfirmationDialog";
import { PageTitle } from "@/components/ui/page-title";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Holidays() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === "Super Admin";

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [restrictedFilter, setRestrictedFilter] = useState<string>("all");

  const [holidayForm, setHolidayForm] = useState({
    holiday_name: "",
    date: "",
    is_restricted: false,
  });

  const [formErrors, setFormErrors] = useState<{
    holiday_name?: string;
    date?: string;
  }>({});

  // Fetch holidays
  const { data: holidaysData, isLoading } = useQuery({
    queryKey: ["holidays", yearFilter, restrictedFilter],
    queryFn: () =>
      holidaysApi.getAll({
        year: yearFilter,
        is_restricted:
          restrictedFilter === "all"
            ? undefined
            : restrictedFilter === "true",
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const holidays = holidaysData?.data || [];

  // Get available years - current year and next 2 years
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<number>();
    
    // Add current year and next 2 years
    for (let i = 0; i < 3; i++) {
      years.add(currentYear + i);
    }
    
    // Also add any years from existing holidays
    holidays.forEach((holiday: any) => {
      if (holiday.year) {
        years.add(holiday.year);
      }
    });
    
    return Array.from(years).sort((a, b) => b - a);
  }, [holidays]);

  // Create holiday mutation
  const createMutation = useMutation({
    mutationFn: holidaysApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast({ title: "Success", description: "Holiday created successfully." });
      setShowCreateDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create holiday.",
        variant: "destructive",
      });
    },
  });

  // Update holiday mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: number; holiday_name?: string; date?: string; is_restricted?: boolean }) =>
      holidaysApi.update(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast({ title: "Success", description: "Holiday updated successfully." });
      setShowEditDialog(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update holiday.",
        variant: "destructive",
      });
    },
  });

  // Delete holiday mutation
  const deleteMutation = useMutation({
    mutationFn: holidaysApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast({ title: "Success", description: "Holiday deleted successfully." });
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete holiday.",
        variant: "destructive",
      });
    },
  });


  const resetForm = () => {
    setHolidayForm({
      holiday_name: "",
      date: "",
      is_restricted: false,
    });
    setFormErrors({});
    setSelectedHoliday(null);
  };

  const validateForm = (): boolean => {
    const errors: { holiday_name?: string; date?: string } = {};

    if (!holidayForm.holiday_name || holidayForm.holiday_name.trim() === "") {
      errors.holiday_name = "Holiday name is required";
    }

    if (!holidayForm.date || holidayForm.date.trim() === "") {
      errors.date = "Date is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = () => {
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(holidayForm);
  };

  const handleEdit = (holiday: any) => {
    setSelectedHoliday(holiday);
    // Format date for DatePicker (YYYY-MM-DD)
    const holidayDate = holiday.date ? holiday.date.split('T')[0] : "";
    setHolidayForm({
      holiday_name: holiday.holiday_name || "",
      date: holidayDate,
      is_restricted: holiday.is_restricted === 1 || holiday.is_restricted === true,
    });
    setFormErrors({});
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!selectedHoliday) return;
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({
      id: selectedHoliday.id,
      ...holidayForm,
    });
  };

  const handleDelete = (holiday: any) => {
    setSelectedHoliday(holiday);
    setShowDeleteDialog(true);
  };

  // Separate holidays by type
  const regularHolidays = holidays.filter((h: any) => !h.is_restricted);
  const restrictedHolidays = holidays.filter((h: any) => h.is_restricted);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <PageTitle title="Holidays" icon={Calendar} description="View and manage company holidays" />
        {isSuperAdmin && (
          <Button onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Holiday
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={yearFilter.toString()}
                onValueChange={(value) => setYearFilter(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.length > 0 ? (
                    availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={new Date().getFullYear().toString()}>
                      {new Date().getFullYear()}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="restricted">Type</Label>
              <Select value={restrictedFilter} onValueChange={setRestrictedFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Holidays</SelectItem>
                  <SelectItem value="false">Regular Holidays</SelectItem>
                  <SelectItem value="true">Restricted Holidays</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regular Holidays */}
      {regularHolidays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>List of Holidays {yearFilter}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sl. No.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Holiday</TableHead>
                    {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regularHolidays.map((holiday: any, index: number) => (
                    <TableRow key={holiday.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {format(new Date(holiday.date), "dd-MMM-yyyy")}
                      </TableCell>
                      <TableCell>{holiday.day}</TableCell>
                      <TableCell>{holiday.holiday_name}</TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleEdit(holiday)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(holiday)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Restricted Holidays */}
      {restrictedHolidays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Restricted Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl. No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Holiday</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {restrictedHolidays.map((holiday: any, index: number) => (
                  <TableRow key={holiday.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      {format(new Date(holiday.date), "dd-MMM-yyyy")}
                    </TableCell>
                    <TableCell>{holiday.day}</TableCell>
                    <TableCell>{holiday.holiday_name}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleEdit(holiday)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(holiday)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {holidays.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No holidays found for the selected year.</p>
          </CardContent>
        </Card>
      )}

      {/* Create Holiday Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
            <DialogDescription>Create a new holiday entry.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="holiday_name" className="text-red-500">
                Holiday Name *
              </Label>
              <Input
                id="holiday_name"
                value={holidayForm.holiday_name}
                onChange={(e) => {
                  setHolidayForm({ ...holidayForm, holiday_name: e.target.value });
                  if (formErrors.holiday_name) {
                    setFormErrors({ ...formErrors, holiday_name: undefined });
                  }
                }}
                placeholder="e.g., New Year's Day"
                className={formErrors.holiday_name ? "border-red-500" : ""}
                autoComplete="off"
              />
              {formErrors.holiday_name && (
                <p className="text-sm text-red-500">{formErrors.holiday_name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date" className="text-red-500">
                Date *
              </Label>
              <DatePicker
                id="date"
                value={holidayForm.date}
                onChange={(date) => {
                  setHolidayForm({ ...holidayForm, date });
                  if (formErrors.date) {
                    setFormErrors({ ...formErrors, date: undefined });
                  }
                }}
                placeholder="Select date"
              />
              {formErrors.date && (
                <p className="text-sm text-red-500">{formErrors.date}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_restricted"
                checked={holidayForm.is_restricted}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, is_restricted: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="is_restricted">Restricted Holiday</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleCreate} 
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Holiday Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
            <DialogDescription>Update holiday information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_holiday_name" className="text-red-500">
                Holiday Name *
              </Label>
              <Input
                id="edit_holiday_name"
                value={holidayForm.holiday_name}
                onChange={(e) => {
                  setHolidayForm({ ...holidayForm, holiday_name: e.target.value });
                  if (formErrors.holiday_name) {
                    setFormErrors({ ...formErrors, holiday_name: undefined });
                  }
                }}
                placeholder="e.g., New Year's Day"
                className={formErrors.holiday_name ? "border-red-500" : ""}
              />
              {formErrors.holiday_name && (
                <p className="text-sm text-red-500">{formErrors.holiday_name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_date" className="text-red-500">
                Date *
              </Label>
              <DatePicker
                id="edit_date"
                value={holidayForm.date}
                onChange={(date) => {
                  setHolidayForm({ ...holidayForm, date });
                  if (formErrors.date) {
                    setFormErrors({ ...formErrors, date: undefined });
                  }
                }}
                placeholder="Select date"
              />
              {formErrors.date && (
                <p className="text-sm text-red-500">{formErrors.date}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit_is_restricted"
                checked={holidayForm.is_restricted}
                onChange={(e) =>
                  setHolidayForm({ ...holidayForm, is_restricted: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="edit_is_restricted">Restricted Holiday</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleUpdate} 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Holiday"
        description={`Are you sure you want to delete "${selectedHoliday?.holiday_name}"? This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate(selectedHoliday?.id)}
        confirmLabel="Delete"
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}

