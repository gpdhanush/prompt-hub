export const APP_ISSUE_TYPES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feedback', label: 'Feedback' },
] as const;

export const APP_ISSUE_STATUSES = [
  { value: 'open', label: 'Open', color: 'bg-red-100 text-red-800' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'assigned', label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-purple-100 text-purple-800' },
  { value: 'need_testing', label: 'Need Testing', color: 'bg-orange-100 text-orange-800' },
  { value: 'testing', label: 'Testing', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
] as const;

export const APP_ISSUE_PAGE_LIMITS = [10, 20, 50, 100] as const;
