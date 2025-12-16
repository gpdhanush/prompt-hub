export const TASK_STAGES = [
  "Analysis",
  "Documentation",
  "Development",
  "Testing",
  "Pre-Prod",
  "Production",
  "Closed",
] as const;

export const TASK_PRIORITIES = ["Low", "Medium", "High"] as const;

export const TASK_STATUSES = ["Open", "In Progress", "Completed", "On Hold"] as const;

export const TASK_PAGE_LIMITS = [10, 20, 50, 100] as const;

export const DEFAULT_PAGE_LIMIT = 10;

