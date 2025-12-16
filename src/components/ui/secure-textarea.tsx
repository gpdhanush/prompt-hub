import { forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useSecurityValidation } from "@/hooks/useSecurityValidation";
import { SecurityAlertDialog } from "@/components/SecurityAlertDialog";

interface SecureTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  fieldName?: string;
  onSecurityAlert?: (fieldName: string, detectedContent: string) => void;
}

export const SecureTextarea = forwardRef<HTMLTextAreaElement, SecureTextareaProps>(
  ({ fieldName = "Textarea", onSecurityAlert, onChange, ...props }, ref) => {
    const { validateInput, securityAlertProps } = useSecurityValidation({
      onSecurityAlert,
    });

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const sanitized = validateInput(value, fieldName);
      
      // Create new event with sanitized value
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: sanitized,
        },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      
      onChange?.(syntheticEvent);
    };

    return (
      <>
        <Textarea ref={ref} {...props} onChange={handleChange} />
        <SecurityAlertDialog {...securityAlertProps} />
      </>
    );
  }
);

SecureTextarea.displayName = "SecureTextarea";

