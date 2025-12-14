# Security Implementation Guide

This document outlines the security features implemented in the backend API.

## ✅ Implemented Features

### 1. Joi Validation
- **Status**: ✅ Implemented
- **Location**: `server/middleware/validation.js`
- **Usage**: Validation middleware for request body, query, and params
- **Example**:
  ```javascript
  import { validate, schemas } from '../middleware/validation.js';
  router.post('/login', validate(schemas.login), async (req, res) => {
    // Validated request body
  });
  ```

### 2. Helmet Security Headers
- **Status**: ✅ Implemented
- **Location**: `server/index.js`
- **Features**:
  - Content Security Policy (CSP)
  - XSS Protection
  - Frame Options
  - HSTS (HTTP Strict Transport Security)
  - And more security headers

### 3. Rate Limiting
- **Status**: ✅ Implemented
- **Location**: `server/index.js`
- **Configuration**:
  - **Global Rate Limit**: 100 requests per 15 minutes per IP
  - **Auth Rate Limit**: 5 requests per 15 minutes per IP (stricter for login)
  - Uses `express-rate-limit` package

### 4. CORS Configuration
- **Status**: ✅ Implemented
- **Location**: `server/index.js` and `server/config/config.js`
- **Configuration**: Configurable via environment variables
  - `CORS_ORIGIN`: Allowed origins (default: `*`)
  - `CORS_CREDENTIALS`: Allow credentials (default: `false`)

### 5. HTTPS Support
- **Status**: ✅ Implemented (Optional)
- **Location**: `server/index.js`
- **Configuration**: Enable via environment variables
  - `HTTPS_ENABLED=true`
  - `SSL_CERT_PATH=/path/to/cert.pem`
  - `SSL_KEY_PATH=/path/to/key.pem`
- **Note**: In production, HTTPS is typically handled by a reverse proxy (nginx, etc.)

### 6. JWT Access + Refresh Tokens
- **Status**: ✅ Implemented
- **Location**: 
  - `server/utils/jwt.js` - JWT utilities
  - `server/utils/refreshTokenService.js` - Refresh token management
  - `server/routes/auth.js` - Auth endpoints
  - `server/middleware/auth.js` - Authentication middleware

#### Token Configuration
- **Access Token**: 
  - Short-lived: 5-15 minutes (configurable per user via `session_timeout`)
  - Default: 15 minutes
  - Contains: userId, email, role, roleId
  
- **Refresh Token**: 
  - Long-lived: 7-30 days (default: 30 days)
  - Stored in database with hash
  - Can be revoked individually or for all devices

#### API Endpoints

##### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "Admin"
  },
  "expiresIn": 900
}
```

##### Refresh Access Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

##### Logout
```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

##### Logout from All Devices
```http
POST /api/auth/logout-all
Authorization: Bearer <accessToken>
```

##### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <accessToken>
```

## Database Schema

### Refresh Tokens Table
```sql
CREATE TABLE `refresh_tokens` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `token_id` VARCHAR(64) NOT NULL UNIQUE,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `revoked` BOOLEAN DEFAULT FALSE,
  `revoked_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_token_id` (`token_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_expires_at` (`expires_at`),
  INDEX `idx_revoked` (`revoked`)
);
```

**Migration File**: `database/migrations/create_refresh_tokens_table.sql`

## Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here  # Required: Generate with: openssl rand -hex 32
JWT_EXPIRES_IN=7d  # Optional: Default refresh token expiry

# HTTPS Configuration (Optional)
HTTPS_ENABLED=false  # Set to true to enable HTTPS
SSL_CERT_PATH=/path/to/cert.pem  # Path to SSL certificate
SSL_KEY_PATH=/path/to/key.pem  # Path to SSL private key

# CORS Configuration
CORS_ORIGIN=*  # Or specific origins: http://localhost:5173,https://example.com
CORS_CREDENTIALS=false  # Set to true if using credentials
```

## Installation

Install required packages:

```bash
cd server
npm install joi helmet jsonwebtoken
```

## Running Database Migration

Run the refresh tokens table migration:

```bash
mysql -u your_user -p your_database < database/migrations/create_refresh_tokens_table.sql
```

## Frontend Integration

### Storing Tokens
Store both tokens securely:
- **Access Token**: In memory or short-lived storage (sessionStorage)
- **Refresh Token**: In httpOnly cookie or secure storage (localStorage with encryption)

### Token Refresh Flow
1. Store access token and refresh token after login
2. Include access token in `Authorization: Bearer <token>` header for API requests
3. When access token expires (401 response), use refresh token to get new access token
4. Retry the original request with new access token

### Example Frontend Code
```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { accessToken, refreshToken } = await response.json();

// Store tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// API request with token
const apiResponse = await fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Handle token expiration
if (apiResponse.status === 401) {
  // Refresh token
  const refreshResponse = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  const { accessToken: newAccessToken } = await refreshResponse.json();
  
  // Retry original request
  // ...
}
```

## Security Best Practices

1. **JWT Secret**: Use a strong, random secret (minimum 32 characters)
2. **HTTPS**: Always use HTTPS in production
3. **Token Storage**: Store refresh tokens securely (httpOnly cookies recommended)
4. **Token Rotation**: Consider implementing refresh token rotation
5. **Rate Limiting**: Already implemented, but adjust limits as needed
6. **CORS**: Restrict CORS origins in production (don't use `*`)
7. **Token Expiry**: Keep access tokens short-lived (5-15 minutes)
8. **Logout**: Always revoke refresh tokens on logout

## Cleanup Job

A cleanup job runs automatically every 24 hours to remove expired refresh tokens from the database. This helps keep the database clean and improves performance.

## Testing

Test the implementation:

1. **Login**: `POST /api/auth/login`
2. **Get User**: `GET /api/auth/me` (with access token)
3. **Refresh Token**: `POST /api/auth/refresh` (with refresh token)
4. **Logout**: `POST /api/auth/logout` (with refresh token)

## Troubleshooting

### "JWT_SECRET not set" error
- Ensure `JWT_SECRET` is set in `.env` file
- Generate a secret: `openssl rand -hex 32`

### "Refresh token not found" error
- Token may have been revoked or expired
- Check database for token record
- User may need to login again

### Rate limit errors
- Too many requests from same IP
- Wait 15 minutes or adjust rate limit configuration

### HTTPS errors
- Check SSL certificate paths
- Ensure certificates are valid
- Check file permissions
