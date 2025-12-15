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

// Normalize repository URL for comparison
function normalizeRepoUrl(url) {
  if (!url) return '';
  return url
    .replace(/\.git$/, '')           // Remove .git suffix
    .replace(/\/$/, '')              // Remove trailing slash
    .toLowerCase()                   // Convert to lowercase
    .trim();                         // Remove whitespace
}

// Extract repository path from URL (e.g., "gpdhanush/prompt-hub" from "https://github.com/gpdhanush/prompt-hub")
function extractRepoPath(url) {
  if (!url) return '';
  try {
    const normalized = normalizeRepoUrl(url);
    // Match patterns like:
    // - https://github.com/owner/repo
    // - https://bitbucket.org/owner/repo
    // - git@github.com:owner/repo
    const patterns = [
      /github\.com[\/:]([^\/]+)\/([^\/\s]+)/,
      /bitbucket\.org[\/:]([^\/]+)\/([^\/\s]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        return `${match[1]}/${match[2]}`;
      }
    }
    return normalized;
  } catch (error) {
    return normalizeRepoUrl(url);
  }
}

// Find project by repository URL
async function findProjectByRepoUrl(repoUrl) {
  try {
    if (!repoUrl) {
      logger.warn('Empty repository URL provided');
      return null;
    }

    const normalizedUrl = normalizeRepoUrl(repoUrl);
    const repoPath = extractRepoPath(repoUrl);
    
    logger.debug('Finding project for repo URL:', repoUrl);
    logger.debug('Normalized URL:', normalizedUrl);
    logger.debug('Extracted repo path:', repoPath);

    // Strategy 1: Try exact match (case-insensitive)
    let [projects] = await db.query(
      `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
       FROM projects 
       WHERE LOWER(TRIM(github_repo_url)) = ? 
          OR LOWER(TRIM(bitbucket_repo_url)) = ?`,
      [normalizedUrl, normalizedUrl]
    );

    // Strategy 2: Try normalized match (remove .git, trailing slashes)
    if (projects.length === 0) {
      [projects] = await db.query(
        `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
         FROM projects 
         WHERE LOWER(REPLACE(REPLACE(TRIM(github_repo_url), '.git', ''), '/', '')) = LOWER(REPLACE(REPLACE(?, '.git', ''), '/', ''))
            OR LOWER(REPLACE(REPLACE(TRIM(bitbucket_repo_url), '.git', ''), '/', '')) = LOWER(REPLACE(REPLACE(?, '.git', ''), '/', ''))`,
        [repoUrl, repoUrl]
      );
    }

    // Strategy 3: Try matching by repository path (owner/repo)
    if (projects.length === 0 && repoPath) {
      [projects] = await db.query(
        `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
         FROM projects 
         WHERE LOWER(github_repo_url) LIKE ? 
            OR LOWER(bitbucket_repo_url) LIKE ?
            OR LOWER(REPLACE(REPLACE(REPLACE(github_repo_url, 'https://', ''), 'http://', ''), '.git', '')) LIKE ?
            OR LOWER(REPLACE(REPLACE(REPLACE(bitbucket_repo_url, 'https://', ''), 'http://', ''), '.git', '')) LIKE ?`,
        [`%${repoPath}%`, `%${repoPath}%`, `%${repoPath}%`, `%${repoPath}%`]
      );
    }

    // Strategy 4: Try partial match (contains the repo path)
    if (projects.length === 0 && repoPath) {
      const repoParts = repoPath.split('/');
      if (repoParts.length === 2) {
        const [owner, repo] = repoParts;
        [projects] = await db.query(
          `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
           FROM projects 
           WHERE (github_repo_url IS NOT NULL AND (
             LOWER(github_repo_url) LIKE ? OR 
             LOWER(github_repo_url) LIKE ? OR
             LOWER(github_repo_url) LIKE ?
           ))
           OR (bitbucket_repo_url IS NOT NULL AND (
             LOWER(bitbucket_repo_url) LIKE ? OR 
             LOWER(bitbucket_repo_url) LIKE ? OR
             LOWER(bitbucket_repo_url) LIKE ?
           ))`,
          [
            `%${owner}/${repo}%`,
            `%${owner}%${repo}%`,
            `%${repo}%`,
            `%${owner}/${repo}%`,
            `%${owner}%${repo}%`,
            `%${repo}%`
          ]
        );
      }
    }

    if (projects.length > 0) {
      logger.info(`Found project: ${projects[0].project_code} (${projects[0].name}) for repo: ${repoUrl}`);
      logger.debug('Matched URL:', projects[0].github_repo_url || projects[0].bitbucket_repo_url);
      return projects[0];
    }

    logger.warn(`No project found for repository: ${repoUrl}`);
    logger.debug('Tried matching with:', { normalizedUrl, repoPath });
    
    // Log all projects with repo URLs for debugging
    const [allProjects] = await db.query(
      `SELECT id, project_code, name, github_repo_url, bitbucket_repo_url 
       FROM projects 
       WHERE github_repo_url IS NOT NULL OR bitbucket_repo_url IS NOT NULL
       LIMIT 10`
    );
    logger.debug('Available projects with repo URLs:', allProjects.map(p => ({
      code: p.project_code,
      github: p.github_repo_url,
      bitbucket: p.bitbucket_repo_url
    })));

    return null;
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
      
      // Get all projects with repo URLs for debugging
      try {
        const [allProjects] = await db.query(
          `SELECT id, project_code, name, github_repo_url, bitbucket_repo_url 
           FROM projects 
           WHERE github_repo_url IS NOT NULL OR bitbucket_repo_url IS NOT NULL
           LIMIT 20`
        );
        logger.debug('Available projects with repository URLs:', 
          allProjects.map(p => ({
            code: p.project_code,
            name: p.name,
            github: p.github_repo_url,
            bitbucket: p.bitbucket_repo_url
          }))
        );
      } catch (err) {
        logger.error('Error fetching projects for debugging:', err);
      }
      
      return res.status(404).json({ 
        error: 'Project not found',
        message: `No project found matching repository URL: ${repoUrl}`,
        hint: 'Please ensure the repository URL is correctly configured in the project settings (Integrations section)',
        received_url: repoUrl
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

