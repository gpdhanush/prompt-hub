import { useQuery } from "@tanstack/react-query";
import { Loader2, Shield, UserCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { employeesApi } from "@/features/employees/api";
import { getCurrentUser } from "@/lib/auth";
import { getProfilePhotoUrl } from "@/lib/imageUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Simple user card component
function UserCard({ user, level }: { user: any; level: 'superAdmin' | 'level1' | 'level2' }) {
  const borderColors = {
    superAdmin: 'border-blue-500',
    level1: 'border-orange-500',
    level2: 'border-green-500'
  };

  return (
    <Card className={`${borderColors[level]} border-2 bg-white shadow-sm hover:shadow-md transition-shadow`}>
      <CardContent className="p-4 flex flex-col items-center text-center">
        {/* Profile Photo */}
        <Avatar className="h-16 w-16 mb-3 border-2 border-gray-200">
          <AvatarImage src={getProfilePhotoUrl(user.profile_photo_url)} />
          <AvatarFallback className="bg-gray-100 text-gray-600 text-lg">
            {user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Name */}
        <h3 className="font-bold text-lg mb-2 text-gray-800">{user.name.toUpperCase()}</h3>
        
        {/* Role Badge */}
        <Badge variant="outline" className="text-xs font-normal">
          {user.role || 'N/A'}
        </Badge>
      </CardContent>
    </Card>
  );
}

export default function UserHierarchy() {
  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'Super Admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-hierarchy'],
    queryFn: () => employeesApi.getHierarchy(),
    enabled: isSuperAdmin,
  });

  const hierarchy = data?.data;

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive font-semibold">Access Denied</p>
              <p className="text-muted-foreground mt-2">Only Super Admin can access this page.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive font-semibold mb-2">Error loading hierarchy</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hierarchy) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hierarchy data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const superAdmins = hierarchy.superAdmin?.users || [];
  const level1Users = hierarchy.level1 || [];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">User Hierarchy</h1>
        <p className="text-muted-foreground mt-1">Organizational structure</p>
      </div>

      {/* Hierarchy Tree */}
      <div className="space-y-8">
        {/* Level 0 - Super Admin */}
        {superAdmins.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="flex gap-6 justify-center flex-wrap">
              {superAdmins.map((admin: any) => (
                <UserCard key={admin.id} user={admin} level="superAdmin" />
              ))}
            </div>
            <Badge variant="default" className="mt-3 bg-blue-500">
              Super Admin (Level 0)
            </Badge>
          </div>
        )}

        {/* Connecting Line */}
        {superAdmins.length > 0 && level1Users.length > 0 && (
          <div className="flex justify-center">
            <div className="w-0.5 h-12 bg-gray-400"></div>
          </div>
        )}

        {/* Level 1 Users with their Level 2 Employees */}
        {level1Users.length > 0 && (
          <div className="space-y-12">
            {level1Users.map((level1User: any, idx: number) => {
              const level2Users = level1User.level2Users || [];
              
              return (
                <div key={level1User.id} className="flex flex-col items-center">
                  {/* Level 1 User */}
                  <div className="mb-4">
                    <UserCard user={level1User} level="level1" />
                    <div className="text-center mt-2">
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                        Level 1 Manager
                      </Badge>
                    </div>
                  </div>

                  {/* Connecting Line to Level 2 */}
                  {level2Users.length > 0 && (
                    <div className="w-0.5 h-8 bg-gray-400 mb-4"></div>
                  )}

                  {/* Level 2 Employees */}
                  {level2Users.length > 0 ? (
                    <div className="flex gap-4 justify-center flex-wrap">
                      {level2Users.map((level2User: any) => (
                        <div key={level2User.id} className="flex flex-col items-center">
                          <UserCard user={level2User} level="level2" />
                          <div className="text-center mt-2">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                              Level 2 Employee
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No employees assigned
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {superAdmins.length === 0 && level1Users.length === 0 && (
          <div className="text-center py-12">
            <UserCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No users found in hierarchy</p>
          </div>
        )}
      </div>
    </div>
  );
}
