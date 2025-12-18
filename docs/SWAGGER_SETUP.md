# Swagger API Documentation Setup

## Overview

Swagger/OpenAPI documentation has been added to the project to provide interactive API documentation.

## Installation

Install the required packages in the `server` directory:

```bash
cd server
npm install swagger-jsdoc swagger-ui-express
```

## Accessing Swagger UI

Once the server is running, access the Swagger UI at:

- **Swagger UI**: `http://localhost:3001/api-docs`
- **Swagger JSON**: `http://localhost:3001/api-docs.json`

## Adding Documentation to Routes

To document your API endpoints, add JSDoc comments above your route handlers. Here's an example:

```javascript
/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/', authenticate, async (req, res) => {
  // Your route handler
});
```

## Authentication

The Swagger UI supports JWT Bearer token authentication. To test authenticated endpoints:

1. Click the "Authorize" button in Swagger UI
2. Enter your JWT token in the format: `Bearer <your-token>`
3. Click "Authorize" and "Close"

## Configuration

Swagger configuration is located in `server/config/swagger.js`. You can customize:

- API title and description
- Server URLs
- Security schemes
- Common schemas
- Tags/categories

## Example Endpoints Already Documented

- `/api/auth/login` - User login endpoint
- `/api/tasks` - Get all tasks endpoint

## Next Steps

1. Install the packages: `cd server && npm install`
2. Start your server
3. Visit `http://localhost:3001/api-docs` to see the Swagger UI
4. Add JSDoc comments to more routes as needed

## Resources

- [Swagger JSDoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [OpenAPI Specification](https://swagger.io/specification/)

