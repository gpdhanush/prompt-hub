import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Plus, Eye, MessageSquare, Paperclip, Bug, Clock, FileText, CheckCircle, AlertTriangle, RefreshCw, User } from 'lucide-react';
import { appIssuesApi, type AppIssue } from '../api';
import { getStatusBadgeColor, getStatusLabel, formatAppIssueType } from '../utils/utils';
import { APP_ISSUE_PAGE_LIMITS } from '../utils/constants';
import { PageTitle } from '@/components/ui/page-title';
import PaginationControls from '@/shared/components/PaginationControls';
import { getCurrentUser } from '@/lib/auth';

export default function MyAppIssues() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  console.log('Current user:', currentUser);
  console.log('Is admin:', isAdmin);

  const getDetailRoute = (uuid: string) => {
    const route = isAdmin ? `/admin/app-issues/${uuid}` : `/app-issues/${uuid}`;
    console.log('Routing to:', route, 'for uuid:', uuid);
    return route;
  };

  const { data, isLoading, error } = useQuery({
    queryKey: isAdmin ? ['all-app-issues', page, limit] : ['my-app-issues', page, limit],
    queryFn: () => isAdmin ? appIssuesApi.getAllIssues({ page, limit }) : appIssuesApi.getMyIssues({ page, limit }),
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
              <p className="text-muted-foreground">Loading your issues...</p>
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
                <p className="text-muted-foreground">Please try again later.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_review':
        return <Eye className="h-4 w-4" />;
      case 'assigned':
        return <User className="h-4 w-4" />;
      case 'in_progress':
        return <RefreshCw className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-xl">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">All App Issues</h1>
              <p className="text-muted-foreground">View all reported issues to prevent duplicates</p>
            </div>
          </div>
          <Button onClick={() => navigate('/app-issues/create')} className="shadow-lg">
            <Plus className="h-4 w-4 mr-2" />
            Report New Issue
          </Button>
        </div>

        {issues.length === 0 ? (
          <Card className="shadow-xl border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <CardContent className="pt-6">
              <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-muted/50 rounded-full mb-6">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No issues reported yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                No app issues have been reported yet. Be the first to help improve the application.
              </p>
              <Button onClick={() => navigate('/app-issues/create')} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                Report First Issue
              </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Issues Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
              {issues.map((issue: AppIssue) => (
                <Card
                  key={issue.uuid}
                  className="shadow-lg border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 hover:shadow-xl transition-all duration-200 cursor-pointer group"
                  onClick={() => navigate(getDetailRoute(issue.uuid))}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
                        issue.status === 'open' ? 'bg-red-100 text-red-600' :
                        issue.status === 'in_review' ? 'bg-yellow-100 text-yellow-600' :
                        issue.status === 'in_progress' ? 'bg-blue-100 text-blue-600' :
                        issue.status === 'resolved' ? 'bg-green-100 text-green-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getStatusIcon(issue.status)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-foreground mb-1 truncate group-hover:text-primary transition-colors">
                              {issue.title}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {formatAppIssueType(issue.issue_type)}
                              </Badge>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(issue.status)}`}>
                                {getStatusLabel(issue.status)}
                              </span>
                             
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(getDetailRoute(issue.uuid));
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>

                        <p className="desc">
                          {issue.description}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {issue.reply_count > 0 && (
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{issue.reply_count}</span>
                            </div>
                          )}

                          {issue.attachment_count && issue.attachment_count > 0 && (
                            <div className="flex items-center gap-1">
                              <Paperclip className="h-3 w-3" />
                              <span>{issue.attachment_count}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                              <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                          </div>

                          <div className="flex items-center gap-1 text-xs text-muted-foreground/80">
                            <span>by {issue.submitted_by}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.total > 0 && (
              <Card className="shadow-lg border-0 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 mt-8">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {(page - 1) * limit + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} issues
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Rows per page:</span>
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
                              <SelectItem key={limitValue} value={limitValue.toString()}>
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
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
