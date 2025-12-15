import express from 'express';
import crypto from 'crypto';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// GitHub webhook secret (should be in environment variables)
const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || '';

// Middleware to verify GitHub webhook signature
function verifyGitHubSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  
  if (!signature) {
    logger.warn('GitHub webhook request missing signature');
    return res.status(401).json({ error: 'Missing signature' });
  }

  if (!GITHUB_WEBHOOK_SECRET) {
    logger.warn('GitHub webhook secret not configured');
    // In development, allow without secret verification
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }
    return next();
  }

  const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

  if (signature !== digest) {
    logger.warn('GitHub webhook signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
}

// Find project by repository URL
async function findProjectByRepoUrl(repoUrl) {
  try {
    // Normalize the URL (remove .git, trailing slashes, etc.)
    const normalizedUrl = repoUrl
      .replace(/\.git$/, '')
      .replace(/\/$/, '')
      .toLowerCase();

    // Search in both github_repo_url and bitbucket_repo_url fields
    const [projects] = await db.query(
      `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
       FROM projects 
       WHERE LOWER(REPLACE(REPLACE(github_repo_url, '.git', ''), '/', '')) = ? 
          OR LOWER(REPLACE(REPLACE(bitbucket_repo_url, '.git', ''), '/', '')) = ?`,
      [normalizedUrl.replace(/\//g, ''), normalizedUrl.replace(/\//g, '')]
    );

    // Also try exact match
    if (projects.length === 0) {
      const [exactProjects] = await db.query(
        `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
         FROM projects 
         WHERE github_repo_url = ? OR bitbucket_repo_url = ?`,
        [repoUrl, repoUrl]
      );
      return exactProjects[0] || null;
    }

    return projects[0] || null;
  } catch (error) {
    logger.error('Error finding project by repo URL:', error);
    return null;
  }
}

// Handle GitHub push event
async function handlePushEvent(payload, project) {
  try {
    const { ref, commits, repository, pusher } = payload;
    const branch = ref.replace('refs/heads/', '');

    // Process each commit
    for (const commit of commits || []) {
      const commitData = {
        project_id: project.id,
        activity_type: 'push',
        repository_url: repository.html_url || repository.url,
        branch: branch,
        commit_sha: commit.id,
        commit_message: commit.message,
        commit_author: commit.author.name || commit.author.username,
        commit_author_email: commit.author.email,
        commit_url: commit.url,
        files_changed: 0, // GitHub push payload doesn't include file stats
        additions: 0,
        deletions: 0,
        raw_payload: JSON.stringify(commit)
      };

      await db.query(
        `INSERT INTO project_activities 
         (project_id, activity_type, repository_url, branch, commit_sha, commit_message, 
          commit_author, commit_author_email, commit_url, files_changed, additions, deletions, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          commitData.project_id,
          commitData.activity_type,
          commitData.repository_url,
          commitData.branch,
          commitData.commit_sha,
          commitData.commit_message,
          commitData.commit_author,
          commitData.commit_author_email,
          commitData.commit_url,
          commitData.files_changed,
          commitData.additions,
          commitData.deletions,
          commitData.raw_payload
        ]
      );
    }

    logger.info(`Processed ${commits?.length || 0} commits for project ${project.project_code}`);
    return { success: true, commitsProcessed: commits?.length || 0 };
  } catch (error) {
    logger.error('Error handling push event:', error);
    throw error;
  }
}

// Handle GitHub pull request event
async function handlePullRequestEvent(payload, project) {
  try {
    const { action, pull_request, repository } = payload;
    
    if (action === 'opened' || action === 'closed' || action === 'synchronize') {
      const prData = {
        project_id: project.id,
        activity_type: 'pull_request',
        repository_url: repository.html_url || repository.url,
        branch: pull_request.head.ref,
        pull_request_number: pull_request.number,
        pull_request_title: pull_request.title,
        pull_request_url: pull_request.html_url,
        commit_author: pull_request.user.login,
        raw_payload: JSON.stringify(pull_request)
      };

      await db.query(
        `INSERT INTO project_activities 
         (project_id, activity_type, repository_url, branch, pull_request_number, 
          pull_request_title, pull_request_url, commit_author, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prData.project_id,
          prData.activity_type,
          prData.repository_url,
          prData.branch,
          prData.pull_request_number,
          prData.pull_request_title,
          prData.pull_request_url,
          prData.commit_author,
          prData.raw_payload
        ]
      );

      logger.info(`Processed pull request #${pull_request.number} for project ${project.project_code}`);
      return { success: true };
    }

    return { success: true, skipped: true };
  } catch (error) {
    logger.error('Error handling pull request event:', error);
    throw error;
  }
}

// Handle GitHub issues event
async function handleIssuesEvent(payload, project) {
  try {
    const { action, issue, repository } = payload;
    
    if (action === 'opened' || action === 'closed') {
      const issueData = {
        project_id: project.id,
        activity_type: 'issue',
        repository_url: repository.html_url || repository.url,
        issue_number: issue.number,
        issue_title: issue.title,
        issue_url: issue.html_url,
        commit_author: issue.user.login,
        raw_payload: JSON.stringify(issue)
      };

      await db.query(
        `INSERT INTO project_activities 
         (project_id, activity_type, repository_url, issue_number, issue_title, 
          issue_url, commit_author, raw_payload)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          issueData.project_id,
          issueData.activity_type,
          issueData.repository_url,
          issueData.issue_number,
          issueData.issue_title,
          issueData.issue_url,
          issueData.commit_author,
          issueData.raw_payload
        ]
      );

      logger.info(`Processed issue #${issue.number} for project ${project.project_code}`);
      return { success: true };
    }

    return { success: true, skipped: true };
  } catch (error) {
    logger.error('Error handling issues event:', error);
    throw error;
  }
}

// Main webhook endpoint
router.post('/github', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), verifyGitHubSignature, async (req, res) => {
  try {
    const event = req.headers['x-github-event'];
    const payload = req.body;

    logger.info(`Received GitHub webhook event: ${event}`);

    // Get repository URL
    const repoUrl = payload.repository?.html_url || payload.repository?.url;
    if (!repoUrl) {
      logger.warn('GitHub webhook missing repository URL');
      return res.status(400).json({ error: 'Missing repository URL' });
    }

    // Find matching project
    const project = await findProjectByRepoUrl(repoUrl);
    if (!project) {
      logger.warn(`No project found for repository: ${repoUrl}`);
      return res.status(404).json({ 
        error: 'Project not found',
        message: `No project found matching repository URL: ${repoUrl}`
      });
    }

    logger.info(`Found project: ${project.project_code} (${project.name})`);

    // Handle different event types
    let result;
    switch (event) {
      case 'push':
        result = await handlePushEvent(payload, project);
        break;
      case 'pull_request':
        result = await handlePullRequestEvent(payload, project);
        break;
      case 'issues':
        result = await handleIssuesEvent(payload, project);
        break;
      default:
        logger.info(`Unhandled GitHub event type: ${event}`);
        return res.status(200).json({ 
          message: 'Event received but not processed',
          event: event 
        });
    }

    res.status(200).json({
      success: true,
      project: project.project_code,
      event: event,
      result: result
    });
  } catch (error) {
    logger.error('Error processing GitHub webhook:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'webhooks' });
});

export default router;

