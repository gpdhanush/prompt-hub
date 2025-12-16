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

    // Strategy 1: Try exact match (case-insensitive, trimmed)
    let [projects] = await db.query(
      `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
       FROM projects 
       WHERE (github_repo_url IS NOT NULL AND github_repo_url != '' AND LOWER(TRIM(github_repo_url)) = ?)
          OR (bitbucket_repo_url IS NOT NULL AND bitbucket_repo_url != '' AND LOWER(TRIM(bitbucket_repo_url)) = ?)`,
      [normalizedUrl, normalizedUrl]
    );

    // Strategy 2: Try normalized match (remove .git, trailing slashes) - more flexible
    if (projects.length === 0) {
      const normalizedForQuery = normalizedUrl.replace(/\.git$/, '').replace(/\/$/, '');
      [projects] = await db.query(
        `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
         FROM projects 
         WHERE (github_repo_url IS NOT NULL AND github_repo_url != '' AND 
                LOWER(REPLACE(REPLACE(REPLACE(TRIM(github_repo_url), '.git', ''), '/', ''), ' ', '')) = ?)
            OR (bitbucket_repo_url IS NOT NULL AND bitbucket_repo_url != '' AND 
                LOWER(REPLACE(REPLACE(REPLACE(TRIM(bitbucket_repo_url), '.git', ''), '/', ''), ' ', '')) = ?)`,
        [normalizedForQuery.replace(/\//g, ''), normalizedForQuery.replace(/\//g, '')]
      );
    }

    // Strategy 3: Try matching by repository path (owner/repo) - most flexible
    if (projects.length === 0 && repoPath) {
      [projects] = await db.query(
        `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
         FROM projects 
         WHERE (github_repo_url IS NOT NULL AND github_repo_url != '' AND LOWER(github_repo_url) LIKE ?)
            OR (bitbucket_repo_url IS NOT NULL AND bitbucket_repo_url != '' AND LOWER(bitbucket_repo_url) LIKE ?)
            OR (github_repo_url IS NOT NULL AND github_repo_url != '' AND 
                LOWER(REPLACE(REPLACE(REPLACE(REPLACE(github_repo_url, 'https://', ''), 'http://', ''), '.git', ''), '/', '')) LIKE ?)
            OR (bitbucket_repo_url IS NOT NULL AND bitbucket_repo_url != '' AND 
                LOWER(REPLACE(REPLACE(REPLACE(REPLACE(bitbucket_repo_url, 'https://', ''), 'http://', ''), '.git', ''), '/', '')) LIKE ?)`,
        [`%${repoPath}%`, `%${repoPath}%`, `%${repoPath.replace(/\//g, '')}%`, `%${repoPath.replace(/\//g, '')}%`]
      );
    }

    // Strategy 4: Try partial match by owner and repo separately
    if (projects.length === 0 && repoPath) {
      const repoParts = repoPath.split('/');
      if (repoParts.length === 2) {
        const [owner, repo] = repoParts;
        [projects] = await db.query(
          `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
           FROM projects 
           WHERE (github_repo_url IS NOT NULL AND github_repo_url != '' AND (
             LOWER(github_repo_url) LIKE ? OR 
             LOWER(github_repo_url) LIKE ? OR
             LOWER(github_repo_url) LIKE ?
           ))
           OR (bitbucket_repo_url IS NOT NULL AND bitbucket_repo_url != '' AND (
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

    // Strategy 5: Last resort - match just the repo name
    if (projects.length === 0 && repoPath) {
      const repoParts = repoPath.split('/');
      if (repoParts.length === 2) {
        const repo = repoParts[1];
        [projects] = await db.query(
          `SELECT id, name, project_code, github_repo_url, bitbucket_repo_url 
           FROM projects 
           WHERE (github_repo_url IS NOT NULL AND github_repo_url != '' AND LOWER(github_repo_url) LIKE ?)
              OR (bitbucket_repo_url IS NOT NULL AND bitbucket_repo_url != '' AND LOWER(bitbucket_repo_url) LIKE ?)`,
          [`%${repo}%`, `%${repo}%`]
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
    const branch = ref ? ref.replace('refs/heads/', '') : 'unknown';

    if (!commits || commits.length === 0) {
      logger.warn(`Push event received with no commits for project ${project.project_code}`);
      return { success: true, commitsProcessed: 0, note: 'No commits in push event' };
    }

    let processedCount = 0;
    let errorCount = 0;

    // Process each commit
    for (const commit of commits) {
      try {
        // Get commit SHA - GitHub webhooks use 'id' field for commit SHA
        const commitSha = commit.id || commit.sha || null;
        if (!commitSha) {
          logger.warn('Commit missing SHA/id, skipping:', commit);
          errorCount++;
          continue;
        }

        // Construct HTML URL for commit (GitHub provides API URL, we need HTML URL)
        const repoHtmlUrl = repository?.html_url || repository?.url || '';
        let commitHtmlUrl = commit.url || ''; // Fallback to provided URL
        
        if (repoHtmlUrl && commitSha) {
          // If we have HTML URL, construct commit URL
          if (repoHtmlUrl.includes('github.com')) {
            commitHtmlUrl = `${repoHtmlUrl.replace(/\/$/, '')}/commit/${commitSha}`;
          } else if (repoHtmlUrl.includes('bitbucket.org')) {
            commitHtmlUrl = `${repoHtmlUrl.replace(/\/$/, '')}/commits/${commitSha}`;
          }
        }
        
        // Extract author information - handle different payload structures
        const author = commit.author || commit.committer || {};
        const commitAuthor = author.name || author.username || pusher?.name || 'Unknown';
        const commitAuthorEmail = author.email || pusher?.email || null;
        
        // Extract commit message
        const commitMessage = commit.message || 'No commit message';
        
        
        const commitData = {
          project_id: project.id,
          activity_type: 'push',
          repository_url: repoHtmlUrl,
          branch: branch,
          commit_sha: commitSha,
          commit_message: commitMessage.substring(0, 10000), // Limit message length to prevent DB issues
          commit_author: commitAuthor.substring(0, 255), // Limit author name length
          commit_author_email: commitAuthorEmail ? commitAuthorEmail.substring(0, 255) : null,
          commit_url: commitHtmlUrl.substring(0, 500), // Limit URL length
          // GitHub push payload includes file lists but not line-level stats
          files_changed: (commit.added?.length || 0) + (commit.removed?.length || 0) + (commit.modified?.length || 0),
          additions: 0, // GitHub push payload doesn't include line-level additions
          deletions: 0, // GitHub push payload doesn't include line-level deletions
          raw_payload: JSON.stringify(commit).substring(0, 65535) // Limit JSON size
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

        processedCount++;
        logger.debug(`Stored commit ${commitSha.substring(0, 7)} for project ${project.project_code}`);
      } catch (commitError) {
        logger.error(`Error processing individual commit:`, commitError);
        errorCount++;
        // Continue processing other commits even if one fails
      }
    }

    logger.info(`Processed ${processedCount} of ${commits.length} commits for project ${project.project_code}${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
    return { 
      success: true, 
      commitsProcessed: processedCount,
      commitsTotal: commits.length,
      errors: errorCount
    };
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
    logger.debug('Webhook payload repository info:', {
      html_url: payload.repository?.html_url,
      url: payload.repository?.url,
      clone_url: payload.repository?.clone_url,
      git_url: payload.repository?.git_url,
      ssh_url: payload.repository?.ssh_url,
      full_name: payload.repository?.full_name,
      name: payload.repository?.name,
      owner: payload.repository?.owner?.login || payload.repository?.owner?.name,
      private: payload.repository?.private
    });

    // Get repository URL - try multiple fields (private repos might use different fields)
    const repoUrl = payload.repository?.html_url || 
                    payload.repository?.url || 
                    payload.repository?.clone_url ||
                    (payload.repository?.full_name ? `https://github.com/${payload.repository.full_name}` : null);
    
    if (!repoUrl) {
      logger.warn('GitHub webhook missing repository URL');
      logger.debug('Full repository object:', JSON.stringify(payload.repository, null, 2));
      return res.status(400).json({ 
        error: 'Missing repository URL',
        received_data: {
          repository_html_url: payload.repository?.html_url,
          repository_url: payload.repository?.url,
          repository_clone_url: payload.repository?.clone_url,
          repository_full_name: payload.repository?.full_name
        }
      });
    }

    logger.info(`Processing webhook for repository: ${repoUrl} (private: ${payload.repository?.private || false})`);

    // Find matching project
    const project = await findProjectByRepoUrl(repoUrl);
    if (!project) {
      logger.warn(`No project found for repository: ${repoUrl}`);
      
      // Get all projects with repo URLs for debugging
      let allProjects = [];
      try {
        const [projectsResult] = await db.query(
          `SELECT id, project_code, name, github_repo_url, bitbucket_repo_url 
           FROM projects 
           WHERE github_repo_url IS NOT NULL AND github_repo_url != ''
              OR bitbucket_repo_url IS NOT NULL AND bitbucket_repo_url != ''
           LIMIT 50`
        );
        allProjects = projectsResult;
        
        logger.info('Available projects with repository URLs:', 
          allProjects.map(p => ({
            code: p.project_code,
            name: p.name,
            github: p.github_repo_url,
            bitbucket: p.bitbucket_repo_url,
            github_normalized: normalizeRepoUrl(p.github_repo_url),
            bitbucket_normalized: normalizeRepoUrl(p.bitbucket_repo_url)
          }))
        );
        
        // Try to find close matches
        const normalizedInput = normalizeRepoUrl(repoUrl);
        const repoPath = extractRepoPath(repoUrl);
        const closeMatches = allProjects.filter(p => {
          const githubNorm = normalizeRepoUrl(p.github_repo_url);
          const bitbucketNorm = normalizeRepoUrl(p.bitbucket_repo_url);
          return githubNorm.includes(normalizedInput) || 
                 normalizedInput.includes(githubNorm) ||
                 bitbucketNorm.includes(normalizedInput) ||
                 normalizedInput.includes(bitbucketNorm) ||
                 (repoPath && (githubNorm.includes(repoPath) || bitbucketNorm.includes(repoPath)));
        });
        
        if (closeMatches.length > 0) {
          logger.info('Found close matches:', closeMatches.map(p => ({
            code: p.project_code,
            github: p.github_repo_url,
            bitbucket: p.bitbucket_repo_url
          })));
        }
      } catch (err) {
        logger.error('Error fetching projects for debugging:', err);
      }
      
      // Build helpful response with suggestions
      const suggestions = [];
      if (repoPath) {
        const [owner, repo] = repoPath.split('/');
        suggestions.push(`Try setting the repository URL to: https://github.com/${repoPath}`);
        suggestions.push(`Or: https://github.com/${repoPath}.git`);
        if (allProjects.length > 0) {
          suggestions.push(`Found ${allProjects.length} project(s) with repository URLs configured. Check if any match.`);
        }
      }

      return res.status(404).json({ 
        error: 'Project not found',
        message: `No project found matching repository URL: ${repoUrl}`,
        hint: 'Please ensure the repository URL is correctly configured in the project settings (Integrations section).',
        suggestions: suggestions,
        received_url: repoUrl,
        normalized_url: normalizeRepoUrl(repoUrl),
        extracted_repo_path: extractRepoPath(repoUrl),
        repository_info: {
          full_name: payload.repository?.full_name,
          name: payload.repository?.name,
          owner: payload.repository?.owner?.login || payload.repository?.owner?.name,
          private: payload.repository?.private
        },
        available_projects_count: allProjects.length,
        diagnostic_url: `/api/webhooks/diagnose?url=${encodeURIComponent(repoUrl)}`,
        troubleshooting: {
          step1: 'Go to your project edit page',
          step2: 'Navigate to the "Integrations" section',
          step3: `Set "Code Repo URL (Frontend)" or "Code Repo URL (Backend)" to: https://github.com/${repoPath || 'owner/repo'}`,
          step4: 'Save the project and try the webhook again'
        }
      });
    }

    logger.info(`Found project: ${project.project_code} (${project.name})`);

    // Handle different event types
    let result;
    switch (event) {
      case 'push':
        logger.info(`Processing push event for project ${project.project_code} with ${payload.commits?.length || 0} commit(s)`);
        result = await handlePushEvent(payload, project);
        logger.info(`Successfully processed push event: ${result.commitsProcessed || 0} commits stored`);
        break;
      case 'pull_request':
        result = await handlePullRequestEvent(payload, project);
        break;
      case 'issues':
        result = await handleIssuesEvent(payload, project);
        break;
      case 'deployment_status':
      case 'deployment':
        // Deployment events are informational - acknowledge but don't store
        logger.info(`Deployment event received for project ${project.project_code}: ${payload.deployment?.environment || payload.deployment_status?.state || 'unknown'}`);
        return res.status(200).json({ 
          success: true,
          message: 'Deployment event received',
          event: event,
          project: project.project_code,
          note: 'Deployment events are acknowledged but not stored in activity log. To see git push details, configure your GitHub webhook to also send "push" events.'
        });
      case 'create':
      case 'delete':
      case 'fork':
      case 'watch':
      case 'star':
      case 'release':
      case 'status':
        // Other informational events - acknowledge but don't process
        logger.info(`Informational event received: ${event} for project ${project.project_code}`);
        return res.status(200).json({ 
          success: true,
          message: 'Event received and acknowledged',
          event: event,
          project: project.project_code,
          note: 'This event type is acknowledged but not stored'
        });
      default:
        logger.info(`Unhandled GitHub event type: ${event} for project ${project.project_code}`);
        return res.status(200).json({ 
          success: true,
          message: 'Event received but not processed',
          event: event,
          project: project.project_code,
          note: `Event type '${event}' is not currently supported. Supported events: push, pull_request, issues`
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

// Diagnostic endpoint to check repository URL matching
router.get('/diagnose', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: 'Missing url parameter' });
    }

    const normalizedUrl = normalizeRepoUrl(url);
    const repoPath = extractRepoPath(url);

    // Get all projects with repo URLs
    const [allProjects] = await db.query(
      `SELECT id, project_code, name, github_repo_url, bitbucket_repo_url 
       FROM projects 
       WHERE github_repo_url IS NOT NULL OR bitbucket_repo_url IS NOT NULL`
    );

    const matches = [];
    for (const project of allProjects) {
      const githubNormalized = normalizeRepoUrl(project.github_repo_url);
      const bitbucketNormalized = normalizeRepoUrl(project.bitbucket_repo_url);
      const githubPath = extractRepoPath(project.github_repo_url);
      const bitbucketPath = extractRepoPath(project.bitbucket_repo_url);

      const matchReasons = [];
      if (githubNormalized === normalizedUrl || bitbucketNormalized === normalizedUrl) {
        matchReasons.push('exact_normalized_match');
      }
      if (githubPath === repoPath || bitbucketPath === repoPath) {
        matchReasons.push('repo_path_match');
      }
      if (githubNormalized.includes(repoPath) || bitbucketNormalized.includes(repoPath)) {
        matchReasons.push('contains_repo_path');
      }
      if (repoPath && (githubNormalized.includes(repoPath) || bitbucketNormalized.includes(repoPath))) {
        matchReasons.push('partial_match');
      }

      if (matchReasons.length > 0) {
        matches.push({
          project_code: project.project_code,
          name: project.name,
          github_repo_url: project.github_repo_url,
          bitbucket_repo_url: project.bitbucket_repo_url,
          match_reasons: matchReasons
        });
      }
    }

    res.json({
      input_url: url,
      normalized_url: normalizedUrl,
      extracted_repo_path: repoPath,
      total_projects_with_repos: allProjects.length,
      matching_projects: matches,
      all_projects: allProjects.map(p => ({
        project_code: p.project_code,
        name: p.name,
        github_repo_url: p.github_repo_url,
        bitbucket_repo_url: p.bitbucket_repo_url,
        github_normalized: normalizeRepoUrl(p.github_repo_url),
        bitbucket_normalized: normalizeRepoUrl(p.bitbucket_repo_url),
        github_path: extractRepoPath(p.github_repo_url),
        bitbucket_path: extractRepoPath(p.bitbucket_repo_url)
      }))
    });
  } catch (error) {
    logger.error('Error in diagnose endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

