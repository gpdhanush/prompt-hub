import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertCircle, Eye, MessageSquare, Paperclip, Bug, Clock, FileText, CheckCircle, AlertTriangle, RefreshCw, User, Search } from 'lucide-react';
import { appIssuesApi, type AppIssue } from '../api';
import { getStatusBadgeColor, getStatusLabel, formatAppIssueType } from '../utils/utils';
import { APP_ISSUE_PAGE_LIMITS } from '../utils/constants';
import { PageTitle } from '@/components/ui/page-title';
import PaginationControls from '@/shared/components/PaginationControls';
import { getCurrentUser } from '@/lib/auth';

export default function BrowseIssues() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['browse-app-issues', page, limit, searchQuery, statusFilter],
    queryFn: () => appIssuesApi.getAllIssues({
      page,
      limit,
      ...(searchQuery && { search: searchQuery }),
      ...(statusFilter && { status: statusFilter })
    }),
  });

  const issues = data?.data || [];
  const pagination = data?.pagination;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleViewIssue = (uuid: string) => {
    navigate(`/app-issues/browse/${uuid}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading all issues...</p>
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
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Error Loading Issues</h2>
                <p className="text-muted-foreground">Failed to load issues. Please try again.</p>
              </div>
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <PageTitle
          title="Browse Issues"
          description="View all reported issues to check for duplicates before submitting a new one"
        />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search issues by title or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="closed_by_tester">Closed by Tester</SelectItem>
                    <SelectItem value="need_testing">Need Testing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('');
                  setPage(1);
                }}
                variant="outline"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Issues List */}
        {issues.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No issues found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter ? 'Try adjusting your search or filters.' : 'No issues have been reported yet.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {issues.map((issue) => (
              <Card key={issue.uuid} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewIssue(issue.uuid)}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground hover:text-primary transition-colors">
                            {issue.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={issue.issue_type === 'bug' ? 'destructive' : 'secondary'} className="text-xs">
                              {formatAppIssueType(issue.issue_type)}
                            </Badge>
                            {/* <Badge variant={getStatusBadgeColor(issue.status)} className="text-xs">
                              {getStatusLabel(issue.status)}
                            </Badge>
                            {issue.is_anonymous === 1 && (
                              <Badge variant="outline" className="text-xs">
                                Anonymous
                              </Badge>
                            )} */}
                          </div>
                        </div>
                      </div>

                      <p className="text-muted-foreground line-clamp-2">
                        {issue.description}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>{issue.submitted_by}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDate(issue.created_at)}</span>
                        </div>
                        {issue.reply_count && issue.reply_count > 0 && (
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>{issue.reply_count} replies</span>
                          </div>
                        )}
                        {issue.attachment_count && issue.attachment_count > 0 && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="h-4 w-4" />
                            <span>{issue.attachment_count} attachments</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-primary text-white hover:bg-primary/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewIssue(issue.uuid);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8">
            <PaginationControls
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}

        {/* Results Summary */}
        {pagination && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Showing {issues.length} of {pagination.total} issues
            {limit !== pagination.total && ` (Page ${pagination.page} of ${pagination.totalPages})`}
          </div>
        )}
      </div>
    </div>
  );
}
