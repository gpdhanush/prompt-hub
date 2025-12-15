# GitHub Webhook Sample Payloads

This document shows example payloads that GitHub sends for different webhook events.

## Push Event

When code is pushed to a repository, GitHub sends a `push` event with commit details.

### Sample Push Payload

```json
{
  "ref": "refs/heads/main",
  "before": "abc123def456",
  "after": "def456ghi789",
  "repository": {
    "id": 123456789,
    "name": "prompt-hub",
    "full_name": "gpdhanush/prompt-hub",
    "html_url": "https://github.com/gpdhanush/prompt-hub",
    "url": "https://api.github.com/repos/gpdhanush/prompt-hub",
    "clone_url": "https://github.com/gpdhanush/prompt-hub.git",
    "private": true,
    "owner": {
      "login": "gpdhanush",
      "name": "Dhanush",
      "email": "dhanush@example.com"
    }
  },
  "pusher": {
    "name": "gpdhanush",
    "email": "dhanush@example.com"
  },
  "commits": [
    {
      "id": "def456ghi789",
      "message": "Add GitHub webhook integration\n\n- Implement webhook endpoint\n- Add project activities tracking\n- Update project detail view",
      "timestamp": "2024-12-15T22:30:00Z",
      "url": "https://api.github.com/repos/gpdhanush/prompt-hub/commits/def456ghi789",
      "author": {
        "name": "Dhanush",
        "email": "dhanush@example.com",
        "username": "gpdhanush"
      },
      "committer": {
        "name": "Dhanush",
        "email": "dhanush@example.com",
        "username": "gpdhanush"
      },
      "added": ["src/components/webhook.ts", "server/routes/webhooks.js"],
      "removed": [],
      "modified": ["src/pages/ProjectDetail.tsx", "README.md"]
    },
    {
      "id": "abc789xyz123",
      "message": "Fix webhook URL matching logic",
      "timestamp": "2024-12-15T22:25:00Z",
      "url": "https://api.github.com/repos/gpdhanush/prompt-hub/commits/abc789xyz123",
      "author": {
        "name": "Dhanush",
        "email": "dhanush@example.com",
        "username": "gpdhanush"
      },
      "committer": {
        "name": "Dhanush",
        "email": "dhanush@example.com",
        "username": "gpdhanush"
      },
      "added": [],
      "removed": [],
      "modified": ["server/routes/webhooks.js"]
    }
  ]
}
```

### What Gets Stored

For each commit in the push event, the system stores:
- **Commit SHA**: `def456ghi789`
- **Commit Message**: Full commit message
- **Author**: Name and email
- **Branch**: `main` (extracted from `ref`)
- **Repository URL**: `https://github.com/gpdhanush/prompt-hub`
- **Commit URL**: Link to view commit on GitHub
- **Timestamp**: When the commit was made

## Pull Request Event

When a pull request is opened, closed, or synchronized.

### Sample Pull Request Payload

```json
{
  "action": "opened",
  "number": 42,
  "pull_request": {
    "id": 987654321,
    "number": 42,
    "title": "Add GitHub webhook integration",
    "body": "This PR adds webhook support to track repository activity.\n\n## Changes\n- Webhook endpoint for GitHub events\n- Project activities table\n- UI updates to show commits",
    "state": "open",
    "html_url": "https://github.com/gpdhanush/prompt-hub/pull/42",
    "head": {
      "ref": "feature/webhook-integration",
      "sha": "def456ghi789"
    },
    "base": {
      "ref": "main",
      "sha": "abc123def456"
    },
    "user": {
      "login": "gpdhanush",
      "name": "Dhanush"
    },
    "created_at": "2024-12-15T22:00:00Z",
    "updated_at": "2024-12-15T22:30:00Z"
  },
  "repository": {
    "id": 123456789,
    "name": "prompt-hub",
    "full_name": "gpdhanush/prompt-hub",
    "html_url": "https://github.com/gpdhanush/prompt-hub",
    "private": true
  }
}
```

### Supported Actions

- `opened` - PR is created
- `closed` - PR is closed (merged or not merged)
- `synchronize` - New commits added to PR

## Issue Event

When an issue is opened or closed.

### Sample Issue Payload

```json
{
  "action": "opened",
  "issue": {
    "id": 123456,
    "number": 15,
    "title": "Webhook not matching project repository URL",
    "body": "The webhook is receiving events but can't find the matching project.",
    "state": "open",
    "html_url": "https://github.com/gpdhanush/prompt-hub/issues/15",
    "user": {
      "login": "gpdhanush",
      "name": "Dhanush"
    },
    "created_at": "2024-12-15T22:20:00Z",
    "updated_at": "2024-12-15T22:20:00Z"
  },
  "repository": {
    "id": 123456789,
    "name": "prompt-hub",
    "full_name": "gpdhanush/prompt-hub",
    "html_url": "https://github.com/gpdhanush/prompt-hub",
    "private": true
  }
}
```

## Testing Webhooks

### View Sample Payloads

```bash
GET /api/webhooks/samples
```

Returns sample payloads for all supported event types.

### Test Webhook Processing

You can test webhook processing with sample data:

```bash
POST /api/webhooks/test/push
Content-Type: application/json

{
  "project_id": 1
}
```

Or using repository URL:

```bash
POST /api/webhooks/test/push
Content-Type: application/json

{
  "repository_url": "https://github.com/gpdhanush/prompt-hub"
}
```

### Supported Test Event Types

- `push` - Test push/commit events
- `pull_request` - Test PR events
- `issues` - Test issue events

## Data Flow

1. **GitHub sends webhook** → Your server receives payload
2. **Extract repository URL** → Match to project in database
3. **Process event** → Store in `project_activities` table
4. **Display in UI** → Show in Project Detail page

## Commit Information Displayed

In the Project Detail page, each commit shows:

- ✅ **Commit Message** - Full message with formatting
- ✅ **Commit SHA** - Shortened (first 7 characters)
- ✅ **Branch** - Which branch the commit was pushed to
- ✅ **Author** - Name and email
- ✅ **Date/Time** - When the commit was made
- ✅ **File Stats** - Files changed, additions, deletions (if available)
- ✅ **Link** - Direct link to view commit on GitHub

## Example Commit Display

```
┌─────────────────────────────────────────────────┐
│ 🔵 Commit Icon                                   │
│                                                 │
│ Add GitHub webhook integration                  │
│ [main] badge                                    │
│                                                 │
│ abc1234 • View on GitHub                        │
│                                                 │
│ 📄 4 files • +150 additions • -25 deletions   │
│                                                 │
│ 👤 Dhanush (dhanush@example.com)                │
│ 📅 December 15, 2024 at 10:30 PM               │
└─────────────────────────────────────────────────┘
```

## Notes

- **Private Repositories**: Work exactly the same as public repos
- **Multiple Commits**: Each commit in a push is stored separately
- **Branch Information**: Extracted from the `ref` field (e.g., `refs/heads/main`)
- **File Changes**: GitHub push payloads don't include file stats, but PR payloads do

