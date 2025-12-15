import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Mail, Lock, KeyRound, CheckCircle2, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [step, setStep] = useState<"email" | "otp" | "reset" | "success">("email");
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);

  // Pre-fill email from location state if available
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const getStepNumber = () => {
    switch (step) {
      case "email": return 1;
      case "otp": return 2;
      case "reset": return 3;
      case "success": return 4;
      default: return 1;
    }
  };

  const getTotalSteps = () => 3;

  const handleSendOTP = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSendingOTP(true);
    setEmailExists(null);
    try {
      const response = await authApi.forgotPassword(email);
      
      // Backend returns emailExists: false when email not found, true when found and OTP sent
      // Both cases return 200 status for security (don't reveal if email exists)
      if (response && 'emailExists' in response) {
        if (response.emailExists === false) {
          // Email not found
          setEmailExists(false);
          toast({
            title: "Email Not Found",
            description: "This email address is not registered in our system. Please check and try again.",
            variant: "destructive",
          });
          return;
        } else if (response.emailExists === true) {
          // Email found and OTP sent successfully
          setEmailExists(true);
          toast({
            title: "OTP Sent",
            description: "Please check your email for the OTP code",
          });
          setStep("otp");
          return;
        }
      }
      
      // Fallback: if response structure is unexpected, check success flag
      if (response && response.success) {
        // Assume success if success flag is true but emailExists is missing
        setEmailExists(true);
        toast({
          title: "OTP Sent",
          description: "Please check your email for the OTP code",
        });
        setStep("otp");
      } else {
        // Unexpected response structure
        setEmailExists(null);
        toast({
          title: "Error",
          description: "Unexpected response from server. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      // Handle API errors
      // Check if it's a network error or server error
      const errorMessage = error.message || error.toString() || "Unknown error";
      
      // Only mark email as not found if we get a specific 400 error
      if (error.status === 400 && (errorMessage.includes('not registered') || errorMessage.includes('not found'))) {
        setEmailExists(false);
        toast({
          title: "Email Not Found",
          description: "This email address is not registered in our system.",
          variant: "destructive",
        });
      } else {
        // For other errors (500, network, email service issues), don't assume email doesn't exist
        setEmailExists(null);
        toast({
          title: "Error",
          description: errorMessage.includes('Failed to send email') 
            ? "Email service is not configured. Please contact administrator."
            : errorMessage || "Failed to send OTP. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingOTP(true);
    try {
      const response = await authApi.verifyOTP(email, otp);
      setResetToken(response.resetToken);
      setStep("reset");
      toast({
        title: "OTP Verified",
        description: "Please enter your new password",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsResettingPassword(true);
    try {
      await authApi.resetPassword(email, resetToken, newPassword);
      setStep("success");
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-primary/20 via-background to-background p-12 relative overflow-hidden">
        <div className="relative z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/login")}
            className="mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span>Back to Login</span>
          </Button>
          
          <div className="flex flex-col items-center gap-4">
            <Logo iconSize={128} showText={false} noBox={true} />
            <div className="text-center">
              <h1 className="text-4xl font-bold">Naethra EMS</h1>
              <p className="text-lg text-muted-foreground mt-2">Password Recovery</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Reset Your<br />
            <span className="text-primary">Password Securely</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Follow the simple steps to reset your password. We'll send you a verification code to ensure your account security.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-status-success" />
              <span>Secure Process</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-status-info" />
              <span>Quick Recovery</span>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full border border-primary/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full border border-primary/5" />
      </div>

      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md space-y-6 animate-fade-in">
          {/* Mobile back button */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-6 gap-3">
            <Logo className="h-24 w-24" iconSize={96} showText={false} noBox={true} />
            <div className="text-center">
              <h1 className="text-2xl font-bold">Naethra EMS</h1>
              <p className="text-sm text-muted-foreground">Password Recovery</p>
            </div>
          </div>

          {/* Step Indicator */}
          {step !== "success" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Step {getStepNumber()} of {getTotalSteps()}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round((getStepNumber() / getTotalSteps()) * 100)}% Complete
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((stepNum) => (
                  <div
                    key={stepNum}
                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                      stepNum <= getStepNumber()
                        ? "bg-primary"
                        : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main Card */}
          <Card className="border shadow-xl">
            <CardHeader className="space-y-1 text-center pb-6">
              <CardTitle className="text-3xl font-bold">
                {step === "email" && "Forgot Password?"}
                {step === "otp" && "Verify Your Email"}
                {step === "reset" && "Create New Password"}
                {step === "success" && "Password Reset Successful"}
              </CardTitle>
              <CardDescription className="text-base">
                {step === "email" && "Enter your email address and we'll send you a verification code"}
                {step === "otp" && "Enter the 6-digit code we sent to your email"}
                {step === "reset" && "Choose a strong password for your account"}
                {step === "success" && "Your password has been reset successfully"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Email Input */}
              {step === "email" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@naethra.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailExists(null);
                        }}
                        className={`pl-11 h-12 text-base ${emailExists === false ? "border-destructive focus-visible:ring-destructive" : ""}`}
                        required
                      />
                    </div>
                    {emailExists === false && (
                      <p className="text-sm text-destructive mt-2 flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-xs">!</span>
                        This email address is not registered in our system.
                      </p>
                    )}
                    {emailExists === true && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        OTP has been sent to your email
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSendOTP}
                    className="w-full h-12 text-base"
                    size="lg"
                    disabled={isSendingOTP || !email}
                  >
                    {isSendingOTP ? (
                      <>
                        <Mail className="mr-2 h-5 w-5 animate-pulse" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-5 w-5" />
                        Send Verification Code
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {step === "otp" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-base font-medium">Verification Code</Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="otp"
                        type="text"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="pl-11 h-14 text-center text-3xl tracking-[0.5em] font-mono font-semibold"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-3">
                      <Clock className="h-3 w-3" />
                      <span>Code is valid for 10 minutes</span>
                    </div>
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      Didn't receive the code?{" "}
                      <button
                        onClick={() => {
                          setStep("email");
                          setOtp("");
                        }}
                        className="text-primary hover:underline font-medium"
                      >
                        Resend
                      </button>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep("email");
                        setOtp("");
                      }}
                      className="flex-1 h-12"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleVerifyOTP}
                      className="flex-1 h-12 text-base"
                      size="lg"
                      disabled={isVerifyingOTP || otp.length !== 6}
                    >
                      {isVerifyingOTP ? (
                        "Verifying..."
                      ) : (
                        <>
                          <KeyRound className="mr-2 h-5 w-5" />
                          Verify Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Reset Password */}
              {step === "reset" && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-base font-medium">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-11 h-12 text-base"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${newPassword.length >= 8 ? "bg-green-500" : "bg-muted"}`} />
                      <span>Must be at least 8 characters long</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-base font-medium">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-11 h-12 text-base"
                        required
                      />
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-sm text-destructive mt-2 flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-xs">!</span>
                        Passwords do not match
                      </p>
                    )}
                    {confirmPassword && newPassword === confirmPassword && newPassword.length >= 8 && (
                      <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Passwords match
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep("otp");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="flex-1 h-12"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleResetPassword}
                      className="flex-1 h-12 text-base"
                      size="lg"
                      disabled={isResettingPassword || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                    >
                      {isResettingPassword ? (
                        "Resetting..."
                      ) : (
                        <>
                          <Lock className="mr-2 h-5 w-5" />
                          Reset Password
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Success */}
              {step === "success" && (
                <div className="space-y-6 text-center py-4">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-6 animate-in zoom-in duration-500">
                      <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-500" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Password Reset Successful!</h3>
                    <p className="text-base text-muted-foreground max-w-sm mx-auto">
                      Your password has been reset successfully. You can now login with your new password.
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate("/login")}
                    className="w-full h-12 text-base"
                    size="lg"
                  >
                    Continue to Login
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          {step !== "success" && (
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Remember your password?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

