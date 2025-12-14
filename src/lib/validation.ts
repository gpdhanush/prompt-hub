/**
 * Sanitizes input to remove HTML and script tags
 * @param input - The input string to sanitize
 * @returns Sanitized string with HTML/script tags removed
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and their content (case insensitive)
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove on* event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove data: URLs that might contain scripts
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  return sanitized.trim();
}

/**
 * Validates if input contains HTML or script tags
 * @param input - The input string to validate
 * @returns true if input contains HTML/script tags, false otherwise
 */
export function containsHtmlOrScript(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }
  
  // Check for HTML tags
  const htmlTagPattern = /<[^>]+>/;
  
  // Check for script tags
  const scriptPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i;
  
  // Check for javascript: protocol
  const jsProtocolPattern = /javascript:/i;
  
  // Check for on* event handlers
  const eventHandlerPattern = /\s*on\w+\s*=/i;
  
  return htmlTagPattern.test(input) || 
         scriptPattern.test(input) || 
         jsProtocolPattern.test(input) || 
         eventHandlerPattern.test(input);
}

/**
 * Validates and sanitizes input, showing error if HTML/script detected
 * @param input - The input string to validate
 * @param fieldName - Name of the field for error message
 * @returns Object with sanitized value and error message
 */
export function validateAndSanitize(input: string, fieldName: string = 'Field'): { value: string; error: string | null } {
  if (containsHtmlOrScript(input)) {
    return {
      value: sanitizeInput(input),
      error: `${fieldName} cannot contain HTML or script tags. They have been removed.`
    };
  }
  return {
    value: input,
    error: null
  };
}
