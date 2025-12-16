import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { useSecurityValidation } from "@/hooks/useSecurityValidation";
import { SecurityAlertDialog } from "@/components/SecurityAlertDialog";

interface SecureInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  fieldName?: string;
  onSecurityAlert?: (fieldName: string, detectedContent: string) => void;
}

export const SecureInput = forwardRef<HTMLInputElement, SecureInputProps>(
  ({ fieldName = "Input", onSecurityAlert, onChange, ...props }, ref) => {
    const { validateInput, securityAlertProps } = useSecurityValidation({
      onSecurityAlert,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const sanitized = validateInput(value, fieldName);
      
      // Create new event with sanitized value
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: sanitized,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      
      onChange?.(syntheticEvent);
    };

    return (
      <>
        <Input ref={ref} {...props} onChange={handleChange} />
        <SecurityAlertDialog {...securityAlertProps} />
      </>
    );
  }
);

SecureInput.displayName = "SecureInput";

