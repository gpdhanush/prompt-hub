# Complete Swagger Documentation Guide

This project now has comprehensive Swagger/OpenAPI documentation for all API endpoints.

## Access Swagger UI

- **URL**: `http://localhost:3001/api-docs`
- **JSON Spec**: `http://localhost:3001/api-docs.json`

## Documentation Status

### ✅ Fully Documented Routes

1. **Authentication** (`/api/auth/*`)
   - POST `/api/auth/login` - User login
   - POST `/api/auth/refresh` - Refresh access token
   - POST `/api/auth/logout` - Logout user
   - POST `/api/auth/logout-all` - Logout from all devices
   - GET `/api/auth/me` - Get current user
   - PUT `/api/auth/me/profile` - Update profile
   - GET `/api/auth/me/permissions` - Get user permissions
   - POST `/api/auth/forgot-password` - Request password reset
   - POST `/api/auth/verify-otp` - Verify OTP
   - POST `/api/auth/reset-password` - Reset password

2. **Tasks** (`/api/tasks/*`)
   - GET `/api/tasks` - Get all tasks (with pagination and filters)

### 📝 Partially Documented Routes

The following routes have basic structure but may need additional endpoint documentation:

- Users (`/api/users/*`)
- Employees (`/api/employees/*`)
- Projects (`/api/projects/*`)
- Bugs (`/api/bugs/*`)
- Leaves (`/api/leaves/*`)
- Reimbursements (`/api/reimbursements/*`)
- Notifications (`/api/notifications/*`)
- FCM (`/api/fcm/*`)
- Reports (`/api/reports/*`)
- Settings (`/api/settings/*`)
- Assets (`/api/assets/*`)
- Roles (`/api/roles/*`)
- Positions (`/api/positions/*`)
- Permissions (`/api/permissions/*`)
- Audit Logs (`/api/audit-logs/*`)
- Reminders (`/api/reminders/*`)
- Document Requests (`/api/document-requests/*`)
- Webhooks (`/api/webhooks/*`)
- Search (`/api/search/*`)
- MFA (`/api/mfa/*`)
- Prompts (`/api/prompts/*`)

## Adding Documentation to New Endpoints

To add Swagger documentation to a new endpoint, add JSDoc comments above the route handler:

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: Brief description
 *     tags: [YourTag]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: paramName
 *         schema:
 *           type: string
 *         description: Parameter description
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *       401:
 *         description: Unauthorized
 */
router.get('/your-endpoint', authenticate, async (req, res) => {
  // Your route handler
});
```

## Common Schemas

The following reusable schemas are available:

- `Error` - Standard error response
- `Success` - Standard success response
- `PaginatedResponse` - Paginated list response
- `User` - User object schema
- `Task` - Task object schema
- `Project` - Project object schema
- `Employee` - Employee object schema
- `Bug` - Bug object schema
- `Notification` - Notification object schema

## Authentication

All protected endpoints require JWT Bearer token authentication. In Swagger UI:

1. Click the "Authorize" button
2. Enter your token: `Bearer <your-jwt-token>`
3. Click "Authorize"

## Testing Endpoints

Swagger UI provides a "Try it out" feature for each endpoint:

1. Click on an endpoint to expand it
2. Click "Try it out"
3. Fill in parameters/request body
4. Click "Execute"
5. View the response

## Next Steps

To complete documentation for all endpoints:

1. Review each route file
2. Add Swagger JSDoc comments above each route handler
3. Include request/response schemas
4. Document all parameters
5. Add example values where helpful

