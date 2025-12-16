import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ArrowLeft,
  Download,
  FileText,
  TrendingUp,
  Package,
  AlertTriangle,
  DollarSign,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { assetsApi, settingsApi } from "@/lib/api";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const REPORT_TYPES = [
  { value: "stock_levels", label: "Stock Levels Report", description: "Current inventory levels and status" },
  { value: "stock_movements", label: "Stock Movements Report", description: "Inventory transactions over time" },
  { value: "inventory_valuation", label: "Inventory Valuation", description: "Total value of inventory" },
  { value: "low_stock_analysis", label: "Low Stock Analysis", description: "Items below minimum stock levels" },
  { value: "usage_report", label: "Usage Report", description: "Asset assignment and usage patterns" }
];

export default function InventoryReports() {
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState("stock_levels");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fetch currency symbol from database
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const currencySymbol = settingsData?.data?.currency_symbol || "$";
  
  // Format currency helper
  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch report data
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: [
      'inventory-reports',
      {
        report_type: selectedReport,
        date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
        date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
        category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
      }
    ],
    queryFn: () => assetsApi.getInventoryReports({
      report_type: selectedReport,
      date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
      date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
      category_id: categoryFilter !== 'all' ? categoryFilter : undefined,
    }),
    enabled: false, // Only run when user clicks Generate Report
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
  });

  const handleGenerateReport = () => {
    refetch();
  };

  const handleExportReport = () => {
    // This would typically export the report data
    // For now, we'll just show a placeholder
    console.log('Export report functionality would be implemented here');
  };

  const renderStockLevelsReport = (data: any) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{data.total_items || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{data.low_stock_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{data.total_value ? formatCurrency(data.total_value) : `${currencySymbol}0`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead>Min Level</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items?.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{item.asset_name}</p>
                  <p className="text-sm text-muted-foreground">{item.asset_code}</p>
                </div>
              </TableCell>
              <TableCell>{item.category_name}</TableCell>
              <TableCell>{item.current_stock}</TableCell>
              <TableCell>{item.min_stock_level}</TableCell>
              <TableCell>
                <StatusBadge
                  variant={
                    item.current_stock === 0 ? "error" :
                    item.current_stock <= item.min_stock_level ? "warning" :
                    "success"
                  }
                >
                  {item.current_stock === 0 ? "Out of Stock" :
                   item.current_stock <= item.min_stock_level ? "Low Stock" :
                   "In Stock"}
                </StatusBadge>
              </TableCell>
              <TableCell>{item.total_value ? formatCurrency(item.total_value) : `${currencySymbol}0`}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderStockMovementsReport = (data: any) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Additions</p>
                <p className="text-2xl font-bold text-green-600">{data.total_additions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Total Reductions</p>
                <p className="text-2xl font-bold text-red-600">{data.total_reductions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium text-muted-foreground">Net Change</p>
                <p className={`text-2xl font-bold ${
                  (data.net_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(data.net_change || 0) >= 0 ? '+' : ''}{data.net_change || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Quantity Change</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>User</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.movements?.map((movement: any) => (
            <TableRow key={movement.id}>
              <TableCell>
                {format(new Date(movement.created_at), "MMM dd, yyyy HH:mm")}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{movement.asset_name}</p>
                  <p className="text-sm text-muted-foreground">{movement.asset_code}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={movement.type === 'addition' ? 'default' : 'secondary'}>
                  {movement.type}
                </Badge>
              </TableCell>
              <TableCell>
                <span className={`font-medium ${
                  movement.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                </span>
              </TableCell>
              <TableCell className="capitalize">
                {movement.reason.replace('_', ' ')}
              </TableCell>
              <TableCell>{movement.user_name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderLowStockAnalysisReport = (data: any) => (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">Items Requiring Attention</p>
              <p className="text-3xl font-bold text-orange-600">{data.low_stock_items?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Current Stock</TableHead>
            <TableHead>Min Level</TableHead>
            <TableHead>Deficit</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.low_stock_items?.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{item.asset_name}</p>
                  <p className="text-sm text-muted-foreground">{item.asset_code}</p>
                </div>
              </TableCell>
              <TableCell>{item.category_name}</TableCell>
              <TableCell>{item.current_stock}</TableCell>
              <TableCell>{item.min_stock_level}</TableCell>
              <TableCell className="text-red-600 font-medium">
                {item.min_stock_level - item.current_stock}
              </TableCell>
              <TableCell>
                <StatusBadge variant="error">
                  {item.current_stock === 0 ? "Out of Stock" : "Low Stock"}
                </StatusBadge>
              </TableCell>
              <TableCell>
                <Badge variant={item.current_stock === 0 ? "destructive" : "secondary"}>
                  {item.current_stock === 0 ? "Critical" : "High"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const renderReportContent = () => {
    if (!reportData?.data) return null;

    switch (selectedReport) {
      case "stock_levels":
        return renderStockLevelsReport(reportData.data);
      case "stock_movements":
        return renderStockMovementsReport(reportData.data);
      case "low_stock_analysis":
        return renderLowStockAnalysisReport(reportData.data);
      default:
        return <div className="text-center py-8">Report type not implemented yet</div>;
    }
  };

  return (
    <div className="mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/it-assets/inventory')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Reports</h1>
            <p className="text-muted-foreground mt-2">Generate detailed inventory reports and analytics</p>
          </div>
        </div>
        {reportData?.data && (
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        )}
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Report Type</label>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">From Date</label>
              <DatePicker
                date={dateFrom}
                onSelect={setDateFrom}
              />
            </div>

            <div>
              <label className="text-sm font-medium">To Date</label>
              <DatePicker
                date={dateTo}
                onSelect={setDateTo}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {/* Add category options here */}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={handleGenerateReport} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Report"}
            </Button>
          </div>

          {REPORT_TYPES.find(t => t.value === selectedReport) && (
            <p className="text-sm text-muted-foreground mt-2">
              {REPORT_TYPES.find(t => t.value === selectedReport)?.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Report Content */}
      {reportData?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {REPORT_TYPES.find(t => t.value === selectedReport)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderReportContent()}
          </CardContent>
        </Card>
      )}

      {!reportData?.data && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Select report parameters and click "Generate Report" to view results</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}