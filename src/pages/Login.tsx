import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecureInput } from "@/components/ui/secure-input";
import { Label } from "@/components/ui/label";
import { useSecurityValidation } from "@/hooks/useSecurityValidation";
import { SecurityAlertDialog } from "@/components/SecurityAlertDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { authApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { secureStorageWithCache } from "@/lib/secureStorage";
import { useLoading } from "@/contexts/LoadingContext";
import { ENV_CONFIG } from "@/lib/config";

// Development: Test loader without API call (set to false to enable real login)
const TEST_LOADER_ONLY = false;
const TEST_LOADING_DELAY_MS = 3000; // 3 seconds delay for testing

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { startLoading, stopLoading } = useLoading();
  const navigate = useNavigate();
  const { securityAlertProps } = useSecurityValidation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (TEST_LOADER_ONLY) {
        // Test mode: Just show loader for 3 seconds, no API call
        startLoading();
        await new Promise(resolve => setTimeout(resolve, TEST_LOADING_DELAY_MS));
        stopLoading();
        setIsLoading(false);
        return;
      }
      
      // Production mode: Real login API call
      const response = await authApi.login(email, password);
      
      // Check if MFA is required
      if (response.requiresMfaSetup) {
        toast({
          title: "MFA Setup Required",
          description: "MFA is required for your role. Please set it up now.",
        });
        navigate("/mfa/setup", { state: { userId: response.userId } });
        return;
      }
      
      if (response.requiresMfa) {
        toast({
          title: "MFA Verification Required",
          description: "Please verify your MFA code to continue.",
        });
        navigate("/mfa/verify", {
          state: {
            userId: response.userId,
            sessionToken: response.sessionToken,
          },
        });
        return;
      }
      
      // Store tokens and user info securely (encrypted)
      // Use accessToken if available, fallback to token for backward compatibility
      const accessToken = response.accessToken || response.token;
      await secureStorageWithCache.setItem('auth_token', accessToken);
      await secureStorageWithCache.setItem('user', JSON.stringify(response.user));
      
      // Store refresh token if available (for token refresh functionality)
      if (response.refreshToken) {
        await secureStorageWithCache.setItem('refresh_token', response.refreshToken);
      }
      
      if (rememberMe) {
        await secureStorageWithCache.setItem('remember_me', 'true');
      }
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${response.user.name}!`,
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary/20 via-background to-background p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col items-center gap-4">
            <Logo iconSize={128} showText={false} noBox={true} />
            <div className="text-center">
              <h1 className="text-4xl font-bold">Naethra EMS</h1>
              <p className="text-lg text-muted-foreground mt-2">Employee and Project Management System</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Employee and Project<br />
            <span className="text-primary">Management System</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Manage projects, employees, tasks, and resources with a powerful,
            secure management system built for productivity.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-status-success" />
              <span>Role-Based Access</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-status-info" />
              <span>MFA Protected</span>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <div className="relative z-10 pt-6 border-t border-border/50">
          <p className="text-sm text-muted-foreground/80">
            For optimal experience, use desktop screens (~1280-1920px wide). Not suitable for mobile view.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full border border-primary/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full border border-primary/5" />
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-8 gap-3">
            <Logo className="h-24 w-24" iconSize={96} showText={false} noBox={true} />
            <div className="text-center">
              <h1 className="text-2xl font-bold">Naethra EMS</h1>
              <p className="text-sm text-muted-foreground">Employee and Project Management System</p>
            </div>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-3xl font-bold">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <SecureInput
                  id="email"
                  fieldName="Email"
                  type="email"
                  placeholder="user@naethra.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <SecureInput
                  id="password"
                  fieldName="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                onClick={() => navigate("/forgot-password", { state: { email } })}
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground space-y-1">
            <p>
              © {new Date().getFullYear()} Naethra Technologies Pvt. Ltd. All rights reserved.
            </p>
            <p>
              Created by <span className="font-semibold">gpdhanush</span>
            </p>
            <p className="text-xs opacity-70 font-bold">
              Version: {ENV_CONFIG.APP_VERSION}
            </p>
            {/* <p className="text-sm font-medium text-muted-foreground/80 mt-4 pt-4 border-t border-border">
              For optimal experience, use desktop screens (~1280-1920px wide). Not suitable for mobile view.
            </p> */}
          </div>
        </div>
      </div>
      <SecurityAlertDialog {...securityAlertProps} />
    </div>
  );
}
