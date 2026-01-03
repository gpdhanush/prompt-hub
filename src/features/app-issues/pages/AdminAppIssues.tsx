import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Eye, MessageSquare, Paperclip, Bug, Filter } from 'lucide-react';
import { appIssuesApi, type AppIssue } from '../api';
import { getStatusBadgeColor, getStatusLabel, formatAppIssueType } from '../utils/utils';
import { APP_ISSUE_PAGE_LIMITS, APP_ISSUE_STATUSES, APP_ISSUE_TYPES } from '../utils/constants';
import { PageTitle } from '@/components/ui/page-title';
import PaginationControls from '@/shared/components/PaginationControls';
import { toast } from '@/hooks/use-toast';

export default function AdminAppIssues() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    status: 'all',
    issue_type: 'all',
    is_anonymous: 'all',
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-app-issues', page, limit, filters],
    queryFn: () => appIssuesApi.getAllAdmin({
      page,
      limit,
      status: filters.status === 'all' ? undefined : filters.status,
      issue_type: filters.issue_type === 'all' ? undefined : filters.issue_type,
      is_anonymous: filters.is_anonymous === 'all' ? undefined : filters.is_anonymous === 'true',
    }),
  });

  const issues = data?.data || [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading app issues...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <Card className="shadow-xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <p className="text-destructive font-semibold mb-2">Error loading issues</p>
                <p className="text-muted-foreground mb-4">Please try again later.</p>
                <div className="text-left bg-muted p-4 rounded-lg text-sm">
                  <p className="font-medium mb-2">Possible causes:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Database tables may not be created yet</li>
                    <li>No app issues have been submitted</li>
                    <li>Database connection issues</li>
                  </ul>
                  <p className="mt-2 text-xs">
                    Check server logs for more details.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                App Issues Management
              </h1>
              <p className="text-muted-foreground">
                Manage and respond to user-reported app issues
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {APP_ISSUE_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Issue Type</Label>
                <Select
                  value={filters.issue_type}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, issue_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {APP_ISSUE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Privacy</Label>
                <Select
                  value={filters.is_anonymous}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, is_anonymous: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Issues" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Issues</SelectItem>
                    <SelectItem value="true">Anonymous Only</SelectItem>
                    <SelectItem value="false">Non-Anonymous Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues List */}
        <div className="space-y-6 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          
          <div className="grid gap-4">
            {issues.length === 0 ? (
              <Card className="border-2 border-dashed border-muted-foreground/25">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="flex items-center justify-center w-16 h-16 bg-muted/50 rounded-full mb-6">
                    <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No app issues found
                  </h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-md">
                    {Object.values(filters).some((v) => v !== "all")
                      ? "Try adjusting your filters to see more results."
                      : "No app issues have been reported yet. Issues will appear here when users submit them."}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-6 max-w-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Anonymous submissions allowed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Status tracking & assignments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Replies and attachments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Real-time updates</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open("/api/admin/app-issues/debug/all", "_blank")
                    }
                    className="flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Check Database Status
                  </Button>
                </CardContent>
              </Card>
            ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Issue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue: AppIssue) => (
                    <TableRow key={issue.uuid} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="font-medium">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer"
                              onClick={() => {
                                if (
                                  issue.uuid &&
                                  issue.uuid.match(
                                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                                  )
                                ) {
                                  navigate(`/admin/app-issues/${issue.uuid}`);
                                } else {
                                  toast({
                                    title: "Invalid Issue",
                                    description: "This issue appears to have invalid data.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              {issue.title.replace(/\b\w/g, (l) => l.toUpperCase().slice(0, 30))}
                              {issue.title.length > 30 && '...'}
                            </span>
                            {issue.is_anonymous === true && (
                              <Badge variant="secondary" className="text-xs">
                                Anonymous
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                            {issue.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {issue.reply_count > 0 && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{issue.reply_count}</span>
                              </div>
                            )}
                            {issue.attachment_count > 0 && (
                              <div className="flex items-center gap-1">
                                <Paperclip className="h-3 w-3" />
                                <span>{issue.attachment_count}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                            issue.status
                          )}`}
                        >
                          {getStatusLabel(issue.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {issue.submitted_by}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs bg-primary/10 text-primary"
                        >
                          {formatAppIssueType(issue.issue_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {(() => {
                          const date = new Date(issue.created_at);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = date.toLocaleString('en-US', { month: 'short' });
                          const year = date.getFullYear();
                          const hours = date.getHours();
                          const minutes = String(date.getMinutes()).padStart(2, '0');
                          const seconds = String(date.getSeconds()).padStart(2, '0');
                          const ampm = hours >= 12 ? 'PM' : 'AM';
                          const displayHours = hours % 12 || 12;

                          return `${day}-${month}-${year} ${String(displayHours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
                        })()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            if (
                              issue.uuid &&
                              issue.uuid.match(
                                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                              )
                            ) {
                              navigate(`/admin/app-issues/${issue.uuid}`);
                            } else {
                              toast({
                                title: "Invalid Issue",
                                description: "This issue appears to have invalid data.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            )}
            {/* Pagination */}
            {pagination && pagination.total > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, pagination.total)} of{" "}
                  {pagination.total} issues
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground">
                      Rows per page:
                    </Label>
                    <Select
                      value={limit.toString()}
                      onValueChange={(value) => {
                        setLimit(Number(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_ISSUE_PAGE_LIMITS.map((limitValue) => (
                          <SelectItem
                            key={limitValue}
                            value={limitValue.toString()}
                          >
                            {limitValue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <PaginationControls
                    currentPage={page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
    