import { AlertTriangle, Shield, X, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SecurityAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldName?: string;
  detectedContent?: string;
}

export function SecurityAlertDialog({
  open,
  onOpenChange,
  fieldName = "Input field",
  detectedContent,
}: SecurityAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <div className="relative">
          {/* Decorative background */}
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent" />
          
          {/* Header with icon */}
          <DialogHeader className="relative p-6 pb-4">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl" />
                <div className="relative p-4 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-full">
                  <Shield className="h-8 w-8 text-destructive" />
                </div>
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-destructive">
              Security Alert
            </DialogTitle>
            <DialogDescription className="text-center text-base mt-2">
              Potentially malicious content detected in your input
            </DialogDescription>
          </DialogHeader>

          {/* Warning content */}
          <div className="relative px-6 pb-4">
            <Card className="border-destructive/20 bg-gradient-to-br from-background to-destructive/5">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10 mt-0.5">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-destructive mb-1">
                      HTML or Script Tags Detected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The {fieldName} contains HTML tags, script tags, or other potentially harmful content that could be used to attack the system.
                    </p>
                  </div>
                </div>
                
                {detectedContent && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-destructive/20">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Detected content:</p>
                    <p className="text-xs font-mono text-destructive break-all">
                      {detectedContent.substring(0, 200)}
                      {detectedContent.length > 200 ? '...' : ''}
                    </p>
                  </div>
                )}
                
                <div className="flex items-start gap-3 pt-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 mt-0.5">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Why is this blocked?</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      HTML and script tags can be used to execute malicious code, steal data, or compromise the security of the application. All such content has been automatically removed for your protection.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer with actions */}
          <DialogFooter className="relative px-6 pb-6 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-destructive hover:bg-destructive/90"
            >
              <X className="mr-2 h-4 w-4" />
              I Understand
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

