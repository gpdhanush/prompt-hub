import { useFCM } from "@/hooks/useFCM";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from "lucide-react";

/**
 * Debug component to test FCM setup
 * You can add this to any page temporarily to test FCM
 */
export function FCMDebug() {
  const { token, isRegistered, isLoading, permission, requestPermission } = useFCM();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications Status
        </CardTitle>
        <CardDescription>Firebase Cloud Messaging Debug Info</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Permission:</span>
            <Badge 
              variant={
                permission === 'granted' ? 'default' : 
                permission === 'denied' ? 'destructive' : 
                'secondary'
              }
            >
              {permission === 'granted' && <CheckCircle className="h-3 w-3 mr-1" />}
              {permission === 'denied' && <XCircle className="h-3 w-3 mr-1" />}
              {permission === 'default' && <AlertCircle className="h-3 w-3 mr-1" />}
              {permission}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Token Registered:</span>
            <Badge variant={isRegistered ? 'default' : 'secondary'}>
              {isRegistered ? 'Yes' : 'No'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Loading:</span>
            <Badge variant={isLoading ? 'secondary' : 'outline'}>
              {isLoading ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>

        {token && (
          <div className="p-2 bg-muted rounded text-xs font-mono break-all">
            <div className="font-semibold mb-1">FCM Token:</div>
            {token.substring(0, 50)}...
          </div>
        )}

        {permission !== 'granted' && (
          <Button 
            onClick={requestPermission} 
            className="w-full"
            variant={permission === 'denied' ? 'outline' : 'default'}
          >
            {permission === 'denied' ? (
              <>
                <BellOff className="h-4 w-4 mr-2" />
                Permission Denied - Enable in Browser Settings
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Request Notification Permission
              </>
            )}
          </Button>
        )}

        {permission === 'denied' && (
          <p className="text-xs text-muted-foreground">
            To enable notifications, go to your browser settings and allow notifications for this site.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
