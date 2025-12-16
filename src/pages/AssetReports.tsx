import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileBarChart,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  BarChart3,
  PieChart,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { assetsApi } from "@/features/assets/api";
import { settingsApi } from "@/features/settings/api";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AssetReports() {
  const [reportType, setReportType] = useState("asset_summary");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");

  // Fetch currency symbol
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
  });
  const currencySymbol = settingsData?.data?.currency_symbol || "$";

  // Fetch categories for filter
  const { data: categoriesData } = useQuery({
    queryKey: ["asset-categories"],
    queryFn: () => assetsApi.getCategories(),
  });
  const categories = categoriesData?.data || [];

  // Fetch report data
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ["asset-reports", reportType, dateFrom, dateTo, categoryId],
    queryFn: () =>
      assetsApi.getReports({
        report_type: reportType,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        category_id: categoryId !== "all" ? parseInt(categoryId) : undefined,
      }),
    enabled: !!reportType,
  });

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const handleExport = () => {
    toast({
      title: "Export",
      description: "Export functionality will be available soon",
    });
  };

  const renderReportContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12 text-destructive">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
          <p className="font-medium">Error loading report</p>
          <p className="text-sm text-muted-foreground mt-2">
            {(error as any)?.message || "Failed to fetch report data"}
          </p>
        </div>
      );
    }

    const data = reportData?.data || {};

    switch (reportType) {
      case "asset_summary":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Asset Status Summary</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.status_summary?.map((item: any) => (
                  <TableRow key={item.status}>
                    <TableCell className="capitalize">{item.status}</TableCell>
                    <TableCell className="text-right font-medium">{item.count}</TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        );

      case "category_distribution":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Assets by Category</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.category_distribution?.map((item: any) => (
                  <TableRow key={item.category}>
                    <TableCell>{item.category || "Uncategorized"}</TableCell>
                    <TableCell className="text-right font-medium">{item.count}</TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        );

      case "assignment_history":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Assignment History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total Assignments</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Returned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.assignment_history?.map((item: any) => (
                  <TableRow key={item.date}>
                    <TableCell>{format(new Date(item.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="text-right font-medium">{item.assignments}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="default">{item.active}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{item.returned}</Badge>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        );

      case "maintenance_summary":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Maintenance Summary</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.maintenance_summary?.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="capitalize">{item.maintenance_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.count}</TableCell>
                    <TableCell className="text-right font-medium">
                      {item.total_cost ? formatCurrency(parseFloat(item.total_cost)) : "-"}
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        );

      case "warranty_expiry":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Warranty Expiry Report</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset Code</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Days Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.warranty_expiry?.map((item: any) => (
                  <TableRow key={item.asset_code}>
                    <TableCell className="font-medium">{item.asset_code}</TableCell>
                    <TableCell>{item.brand}</TableCell>
                    <TableCell>{item.model}</TableCell>
                    <TableCell>
                      {item.warranty_expiry
                        ? format(new Date(item.warranty_expiry), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          item.days_remaining < 30
                            ? "destructive"
                            : item.days_remaining < 90
                            ? "default"
                            : "secondary"
                        }
                      >
                        {item.days_remaining} days
                      </Badge>
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        );

      case "cost_analysis":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cost Analysis</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Assets Purchased</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Average Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.cost_analysis?.map((item: any) => (
                  <TableRow key={item.month}>
                    <TableCell className="font-medium">{item.month}</TableCell>
                    <TableCell className="text-right">{item.assets_purchased}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(parseFloat(item.total_cost || 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(parseFloat(item.avg_cost || 0))}
                    </TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        );

      default:
        return (
          <div className="text-center py-12 text-muted-foreground">
            <FileBarChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a report type to view data</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-8 w-8 text-primary" />
            Asset Reports
          </h1>
          <p className="text-muted-foreground mt-2">
            Generate comprehensive reports and analytics for asset management
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asset_summary">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Asset Summary
                    </div>
                  </SelectItem>
                  <SelectItem value="category_distribution">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Category Distribution
                    </div>
                  </SelectItem>
                  <SelectItem value="assignment_history">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Assignment History
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance_summary">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Maintenance Summary
                    </div>
                  </SelectItem>
                  <SelectItem value="warranty_expiry">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Warranty Expiry
                    </div>
                  </SelectItem>
                  <SelectItem value="cost_analysis">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Cost Analysis
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-from">Date From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-to">Date To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Results
          </CardTitle>
        </CardHeader>
        <CardContent>{renderReportContent()}</CardContent>
      </Card>
    </div>
  );
}
