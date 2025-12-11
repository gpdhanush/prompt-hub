import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        success: "bg-status-success-bg text-status-success border border-status-success/20",
        warning: "bg-status-warning-bg text-status-warning border border-status-warning/20",
        error: "bg-status-error-bg text-status-error border border-status-error/20",
        info: "bg-status-info-bg text-status-info border border-status-info/20",
        neutral: "bg-status-neutral-bg text-status-neutral border border-status-neutral/20",
        purple: "bg-status-purple-bg text-status-purple border border-status-purple/20",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  pulse?: boolean;
}

export function StatusBadge({
  className,
  variant,
  pulse,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        statusBadgeVariants({ variant }),
        pulse && "animate-pulse-soft",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// Predefined status mappings
export const userStatusMap = {
  Active: "success",
  Inactive: "neutral",
  Suspended: "error",
} as const;

export const projectStatusMap = {
  Planning: "info",
  "In Progress": "warning",
  Testing: "purple",
  "Pre-Prod": "info",
  Production: "success",
  Completed: "success",
  "On Hold": "neutral",
} as const;

export const taskStageMap = {
  Analysis: "info",
  Documentation: "info",
  Development: "warning",
  Testing: "purple",
  "Pre-Prod": "info",
  Production: "success",
  Closed: "neutral",
} as const;

export const taskPriorityMap = {
  Low: "neutral",
  Medium: "warning",
  High: "error",
} as const;

export const bugSeverityMap = {
  Minor: "neutral",
  Major: "warning",
  Critical: "error",
} as const;

export const bugStatusMap = {
  Open: "error",
  "In Review": "info",
  Fixing: "warning",
  Retesting: "purple",
  Passed: "success",
  Rejected: "neutral",
  Duplicate: "neutral",
  "Not a Bug": "neutral",
} as const;

export const reimbursementStatusMap = {
  Pending: "warning",
  Approved: "success",
  Rejected: "error",
  Processing: "info",
  Paid: "success",
} as const;

export const leaveStatusMap = {
  Pending: "warning",
  Approved: "success",
  Rejected: "error",
  Cancelled: "neutral",
} as const;

export const attendanceStatusMap = {
  Present: "success",
  Absent: "error",
  "On Leave": "info",
} as const;
