import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentUser } from "@/lib/auth";
import { usePermissions } from "@/hooks/usePermissions";

interface BugStatusDropdownProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

// Simple list of all available bug statuses
const BUG_STATUSES = [
  'Open',
  'Assigned',
  'In Progress',
  'Testing',
  'Fixed',
  'Retesting',
  'Closed',
  'Reopened'
];

export function BugStatusDropdown({ currentStatus, onStatusChange, disabled }: BugStatusDropdownProps) {
  // Ensure we have a valid status, default to 'Open'
  const status = currentStatus || 'Open';

  return (
    <Select
      value={status}
      onValueChange={onStatusChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        {BUG_STATUSES.map((statusOption) => (
          <SelectItem key={statusOption} value={statusOption}>
            {statusOption}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

