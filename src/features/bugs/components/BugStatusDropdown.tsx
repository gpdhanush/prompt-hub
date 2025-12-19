import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentUser } from "@/lib/auth";

interface BugStatusDropdownProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

const BUG_STATUS_FLOW = {
  'Open': ['Assigned'],
  'Assigned': ['Fixed', 'Open'],
  'Fixed': ['Retest'],
  'Retest': ['Closed', 'Reopened'],
  'Closed': ['Reopened'],
  'Reopened': ['Assigned', 'Fixed']
};

export function BugStatusDropdown({ currentStatus, onStatusChange, disabled }: BugStatusDropdownProps) {
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';
  
  // Ensure we have a valid status
  const status = currentStatus || 'Open';

  const getAllowedTransitions = (status: string, role: string): string[] => {
    const possibleNext = BUG_STATUS_FLOW[status as keyof typeof BUG_STATUS_FLOW] || [];
    
    if (role === 'Super Admin' || role === 'Admin' || role === 'Team Leader' || role === 'Team Lead') {
      // TL/Admin can move to any status, including reopen/close
      return possibleNext;
    }

    if (role === 'Developer') {
      // Developers: Assigned → Fixed (cannot close)
      return possibleNext.filter(next => {
        if (status === 'Assigned' && next === 'Fixed') return true;
        return false;
      });
    }

    if (role === 'Tester') {
      // Tester: Retest → Closed
      return possibleNext.filter(next => {
        if (status === 'Retest' && next === 'Closed') return true;
        return false;
      });
    }

    return [];
  };

  const allowedStatuses = getAllowedTransitions(status, userRole);

  if (allowedStatuses.length === 0 && status !== 'Closed') {
    return (
      <Select value={status} disabled>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={status}>{status}</SelectItem>
        </SelectContent>
      </Select>
    );
  }

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
        <SelectItem value={status}>{status}</SelectItem>
        {allowedStatuses.map((nextStatus) => (
          <SelectItem key={nextStatus} value={nextStatus}>
            {nextStatus}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

