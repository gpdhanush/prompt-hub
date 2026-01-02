/**
 * Status transition permissions based on user roles
 */

/**
 * Get allowed status transitions for tasks based on user role
 * @param {string} currentStatus - Current task status
 * @param {string} userRole - User's role
 * @returns {string[]} Array of allowed next statuses
 */
export function getAllowedTaskStatusTransitions(currentStatus, userRole) {
  const statusFlow = {
    'New': ['In Progress'],
    'In Progress': ['Code Review', 'New'],
    'Code Review': ['Testing', 'In Progress'],
    'Testing': ['Reopen', 'Completed'],
    'Reopen': ['In Progress', 'Code Review'],
    'Completed': [] // Terminal state
  };

  const rolePermissions = {
    'Developer': {
      allowed: ['New', 'In Progress', 'Code Review'],
      canMove: (from, to) => {
        if (from === 'New' && to === 'In Progress') return true;
        if (from === 'In Progress' && to === 'Code Review') return true;
        return false;
      }
    },
    'Tester': {
      allowed: ['Testing', 'Completed'],
      canMove: (from, to) => {
        if (from === 'Testing' && to === 'Completed') return true;
        return false;
      }
    },
    'Team Leader': {
      allowed: ['New', 'In Progress', 'Code Review', 'Testing', 'Reopen', 'Completed'],
      canMove: (from, to) => {
        // TL can move to any status, including Completed
        return true;
      }
    },
    'Team Lead': {
      allowed: ['New', 'In Progress', 'Code Review', 'Testing', 'Reopen', 'Completed'],
      canMove: (from, to) => {
        // TL can move to any status, including Completed
        return true;
      }
    },
    'Admin': {
      allowed: ['New', 'In Progress', 'Code Review', 'Testing', 'Reopen', 'Completed'],
      canMove: (from, to) => {
        // Admin can move to any status
        return true;
      }
    },
    'Super Admin': {
      allowed: ['New', 'In Progress', 'Code Review', 'Testing', 'Reopen', 'Completed'],
      canMove: (from, to) => {
        // Super Admin can move to any status
        return true;
      }
    }
  };

  const roleConfig = rolePermissions[userRole] || rolePermissions['Developer'];
  
  // Get all possible next statuses from current status
  const possibleNext = statusFlow[currentStatus] || [];
  
  // Filter based on role permissions
  return possibleNext.filter(nextStatus => {
    return roleConfig.canMove(currentStatus, nextStatus);
  });
}

/**
 * Check if user can transition task from one status to another
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @param {string} userRole - User's role
 * @returns {boolean} True if transition is allowed
 */
export function canTransitionTaskStatus(fromStatus, toStatus, userRole) {
  const allowed = getAllowedTaskStatusTransitions(fromStatus, userRole);
  return allowed.includes(toStatus);
}

/**
 * Get allowed bug status transitions based on user role
 * @param {string} currentStatus - Current bug status
 * @param {string} userRole - User's role
 * @returns {string[]} Array of allowed next statuses
 */
export function getAllowedBugStatusTransitions(currentStatus, userRole) {
  const statusFlow = {
    'Open': ['Assigned', 'Closed'], // Allow closing directly from Open
    'Assigned': ['Fixed', 'Open', 'Closed'], // Allow closing directly from Assigned
    'Fixed': ['Retest', 'Closed'], // Allow closing directly from Fixed
    'Retest': ['Closed', 'Reopened'],
    'Closed': ['Reopened'],
    'Reopened': ['Assigned', 'Fixed', 'Closed'] // Allow closing directly from Reopened
  };

  const rolePermissions = {
    'Developer': {
      allowed: ['Assigned', 'Fixed', 'Closed'], // Allow closing
      canMove: (from, to) => {
        if (from === 'Assigned' && to === 'Fixed') return true;
        if (from === 'Assigned' && to === 'Closed') return true; // Allow closing
        if (from === 'Fixed' && to === 'Closed') return true; // Allow closing
        if (from === 'Reopened' && to === 'Fixed') return true;
        if (from === 'Reopened' && to === 'Closed') return true; // Allow closing
        return false;
      }
    },
    'Tester': {
      allowed: ['Retest', 'Closed'],
      canMove: (from, to) => {
        if (from === 'Retest' && to === 'Closed') return true;
        if (from === 'Fixed' && to === 'Closed') return true; // Allow closing
        if (from === 'Assigned' && to === 'Closed') return true; // Allow closing
        return false;
      }
    },
    'Team Leader': {
      allowed: ['Open', 'Assigned', 'Fixed', 'Retest', 'Closed', 'Reopened'],
      canMove: (from, to) => {
        // TL can move to any status, including reopen/close
        return true;
      }
    },
    'Team Lead': {
      allowed: ['Open', 'Assigned', 'Fixed', 'Retest', 'Closed', 'Reopened'],
      canMove: (from, to) => {
        // TL can move to any status, including reopen/close
        return true;
      }
    },
    'Admin': {
      allowed: ['Open', 'Assigned', 'Fixed', 'Retest', 'Closed', 'Reopened'],
      canMove: (from, to) => {
        // Admin can move to any status
        return true;
      }
    },
    'Super Admin': {
      allowed: ['Open', 'Assigned', 'Fixed', 'Retest', 'Closed', 'Reopened'],
      canMove: (from, to) => {
        // Super Admin can move to any status
        return true;
      }
    }
  };

  const roleConfig = rolePermissions[userRole] || rolePermissions['Developer'];

  // Get all possible next statuses from current status
  const possibleNext = statusFlow[currentStatus] || [];

  // Filter based on role permissions
  return possibleNext.filter(nextStatus => {
    return roleConfig.canMove(currentStatus, nextStatus);
  });
}

/**
 * Check if user can transition bug from one status to another
 * @param {string} fromStatus - Current status
 * @param {string} toStatus - Target status
 * @param {string} userRole - User's role
 * @returns {boolean} True if transition is allowed
 */
export function canTransitionBugStatus(fromStatus, toStatus, userRole) {
  const allowed = getAllowedBugStatusTransitions(fromStatus, userRole);
  return allowed.includes(toStatus);
}

