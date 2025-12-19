import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TaskStatusDropdownProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

// All available task statuses
const ALL_TASK_STATUSES = [
  'New',
  'Open',
  'In Progress',
  'Code Review',
  'Testing',
  'Ready for Testing',
  'Reopen',
  'Completed',
  'Closed',
  'Failed',
  'TBD',
  'Not a Bug',
  'Production Bug',
];

export function TaskStatusDropdown({ currentStatus, onStatusChange, disabled }: TaskStatusDropdownProps) {
  const status = currentStatus || 'New';

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
        {ALL_TASK_STATUSES.map((statusOption) => (
          <SelectItem key={statusOption} value={statusOption}>
            {statusOption}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

