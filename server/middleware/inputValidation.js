import { validateAndSanitizeObject } from '../utils/inputValidation.js';

/**
 * Middleware to validate and sanitize request body for HTML/script tags
 * @param {string[]} fields - Array of field names to validate (optional, validates all string fields if not provided)
 */
export function validateInput(fields = null) {
  return (req, res, next) => {
    // Only validate if there's a body
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }
    
    const validation = validateAndSanitizeObject(req.body, fields);
    
    if (validation.errors && validation.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid input detected', 
        details: validation.errors.join('; ') 
      });
    }
    
    // Replace req.body with sanitized data
    req.body = validation.data;
    next();
  };
}
