import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, AlertCircle, Loader2, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mfaApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { secureStorageWithCache } from "@/lib/secureStorage";

export default function MFAVerify() {
  const [code, setCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("totp");
  const navigate = useNavigate();
  const location = useLocation();

  // Get userId and sessionToken from location state or URL params
  const userId = location.state?.userId || new URLSearchParams(location.search).get("userId");
  const sessionToken = location.state?.sessionToken || new URLSearchParams(location.search).get("sessionToken");

  useEffect(() => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please login again.",
        variant: "destructive",
      });
      navigate("/login");
    }
  }, [userId, navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const verificationCode = activeTab === "totp" ? code : backupCode;
      
      if (!verificationCode) {
        toast({
          title: "Error",
          description: "Please enter a verification code",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const response = await mfaApi.verify(
        parseInt(userId as string),
        activeTab === "totp" ? verificationCode : "",
        activeTab === "backup" ? verificationCode : "",
        sessionToken as string
      );

      // Store token and user info securely
      await secureStorageWithCache.setItem("auth_token", response.token);
      await secureStorageWithCache.setItem("user", JSON.stringify(response.user));

      toast({
        title: "Success",
        description: "MFA verification successful",
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle>MFA Verification Required</CardTitle>
          </div>
          <CardDescription>
            Please enter your verification code to complete login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="totp">
                <Shield className="h-4 w-4 mr-2" />
                Authenticator App
              </TabsTrigger>
              <TabsTrigger value="backup">
                <Key className="h-4 w-4 mr-2" />
                Backup Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="totp" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Enter the 6-digit code from your authenticator app
                </AlertDescription>
              </Alert>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="text-center text-2xl font-mono tracking-widest"
                    required
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={code.length !== 6 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="backup" className="space-y-4 mt-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Enter one of your backup codes. Each code can only be used once.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backupCode">Backup Code</Label>
                  <Input
                    id="backupCode"
                    type="text"
                    placeholder="XXXXXXXX"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    className="text-center text-lg font-mono"
                    required
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={!backupCode || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify with Backup Code"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
