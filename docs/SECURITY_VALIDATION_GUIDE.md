# Security Validation Guide

## Overview
All form inputs across the project must validate against HTML tags, script tags, and other potentially malicious content to prevent XSS (Cross-Site Scripting) attacks.

## Implementation

### 1. Using SecureInput Component
Replace standard `Input` components with `SecureInput`:

```tsx
import { SecureInput } from "@/components/ui/secure-input";

// Instead of:
<Input value={value} onChange={handleChange} />

// Use:
<SecureInput 
  fieldName="Field Name" 
  value={value} 
  onChange={handleChange} 
/>
```

### 2. Using SecureTextarea Component
Replace standard `Textarea` components with `SecureTextarea`:

```tsx
import { SecureTextarea } from "@/components/ui/secure-textarea";

// Instead of:
<Textarea value={value} onChange={handleChange} />

// Use:
<SecureTextarea 
  fieldName="Field Name" 
  value={value} 
  onChange={handleChange} 
/>
```

### 3. Using useSecurityValidation Hook
For custom validation logic:

```tsx
import { useSecurityValidation } from "@/hooks/useSecurityValidation";

function MyForm() {
  const { validateInput, validateFormData, SecurityAlert } = useSecurityValidation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = validateInput(e.target.value, "Field Name");
    setValue(sanitized);
  };

  const handleSubmit = () => {
    const sanitizedData = validateFormData(formData, ['field1', 'field2']);
    // Submit sanitizedData
  };

  return (
    <>
      <form>
        {/* Your form fields */}
      </form>
      <SecurityAlert />
    </>
  );
}
```

## What Gets Blocked

The validation detects and removes:
- HTML tags: `<div>`, `<p>`, `<span>`, etc.
- Script tags: `<script>`, `</script>`
- JavaScript protocol: `javascript:`
- Event handlers: `onclick`, `onerror`, `onload`, etc.
- Data URLs: `data:text/html`

## Security Alert Dialog

When malicious content is detected:
1. Content is automatically sanitized (HTML/scripts removed)
2. A modern security alert dialog appears
3. User is informed about the security issue
4. Sanitized content is used instead

## Backend Validation

Backend also validates all inputs using `validateAndSanitizeObject` middleware. This provides double protection:
- Frontend: Immediate feedback and sanitization
- Backend: Server-side validation as final security layer

## Required for All Forms

The following forms MUST use security validation:
- ✅ Support Ticket Create/Update
- ✅ Employee Forms
- ✅ Project Forms
- ✅ Task Forms
- ✅ Bug Forms
- ✅ Comment Forms
- ✅ Any custom forms with text inputs

## Markdown Editor

The `MarkdownEditor` component is safe to use for rich text (descriptions, comments) as it:
- Uses markdown syntax (not raw HTML)
- Renders markdown safely
- Validates on backend before storage

