import { useState, useCallback } from 'react';
import { containsHtmlOrScript, sanitizeInput } from '@/lib/validation';

interface UseSecurityValidationOptions {
  onSecurityAlert?: (fieldName: string, detectedContent: string) => void;
}

export function useSecurityValidation(options: UseSecurityValidationOptions = {}) {
  const [securityAlert, setSecurityAlert] = useState<{
    isOpen: boolean;
    fieldName: string;
    detectedContent: string;
  }>({
    isOpen: false,
    fieldName: '',
    detectedContent: '',
  });

  const validateInput = useCallback(
    (value: string, fieldName: string = 'Field'): string => {
      if (!value || typeof value !== 'string') {
        return value;
      }

      if (containsHtmlOrScript(value)) {
        const sanitized = sanitizeInput(value);
        
        // Show security alert
        setSecurityAlert({
          isOpen: true,
          fieldName,
          detectedContent: value,
        });

        // Call custom handler if provided
        if (options.onSecurityAlert) {
          options.onSecurityAlert(fieldName, value);
        }

        // Return sanitized value
        return sanitized;
      }

      return value;
    },
    [options]
  );

  const validateFormData = useCallback(
    (data: Record<string, any>, fieldNames?: string[]): Record<string, any> => {
      const sanitized = { ...data };
      const fieldsToCheck = fieldNames || Object.keys(data);

      for (const field of fieldsToCheck) {
        if (data[field] && typeof data[field] === 'string') {
          sanitized[field] = validateInput(data[field], field);
        }
      }

      return sanitized;
    },
    [validateInput]
  );

  return {
    validateInput,
    validateFormData,
    securityAlertProps: {
      open: securityAlert.isOpen,
      onOpenChange: (isOpen: boolean) => {
        setSecurityAlert((prev) => ({ ...prev, isOpen }));
      },
      fieldName: securityAlert.fieldName,
      detectedContent: securityAlert.detectedContent,
    },
    hasSecurityIssue: securityAlert.isOpen,
  };
}
