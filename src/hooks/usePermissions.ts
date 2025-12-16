import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api";
import { getCurrentUser } from "@/lib/auth";

/**
 * Custom hook to check user permissions
 * Returns a function to check if user has a specific permission
 */
export function usePermissions() {
  const currentUser = getCurrentUser();
  const userRole = currentUser?.role || '';

  // Fetch user permissions
  const { data: permissionsData, isLoading } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: () => authApi.getPermissions(),
    enabled: !!currentUser, // Only fetch if user is logged in
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const permissions = permissionsData?.data || [];

  /**
   * Check if user has a specific permission
   * @param permissionCode - The permission code to check (e.g., 'projects.create')
   * @returns boolean - true if user has the permission
   */
  const hasPermission = (permissionCode: string): boolean => {
    // Super Admin always has all permissions
    if (userRole === 'Super Admin') {
      return true;
    }
    
    return permissions.includes(permissionCode);
  };

  return {
    permissions,
    hasPermission,
    isLoading,
  };
}
