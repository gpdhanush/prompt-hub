import { APP_ISSUE_STATUSES } from './constants';

export const getStatusBadgeColor = (status: string) => {
  const statusConfig = APP_ISSUE_STATUSES.find(s => s.value === status);
  return statusConfig?.color || 'bg-gray-100 text-gray-800';
};

export const getStatusLabel = (status: string) => {
  const statusConfig = APP_ISSUE_STATUSES.find(s => s.value === status);
  return statusConfig?.label || status;
};

export const formatAppIssueType = (type: string) => {
  return type === 'bug' ? 'Bug Report' : 'Feedback';
};

export const canUserViewIssue = (issue: any, userId: number) => {
  // User can view if they created it or are assigned to it
  return issue.user_id === userId || issue.assigned_to === userId;
};

export const canAdminManageIssue = (userRole: string) => {
  return ['Super Admin', 'Admin'].includes(userRole);
};
