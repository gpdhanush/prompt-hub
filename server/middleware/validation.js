import Joi from 'joi';
import { logger } from '../utils/logger.js';

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware
 */
export function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn(`Validation error for ${property}:`, errors);
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request property with validated and sanitized value
    req[property] = value;
    next();
  };
}

/**
 * Common validation schemas
 */
export const schemas = {
  // Auth schemas
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    })
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required'
    })
  }),

  // User schemas
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    email: Joi.string().email().optional().messages({
      'string.email': 'Email must be a valid email address'
    }),
    mobile: Joi.string().pattern(/^[0-9]{10}$/).optional().allow(null, '').messages({
      'string.pattern.base': 'Mobile number must be 10 digits'
    }),
    password: Joi.string().min(6).optional().messages({
      'string.min': 'Password must be at least 6 characters'
    }),
    oldPassword: Joi.string().when('password', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    session_timeout: Joi.number().integer().min(1).max(1440).optional()
  }),

  // Pagination schemas
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(255).optional().allow(''),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC')
  }),

  // ID parameter schema
  idParam: Joi.object({
    id: Joi.number().integer().positive().required()
  }),

  // Common email schema
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required'
  })
};
