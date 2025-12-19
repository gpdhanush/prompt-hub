import { logger } from './logger.js';

/**
 * Parse commit message to extract task ID and status keywords
 * @param {string} commitMessage - Commit message
 * @returns {Object} Parsed result with taskId and status
 */
export function parseCommitMessage(commitMessage) {
  if (!commitMessage || typeof commitMessage !== 'string') {
    return { taskId: null, status: null, keywords: [] };
  }

  const message = commitMessage.trim();
  const taskIdPattern = /(KAN|kan|Kan)-(\d+)/i;
  const match = message.match(taskIdPattern);

  if (!match) {
    return { taskId: null, status: null, keywords: [] };
  }

  const taskId = `${match[1].toUpperCase()}-${match[2]}`;
  const keywords = extractStatusKeywords(message);

  return {
    taskId,
    status: mapKeywordsToStatus(keywords),
    keywords,
    originalMessage: message,
  };
}

/**
 * Extract status keywords from commit message
 * @param {string} message - Commit message
 * @returns {Array<string>} Array of found keywords
 */
function extractStatusKeywords(message) {
  const lowerMessage = message.toLowerCase();
  const keywords = [];

  // Status keywords (order matters - more specific first)
  const statusKeywords = [
    'ready for testing',
    'ready for review',
    'ready for qa',
    'code review',
    'code-review',
    'review',
    'reviewed',
    'in progress',
    'in-progress',
    '#in-progress',
    '#inprogress',
    'start',
    'started',
    'progress',
    'working on',
    'fix',
    'fixed',
    'fixing',
    'bug fix',
    'done',
    'completed',
    'complete',
    'finished',
    'finish',
    'test',
    'testing',
    'reopen',
    'reopened',
    'deploy',
    'deployed',
  ];

  for (const keyword of statusKeywords) {
    if (lowerMessage.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  return keywords;
}

/**
 * Map keywords to Kanban status
 * @param {Array<string>} keywords - Array of keywords
 * @returns {string|null} Mapped status or null
 */
function mapKeywordsToStatus(keywords) {
  if (keywords.length === 0) return null;

  const lowerKeywords = keywords.map(k => k.toLowerCase());

  // Priority order (most specific first) - matches new status flow
  // New → In Progress → Code Review → Testing → Reopen → Completed
  
  if (lowerKeywords.some(k => k.includes('completed') || k.includes('complete') || k.includes('done') || k.includes('finished') || k.includes('finish'))) {
    return 'Completed';
  }

  if (lowerKeywords.some(k => k.includes('reopen') || k.includes('reopened'))) {
    return 'Reopen';
  }

  if (lowerKeywords.some(k => k.includes('ready for testing') || k.includes('ready for qa') || k.includes('test') || k.includes('testing'))) {
    return 'Testing';
  }

  if (lowerKeywords.some(k => k.includes('code review') || k.includes('code-review') || k.includes('ready for review') || k.includes('review') || k.includes('reviewed'))) {
    return 'Code Review';
  }

  if (lowerKeywords.some(k => k.includes('start') || k.includes('started') || k.includes('progress') || k.includes('in progress') || k.includes('in-progress') || k.includes('#in-progress') || k.includes('#inprogress') || k.includes('fix') || k.includes('working on'))) {
    return 'In Progress';
  }

  return null;
}

/**
 * Extract task IDs from multiple commit messages
 * @param {Array<Object>} commits - Array of commit objects with message property
 * @returns {Array<Object>} Array of parsed results
 */
export function parseCommits(commits) {
  if (!Array.isArray(commits)) {
    return [];
  }

  return commits
    .map(commit => ({
      ...parseCommitMessage(commit.message || commit.commit?.message || ''),
      commitHash: commit.sha || commit.id,
      author: commit.author?.name || commit.commit?.author?.name,
      date: commit.commit?.author?.date || commit.date,
    }))
    .filter(result => result.taskId !== null);
}

/**
 * Validate GitHub webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - X-Hub-Signature-256 header value
 * @param {string} secret - Webhook secret
 * @returns {boolean} True if signature is valid
 */
export async function validateGitHubSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  try {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch (error) {
    logger.error('Error validating GitHub signature:', error);
    return false;
  }
}

