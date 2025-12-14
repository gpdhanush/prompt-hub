/**
 * Sanitizes input to remove HTML and script tags
 * @param {string} input - The input string to sanitize
 * @returns {string} Sanitized string with HTML/script tags removed
 */
export function sanitizeInput(input) {
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
 * @param {string} input - The input string to validate
 * @returns {boolean} true if input contains HTML/script tags, false otherwise
 */
export function containsHtmlOrScript(input) {
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
 * Validates and sanitizes an object's string properties
 * @param {object} data - Object with string properties to validate
 * @param {string[]} fields - Array of field names to validate (optional, validates all string fields if not provided)
 * @returns {object} Object with sanitized values and any validation errors
 */
export function validateAndSanitizeObject(data, fields = null) {
  const sanitized = { ...data };
  const errors = [];
  
  const fieldsToValidate = fields || Object.keys(data);
  
  for (const field of fieldsToValidate) {
    if (data[field] && typeof data[field] === 'string') {
      if (containsHtmlOrScript(data[field])) {
        errors.push(`${field} contains HTML or script tags`);
        sanitized[field] = sanitizeInput(data[field]);
      }
    }
  }
  
  return {
    data: sanitized,
    errors: errors.length > 0 ? errors : null
  };
}
