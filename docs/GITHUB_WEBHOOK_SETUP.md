# GitHub Webhook Setup Guide

This guide explains how to set up GitHub webhooks to automatically track commits, pull requests, and issues for your projects.

## Overview

When you push code to GitHub, the webhook will:
- Automatically detect which project the repository belongs to
- Store commit information, pull requests, and issues
- Display this activity in the Project Detail page

## Prerequisites

1. A project in the system with a GitHub repository URL configured
2. Access to your GitHub repository settings
3. Your backend server URL (for webhook delivery)

## Setup Steps

### 1. Configure Webhook Secret (Backend)

Add the webhook secret to your environment variables:

```bash
# In your .env file or environment configuration
GITHUB_WEBHOOK_SECRET=your-secret-key-here
```

Generate a secure random secret:
```bash
# Using OpenSSL
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Run Database Migration

Run the migration to create the `project_activities` table:

```bash
# Connect to your MySQL database
mysql -u your_user -p admin_dashboard < database/migrations/create_project_activities_table.sql
```

Or execute the SQL directly:
```sql
-- See database/migrations/create_project_activities_table.sql
```

### 3. Configure Project Repository URL

In your project management system:
1. Go to the project edit page
2. Navigate to the "Integrations" section
3. Enter your GitHub repository URL in "Code Repo URL (Frontend)" or "Code Repo URL (Backend)"
   - Example: `https://github.com/username/repository`
   - Or: `https://github.com/username/repository.git`

### 4. Set Up GitHub Webhook

1. Go to your GitHub repository
2. Navigate to **Settings** → **Webhooks** → **Add webhook**

3. Configure the webhook:
   - **Payload URL**: `https://your-backend-domain.com/api/webhooks/github`
     - For local development: `http://localhost:5000/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: The same secret you set in `GITHUB_WEBHOOK_SECRET`
   - **Which events would you like to trigger this webhook?**
     - Select "Let me select individual events"
     - Check:
       - ✅ **Pushes** (for commits)
       - ✅ **Pull requests** (for PR events)
       - ✅ **Issues** (for issue events)
       - ✅ **Branch or tag creation** (optional)

4. Click **Add webhook**

### 5. Test the Webhook

1. Make a test commit to your repository:
   ```bash
   git commit --allow-empty -m "Test webhook"
   git push
   ```

2. Check the webhook delivery:
   - In GitHub: Go to **Settings** → **Webhooks** → Click on your webhook
   - View recent deliveries to see if it was successful

3. Verify in your project:
   - Go to the Project Detail page
   - Check the "Repository Activity" section
   - You should see your commit listed

## Supported Events

The webhook currently handles:

- **Push Events**: Tracks commits with:
  - Commit SHA
  - Commit message
  - Author name and email
  - Branch name
  - Commit URL

- **Pull Request Events**: Tracks PRs with:
  - PR number and title
  - PR URL
  - Branch name
  - Author

- **Issue Events**: Tracks issues with:
  - Issue number and title
  - Issue URL
  - Author

## API Endpoints

### Get Project Activities

```http
GET /api/projects/:id/activities
```

Query Parameters:
- `activity_type` (optional): Filter by type (`push`, `pull_request`, `issue`, etc.)
- `limit` (optional): Number of activities to return (default: 50)

Example:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api.com/api/projects/1/activities?limit=20
```

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook URL**: Ensure it's accessible from GitHub
   - For local development, use a service like [ngrok](https://ngrok.com/) to expose your local server

2. **Verify secret**: Make sure `GITHUB_WEBHOOK_SECRET` matches in both:
   - Your backend environment
   - GitHub webhook settings

3. **Check logs**: Review server logs for webhook errors:
   ```bash
   # Check your server logs
   tail -f server.log
   ```

### Project Not Found

- Ensure the repository URL in your project matches exactly with GitHub
- The system matches URLs by:
  - Removing `.git` suffix
  - Removing trailing slashes
  - Case-insensitive comparison

### Activities Not Showing

1. **Check database**: Verify activities are being stored:
   ```sql
   SELECT * FROM project_activities WHERE project_id = YOUR_PROJECT_ID;
   ```

2. **Check API response**: Test the activities endpoint directly

3. **Verify repository URL**: Ensure the project has the correct GitHub URL configured

## Security Notes

- Always use HTTPS for webhook URLs in production
- Keep your webhook secret secure and never commit it to version control
- The webhook verifies GitHub signatures to prevent unauthorized requests
- In development, signature verification can be disabled if `GITHUB_WEBHOOK_SECRET` is not set

## Example Webhook Payload

GitHub sends webhook payloads in this format:

```json
{
  "ref": "refs/heads/main",
  "commits": [
    {
      "id": "abc123...",
      "message": "Fix bug in login",
      "author": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "url": "https://github.com/user/repo/commit/abc123"
    }
  ],
  "repository": {
    "html_url": "https://github.com/username/repository"
  }
}
```

The webhook automatically extracts this information and stores it in the database.

## Next Steps

- View activities in the Project Detail page
- Filter activities by type (commits, PRs, issues)
- Track development progress automatically
- Get notified of repository changes

