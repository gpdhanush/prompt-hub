import swaggerJsdoc from 'swagger-jsdoc';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SERVER_CONFIG } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get PORT from environment or use default
const PORT = process.env.PORT || 3001;

// Get production URL from environment or use default
const PRODUCTION_URL = SERVER_CONFIG.API_BASE_URL 
  ? SERVER_CONFIG.API_BASE_URL.replace('/api', '') // Remove /api suffix if present
  : 'https://api.example.com';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Admin Dashboard API',
      version: '1.0.0',
      description: '🚀 Admin Dashboard API Documentation\n\n' +
        'Welcome to the comprehensive API documentation for the Admin Dashboard application.\n\n' +
        '## Features\n\n' +
        '- 🔐 Secure Authentication - JWT-based authentication with refresh tokens\n' +
        '- 👥 User Management - Complete user and employee management\n' +
        '- 📋 Task Management - Create, assign, and track tasks\n' +
        '- 🐛 Bug Tracking - Comprehensive bug reporting and tracking\n' +
        '- 📊 Project Management - Full project lifecycle management\n' +
        '- 📈 Reporting - Detailed analytics and reports\n' +
        '- 🔔 Notifications - Real-time notifications via FCM\n' +
        '- 📱 Multi-device Support - Access from any device\n\n' +
        '## Getting Started\n\n' +
        '1. Authentication: Start by logging in at /api/auth/login\n' +
        '2. Get Token: Use the returned accessToken for authenticated requests\n' +
        '3. Authorize: Click the "Authorize" button and enter: Bearer <your-token>\n' +
        '4. Explore: Browse endpoints by category using the tags below\n\n' +
        '## Base URL\n\n' +
        '- Development: http://localhost:' + PORT + '\n' +
        '- Production: ' + PRODUCTION_URL + '\n\n' +
        '## Support\n\n' +
        'For API support, please contact: support@example.com',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server',
      },
      {
        url: PRODUCTION_URL,
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'Authentication cookie',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            status: {
              type: 'number',
              description: 'HTTP status code',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: {
                  type: 'number',
                  example: 1,
                },
                limit: {
                  type: 'number',
                  example: 10,
                },
                total: {
                  type: 'number',
                  example: 100,
                },
                totalPages: {
                  type: 'number',
                  example: 10,
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string' },
            role_id: { type: 'integer' },
            status: { type: 'string', enum: ['Active', 'Inactive'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            task_code: { type: 'string' },
            project_id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['Low', 'Med', 'High'] },
            stage: { type: 'string' },
            status: { type: 'string' },
            deadline: { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            project_code: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string' },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            emp_code: { type: 'string' },
            user_id: { type: 'integer' },
            position_id: { type: 'integer' },
            department: { type: 'string' },
            joining_date: { type: 'string', format: 'date' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Bug: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            bug_code: { type: 'string' },
            project_id: { type: 'integer' },
            task_id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            type: { type: 'string' },
            title: { type: 'string' },
            message: { type: 'string' },
            is_read: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Employees',
        description: 'Employee management endpoints',
      },
      {
        name: 'Projects',
        description: 'Project management endpoints',
      },
      {
        name: 'Tasks',
        description: 'Task management endpoints',
      },
      {
        name: 'Bugs',
        description: 'Bug tracking endpoints',
      },
      {
        name: 'Leaves',
        description: 'Leave management endpoints',
      },
      {
        name: 'Reimbursements',
        description: 'Reimbursement management endpoints',
      },
      {
        name: 'Notifications',
        description: 'Notification endpoints',
      },
      {
        name: 'FCM',
        description: 'Firebase Cloud Messaging endpoints',
      },
      {
        name: 'Reports',
        description: 'Reporting endpoints',
      },
      {
        name: 'Settings',
        description: 'Application settings endpoints',
      },
      {
        name: 'Assets',
        description: 'IT Asset management endpoints',
      },
    ],
  },
  apis: [
    join(__dirname, '../routes/*.js'),
    join(__dirname, '../index.js'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

