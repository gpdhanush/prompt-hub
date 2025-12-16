import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  ArrowLeft,
  Plus,
  Minus,
  Package,
  Search,
  Filter,
  Calendar,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { assetsApi } from "@/lib/api";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function InventoryHistory() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch inventory history
  const { data: historyData, isLoading } = useQuery({
    queryKey: [
      'inventory-history',
      {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
        date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
      }
    ],
    queryFn: () => assetsApi.getInventoryHistory({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm || undefined,
      type: typeFilter !== 'all' ? typeFilter : undefined,
      date_from: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
      date_to: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
    }),
    retry: (failureCount, error: any) => {
      if (error?.status === 404) return false;
      return failureCount < 1;
    },
  });

  const history = historyData?.data || [];
  const totalItems = historyData?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'addition':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'reduction':
        return <Minus className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'addition':
        return <Badge className="bg-green-100 text-green-800">Addition</Badge>;
      case 'reduction':
        return <Badge className="bg-red-100 text-red-800">Reduction</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const handleExport = () => {
    // This would typically export the data to CSV/Excel
    // For now, we'll just show a toast
    console.log('Export functionality would be implemented here');
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
            <h1 className="text-3xl font-bold tracking-tight">Inventory History</h1>
            <p className="text-muted-foreground mt-2">Track all stock adjustments and movements</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="addition">Additions</SelectItem>
                <SelectItem value="reduction">Reductions</SelectItem>
              </SelectContent>
            </Select>

            <div>
              <DatePicker
                date={dateFrom}
                onSelect={setDateFrom}
                placeholder="From Date"
              />
            </div>

            <div>
              <DatePicker
                date={dateTo}
                onSelect={setDateTo}
                placeholder="To Date"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setTypeFilter("all");
                setDateFrom(undefined);
                setDateTo(undefined);
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History ({totalItems} entries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No transaction history found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity Change</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Previous Stock</TableHead>
                    <TableHead>New Stock</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <p className="font-medium">
                              {format(new Date(transaction.created_at), "MMM dd, yyyy")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(transaction.created_at), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.asset_name}</p>
                          <p className="text-sm text-muted-foreground">{transaction.asset_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTransactionBadge(transaction.type)}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          transaction.quantity_change > 0 ? 'text-green-600' :
                          transaction.quantity_change < 0 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {transaction.quantity_change > 0 ? '+' : ''}{transaction.quantity_change}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{transaction.reason.replace('_', ' ')}</span>
                        {transaction.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {transaction.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{transaction.previous_stock}</TableCell>
                      <TableCell>{transaction.new_stock}</TableCell>
                      <TableCell>{transaction.user_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-3 text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
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