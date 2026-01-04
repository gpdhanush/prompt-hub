import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertCircle, Plus, Eye, MessageSquare, Paperclip, Bug, Clock, FileText, CheckCircle, AlertTriangle, RefreshCw, User, Search } from 'lucide-react';
import { appIssuesApi, type AppIssue } from '../api';
import { getStatusBadgeColor, getStatusLabel, formatAppIssueType } from '../utils/utils';
import { APP_ISSUE_PAGE_LIMITS } from '../utils/constants';
import { PageTitle } from '@/components/ui/page-title';
import PaginationControls from '@/shared/components/PaginationControls';
import { getCurrentUser } from '@/lib/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Issues() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('my-issues');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  const getDetailRoute = (uuid: string) => {
    const route = isAdmin ? `/admin/app-issues/${uuid}` : `/app-issues/${uuid}`;
    return route;
  };

  // Query for My Issues tab
  const { data: myIssuesData, isLoading: myIssuesLoading, error: myIssuesError } = useQuery({
    queryKey: ['my-app-issues', page, limit],
    queryFn: () => appIssuesApi.getMyIssues({ page, limit }),
    enabled: activeTab === 'my-issues',
  });

  // Query for Browse Issues tab
  const { data: browseIssuesData, isLoading: browseIssuesLoading, error: browseIssuesError, refetch: refetchBrowse } = useQuery({
    queryKey: ['browse-app-issues', page, limit, searchQuery, statusFilter],
    queryFn: () => appIssuesApi.getAllIssues({
      page,
      limit,
      ...(searchQuery && { search: searchQuery }),
      ...(statusFilter !== 'all' && { status: statusFilter })
    }),
    enabled: activeTab === 'browse-issues',
  });

  const currentData = activeTab === 'my-issues' ? myIssuesData : browseIssuesData;
  const isLoading = activeTab === 'my-issues' ? myIssuesLoading : browseIssuesLoading;
  const error = activeTab === 'my-issues' ? myIssuesError : browseIssuesError;

  const issues = currentData?.data || [];
  const pagination = currentData?.pagination;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
    setSearchQuery('');
    setStatusFilter('all');
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {activeTab === 'my-issues' ? 'Loading your issues...' : 'Loading all issues...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <PageTitle
            title="Issues"
            description="Manage and track application issues"
          />
          <Button onClick={() => navigate("/app-issues/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Report Issue
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-issues">My Issues</TabsTrigger>
            <TabsTrigger value="browse-issues">Browse Issues</TabsTrigger>
          </TabsList>

          <TabsContent value="my-issues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Issues</CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="text-center py-8 text-destructive">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-medium">Error loading your issues</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {(error as any)?.message || "Failed to fetch issues"}
                    </p>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button onClick={() => window.location.reload()} variant="outline">
                        Retry
                      </Button>
                      <Button onClick={() => navigate('/')} variant="outline">
                        Go Home
                      </Button>
                    </div>
                  </div>
                ) : issues.length === 0 ? (
                  <div className="text-center py-12">
                    <Bug className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      No issues found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't reported any issues yet or no issues match
                      your criteria.
                    </p>
                    <Button onClick={() => navigate("/app-issues/create")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Report Your First Issue
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {issues.map((issue: AppIssue) => (
                        <Card
                          key={issue.uuid}
                          className="hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3
                                    className="font-semibold text-lg hover:text-primary cursor-pointer"
                                    onClick={() =>
                                      navigate(getDetailRoute(issue.uuid))
                                    }
                                  >
                                    {issue.title}
                                  </h3>
                                  <Badge variant="outline" className="text-xs">
                                    {formatAppIssueType(issue.issue_type)}
                                  </Badge>
                                </div>

                                <p className="text-muted-foreground mb-3 line-clamp-2">
                                  {issue.description}
                                </p>

                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                                      issue.status
                                    )}`}
                                  >
                                    {getStatusLabel(issue.status)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(issue.created_at)}
                                  </span>
                                  {issue.reply_count > 0 && (
                                    <span className="flex items-center gap-1">
                                      <MessageSquare className="h-3 w-3" />
                                      {issue.reply_count} replies
                                    </span>
                                  )}
                                  {issue.attachment_count > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Paperclip className="h-3 w-3" />
                                      {issue.attachment_count} attachments
                                    </span>
                                  )}
                                </div>
                              </div>

                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  navigate(getDetailRoute(issue.uuid))
                                }
                                className="ml-4 bg-primary text-white"
                              >
                                <Eye className="h-4 w-4 mr-2 bg-primary text-white" />
                                <span className="text-white">View</span>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {pagination && (
                      <PaginationControls
                        currentPage={page}
                        totalPages={pagination.totalPages}
                        onPageChange={setPage}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="browse-issues" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search issues by title, description..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setPage(1);
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-48">
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => {
                        setStatusFilter(value);
                        setPage(1);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="need_testing">
                          Need Testing
                        </SelectItem>
                        <SelectItem value="closed_by_tester">
                          Closed by Tester
                        </SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setPage(1);
                      refetchBrowse();
                    }}
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Issues</CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <div className="text-center py-8 text-destructive">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                    <p className="font-medium">Error loading issues</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {(error as any)?.message || "Failed to fetch issues"}
                    </p>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button onClick={() => refetchBrowse()} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                      <Button onClick={() => navigate('/')} variant="outline">
                        Go Home
                      </Button>
                    </div>
                  </div>
                ) : issues.length === 0 ? (
                  <div className="text-center py-12">
                    <Bug className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      No issues found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your filters"
                        : "No issues have been reported yet"}
                    </p>
                    <Button onClick={() => navigate("/app-issues/create")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Report Issue
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {issues.map((issue: AppIssue) => (
                        <Card
                          key={issue.uuid}
                          className="hover:shadow-md transition-shadow"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3
                                    className="font-semibold text-lg hover:text-primary cursor-pointer"
                                    onClick={() =>
                                      navigate(getDetailRoute(issue.uuid))
                                    }
                                  >
                                    {issue.title}
                                  </h3>
                                  <Badge variant="outline" className="text-xs">
                                    {formatAppIssueType(issue.issue_type)}
                                  </Badge>
                                </div>

                                <p className="text-muted-foreground mb-3 line-clamp-2">
                                  {issue.description}
                                </p>

                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                                      issue.status
                                    )}`}
                                  >
                                    {getStatusLabel(issue.status)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {issue.submitted_by || "Anonymous"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(issue.created_at)}
                                  </span>
                                  {issue.reply_count > 0 && (
                                    <span className="flex items-center gap-1">
                                      <MessageSquare className="h-3 w-3" />
                                      {issue.reply_count} replies
                                    </span>
                                  )}
                                  {issue.attachment_count > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Paperclip className="h-3 w-3" />
                                      {issue.attachment_count} attachments
                                    </span>
                                  )}
                                </div>
                              </div>

                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  navigate(getDetailRoute(issue.uuid))
                                }
                                className="ml-4 bg-primary text-white"
                              >
                                <Eye className="h-4 w-4 mr-2 " />
                                <span className="text-white">View</span>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {pagination && (
                      <PaginationControls
                        currentPage={page}
                        totalPages={pagination.totalPages}
                        onPageChange={setPage}
                      />
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
