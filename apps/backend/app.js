import { DynamoDBDataLayer } from './dynamodb.js';
import { getStoryPRs, addStoryPR, removeStoryPR } from './story-prs.js';
import { spawnSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, stat, mkdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
// Removed delegation imports - now using direct PR creation

// Global DynamoDB client for reuse
let dynamoClient = null;
async function getDynamoClient() {
  if (!dynamoClient && process.env.NODE_ENV !== 'test' && process.env.STORIES_TABLE && process.env.AWS_REGION) {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }
  return dynamoClient;
}

// Helper function to get acceptance tests for a story
async function getAcceptanceTests(db, storyId) {
  if (db.constructor.name === 'DynamoDBDataLayer') {
    // Use db's existing method instead of creating new client
    const allTests = await db.getAllAcceptanceTests();
    return allTests.filter(test => test.storyId === storyId);
  } else {
    const stmt = db.prepare('SELECT * FROM acceptance_tests WHERE story_id = ?');
    return stmt.all(storyId);
  }
}

// Load configuration from environments.yaml
import CONFIG from './config.js';

async function loadTemplate(templateName) {
  try {
    const templatePath = path.join(__dirname, '../../semantic-api/templates', `${templateName}.md`);
    return await readFile(templatePath, 'utf8');
  } catch (error) {
    console.error(`Failed to load template ${templateName}:`, error);
    return null;
  }
}

// Set environment variables from config
Object.entries(CONFIG).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = String(value);
  }
});

// Debug logging configuration
const DEBUG = process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development';
const debugLog = (...args) => {
  if (DEBUG) {
    console.log('[DEBUG]', new Date().toISOString(), ...args);
  }
};

// Add delegation helper functions
function ensureGithubToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GitHub token not configured');
  }
  return token;
}

function generateConfirmationCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function githubRequest(path, options = {}) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const token = ensureGithubToken();
      const url = new URL(path, 'https://api.github.com');
      const headers = {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'aipm-delegation-server',
      };
      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
      });
      const text = await response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
      if (!response.ok) {
        const message = (data && data.message) || `GitHub request failed with status ${response.status}`;
        const error = Object.assign(new Error(message), { statusCode: response.status || 502, details: data });
        
        // Don't retry on 4xx errors except 429 (rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw error;
        }
        
        throw error;
      }
      return data;
    } catch (error) {
      lastError = error;
      console.error(`❌ GitHub API attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries && (error.statusCode === 429 || error.statusCode >= 500)) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Retrying GitHub API in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

async function getAllStories(db) {
  const query = 'SELECT * FROM stories ORDER BY id';
  const rows = await new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
  
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    storyPoints: row.story_points,
    parentId: row.parent_id,
    assignee: row.assignee,
    component: row.component
  }));
}

function getAllDescendants(stories, parentId) {
  const children = stories.filter(s => s.parentId === parentId);
  const descendants = [...children];
  children.forEach(child => {
    descendants.push(...getAllDescendants(stories, child.id));
  });
  return descendants;
}

async function handleCreatePRWithCodeRequest(req, res) {
  const startTime = Date.now();
  let success = false;
  let errorType = null;

  try {
    // Check GitHub token first
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      errorType = 'config_error';
      sendJson(res, 400, { message: 'GitHub token not configured' });
      return;
    }

    const body = await readRequestBody(req);
    const payload = JSON.parse(body);
    
    const result = await performDelegation(payload);
    success = true;
    
    // Store PR in database if storyId is provided
    if (payload.storyId && result.number) {
      const db = await ensureDatabase();
      const prEntry = {
        localId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        storyId: payload.storyId,
        taskTitle: payload.taskTitle || 'Development task',
        repo: `${payload.owner}/${payload.repo}`,
        branchName: result.branchName,
        number: result.number,
        type: result.type,
        taskId: result.taskId,
        prUrl: result.html_url,
        htmlUrl: result.html_url,
        taskUrl: result.taskHtmlUrl || result.html_url,
        threadUrl: result.threadHtmlUrl || result.html_url,
        confirmationCode: result.confirmationCode,
        createdAt: new Date().toISOString()
      };
      await addStoryPR(db, payload.storyId, prEntry);
    }
    
    sendJson(res, 200, result);
  } catch (error) {
    success = false;
    errorType = error.statusCode >= 400 && error.statusCode < 500 ? 'client_error' : 'server_error';
    console.error('Personal delegation request failed', error);
    const status = error.statusCode || 500;
    sendJson(res, status, { message: error.message || 'Failed to create delegation' });
  } finally {
    // Log metrics
    const duration = Date.now() - startTime;
    console.log(`📊 Delegation request: success=${success}, duration=${duration}ms, error=${errorType || 'none'}`);
  }
}

async function handlePersonalDelegateStatusRequest(req, res, url) {
  try {
    const owner = url.searchParams.get('owner');
    const repo = url.searchParams.get('repo');
    const number = url.searchParams.get('number');
    
    if (!owner || !repo || !number) {
      sendJson(res, 400, { message: 'owner, repo, and number are required' });
      return;
    }

    const comments = await githubRequest(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=30&direction=desc`);
    
    sendJson(res, 200, {
      fetchedAt: new Date().toISOString(),
      totalComments: Array.isArray(comments) ? comments.length : 0,
      latestComment: comments?.[0] || null
    });
  } catch (error) {
    console.error('Personal delegation status request failed', error);
    const status = error.statusCode || 500;
    sendJson(res, status, { message: error.message || 'Failed to fetch status' });
  }
}

// Update Task Specification file when User Story changes
async function updateTaskSpecificationFile(storyId, updatedStory) {
  try {
    // Notify Kiro API server to update Task Specification
    const response = await fetch('http://44.197.204.18:8081/api/update-task-spec', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        storyId: storyId,
        updatedStory: updatedStory
      })
    });
    
    if (response.ok) {
      console.log(`✅ Updated Task Specification for story ${storyId}`);
    } else {
      console.log(`⚠️ Failed to update Task Specification for story ${storyId}:`, response.status);
    }
  } catch (error) {
    console.log(`⚠️ Error updating Task Specification for story ${storyId}:`, error.message);
  }
}

function normalizeDelegatePayload(payload) {
  const owner = String(payload.owner || '').trim();
  const repo = String(payload.repo || '').trim();
  const repositoryApiUrl = String(payload.repositoryApiUrl || '').trim();
  const branchName = String(payload.branchName || '').trim();
  const taskTitle = String(payload.taskTitle || '').trim();
  const objective = String(payload.objective || '').trim();
  const prTitle = String(payload.prTitle || '').trim();
  const constraints = String(payload.constraints || '').trim();
  const target = String(payload.target || 'new-issue');
  const acceptanceCriteria = normalizeAcceptanceCriteria(payload.acceptanceCriteria);
  const storyTitle = String(payload.storyTitle || '').trim();
  const storyId = payload.storyId ?? null;

  let targetNumber = payload.targetNumber;
  if (target !== 'new-issue' && target !== 'pr') {
    // Only require target number for existing issues/PRs, not for creating new ones
    if (targetNumber == null || targetNumber === '') {
      throw Object.assign(new Error('Issue or PR number is required'), { statusCode: 400 });
    }
    targetNumber = Number(targetNumber);
    if (!Number.isFinite(targetNumber) || targetNumber <= 0) {
      throw Object.assign(new Error('Issue or PR number must be a positive integer'), { statusCode: 400 });
    }
  }

  return {
    repositoryApiUrl,
    owner,
    repo,
    branchName,
    taskTitle,
    objective,
    prTitle,
    constraints,
    acceptanceCriteria,
    target,
    targetNumber,
    storyTitle,
    storyId,
  };
}

function normalizeAcceptanceCriteria(criteria) {
  if (typeof criteria === 'string') {
    return criteria.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  }
  if (Array.isArray(criteria)) {
    return criteria.map(item => String(item || '').trim()).filter(item => item.length > 0);
  }
  return [];
}

function buildTaskBrief(payload) {
  const criteria = normalizeAcceptanceCriteria(payload.acceptanceCriteria);
  const lines = [
    '@codex',
    '',
    '# AIPM Task Brief',
    `**Story ID:** ${payload.storyId ?? 'N/A'}`,
    `**Story Title:** ${payload.storyTitle ?? payload.taskTitle ?? 'N/A'}`,
    '',
    '## 📋 Full Story Details',
    payload.objective || 'Deliver the referenced story with Codex support.',
    '',
    '## 🎯 Deliverables',
    `- Implement feature per story in branch: \`${payload.branchName}\``,
    '- Tests: unit + minimal e2e (where applicable)',
    `- PR back to main with title: "${payload.prTitle}"`,
    '- Code should follow existing patterns and conventions',
    '- Include proper error handling and validation',
    '',
  ];

  // Add constraints section if provided
  if (payload.constraints && payload.constraints.trim()) {
    lines.push('## ⚠️ Constraints');
    lines.push(payload.constraints.trim());
    lines.push('');
  }

  // Add acceptance criteria section
  lines.push('## ✅ Acceptance Criteria');
  if (criteria.length) {
    criteria.forEach((line) => {
      lines.push(`- ${line}`);
    });
  } else {
    lines.push('- Define measurable acceptance criteria with Codex.');
  }

  lines.push(
    '',
    '## 📁 Repository Info',
    `**Owner/Repo:** ${payload.owner}/${payload.repo}`,
    `**Default API URL:** https://api.github.com/repos/${payload.owner}/${payload.repo}`,
    '',
    '---',
    '*Auto-generated from AIPM Story Management System*'
  );

  return lines.join('\n');
}

async function generateCodeWithKiro(taskTitle, objective, constraints, acceptanceCriteria) {
  try {
    console.log(`🤖 Using EC2 Kiro API for code generation`);
    
    const prompt = `Generate complete working JavaScript code for: ${taskTitle}

Objective: ${objective}
Constraints: ${constraints}
Acceptance Criteria: ${acceptanceCriteria?.join(', ') || 'None specified'}

Project context: AIPM is a vanilla JavaScript project with Express backend. Include proper error handling and JSDoc comments. Return only the code, no explanations.`;

    const response = await fetch('http://44.197.204.18:8081/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(600000) // 10 minute timeout
    });

    if (!response.ok) {
      throw new Error(`EC2 Kiro API returned ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ EC2 Kiro API call successful');
    
    if (result.success && result.output) {
      // Clean ANSI codes and extract code
      const cleanOutput = result.output
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/\r/g, '')
        .split('\n')
        .filter(line => line.includes('function') || line.includes('const') || line.includes('let') || line.includes('var') || line.includes('export') || line.includes('/**') || line.includes('*') || line.includes('*/') || line.includes('{') || line.includes('}') || line.includes('return'))
        .join('\n')
        .trim();

      return {
        files: [{
          path: `${taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.js`,
          content: cleanOutput || `// Generated by EC2 Kiro API\n// ${taskTitle}\n// ${objective}\n\nfunction implementation() {\n  // Implementation generated\n  return true;\n}`
        }],
        summary: `Code generated by EC2 Kiro API for: ${taskTitle}`
      };
    }

    throw new Error('No valid output from Kiro API');

  } catch (error) {
    console.error(`❌ EC2 Kiro API failed:`, error.message);
    
    return {
      files: [{
        path: `${taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.js`,
        content: `// ${taskTitle}\n// ${objective}\n\n/**\n * ${taskTitle}\n * ${objective}\n */\nfunction ${taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '')}() {\n  // TODO: Implement ${objective}\n  return 'Not implemented';\n}\n\nexport default ${taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '')};`
      }],
      summary: `Fallback implementation for: ${taskTitle}`,
      error: error.message
    };
  }
}

async function performDelegation(payload) {
  const normalized = normalizeDelegatePayload(payload);
  const repoPath = `/repos/${normalized.owner}/${normalized.repo}`;
  const confirmationCode = generateConfirmationCode();

  // Generate code using Kiro CLI
  const generatedCode = await generateCodeWithKiro(
    normalized.taskTitle,
    normalized.objective,
    normalized.constraints,
    normalizeAcceptanceCriteria(normalized.acceptanceCriteria)
  );

  if (normalized.target === 'new-issue') {
    // Create issue with generated code
    const body = buildTaskBrief({ ...normalized, owner: normalized.owner, repo: normalized.repo });
    const codeSection = `\n\n## 🤖 Generated Code\n\n${generatedCode.files.map(f => `**${f.path}:**\n\`\`\`javascript\n${f.content}\n\`\`\``).join('\n\n')}\n\n**Summary:** ${generatedCode.summary}`;
    
    const issue = await githubRequest(`${repoPath}/issues`, {
      method: 'POST',
      body: JSON.stringify({
        title: normalized.taskTitle,
        body: body + codeSection,
      }),
    });
    return {
      type: 'issue',
      id: issue.id,
      html_url: issue.html_url,
      number: issue.number,
      taskHtmlUrl: issue.html_url,
      threadHtmlUrl: issue.html_url,
      confirmationCode,
      generatedCode,
    };
  }

  if (normalized.target === 'pr') {
    const timestamp = Date.now();
    const branchName = normalized.branchName ? 
      `${normalized.branchName}-${timestamp}` : 
      `feature/${normalized.taskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${timestamp}`;
    
    // Get default branch
    const repoInfo = await githubRequest(`${repoPath}`);
    const baseBranch = repoInfo.default_branch || 'main';
    const baseRef = await githubRequest(`${repoPath}/git/ref/heads/${baseBranch}`);
    
    // Create new branch
    await githubRequest(`${repoPath}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: baseRef.object.sha
      })
    });
    
    // Create blobs for generated code files
    const treeItems = [];
    for (const file of generatedCode.files) {
      const blob = await githubRequest(`${repoPath}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64'
        })
      });
      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      });
    }
    
    // Add TASK.md with task description
    const taskContent = `# ${normalized.taskTitle}\n\n${normalized.objective}\n\nConstraints: ${normalized.constraints}\n\nAcceptance Criteria:\n${normalizeAcceptanceCriteria(normalized.acceptanceCriteria).map(c => `- ${c}`).join('\n')}\n\n## Generated Code Summary\n${generatedCode.summary}`;
    const taskBlob = await githubRequest(`${repoPath}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({
        content: Buffer.from(taskContent).toString('base64'),
        encoding: 'base64'
      })
    });
    treeItems.push({
      path: 'TASK.md',
      mode: '100644',
      type: 'blob',
      sha: taskBlob.sha
    });
    
    // Get base tree
    const baseCommit = await githubRequest(`${repoPath}/git/commits/${baseRef.object.sha}`);
    
    // Create tree with generated files
    const tree = await githubRequest(`${repoPath}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseCommit.tree.sha,
        tree: treeItems
      })
    });
    
    // Create commit
    const commit = await githubRequest(`${repoPath}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: `feat: ${normalized.taskTitle}`,
        tree: tree.sha,
        parents: [baseRef.object.sha]
      })
    });
    
    // Update branch reference
    await githubRequest(`${repoPath}/git/refs/heads/${branchName}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: commit.sha
      })
    });
    
    // Create PR
    const pr = await githubRequest(`${repoPath}/pulls`, {
      method: 'POST',
      body: JSON.stringify({
        title: normalized.prTitle || normalized.taskTitle,
        head: branchName,
        base: baseBranch,
        body: `## ${normalized.taskTitle}\n\n${normalized.objective}\n\n### Constraints\n${normalized.constraints}\n\n### Acceptance Criteria\n${normalizeAcceptanceCriteria(normalized.acceptanceCriteria).map(c => `- ${c}`).join('\n')}\n\n---\n⏳ **Code is being generated by Kiro CLI...**`
      })
    });
    
    // Call Kiro API to generate code (fire and forget - don't wait)
    const criteria = normalizeAcceptanceCriteria(normalized.acceptanceCriteria);
    const hasCriteria = criteria.length > 0 && criteria.some(c => c.trim().length > 0);
    const hasConstraints = normalized.constraints && normalized.constraints.trim().length > 1;
    
    // Build detailed task description for Kiro
    let taskDescription = `${normalized.objective}`;
    
    if (hasConstraints) {
      taskDescription += `\n\nConstraints: ${normalized.constraints}`;
    }
    
    if (hasCriteria) {
      taskDescription += `\n\nAcceptance Criteria:\n${criteria.map(c => `- ${c}`).join('\n')}`;
    } else {
      // Provide implementation guidance when criteria is missing
      taskDescription += `\n\nImplementation guidance:
- Add the button to the Development Tasks section in apps/frontend/public/app.js
- Button should be labeled "${normalized.taskTitle.replace(/^I Want /i, '').replace(/"/g, '')}"
- Implement the button's click handler
- Follow existing button patterns in the codebase
- Test the functionality works correctly`;
    }
    
    const prProcessorUrl = process.env.EC2_PR_PROCESSOR_URL || process.env.SESSION_POOL_URL || 'http://localhost:8082';
    
    console.log(`🤖 Calling PR Processor: ${prProcessorUrl}/api/process-pr for PR #${pr.number}`);
    
    // Call PR Processor using http module (Lambda compatible)
    const http = await import('node:http');
    const prUrl = new URL(`${prProcessorUrl}/api/process-pr`);
    const postData = JSON.stringify({
      branch: branchName,
      prNumber: pr.number,
      taskDetails: taskDescription
    });
    
    const options = {
      hostname: prUrl.hostname,
      port: prUrl.port || 80,
      path: prUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 5000
    };
    
    const req = http.default.request(options, (res) => {
      console.log(`📡 PR Processor response status: ${res.statusCode}`);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✅ PR Processor:`, result.status || 'Processing started');
        } catch (e) {
          console.log(`✅ PR Processor: Response received`);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`❌ PR Processor failed:`, error.message);
    });
    
    req.on('timeout', () => {
      console.error(`❌ PR Processor timeout`);
      req.destroy();
    });
    
    req.write(postData);
    req.end();
    
    return {
      type: 'pull_request',
      id: pr.id,
      html_url: pr.html_url,
      number: pr.number,
      branchName: branchName,
      taskHtmlUrl: pr.html_url,
      threadHtmlUrl: pr.html_url,
      confirmationCode: `PR${timestamp}`,
    };
  }

  // Handle existing issue/PR comments
  const number = normalized.targetNumber;
  const comment = await githubRequest(`${repoPath}/issues/${number}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
  return {
    type: 'comment',
    id: comment.id,
    html_url: comment.html_url,
    number,
    taskHtmlUrl: comment.html_url ? comment.html_url.split('#')[0] : null,
    threadHtmlUrl: comment.html_url,
    confirmationCode,
  };
}

const SQLITE_COMMAND = process.env.AI_PM_SQLITE_CLI || 'sqlite3';

export const COMPONENT_CATALOG = [
  'WorkModel',
  'Document_Intelligence',
  'Review_Governance',
  'Orchestration_Engagement',
  'Run_Verify',
  'Traceabilty_Insight',
];

const STORY_STATUS_VALUES = ['Draft', 'Ready', 'In Progress', 'Blocked', 'Approved', 'Done'];
const STORY_STATUS_DEFAULT = STORY_STATUS_VALUES[0];

const COMPONENT_LOOKUP = new Map(
  COMPONENT_CATALOG.map((name) => [name.toLowerCase(), name])
);

const UNSPECIFIED_COMPONENT = 'Unspecified';

const EPIC_STORY_POINT_THRESHOLD = 10;

const STORY_DEPENDENCY_RELATIONSHIPS = ['depends', 'blocks'];
const STORY_DEPENDENCY_DEFAULT = STORY_DEPENDENCY_RELATIONSHIPS[0];

const SQLITE_NO_SUCH_TABLE = /no such table/i;

const PYTHON_SQLITE_EXPORT_SCRIPT = `
import json
import sqlite3
import sys
import datetime
import os
import traceback

target = sys.argv[1]
payload = json.load(sys.stdin)
now = datetime.datetime.utcnow().isoformat(timespec='milliseconds') + 'Z'

tables = payload.get('tables', {})
columns = payload.get('columns', {})

has_title_column = 'title' in columns.get('acceptance_tests', [])

ALLOWED_COMPONENTS = ${JSON.stringify(COMPONENT_CATALOG)}
ALLOWED_LOOKUP = {item.lower(): item for item in ALLOWED_COMPONENTS}


def normalize_text(value, default=''):
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def normalize_int(value, default=None):
    if value is None or value == '':
        return default
    try:
        return int(value)
    except Exception:
        try:
            return int(float(value))
        except Exception:
            return default


def normalize_timestamp(primary, fallback):
    value = normalize_text(primary, '')
    if value:
        return value
    value = normalize_text(fallback, '')
    if value:
        return value
    return now


def normalize_components(value):
    entries = []
    if isinstance(value, list):
        entries.extend(normalize_text(item, '') for item in value)
    text = normalize_text(value, '')
    if text:
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                entries.extend(normalize_text(item, '') for item in parsed)
        except Exception:
            normalized_text = text.replace(',', chr(10)).replace(';', chr(10))
            for chunk in normalized_text.splitlines():
                entry = normalize_text(chunk, '')
                if entry:
                    entries.append(entry)
    normalized = []
    seen = set()
    for entry in entries:
        key = entry.lower()
        canonical = ALLOWED_LOOKUP.get(key)
        if canonical and canonical not in seen:
            seen.add(canonical)
            normalized.append(canonical)
    return json.dumps(normalized)


try:
    conn = sqlite3.connect(target)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_stories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mr_id INTEGER DEFAULT 1,
          parent_id INTEGER,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          as_a TEXT DEFAULT '',
          i_want TEXT DEFAULT '',
          so_that TEXT DEFAULT '',
          components TEXT DEFAULT '[]',
          story_point INTEGER,
          assignee_email TEXT DEFAULT '',
          status TEXT DEFAULT 'Draft',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(parent_id) REFERENCES user_stories(id) ON DELETE CASCADE
        );
        """
    )

    if has_title_column:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS acceptance_tests (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              story_id INTEGER NOT NULL,
              title TEXT DEFAULT '',
              given TEXT NOT NULL,
              when_step TEXT NOT NULL,
              then_step TEXT NOT NULL,
              status TEXT DEFAULT 'Draft',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
            );
            """
        )
    else:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS acceptance_tests (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              story_id INTEGER NOT NULL,
              given TEXT NOT NULL,
              when_step TEXT NOT NULL,
              then_step TEXT NOT NULL,
              status TEXT DEFAULT 'Draft',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
            );
            """
        )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reference_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          story_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
        );
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS story_dependencies (
          story_id INTEGER NOT NULL,
          depends_on_story_id INTEGER NOT NULL,
          relationship TEXT DEFAULT 'depends',
          PRIMARY KEY (story_id, depends_on_story_id),
          FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE,
          FOREIGN KEY(depends_on_story_id) REFERENCES user_stories(id) ON DELETE CASCADE
        );
        """
    )

    story_rows = []
    for row in tables.get('user_stories', []):
        story_rows.append(
            (
                normalize_int(row.get('id'), 0),
                normalize_int(row.get('mr_id'), 1) or 1,
                normalize_int(row.get('parent_id')),
                normalize_text(row.get('title'), ''),
                normalize_text(row.get('description'), ''),
                normalize_text(row.get('as_a'), ''),
                normalize_text(row.get('i_want'), ''),
                normalize_text(row.get('so_that'), ''),
                normalize_components(row.get('components')),
                normalize_int(row.get('story_point')),
                normalize_text(row.get('assignee_email'), ''),
                normalize_text(row.get('status'), 'Draft'),
                normalize_timestamp(row.get('created_at'), row.get('updated_at')),
                normalize_timestamp(row.get('updated_at'), row.get('created_at')),
            )
        )

    if story_rows:
        conn.executemany(
            """
            INSERT INTO user_stories (
              id, mr_id, parent_id, title, description, as_a, i_want, so_that, components,
              story_point, assignee_email, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            story_rows,
        )

    test_rows = []
    for row in tables.get('acceptance_tests', []):
        base = [normalize_int(row.get('id'), 0), normalize_int(row.get('story_id'))]
        if has_title_column:
            base.append(normalize_text(row.get('title'), ''))
        base.extend(
            [
                normalize_text(row.get('given'), '[]'),
                normalize_text(row.get('when_step'), '[]'),
                normalize_text(row.get('then_step'), '[]'),
                normalize_text(row.get('status'), 'Draft'),
                normalize_timestamp(row.get('created_at'), row.get('updated_at')),
                normalize_timestamp(row.get('updated_at'), row.get('created_at')),
            ]
        )
        test_rows.append(tuple(base))

    if test_rows:
        if has_title_column:
            conn.executemany(
                """
                INSERT INTO acceptance_tests (
                  id, story_id, title, given, when_step, then_step, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                test_rows,
            )
        else:
            conn.executemany(
                """
                INSERT INTO acceptance_tests (
                  id, story_id, given, when_step, then_step, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                test_rows,
            )

    doc_rows = []
    for row in tables.get('reference_documents', []):
        doc_rows.append(
            (
                normalize_int(row.get('id'), 0),
                normalize_int(row.get('story_id')),
                normalize_text(row.get('name'), ''),
                normalize_text(row.get('url'), ''),
                normalize_timestamp(row.get('created_at'), row.get('updated_at')),
                normalize_timestamp(row.get('updated_at'), row.get('created_at')),
            )
        )

    if doc_rows:
        conn.executemany(
            """
            INSERT INTO reference_documents (
              id, story_id, name, url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            doc_rows,
        )

    dependency_rows = []
    for row in tables.get('story_dependencies', []):
        dependency_rows.append(
            (
                normalize_int(row.get('story_id')),
                normalize_int(row.get('depends_on_story_id')),
                normalize_text(row.get('relationship'), 'depends'),
            )
        )

    if dependency_rows:
        conn.executemany(
            """
            INSERT INTO story_dependencies (story_id, depends_on_story_id, relationship)
            VALUES (?, ?, ?)
            """,
            dependency_rows,
        )

    conn.commit()
    conn.close()
except Exception as exc:
    try:
        conn.close()
    except Exception:
        pass
    if os.path.exists(target):
        os.remove(target)
    traceback.print_exc()
    sys.exit(1)
`;

function createSqliteBinarySnapshot(snapshot) {
  const tempPath = path.join(
    os.tmpdir(),
    `aipm-sqlite-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`
  );
  const result = spawnSync('python3', ['-c', PYTHON_SQLITE_EXPORT_SCRIPT, tempPath], {
    input: Buffer.from(JSON.stringify(snapshot), 'utf8'),
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? String(result.stderr).trim() : 'Unknown error';
    const error = new Error(`Failed to generate SQLite snapshot via python3: ${stderr}`);
    error.stderr = stderr;
    throw error;
  }

  try {
    const buffer = readFileSync(tempPath);
    unlinkSync(tempPath);
    return buffer;
  } catch (error) {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
    throw error;
  }
}

async function exportRuntimeDataBuffer(db) {
  if (db && typeof db.exportRuntimeSnapshot === 'function') {
    const snapshot = await db.exportRuntimeSnapshot();
    return Buffer.isBuffer(snapshot) ? snapshot : Buffer.from(snapshot);
  }

  return readFile(DATABASE_PATH);
}

function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'NULL';
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (value instanceof Date) {
    return `'${value.toISOString().replace(/'/g, "''")}'`;
  }
  const text = String(value);
  return `'${text.replace(/'/g, "''")}'`;
}

function ensureStatementTerminated(sql) {
  const trimmed = sql.trim();
  if (trimmed.endsWith(';')) {
    return trimmed;
  }
  return `${trimmed};`;
}

function substituteParams(sql, params) {
  let index = 0;
  return ensureStatementTerminated(
    sql.replace(/\?/g, () => {
      const value = index < params.length ? params[index++] : null;
      return escapeSqlValue(value);
    })
  );
}

function runSqliteCli(args, input) {
  const result = spawnSync(SQLITE_COMMAND, ['-batch', ...args], {
    input,
    encoding: 'utf8',
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      const error = new Error(
        `SQLite CLI executable "${SQLITE_COMMAND}" not found. Install sqlite3 or use Node 20+ for the built-in driver.`
      );
      error.cause = result.error;
      throw error;
    }
    throw result.error;
  }

  if (result.status !== 0) {
    const message = result.stderr?.trim() || 'Failed to execute sqlite3 command';
    const error = new Error(message);
    error.stderr = result.stderr;
    error.stdout = result.stdout;
    error.status = result.status;
    error.args = args;
    throw error;
  }

  return result.stdout || '';
}

let cliFeatureCache;

function detectCliFeatures() {
  if (cliFeatureCache) {
    return cliFeatureCache;
  }

  let json = false;
  try {
    const output = runSqliteCli([':memory:'], '.mode json\nSELECT 1 AS value;\n');
    const trimmed = output.trim();
    if (trimmed) {
      JSON.parse(trimmed);
      json = true;
    }
  } catch (error) {
    if (error.stderr && /no such mode: json/i.test(error.stderr)) {
      json = false;
    } else if (error.message && /no such mode: json/i.test(error.message)) {
      json = false;
    } else if (error.cause && error.cause.code === 'ENOENT') {
      throw error;
    }
  }

  cliFeatureCache = { json };
  return cliFeatureCache;
}

function parseJsonOutput(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const jsonLine = lines[lines.length - 1];
  
  try {
    return JSON.parse(jsonLine);
  } catch (error) {
    // Handle malformed JSON in CI environments by falling back to empty result
    console.warn(`[sqlite-cli] JSON parse error: ${error.message}, output: ${jsonLine.substring(0, 100)}...`);
    return [];
  }
}

function normalizeTabValue(value) {
  if (value === undefined) return null;
  if (value === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}

function parseTabularOutput(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return [];
  }
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = normalizeTabValue(values[index]);
    });
    return row;
  });
}

class CliStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  all(...params) {
    return this.db._all(this.sql, params);
  }

  get(...params) {
    const rows = this.db._all(this.sql, params);
    return rows[0];
  }

  run(...params) {
    return this.db._run(this.sql, params);
  }
}

class CliDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.features = detectCliFeatures();
  }

  exec(sql) {
    if (!sql) {
      return this;
    }
    const script = sql.endsWith('\n') ? sql : `${sql}\n`;
    runSqliteCli([this.filePath], script);
    return this;
  }

  prepare(sql) {
    return new CliStatement(this, sql);
  }

  close() {
    // CLI-based connections do not maintain persistent handles.
  }

  _all(sql, params) {
    const statement = substituteParams(sql, params);
    const prefix = this.features.json ? '.mode json\n' : '.headers on\n.mode tabs\n';
    const output = runSqliteCli([this.filePath], `${prefix}${statement}\n`);
    return this.features.json ? parseJsonOutput(output) : parseTabularOutput(output);
  }

  _run(sql, params) {
    const statement = substituteParams(sql, params);
    const prefix = this.features.json ? '.mode json\n' : '.headers on\n.mode tabs\n';
    const script = `${prefix}${statement}\nSELECT changes() AS changes, last_insert_rowid() AS lastInsertRowid;\n`;
    const output = runSqliteCli([this.filePath], script);
    if (this.features.json) {
      const rows = parseJsonOutput(output);
      const meta = rows[rows.length - 1] || {};
      return {
        changes: Number(meta.changes ?? 0),
        lastInsertRowid: Number(meta.lastInsertRowid ?? meta.last_insert_rowid ?? 0),
      };
    }
    const rows = parseTabularOutput(output);
    const meta = rows[rows.length - 1] || {};
    return {
      changes: Number(meta.changes ?? 0),
      lastInsertRowid: Number(meta.lastInsertRowid ?? meta.last_insert_rowid ?? 0),
    };
  }
}

let createDatabaseInstance;

const DEFAULT_COLUMNS = {
  user_stories: [
    'id',
    'mr_id',
    'parent_id',
    'title',
    'description',
    'as_a',
    'i_want',
    'so_that',
    'components',
    'story_point',
    'assignee_email',
    'status',
    'created_at',
    'updated_at',
  ],
  acceptance_tests: ['id', 'story_id', 'title', 'given', 'when_step', 'then_step', 'status', 'created_at', 'updated_at'],
  reference_documents: ['id', 'story_id', 'name', 'url', 'created_at', 'updated_at'],
  story_dependencies: ['story_id', 'depends_on_story_id', 'relationship'],
};

class JsonStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.trim();
    this.normalized = this.sql.replace(/\s+/g, ' ').trim();
  }

  all(...params) {
    return this.db._all(this.normalized, params);
  }

  get(...params) {
    const rows = this.all(...params);
    return rows[0];
  }

  run(...params) {
    return this.db._run(this.normalized, params);
  }
}

class JsonDatabase {
  constructor(filePath) {
    this.sqlitePath = filePath;
    this.jsonPath = filePath.endsWith('.sqlite') ? `${filePath}.json` : `${filePath}.json`;
    this.tables = {
      user_stories: [],
      acceptance_tests: [],
      reference_documents: [],
      story_dependencies: [],
    };
    this.sequences = {
      user_stories: 0,
      acceptance_tests: 0,
      reference_documents: 0,
      story_dependencies: 0,
    };
    this.columns = JSON.parse(JSON.stringify(DEFAULT_COLUMNS));
    this.driver = 'json-fallback';
    this._load();
  }

  _load() {
    try {
      if (existsSync(this.jsonPath)) {
        const raw = readFileSync(this.jsonPath, 'utf8');
        if (raw) {
          const data = JSON.parse(raw);
          if (data.tables) {
            this.tables.user_stories = data.tables.user_stories ?? [];
            this.tables.acceptance_tests = data.tables.acceptance_tests ?? [];
            this.tables.reference_documents = data.tables.reference_documents ?? [];
            this.tables.story_dependencies = data.tables.story_dependencies ?? [];
          }
          if (data.sequences) {
            this.sequences = {
              user_stories: data.sequences.user_stories ?? this._maxId(this.tables.user_stories),
              acceptance_tests:
                data.sequences.acceptance_tests ?? this._maxId(this.tables.acceptance_tests),
              reference_documents:
                data.sequences.reference_documents ?? this._maxId(this.tables.reference_documents),
              story_dependencies: data.sequences.story_dependencies ?? 0,
            };
          } else {
            this._refreshSequences();
          }
          if (data.columns) {
            this.columns = {
              user_stories: data.columns.user_stories ?? this.columns.user_stories,
              acceptance_tests: data.columns.acceptance_tests ?? this.columns.acceptance_tests,
              reference_documents:
                data.columns.reference_documents ?? this.columns.reference_documents,
              story_dependencies: data.columns.story_dependencies ?? this.columns.story_dependencies,
            };
          }
        }
      } else {
        this._persist();
        return;
      }
      this._writeSqliteMirror();
    } catch {
      this._refreshSequences();
      this._writeSqliteMirror();
    }
  }

  _refreshSequences() {
    this.sequences.user_stories = this._maxId(this.tables.user_stories);
    this.sequences.acceptance_tests = this._maxId(this.tables.acceptance_tests);
    this.sequences.reference_documents = this._maxId(this.tables.reference_documents);
    this.sequences.story_dependencies = 0;
  }

  _maxId(rows) {
    return rows.reduce((max, row) => (row.id > max ? row.id : max), 0);
  }

  _snapshot() {
    return {
      tables: {
        user_stories: this.tables.user_stories.map((row) => ({ ...row })),
        acceptance_tests: this.tables.acceptance_tests.map((row) => ({ ...row })),
        reference_documents: this.tables.reference_documents.map((row) => ({ ...row })),
        story_dependencies: this.tables.story_dependencies.map((row) => ({ ...row })),
      },
      sequences: { ...this.sequences },
      columns: {
        user_stories: [...(this.columns.user_stories ?? [])],
        acceptance_tests: [...(this.columns.acceptance_tests ?? [])],
        reference_documents: [...(this.columns.reference_documents ?? [])],
        story_dependencies: [...(this.columns.story_dependencies ?? [])],
      },
      driver: 'json-fallback',
    };
  }

  _writeSqliteMirror() {
    if (DISABLE_SQLITE_MIRROR) return; // ← Amplify에 python3 없어도 안전

    const snapshot = this._snapshot();
    try {
      mkdirSync(path.dirname(this.sqlitePath), { recursive: true });
      const buffer = createSqliteBinarySnapshot(snapshot);
      writeFileSync(this.sqlitePath, buffer);
    } catch (error) {
      const message =
        'Failed to mirror JSON database to SQLite format. Ensure python3 with sqlite3 support is available.';
      const wrapped = new Error(`${message} ${error.message ?? ''}`.trim());
      wrapped.cause = error;
      throw wrapped;
    }
  }

  _persist() {
    mkdirSync(path.dirname(this.jsonPath), { recursive: true });
    const snapshot = this._snapshot();
    const serialized = JSON.stringify(snapshot, null, 2);
    writeFileSync(this.jsonPath, serialized, 'utf8');
    this._writeSqliteMirror();
  }

  exec(sql) {
    if (!sql) {
      return this;
    }
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);
    statements.forEach((statement) => {
      this._executeStatement(statement);
    });
    this._persist();
    return this;
  }

  _executeStatement(statement) {
    const normalized = statement.replace(/\s+/g, ' ').trim();
    if (!normalized) return;
    if (normalized.startsWith('PRAGMA')) {
      return;
    }
    if (normalized.startsWith('CREATE TABLE')) {
      this._ensureTableFromCreate(normalized);
      return;
    }
    if (normalized.startsWith('ALTER TABLE')) {
      this._handleAlter(normalized);
      return;
    }
    if (normalized.includes('UPDATE user_stories SET description =')) {
      this._setDefault('user_stories', 'description', '');
      return;
    }
    if (normalized.includes('UPDATE user_stories SET as_a =')) {
      this._setDefault('user_stories', 'as_a', '');
      return;
    }
    if (normalized.includes('UPDATE user_stories SET i_want =')) {
      this._setDefault('user_stories', 'i_want', '');
      return;
    }
    if (normalized.includes('UPDATE user_stories SET so_that =')) {
      this._setDefault('user_stories', 'so_that', '');
      return;
    }
    if (normalized.includes("UPDATE user_stories SET components = '[]'")) {
      this._setDefault('user_stories', 'components', '[]');
      return;
    }
    if (normalized.includes('UPDATE user_stories SET assignee_email =')) {
      this._setDefault('user_stories', 'assignee_email', '');
      return;
    }
    if (normalized.includes("UPDATE user_stories SET status = 'Draft'")) {
      this._setDefault('user_stories', 'status', 'Draft');
      return;
    }
    if (normalized.includes("UPDATE acceptance_tests SET status = 'Draft'")) {
      this._setDefault('acceptance_tests', 'status', 'Draft');
      return;
    }
    if (normalized.includes('UPDATE reference_documents SET name =')) {
      this._setDefault('reference_documents', 'name', '');
      return;
    }
    if (normalized.includes('UPDATE reference_documents SET url =')) {
      this._setDefault('reference_documents', 'url', '');
      return;
    }
    if (normalized.includes('UPDATE acceptance_tests SET title =')) {
      this._setDefault('acceptance_tests', 'title', '');
    }
    const deleteMatch = normalized.match(/^DELETE FROM (\w+)(?:\s+WHERE\s+(.+))?$/i);
    if (deleteMatch) {
      const [, table, whereClause] = deleteMatch;
      if (!whereClause || /^1\s*=\s*1$/i.test(whereClause)) {
        this._truncateTable(table);
        return;
      }
    }
  }

  _truncateTable(table) {
    const key = table?.toLowerCase();
    if (!key || !(key in this.tables)) {
      return;
    }
    if (key === 'user_stories') {
      const hadRows = Array.isArray(this.tables.user_stories) && this.tables.user_stories.length > 0;
      this.tables.user_stories = [];
      this.tables.acceptance_tests = [];
      this.tables.reference_documents = [];
      this.tables.story_dependencies = [];
      if (hadRows) {
        this._refreshSequences();
      }
      return;
    }
    this.tables[key] = [];
    if (Object.prototype.hasOwnProperty.call(this.sequences, key)) {
      this.sequences[key] = 0;
    }
  }

  _ensureTableFromCreate(statement) {
    const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (!match) return;
    const table = match[1];
    if (!this.tables[table]) {
      this.tables[table] = [];
    }
    if (!this.columns[table]) {
      const columnSectionMatch = statement.match(/\((.*)\)/);
      if (columnSectionMatch) {
        const parts = columnSectionMatch[1]
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => part.split(/\s+/)[0].replace(/"/g, ''))
          .filter((token) =>
            token &&
            !['FOREIGN', 'CONSTRAINT', 'PRIMARY', 'UNIQUE'].includes(token.toUpperCase())
          );
        this.columns[table] = parts;
      }
    }
  }

  _handleAlter(statement) {
    const match = statement.match(/ALTER TABLE (\w+) ADD COLUMN (.+)/i);
    if (!match) return;
    const [, table, definition] = match;
    const columnName = definition.split(/\s+/)[0].replace(/"/g, '');
    if (!this.columns[table]) {
      this.columns[table] = [...(DEFAULT_COLUMNS[table] ?? []), columnName];
    } else if (!this.columns[table].includes(columnName)) {
      this.columns[table].push(columnName);
    }
    const defaultMatch = definition.match(/DEFAULT\s+'([^']*)'/i);
    const numericMatch = definition.match(/DEFAULT\s+([0-9]+)/i);
    const defaultValue =
      defaultMatch?.[1] ?? (numericMatch ? Number(numericMatch[1]) : null);
    const rows = this.tables[table];
    if (Array.isArray(rows)) {
      rows.forEach((row) => {
        if (!(columnName in row) || row[columnName] == null) {
          row[columnName] = defaultValue;
        }
      });
    }
  }

  _setDefault(table, column, value) {
    const rows = this.tables[table];
    if (!Array.isArray(rows)) return;
    rows.forEach((row) => {
      if (row[column] == null) {
        row[column] = value;
      }
    });
  }

  prepare(sql) {
    return new JsonStatement(this, sql);
  }

  close() {
    this._persist();
  }

  _clone(row) {
    return row ? JSON.parse(JSON.stringify(row)) : row;
  }

  exportRuntimeSnapshot() {
    this._writeSqliteMirror();
    return readFileSync(this.sqlitePath);
  }

  _all(sql, params) {
    if (sql.toLowerCase() === 'select count(*) as count from user_stories') {
      return [{ count: this.tables.user_stories.length }];
    }
    if (sql.toLowerCase() === 'select count(*) as count from acceptance_tests') {
      return [{ count: this.tables.acceptance_tests.length }];
    }
    if (sql.startsWith('SELECT * FROM user_stories WHERE id = ?')) {
      const id = Number(params[0]);
      const row = this.tables.user_stories.find((entry) => entry.id === id);
      return row ? [this._clone(row)] : [];
    }
    if (sql.startsWith('SELECT id FROM user_stories WHERE id = ?')) {
      const id = Number(params[0]);
      const row = this.tables.user_stories.find((entry) => entry.id === id);
      return row ? [{ id: row.id }] : [];
    }
    if (sql.startsWith('SELECT * FROM reference_documents WHERE id = ?')) {
      const id = Number(params[0]);
      const row = this.tables.reference_documents.find((entry) => entry.id === id);
      return row ? [this._clone(row)] : [];
    }
    if (sql.startsWith('PRAGMA table_info(')) {
      const table = sql.match(/PRAGMA table_info\((\w+)\)/i)?.[1];
      const columns = this.columns[table] ?? [];
      return columns.map((name, index) => ({ cid: index, name }));
    }
    if (sql.startsWith('SELECT * FROM user_stories ORDER BY')) {
      const rows = this.tables.user_stories.map((row) => this._clone(row));
      rows.sort((a, b) => {
        const aHasParent = a.parent_id != null ? 1 : 0;
        const bHasParent = b.parent_id != null ? 1 : 0;
        if (aHasParent !== bHasParent) {
          return aHasParent - bHasParent;
        }
        const aParent = a.parent_id ?? 0;
        const bParent = b.parent_id ?? 0;
        if (aParent !== bParent) {
          return aParent - bParent;
        }
        return a.id - b.id;
      });
      return rows;
    }
    if (sql.startsWith('SELECT id, title, status FROM user_stories WHERE id IN (')) {
      const ids = params.map(Number);
      const result = this.tables.user_stories
        .filter((row) => ids.includes(row.id))
        .map((row) => ({ id: row.id, title: row.title, status: row.status }));
      result.sort((a, b) => a.id - b.id);
      return result;
    }
    if (sql === 'SELECT id, status FROM acceptance_tests WHERE story_id = ?') {
      const storyId = Number(params[0]);
      const rows = this.tables.acceptance_tests
        .filter((row) => row.story_id === storyId)
        .map((row) => ({ id: row.id, status: row.status }))
        .sort((a, b) => a.id - b.id);
      return rows;
    }
    if (sql === 'SELECT id, title, status FROM acceptance_tests WHERE story_id = ?') {
      const storyId = Number(params[0]);
      const rows = this.tables.acceptance_tests
        .filter((row) => row.story_id === storyId)
        .map((row) => ({ id: row.id, title: row.title, status: row.status }))
        .sort((a, b) => a.id - b.id);
      return rows;
    }
    if (sql === 'SELECT * FROM acceptance_tests WHERE story_id = ? ORDER BY id') {
      const storyId = Number(params[0]);
      const rows = this.tables.acceptance_tests
        .filter((row) => row.story_id === storyId)
        .map((row) => this._clone(row))
        .sort((a, b) => a.id - b.id);
      return rows;
    }
    if (sql.startsWith('SELECT * FROM acceptance_tests ORDER BY')) {
      const rows = this.tables.acceptance_tests.map((row) => this._clone(row));
      rows.sort((a, b) => {
        if (a.story_id !== b.story_id) {
          return a.story_id - b.story_id;
        }
        return a.id - b.id;
      });
      return rows;
    }
    if (sql.startsWith('SELECT * FROM reference_documents ORDER BY')) {
      const rows = this.tables.reference_documents.map((row) => this._clone(row));
      rows.sort((a, b) => {
        if (a.story_id !== b.story_id) {
          return a.story_id - b.story_id;
        }
        return a.id - b.id;
      });
      return rows;
    }
    if (sql.startsWith('SELECT story_id, depends_on_story_id, relationship FROM story_dependencies ORDER BY')) {
      const rows = this.tables.story_dependencies.map((row) => ({ ...row }));
      rows.sort((a, b) => {
        if (a.story_id !== b.story_id) {
          return a.story_id - b.story_id;
        }
        return a.depends_on_story_id - b.depends_on_story_id;
      });
      return rows;
    }
    if (sql.startsWith('SELECT relationship FROM story_dependencies WHERE story_id = ? AND depends_on_story_id = ?')) {
      const storyId = Number(params[0]);
      const dependsOnId = Number(params[1]);
      const row = this.tables.story_dependencies.find(
        (entry) => entry.story_id === storyId && entry.depends_on_story_id === dependsOnId
      );
      return row ? [{ relationship: row.relationship }] : [];
    }
    return [];
  }

  _generateId(table) {
    this.sequences[table] = (this.sequences[table] ?? 0) + 1;
    return this.sequences[table];
  }

  _run(sql, params) {
    const insertMatch = sql.match(/^INSERT(?: OR IGNORE)? INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)$/i);
    if (insertMatch) {
      const [, table, columnList, valueList] = insertMatch;
      const orIgnore = /^INSERT OR IGNORE/i.test(sql);
      const columns = columnList.split(',').map((column) => column.trim());
      const values = valueList.split(',').map((value) => value.trim());
      const row = {};
      let paramIndex = 0;
      columns.forEach((column, index) => {
        const key = column.replace(/"/g, '');
        const valueExpr = values[index] ?? '?';
        if (valueExpr === '?') {
          row[key] = this._coerceValue(table, key, params[paramIndex++]);
        } else if (/^NULL$/i.test(valueExpr)) {
          row[key] = null;
        } else if (/^-?\d+(?:\.\d+)?$/.test(valueExpr)) {
          row[key] = this._coerceValue(table, key, Number(valueExpr));
        } else if (/^'.*'$/.test(valueExpr)) {
          const unescaped = valueExpr.slice(1, -1).replace(/''/g, "'");
          row[key] = this._coerceValue(table, key, unescaped);
        } else {
          row[key] = this._coerceValue(table, key, valueExpr);
        }
      });
      if (!('id' in row) && this.columns[table]?.includes('id')) {
        row.id = this._generateId(table);
      } else if ('id' in row) {
        row.id = Number(row.id);
        this.sequences[table] = Math.max(this.sequences[table] ?? 0, row.id);
      }
      this._applyInsertDefaults(table, row);
      const nowRow = this.tables[table];
      if (table === 'story_dependencies') {
        const storyId = Number(row.story_id);
        const dependsOnId = Number(row.depends_on_story_id);
        const existing = Array.isArray(nowRow)
          ? nowRow.find((entry) => entry.story_id === storyId && entry.depends_on_story_id === dependsOnId)
          : null;
        if (existing) {
          if (!orIgnore) {
            existing.relationship = row.relationship ?? existing.relationship;
            this._persist();
            return { changes: 1, lastInsertRowid: 0 };
          }
          return { changes: 0, lastInsertRowid: 0 };
        }
      }
      if (Array.isArray(nowRow)) {
        nowRow.push(row);
      }
      this._persist();
      return { changes: 1, lastInsertRowid: row.id ?? 0 };
    }

    if (sql.startsWith('UPDATE user_stories SET')) {
      return this._updateRow('user_stories', sql, params);
    }
    if (sql.startsWith('UPDATE acceptance_tests SET')) {
      return this._updateRow('acceptance_tests', sql, params);
    }
    if (sql.startsWith('UPDATE reference_documents SET')) {
      return this._updateRow('reference_documents', sql, params);
    }
    if (sql.startsWith('UPDATE tasks SET')) {
      return this._updateRow('tasks', sql, params);
    }
    if (sql.startsWith('UPDATE story_dependencies SET relationship = ? WHERE story_id = ? AND depends_on_story_id = ?')) {
      const [relationship, storyId, dependsOnId] = params;
      const rows = this.tables.story_dependencies;
      if (!Array.isArray(rows)) {
        return { changes: 0, lastInsertRowid: 0 };
      }
      const target = rows.find(
        (entry) => entry.story_id === Number(storyId) && entry.depends_on_story_id === Number(dependsOnId)
      );
      if (!target) {
        return { changes: 0, lastInsertRowid: 0 };
      }
      target.relationship = relationship ?? target.relationship;
      this._persist();
      return { changes: 1, lastInsertRowid: 0 };
    }
    if (sql.startsWith('DELETE FROM user_stories WHERE id = ?')) {
      return this._deleteRow('user_stories', params[0]);
    }
    if (sql.startsWith('DELETE FROM acceptance_tests WHERE id = ?')) {
      return this._deleteRow('acceptance_tests', params[0]);
    }
    if (sql.startsWith('DELETE FROM reference_documents WHERE id = ?')) {
      return this._deleteRow('reference_documents', params[0]);
    }
    if (sql.startsWith('DELETE FROM tasks WHERE id = ?')) {
      return this._deleteRow('tasks', params[0]);
    }
    if (sql.startsWith('DELETE FROM story_dependencies WHERE story_id = ? AND depends_on_story_id = ?')) {
      const [storyId, dependsOnId] = params.map(Number);
      const rows = this.tables.story_dependencies;
      if (!Array.isArray(rows)) {
        return { changes: 0, lastInsertRowid: 0 };
      }
      const originalLength = rows.length;
      this.tables.story_dependencies = rows.filter(
        (entry) => !(entry.story_id === storyId && entry.depends_on_story_id === dependsOnId)
      );
      const changes = originalLength - this.tables.story_dependencies.length;
      if (changes > 0) {
        this._persist();
      }
      return { changes, lastInsertRowid: 0 };
    }
    return { changes: 0, lastInsertRowid: 0 };
  }

  _updateRow(table, sql, params) {
    const rows = this.tables[table];
    if (!Array.isArray(rows)) {
      return { changes: 0, lastInsertRowid: 0 };
    }
    const id = Number(params[params.length - 1]);
    const row = rows.find((entry) => entry.id === id);
    if (!row) {
      return { changes: 0, lastInsertRowid: 0 };
    }
    const setMatch = sql.match(/SET (.+) WHERE/i);
    if (!setMatch) {
      return { changes: 0, lastInsertRowid: 0 };
    }
    const assignments = setMatch[1].split(',').map((part) => part.trim());
    assignments.forEach((assignment, index) => {
      const [column] = assignment.split('=');
      const key = column.replace(/"/g, '').trim();
      row[key] = this._coerceValue(table, key, params[index]);
    });
    this._persist();
    return { changes: 1, lastInsertRowid: id };
  }

  _deleteRow(table, idValue) {
    const rows = this.tables[table];
    if (!Array.isArray(rows)) {
      return { changes: 0, lastInsertRowid: 0 };
    }
    const id = Number(idValue);
    let targets = [id];
    if (table === 'user_stories') {
      const cascade = [];
      const queue = [id];
      while (queue.length > 0) {
        const current = queue.shift();
        cascade.push(current);
        rows
          .filter((row) => row.parent_id === current)
          .forEach((child) => {
            queue.push(child.id);
          });
      }
      targets = cascade;
    }
    const targetSet = new Set(targets.map(Number));
    const originalLength = rows.length;
    this.tables[table] = rows.filter((row) => !targetSet.has(row.id));
    const changes = originalLength - this.tables[table].length;
    if (table === 'user_stories' && changes > 0) {
      this.tables.acceptance_tests = this.tables.acceptance_tests.filter(
        (test) => !targetSet.has(test.story_id)
      );
      this.tables.reference_documents = this.tables.reference_documents.filter(
        (doc) => !targetSet.has(doc.story_id)
      );
      this.tables.story_dependencies = this.tables.story_dependencies.filter(
        (link) => !targetSet.has(link.story_id) && !targetSet.has(link.depends_on_story_id)
      );
    }
    if (changes > 0) {
      this._persist();
    }
    return { changes, lastInsertRowid: id };
  }

  _coerceValue(table, key, value) {
    if (value === undefined) return null;
    if (value === '') return table === 'user_stories' && key === 'story_point' ? null : value;
    if (key === 'id' || key.endsWith('_id') || key === 'mr_id') {
      return value == null ? null : Number(value);
    }
    if (key === 'story_point') {
      return value == null ? null : Number(value);
    }
    if (key === 'components') {
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      }
      if (value == null) {
        return '[]';
      }
      if (typeof value === 'string') {
        return value;
      }
      return JSON.stringify([String(value)]);
    }
    return value;
  }

  _applyInsertDefaults(table, row) {
    if (table === 'user_stories') {
      if (!('mr_id' in row)) row.mr_id = 1;
      if (!('status' in row) || row.status == null) row.status = 'Draft';
      if (!('description' in row) || row.description == null) row.description = '';
      if (!('as_a' in row) || row.as_a == null) row.as_a = '';
      if (!('i_want' in row) || row.i_want == null) row.i_want = '';
      if (!('so_that' in row) || row.so_that == null) row.so_that = '';
      if (!('components' in row) || row.components == null) row.components = '[]';
      if (!('assignee_email' in row) || row.assignee_email == null) row.assignee_email = '';
    } else if (table === 'acceptance_tests') {
      if (!('status' in row) || row.status == null) row.status = 'Draft';
      if (!('created_at' in row)) row.created_at = now();
      if (!('updated_at' in row)) row.updated_at = now();
    } else if (table === 'reference_documents') {
      if (!('name' in row) || row.name == null) row.name = '';
      if (!('url' in row) || row.url == null) row.url = '';
    }
  }
}

async function loadDatabaseFactory() {
  if (createDatabaseInstance) {
    return createDatabaseInstance;
  }

  if (process.env.AI_PM_FORCE_JSON_DB === '1') {
    createDatabaseInstance = (filePath) => new JsonDatabase(filePath);
    return createDatabaseInstance;
  }

  try {
    const { DatabaseSync } = await import('node:sqlite');
    createDatabaseInstance = (filePath) => new DatabaseSync(filePath);
    return createDatabaseInstance;
  } catch (nativeError) {
    try {
      detectCliFeatures();
      createDatabaseInstance = (filePath) => new CliDatabase(filePath);
      return createDatabaseInstance;
    } catch (cliError) {
      try {
        createDatabaseInstance = (filePath) => new JsonDatabase(filePath);
        return createDatabaseInstance;
      } catch (jsonError) {
        cliError.cause = jsonError;
        nativeError.cause = cliError;
        throw nativeError;
      }
    }
  }
}

export async function openDatabase(filePath) {
  const createDatabase = await loadDatabaseFactory();
  return createDatabase(filePath);
}

export function resetDatabaseFactory() {
  cliFeatureCache = undefined;
  createDatabaseInstance = undefined;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'public');
const DATA_DIR   = process.env.AIPM_DATA_DIR   || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.AIPM_UPLOAD_DIR || path.join(__dirname, 'uploads');
const TEMPLATES_DIR = path.join(__dirname, '../../documents/templates');
const DISABLE_SQLITE_MIRROR = process.env.AIPM_DISABLE_SQLITE_MIRROR === '1';
export const DATABASE_PATH = path.join(DATA_DIR, 'app.sqlite');

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

const ACCEPTANCE_TEST_STATUS_DRAFT = 'Draft';
const ACCEPTANCE_TEST_STATUS_REVIEW = 'Need review with update';

let acceptanceTestsHasTitleColumn = true;

// Semantic API configuration
const SEMANTIC_API_URL = process.env.SEMANTIC_API_URL || 'http://localhost:8083';

/**
 * Call Semantic API with standardized error handling
 * @param {string} endpoint - API endpoint path (e.g., '/aipm/story-draft')
 * @param {object} payload - Request payload
 * @param {object} options - Additional options (method, headers)
 * @returns {Promise<object>} API response
 */
async function callSemanticApi(endpoint, payload, options = {}) {
  const { randomUUID } = await import('crypto');
  const requestId = payload.requestId || randomUUID();
  
  const url = `${SEMANTIC_API_URL}${endpoint}?stream=true`;
  const method = options.method || 'POST';
  
  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...options.headers },
      body: method !== 'GET' ? JSON.stringify({ ...payload, requestId }) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`Semantic API ${endpoint} failed: ${response.status} ${response.statusText}`);
    }
    
    // Read SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = null;
    let buffer = '';
    
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, {stream: true});
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.status === 'complete') {
              result = data;
            } else if (data.status === 'progress') {
              console.log(`📊 Progress: ${data.message}`);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
    
    if (!result) {
      throw new Error('No complete response received from SSE stream');
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Semantic API error [${endpoint}]:`, error.message);
    throw error;
  }
}

const INVEST_DEPENDENCY_HINTS = [
  'blocked by',
  'depends on',
  'waiting on',
  'requires story',
  'requires task',
  'after story',
  'after task',
  'shared migration',
  'coupled with',
  'linked to story',
];

const INVEST_NEGOTIABLE_HINTS = [
  'pixel-perfect',
  'exact pixel',
  'must use ',
  'must leverage ',
  'locked design',
  'cannot change design',
  'exact colour',
  'exact color',
  'exact hex',
  'exact layout',
  'exact spacing',
  '24px',
  '12px',
];

const INVEST_ESTIMABLE_HINTS = [
  'tbd',
  'to be determined',
  'to be decided',
  'unknown',
  'not sure',
  'investigate',
  'research spike',
  'spike on',
  'needs discovery',
  'open question',
];

const INVEST_SCOPE_HINTS = [
  'multiple teams',
  'multi-team',
  'across all',
  'entire platform',
  'entire system',
  'all modules',
  'full rewrite',
  'large refactor',
  'company-wide',
];

const INVEST_AMBIGUOUS_HINTS = [
  'fast',
  'quickly',
  'optimal',
  'asap',
  'maybe',
  'etc',
  'sufficiently',
  'user-friendly',
  'intuitive',
  'seamless',
];

function findKeywordMatchesInText(text, patterns) {
  if (!text) return [];
  const lower = String(text).toLowerCase();
  const matches = new Set();
  patterns.forEach((pattern) => {
    if (!pattern) return;
    if (pattern instanceof RegExp) {
      const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
      const regex = new RegExp(pattern.source, flags);
      let result;
      // eslint-disable-next-line no-cond-assign
      while ((result = regex.exec(lower))) {
        if (result[1]) {
          matches.add(result[1]);
        } else if (result[0]) {
          matches.add(result[0]);
        }
      }
    } else if (lower.includes(String(pattern).toLowerCase())) {
      matches.add(String(pattern).toLowerCase());
    }
  });
  return Array.from(matches);
}

function now() {
  return new Date().toISOString();
}

function ensureArray(value) {
  return value.map((entry) => String(entry).trim()).filter(Boolean);
}

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return JSON.parse(value);
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function isLocalUpload(urlPath) {
  return typeof urlPath === 'string' && urlPath.startsWith('/uploads/');
}

function resolveUploadPath(urlPath) {
  if (!isLocalUpload(urlPath)) return null;
  const relative = urlPath.replace(/^\/uploads\//, '');
  const safeSegments = relative
    .split(/[/\\]+/)
    .filter(Boolean)
    .map((segment) => sanitizeFilename(segment));
  const resolved = path.join(UPLOAD_DIR, ...safeSegments);
  if (!resolved.startsWith(UPLOAD_DIR)) {
    return null;
  }
  return resolved;
}

function baselineInvestWarnings(story, options = {}) {
  const { acceptanceTests = null, includeTestChecks = false } = options;
  const warnings = [];
  const combinedText = [
    story.title,
    story.description,
    story.asA,
    story.iWant,
    story.soThat,
    ...(Array.isArray(story.components) ? story.components : []),
  ]
    .filter(Boolean)
    .join(' ');

  let numericStoryPoint = Number.NaN;
  if (typeof story.storyPoint === 'number') {
    numericStoryPoint = Number.isFinite(story.storyPoint) ? story.storyPoint : Number.NaN;
  } else if (typeof story.storyPoint === 'string') {
    const trimmed = story.storyPoint.trim();
    if (trimmed) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        numericStoryPoint = parsed;
      }
    }
  }
  const hasStoryPointEstimate = Number.isFinite(numericStoryPoint);
  const epicStory = hasStoryPointEstimate && numericStoryPoint > EPIC_STORY_POINT_THRESHOLD;

  if (!story.asA || !story.asA.trim()) {
    warnings.push({
      criterion: 'valuable',
      message: 'Story must describe the persona in “As a”.',
      details: 'INVEST “Valuable” expects a clearly identified persona so the benefit is easy to judge.',
      suggestion: 'Add a persona, e.g., “As a security administrator”.',
    });
  }
  if (!story.iWant || !story.iWant.trim()) {
    warnings.push({
      criterion: 'negotiable',
      message: 'Add a concrete goal in “I want”.',
      details: 'INVEST “Negotiable” stories describe the desired capability without locking in a solution.',
      suggestion: 'State the outcome, e.g., “I want to review pending access requests”.',
    });
  }
  if (!story.soThat || !story.soThat.trim()) {
    warnings.push({
      criterion: 'valuable',
      message: 'Capture the benefit in “So that”.',
      details: 'Explaining the benefit keeps the story valuable and aligned with user needs.',
      suggestion: 'Describe the benefit, e.g., “So that I can approve changes quickly and safely”.',
    });
  }
  const dependencyHints = findKeywordMatchesInText(combinedText, INVEST_DEPENDENCY_HINTS);
  if (dependencyHints.length) {
    warnings.push({
      criterion: 'independent',
      message: 'Story references other work and may not be independent.',
      details:
        `I — Independent stories avoid tight coupling. Detected dependency language: ${dependencyHints
          .map((hint) => `“${hint}”`)
          .join(', ')}.`,
      suggestion:
        'Split by persona, workflow step, or scenario so each story can ship without waiting on other stories.',
    });
  } else if (story.title && story.title.trim().length < 8) {
    warnings.push({
      criterion: 'independent',
      message: 'Title is short; clarify scope in a few more words.',
      details: 'A descriptive title helps reviewers judge whether the story stands independently.',
      suggestion: 'Expand the title, e.g., “Manage MFA enrollment reminders”.',
    });
  }

  const negotiableHints = findKeywordMatchesInText(combinedText, INVEST_NEGOTIABLE_HINTS);
  if (negotiableHints.length) {
    warnings.push({
      criterion: 'negotiable',
      message: 'Story looks prescriptive instead of negotiable.',
      details:
        `N — Negotiable stories leave room for collaboration. Detected rigid language: ${negotiableHints
          .map((hint) => `“${hint.trim()}”`)
          .join(', ')}.`,
      suggestion:
        'Focus on the outcome and move specific UI or tech choices into acceptance criteria or design notes.',
    });
  }

  if (story.soThat && /tbd|n\/a|not applicable|unknown/i.test(story.soThat)) {
    warnings.push({
      criterion: 'valuable',
      message: 'Benefit is unclear in “So that”.',
      details: 'V — Valuable stories explain the user or product benefit so prioritisation stays grounded.',
      suggestion: 'Spell out the user/customer outcome or tie the enabler to a near-term capability.',
    });
  }

  const estimableHints = findKeywordMatchesInText(combinedText, INVEST_ESTIMABLE_HINTS);
  if (estimableHints.length) {
    warnings.push({
      criterion: 'estimable',
      message: 'Story includes unknowns that block estimation.',
      details:
        `E — Estimable stories avoid unclear scope. Detected uncertainty language: ${estimableHints
          .map((hint) => `“${hint.trim()}”`)
          .join(', ')}.`,
      suggestion: 'Schedule a spike, clarify acceptance criteria, or split the story until sizing is possible.',
    });
  }

  if (hasStoryPointEstimate && numericStoryPoint >= 13 && !epicStory) {
    warnings.push({
      criterion: 'small',
      message: 'Story point suggests the slice may be too large.',
      details:
        'S — Small stories fit within a sprint. Consider breaking down work estimated at 13+ points or spanning many teams.',
      suggestion: 'Slice by scenario, CRUD operation, platform, or “thin vertical” increments.',
    });
  } else {
    const scopeHints = findKeywordMatchesInText(combinedText, INVEST_SCOPE_HINTS);
    if (scopeHints.length) {
      warnings.push({
        criterion: 'small',
        message: 'Story scope sounds broad for a single sprint.',
        details:
          `S — Small stories avoid multi-team or platform-wide delivery. Detected language: ${scopeHints
            .map((hint) => `“${hint.trim()}”`)
            .join(', ')}.`,
        suggestion: 'Slice by user scenario, platform, or capability so each story fits within a sprint.',
      });
    }
  }

  const ambiguousMatches = findKeywordMatchesInText(
    [story.iWant, story.soThat].filter(Boolean).join(' '),
    INVEST_AMBIGUOUS_HINTS
  );
  if (ambiguousMatches.length) {
    warnings.push({
      criterion: 'testable',
      message: 'Story uses qualitative words that are hard to test.',
      details:
        `T — Testable stories enable objective verification. Ambiguous words found: ${ambiguousMatches
          .map((hint) => `“${hint.trim()}”`)
          .join(', ')}.`,
      suggestion:
        'Pair acceptance tests with observable or measurable outcomes (e.g., confirmation messages, status changes, or performance targets) for each Then step.',
    });
  }

  if (includeTestChecks) {
    const tests = Array.isArray(acceptanceTests)
      ? acceptanceTests
      : Array.isArray(story.acceptanceTests)
      ? story.acceptanceTests
      : [];
    if (!tests.length) {
      warnings.push({
        criterion: 'testable',
        message: 'Add at least one acceptance test to prove the story is testable.',
        details: 'INVEST “Testable” expects observable or measurable acceptance criteria so the team can validate delivery.',
        suggestion: 'Capture a Given/When/Then scenario covering the expected behaviour.',
      });
    } else {
      const unresolved = tests.flatMap((test) => (test.gwtHealth?.issues ?? []));
      if (unresolved.length > 0) {
        warnings.push({
          criterion: 'testable',
          message: 'Resolve Given/When/Then gaps in acceptance tests.',
          details: 'Some acceptance tests have ambiguous or incomplete steps that block verification.',
          suggestion: 'Edit the failing scenarios to remove ambiguity and include observable outcomes or quantitative targets.',
        });
      }
    }
  }
  return warnings;
}

function markBaselineWarnings(warnings) {
  return warnings.map((warning) => ({ ...warning, source: 'heuristic' }));
}

function compactObject(input) {
  if (!input || typeof input !== 'object') {
    return input;
  }
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null)
  );
}

async function handleDeployPRRequest(req, res) {
  try {
    const payload = await parseJson(req);
    const { prNumber, branchName } = payload;
    
    if (!prNumber && !branchName) {
      sendJson(res, 400, { success: false, error: 'PR number or branch name required' });
      return;
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = process.env.GITHUB_OWNER || 'demian7575';
    const REPO_NAME = process.env.GITHUB_REPO || 'aipm';
    
    if (!GITHUB_TOKEN) {
      sendJson(res, 400, { success: false, error: 'GitHub token not configured' });
      return;
    }

    // Trigger GitHub Actions workflow to deploy PR to dev
    const workflowResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/deploy-pr-to-dev.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            pr_number: String(prNumber || ''),
            branch_name: branchName || ''
          }
        })
      }
    );

    if (!workflowResponse.ok) {
      const errorText = await workflowResponse.text();
      sendJson(res, 500, { 
        success: false, 
        error: `Failed to trigger deployment: ${errorText}` 
      });
      return;
    }

    sendJson(res, 200, {
      success: true,
      message: 'Deployment to staging triggered',
      stagingUrl: 'http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com',
      workflowUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/actions`
    });
  } catch (error) {
    console.error('Deploy PR error:', error);
    sendJson(res, 500, { success: false, error: error.message });
  }
}

async function handleMergePR(req, res) {
  try {
    const payload = await parseJson(req);
    const { prNumber } = payload;
    
    if (!prNumber) {
      sendJson(res, 400, { success: false, error: 'PR number is required' });
      return;
    }

    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    const REPO_OWNER = process.env.GITHUB_OWNER || 'demian7575';
    const REPO_NAME = process.env.GITHUB_REPO || 'aipm';
    
    if (!GITHUB_TOKEN) {
      sendJson(res, 400, { success: false, error: 'GitHub token not configured' });
      return;
    }

    const mergeResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}/merge`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ merge_method: 'squash' })
      }
    );

    if (!mergeResponse.ok) {
      const errorData = await mergeResponse.json();
      sendJson(res, mergeResponse.status, { success: false, error: errorData.message || 'Failed to merge PR' });
      return;
    }

    const mergeData = await mergeResponse.json();
    
    // Get PR details to find the branch name
    const prResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls/${prNumber}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    if (prResponse.ok) {
      const prData = await prResponse.json();
      const branchName = prData.head.ref;
      
      // Delete the branch
      console.log(`🗑️  Deleting branch: ${branchName}`);
      const deleteResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${branchName}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      if (deleteResponse.ok) {
        console.log(`✅ Branch ${branchName} deleted`);
      } else {
        console.warn(`⚠️  Failed to delete branch ${branchName}:`, await deleteResponse.text());
      }
    }
    
    // Add Phase 4 test for merged story
    console.log('📝 Adding Phase 4 test for merged story...');
    try {
      // Get story details
      const storyResponse = await fetch(`${API_BASE}/api/stories/${storyId}`);
      if (storyResponse.ok) {
        const story = await storyResponse.json();
        
        // Generate function name from story title
        const funcName = story.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');
        
        // Create test function
        const testFunction = `
# =============================================================================
# Story: ${story.title}
# ID: ${story.id}
# Merged: ${new Date().toISOString().split('T')[0]}
# =============================================================================
test_${funcName}() {
    log_test "${story.title}"
    
    # TODO: Add acceptance test verification based on story requirements
    # This is a placeholder - update with actual test logic
    
    pass_test "${story.title}"
    return 0
}
`;
        
        const testCall = `
if test_${funcName}; then
    ((PHASE4_PASSED++))
else
    ((PHASE4_FAILED++))
fi
`;
        
        // Add to phase4-functionality.sh via GitHub API
        const phase4Path = 'scripts/testing/phase4-functionality.sh';
        const fileResponse = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${phase4Path}`,
          {
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
          
          // Insert test function before marker
          const updatedContent = content.replace(
            '# ADD NEW STORY TESTS BELOW THIS LINE',
            `# ADD NEW STORY TESTS BELOW THIS LINE${testFunction}`
          ).replace(
            '# ADD NEW TEST FUNCTION CALLS HERE',
            `# ADD NEW TEST FUNCTION CALLS HERE${testCall}`
          );
          
          // Commit updated file
          await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${phase4Path}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Add Phase 4 test for story: ${story.title}`,
                content: Buffer.from(updatedContent).toString('base64'),
                sha: fileData.sha,
                branch: 'main'
              })
            }
          );
          
          console.log('✅ Phase 4 test added for story:', story.title);
        }
      }
    } catch (testError) {
      console.warn('⚠️  Failed to add Phase 4 test:', testError.message);
      // Don't fail the merge if test addition fails
    }
    
    // Production deployment will be triggered automatically by push to main
    // No need to manually trigger workflow since deploy-to-prod.yml has on: push: branches: [main]
    console.log('✅ PR merged successfully - production deployment will trigger automatically via push to main');
    
    sendJson(res, 200, { success: true, message: 'PR merged successfully - production deployment will trigger automatically', sha: mergeData.sha, merged: mergeData.merged });
  } catch (error) {
    console.error('Merge PR error:', error);
    sendJson(res, 500, { success: false, error: error.message });
  }
}

// Terminal session handlers





async function handleGenerateCodeRequest(req, res) {
  try {
    // Code generation is not available in serverless environment
    // The Kiro API server is not accessible from Lambda
    sendJson(res, 503, { 
      success: false,
      error: 'Code generation is not available in the serverless environment. Please use the local development environment for AI code generation features.',
      message: 'Service temporarily unavailable'
    });
    return;
  } catch (error) {
    console.error('Generate code error:', error);
    sendJson(res, 500, { 
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
}

async function handleCreatePRRequest(req, res) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { storyId, branchName, prTitle, prBody, story } = payload;
        
        // GitHub API configuration
        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.GITHUB_OWNER || 'demian7575';
        const REPO_NAME = process.env.GITHUB_REPO || 'aipm';
        
        if (!GITHUB_TOKEN) {
          res.writeHead(400, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ 
            success: false, 
            error: 'GitHub token not configured. Set GITHUB_TOKEN environment variable.' 
          }));
          return;
        }

        // Create branch and PR using GitHub API
        const result = await createGitHubPR({
          token: GITHUB_TOKEN,
          owner: REPO_OWNER,
          repo: REPO_NAME,
          branchName,
          prTitle,
          prBody,
          storyId
        });
        
        // If PR creation was successful, add it to the story
        if (result.success) {
          try {
            console.log('PR creation successful, adding to story:', storyId);
            const prEntry = {
              localId: `pr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              storyId: parseInt(storyId),
              taskTitle: prTitle,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              repo: `${REPO_OWNER}/${REPO_NAME}`,
              branchName: branchName,
              target: 'pull-request',
              targetNumber: result.prNumber,
              number: result.prNumber,
              prUrl: result.prUrl,
              htmlUrl: result.prUrl,
              taskUrl: result.prUrl,
              assignee: '',
              createTrackingCard: true
            };
            
            console.log('Created PR entry:', prEntry);
            
            // Get database instance and add PR to story
            const db = await ensureDatabase();
            console.log('Database instance type:', db.constructor.name);
            const addResult = await addStoryPR(db, parseInt(storyId), prEntry);
            console.log('Add PR result:', addResult);
            
            // Verify the PR was actually added by fetching it back
            const verifyPRs = await getStoryPRs(db, parseInt(storyId));
            console.log('Verification - PRs after adding:', verifyPRs);
            
            // Update the result to include the PR entry for immediate frontend use
            result.prEntry = prEntry;
          } catch (error) {
            console.error('Failed to add PR to story:', error);
            console.error('Error stack:', error.stack);
            // Don't fail the whole request if we can't update the story
          }
        }
        
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('PR creation error:', error);
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ 
          success: false, 
          error: error.message || 'Invalid request' 
        }));
      }
    });
  } catch (error) {
    console.error('PR creation handler error:', error);
    res.writeHead(500, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }));
  }
}

async function createGitHubPR({ token, owner, repo, branchName, prTitle, prBody, storyId }) {
  const baseUrl = 'https://api.github.com';
  
  try {
    // Get the default branch (usually main or master)
    const repoResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!repoResponse.ok) {
      throw new Error(`Failed to get repository info: ${repoResponse.statusText}`);
    }
    
    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch;
    
    // Get the latest commit SHA from the default branch
    const branchResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!branchResponse.ok) {
      throw new Error(`Failed to get branch info: ${branchResponse.statusText}`);
    }
    
    const branchData = await branchResponse.json();
    const baseSha = branchData.object.sha;
    
    // Create new branch (check if exists first)
    let finalBranchName = branchName;
    let attempt = 0;
    
    while (attempt < 5) {
      const createBranchResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: `refs/heads/${finalBranchName}`,
          sha: baseSha
        })
      });
      
      if (createBranchResponse.ok) {
        break; // Branch created successfully
      }
      
      const errorText = await createBranchResponse.text();
      if (createBranchResponse.status === 422 && errorText.includes('already exists')) {
        // Branch exists, try with a suffix
        attempt++;
        finalBranchName = `${branchName}-${attempt}`;
        continue;
      }
      
      throw new Error(`Failed to create branch: ${createBranchResponse.statusText} - ${errorText}`);
    }
    
    if (attempt >= 5) {
      throw new Error('Failed to create unique branch name after 5 attempts');
    }
    
    // Create a placeholder file to make the branch have content (with unique filename)
    const placeholderContent = `# Story ${storyId} Implementation

This branch was created automatically for implementing story ${storyId}.

## Next Steps
1. Implement the required functionality
2. Add tests
3. Update documentation
4. Request review

## Story Details
${prBody}
`;
    
    // Use unique filename to avoid conflicts
    const fileName = `TASK-${storyId}-${Date.now()}.md`;
    const createFileResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}/contents/${fileName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add task file for story ${storyId}`,
        content: Buffer.from(placeholderContent).toString('base64'),
        branch: finalBranchName
      })
    });
    
    if (!createFileResponse.ok) {
      const errorText = await createFileResponse.text();
      console.error(`Failed to create placeholder file: ${createFileResponse.statusText} - ${errorText}`);
      throw new Error(`Failed to create initial commit: ${createFileResponse.statusText}`);
    }
    
    console.log(`Created placeholder file ${fileName} on branch ${finalBranchName}`);
    
    // Create pull request
    const createPRResponse = await fetch(`${baseUrl}/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: prTitle,
        body: prBody,
        head: finalBranchName,
        base: defaultBranch
      })
    });
    
    if (!createPRResponse.ok) {
      const errorText = await createPRResponse.text();
      throw new Error(`Failed to create PR: ${createPRResponse.statusText} - ${errorText}`);
    }
    
    const prData = await createPRResponse.json();
    
    return {
      success: true,
      prNumber: prData.number,
      prUrl: prData.html_url,
      branchName: finalBranchName,
      message: `PR #${prData.number} created successfully`
    };
    
  } catch (error) {
    console.error('GitHub API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function requestInvestAnalysisFromAi(story, options, config) {
  return await requestInvestAnalysisFromAmazonAi(story, options, config);
}

async function analyzeInvest(story, options = {}) {
  const baseline = markBaselineWarnings(baselineInvestWarnings(story, options));
  
  // Try AI analysis via Semantic API
  try {
    console.log('🤖 Attempting AI INVEST analysis for story:', story.id);
    
    // Strip unnecessary fields to reduce payload size
    const storyForAnalysis = {
      id: story.id,
      title: story.title,
      description: story.description,
      asA: story.asA,
      iWant: story.iWant,
      soThat: story.soThat,
      storyPoint: story.storyPoint,
      components: story.components,
      acceptanceTests: story.acceptanceTests
    };
    
    const result = await callSemanticApi('/aipm/invest-analysis', {
      story: storyForAnalysis
    });
    
    console.log('🤖 AI INVEST analysis successful');
    console.log('🔍 AI Response:', JSON.stringify(result, null, 2));
    
    // Use actual score from AI response, fallback to 50 if not provided
    const aiScore = typeof result.score === 'number' ? result.score : 
                    (result.overall === 'pass' ? 100 : 50);
    
    return {
      warnings: result.warnings || result.issues || baseline,
      source: 'ai',
      summary: result.summary || result.suggestions?.join(' ') || '',
      ai: {
        summary: result.summary || result.suggestions?.join(' ') || '',
        warnings: result.warnings || result.issues || [],
        model: result.model || 'kiro-cli',
        score: aiScore
      }
    };
  } catch (error) {
    console.warn('🤖 AI INVEST analysis failed:', error.message);
    throw error;
  }
}

async function evaluateInvestAnalysis(story, options = {}, controls = {}) {
  const includeAiInvest = controls?.includeAiInvest === true;
  
  if (includeAiInvest) {
    return analyzeInvest(story, options);
  }
  
  // Return empty analysis (don't calculate heuristic for GET requests)
  return {
    warnings: [],
    source: 'none',
    summary: ''
  };
}

function applyInvestAnalysisToStory(story, analysis) {
  // Use analysis warnings directly (no separate investWarnings)
  const warnings = analysis.warnings || [];
  
  story.investWarnings = warnings; // Keep for frontend compatibility
  story.investSatisfied = warnings.length === 0;
  story.investHealth = { satisfied: story.investSatisfied, issues: warnings };
  
  // Simplified investAnalysis - no duplicated fields
  story.investAnalysis = {
    source: analysis.source || 'heuristic',
    summary: analysis.summary || '',
    warnings: warnings,
    model: analysis.ai?.model || null
  };
}

function normalizeStoryPoint(value) {
  if (value == null || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw Object.assign(new Error('Story point must be a number'), { statusCode: 400 });
  }
  if (!Number.isInteger(numeric)) {
    throw Object.assign(new Error('Story point must be an integer'), { statusCode: 400 });
  }
  if (numeric < 0) {
    throw Object.assign(new Error('Story point cannot be negative'), { statusCode: 400 });
  }
  return numeric;
}

function normalizeStoryStatus(value) {
  if (value == null) {
    return STORY_STATUS_DEFAULT;
  }
  const text = String(value).trim();
  if (!text) {
    return STORY_STATUS_DEFAULT;
  }
  const match = STORY_STATUS_VALUES.find((status) => status.toLowerCase() === text.toLowerCase());
  if (!match) {
    const error = new Error(`Story status must be one of: ${STORY_STATUS_VALUES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
  return match;
}

function safeNormalizeStoryStatus(value) {
  try {
    return normalizeStoryStatus(value);
  } catch (error) {
    return STORY_STATUS_DEFAULT;
  }
}

function normalizeDependencyRelationship(value) {
  if (value == null) {
    return STORY_DEPENDENCY_DEFAULT;
  }
  const text = String(value).trim().toLowerCase();
  if (!text) {
    return STORY_DEPENDENCY_DEFAULT;
  }
  const match = STORY_DEPENDENCY_RELATIONSHIPS.find((entry) => entry === text);
  return match || STORY_DEPENDENCY_DEFAULT;
}

function normalizeComponentsInput(value, options = {}) {
  const { strict = false } = options;
  let entries = [];
  if (Array.isArray(value)) {
    entries = value.map((entry) => String(entry).trim());
  } else if (value == null) {
    entries = [];
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          entries = parsed.map((entry) => String(entry).trim());
        } else {
          entries = [];
        }
      } catch {
        entries = trimmed.split(/[\n,;]+/).map((entry) => entry.trim());
      }
    }
  } else {
    entries = [String(value).trim()];
  }

  const seen = new Set();
  const normalized = [];
  const invalid = [];

  entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .forEach((entry) => {
      const canonical = COMPONENT_LOOKUP.get(entry.toLowerCase());
      if (canonical) {
        if (!seen.has(canonical)) {
          seen.add(canonical);
          normalized.push(canonical);
        }
      } else {
        invalid.push(entry);
      }
    });

  if (strict && invalid.length) {
    const error = new Error(
      `Components must be chosen from: ${COMPONENT_CATALOG.join(', ')}`
    );
    error.code = 'INVALID_COMPONENTS';
    error.details = { invalid, allowed: COMPONENT_CATALOG };
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function serializeComponents(components) {
  return JSON.stringify(Array.isArray(components) ? components : []);
}

function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
  }
  return false;
}

function collapseWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanFragment(value) {
  const collapsed = collapseWhitespace(value);
  return collapsed.replace(/^[\s,.;:!?-]+/, '').replace(/[\s,.;:!?]+$/, '');
}

function sentenceFragment(value) {
  const cleaned = cleanFragment(value);
  if (!cleaned) {
    return '';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function ensureSentence(value) {
  const fragment = cleanFragment(value);
  if (!fragment) {
    return '';
  }
  const sentence = fragment.charAt(0).toUpperCase() + fragment.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function limitLength(value, maxLength) {
  const text = String(value ?? '');
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  return `${truncated}…`;
}

function toStoryTitle(value) {
  const fragment = cleanFragment(value);
  if (!fragment) {
    return 'New User Story';
  }
  const words = fragment.split(/\s+/).map((word) => {
    if (/^[A-Z0-9]+$/.test(word)) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  const title = words.join(' ');
  return limitLength(title, 120);
}

function cleanupPersona(value) {
  let persona = cleanFragment(value)
    .replace(/^(?:the|a|an|my|our)\s+/i, '')
    .trim();
  if (!persona) {
    return '';
  }
  return sentenceFragment(persona);
}

function cleanupGoal(value) {
  let goal = cleanFragment(value);
  goal = goal.replace(/^to\s+/i, '').replace(/^that\s+/i, '');
  return goal.trim();
}

function cleanupBenefit(value) {
  return cleanFragment(value);
}

function parseIdeaSegments(text) {
  const normalized = collapseWhitespace(text);
  const result = { persona: '', goal: '', benefit: '' };
  if (!normalized) {
    return result;
  }

  const personaPattern = /\bas\s+(?:an?\s+)?([^,.;]+?)\s*,?\s*i\s+want\s+(.*?)(?:\s*(?:,|\s)+so\s+that\s+(.+))?$/i;
  const match = normalized.match(personaPattern);
  if (match) {
    result.persona = match[1] ?? '';
    result.goal = match[2] ?? '';
    result.benefit = match[3] ?? '';
    return result;
  }

  const lower = normalized.toLowerCase();
  const soIndex = lower.indexOf(' so that ');
  if (soIndex >= 0) {
    result.goal = normalized.slice(0, soIndex);
    result.benefit = normalized.slice(soIndex + 9);
  } else {
    result.goal = normalized;
  }

  if (!result.persona) {
    const forMatch = normalized.match(/\bfor\s+(?:the\s+)?([a-z][^,.;]+)/i);
    if (forMatch) {
      result.persona = forMatch[1] ?? '';
    }
  }

  return result;
}

function lowercaseSentenceFragment(value) {
  const fragment = sentenceFragment(value);
  if (!fragment) {
    return '';
  }
  return fragment.charAt(0).toLowerCase() + fragment.slice(1);
}

function formatComponentSentence(components) {
  const valid = (Array.isArray(components) ? components : [])
    .map((component) => String(component || '').trim())
    .filter((component) => component && component !== UNSPECIFIED_COMPONENT);
  if (valid.length === 0) {
    return '';
  }
  const readable = valid.map((component) => {
    const spaced = component
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2');
    return toStoryTitle(spaced);
  });
  const [last] = readable.slice(-1);
  const initial = readable.slice(0, -1);
  const list = initial.length ? `${initial.join(', ')} and ${last}` : last;
  const suffix = readable.length > 1 ? 'components' : 'component';
  return ensureSentence(`Focus on the ${list} ${suffix}.`);
}

function deriveStoryTitleFromSegments(segments, normalized) {
  const goal = cleanupGoal(segments.goal);
  if (goal) {
    return toStoryTitle(goal);
  }
  let candidate = collapseWhitespace(normalized);
  candidate = candidate.replace(
    /^as\s+(?:an?\s+)?[^,.;]+?,?\s*i\s+(?:want|need)\s+/i,
    ''
  );
  const soIndex = candidate.toLowerCase().indexOf(' so that ');
  if (soIndex >= 0) {
    candidate = candidate.slice(0, soIndex);
  }
  const firstSentence = candidate.split(/(?<=[.!?])\s+/)[0] || candidate;
  const firstClause = firstSentence.split(/[,:;]/)[0] || firstSentence;
  return toStoryTitle(firstClause);
}

function deriveDescriptionFromIdea(text, segments, context = {}, wantFragment = '') {
  const normalized = collapseWhitespace(text);
  const parent = context?.parent || null;
  const components = context?.components || [];
  const persona = cleanupPersona(segments.persona) || sentenceFragment(parent?.asA) || 'User';
  const benefitRaw =
    cleanupBenefit(segments.benefit) || cleanFragment(parent?.soThat || '');
  const benefitClause = lowercaseSentenceFragment(benefitRaw);
  let goalClause = lowercaseSentenceFragment(wantFragment || segments.goal || normalized);
  if (goalClause) {
    goalClause = /^to\s+/i.test(goalClause) ? goalClause : `to ${goalClause}`;
  }

  const sentences = [];

  if (persona && goalClause) {
    const firstSentence = `As a ${persona}, I want ${goalClause}`;
    sentences.push(ensureSentence(firstSentence));
  } else if (goalClause) {
    const firstSentence = `This story enables the team ${goalClause}`;
    sentences.push(ensureSentence(firstSentence));
  } else if (normalized) {
    sentences.push(ensureSentence(normalized));
  }

  if (benefitClause) {
    sentences.push(ensureSentence(`This ensures ${benefitClause}`));
  }

  const componentSentence = formatComponentSentence(components);
  if (componentSentence) {
    sentences.push(componentSentence);
  }

  if (parent?.title) {
    sentences.push(ensureSentence(`This work supports the parent story "${parent.title}".`));
  }

  return sentences.filter(Boolean).join(' ');
}

function generateStoryDraftFromIdea(idea, context = {}) {
  const normalized = collapseWhitespace(idea);
  if (!normalized) {
    throw Object.assign(new Error('Idea text is required'), { statusCode: 400 });
  }

  const segments = parseIdeaSegments(normalized);
  const persona = cleanupPersona(segments.persona);
  const goal = cleanupGoal(segments.goal);
  const benefit = cleanupBenefit(segments.benefit);
  const parent = context?.parent || null;
  const parentComponents = parent
    ? normalizeComponentsInput(parent.components || [])
    : [];
  const parentStoryPoint = Number.isFinite(parent?.storyPoint)
    ? Number(parent.storyPoint)
    : Number.isFinite(parent?.story_point)
    ? Number(parent.story_point)
    : null;

  let suggestedStoryPoint = null;
  if (Number.isFinite(parentStoryPoint) && parentStoryPoint > 1) {
    suggestedStoryPoint = Math.max(1, Math.min(8, Math.round(parentStoryPoint / 2)));
  }

  const verbPattern = /^(?:implement|enable|provide|allow|support|deliver|build|create|add|improve|automate|migrate|configure|update|design|introduce|establish|monitor|audit|analyze|define|draft|refine|document|collect|optimize|secure|measure|track|streamline|orchestrate)\b/i;
  let wantFragment = goal;
  if (wantFragment) {
    const normalizedGoal = wantFragment.trim().toLowerCase();
    if (!verbPattern.test(wantFragment) || /^audit\s+\w+ing\b/.test(normalizedGoal)) {
      wantFragment = `implement ${wantFragment}`;
    }
  }

  const draft = {
    title: deriveStoryTitleFromSegments(segments, normalized),
    description: deriveDescriptionFromIdea(normalized, segments, { parent, components: parentComponents }, wantFragment),
    asA: persona || sentenceFragment(parent?.asA) || 'User',
    iWant: wantFragment ? sentenceFragment(wantFragment) : sentenceFragment(normalized),
    soThat: benefit ? sentenceFragment(benefit) : sentenceFragment(parent?.soThat || '') || 'I can accomplish my goals more effectively',
    components: parentComponents,
    storyPoint: suggestedStoryPoint,
    assigneeEmail: parent?.assigneeEmail ? String(parent.assigneeEmail).trim() : '',
  };

  if (!draft.soThat) {
    draft.soThat = '';
  }

  return draft;
}

function buildStoryPathLabel(story, storyMap) {
  if (!story) return '';
  if (!storyMap) return story.title || '';
  const segments = [];
  let current = story;
  while (current) {
    segments.unshift(current.title || 'Untitled');
    current =
      current.parentId != null && storyMap.has(current.parentId)
        ? storyMap.get(current.parentId)
        : null;
  }
  return segments.join(' › ');
}

function renderStepList(label, steps) {
  const lines = [`${label}:`];
  if (Array.isArray(steps) && steps.length > 0) {
    steps.forEach((step) => {
      const text = String(step ?? '').trim() || '(blank)';
      lines.push(`- ${text}`);
    });
  } else {
    lines.push('- (not provided)');
  }
  return lines;
}

function collectChildSummaries(story, depth = 0, lines = []) {
  if (!story || !Array.isArray(story.children)) {
    return lines;
  }
  story.children.forEach((child) => {
    const indent = '  '.repeat(depth);
    const parts = [child.title || 'Untitled story'];
    if (child.status) {
      parts.push(`Status: ${child.status}`);
    }
    if (child.storyPoint != null) {
      parts.push(`Story Point: ${child.storyPoint}`);
    }
    lines.push(`${indent}- ${parts.join(' | ')}`);
    collectChildSummaries(child, depth + 1, lines);
  });
  return lines;
}

function summarizeInvestWarnings(warnings, analysis) {
  if (!Array.isArray(warnings) || warnings.length === 0) {
    if (analysis && analysis.source === 'amazon-ai' && analysis.summary) {
      return [`- Amazon Bedrock summary: ${analysis.summary}`];
    }
    return ['- Amazon Bedrock confirmed the story currently meets INVEST criteria.'];
  }
  return warnings.map((warning) => {
    const criterion = warning.criterion ? String(warning.criterion).toUpperCase() : '';
    const suggestion = warning.suggestion ? ` Suggestion: ${warning.suggestion}` : '';
    return `- ${criterion ? `${criterion}: ` : ''}${warning.message || 'Follow-up required.'}${suggestion}`;
  });
}

function listReferenceDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return ['No reference documents recorded.'];
  }
  return documents.map((doc, index) => {
    const name = doc.name || `Document ${index + 1}`;
    const url = doc.url || 'N/A';
    return `- ${name}: ${url}`;
  });
}

function formatMarkdownTableCell(value) {
  if (value == null) {
    return '';
  }
  return String(value)
    .replace(/\r?\n/g, '<br />')
    .replace(/\|/g, '\\|');
}

function componentDisplayName(name) {
  return (typeof name === 'string' && name.trim().length > 0 ? name : UNSPECIFIED_COMPONENT).replace(
    /_/g,
    ' '
  );
}

function groupStoriesByComponent(flatStories) {
  const groups = new Map();
  const order = [...COMPONENT_CATALOG, UNSPECIFIED_COMPONENT];
  order.forEach((component) => groups.set(component, []));

  flatStories.forEach((story) => {
    const components =
      Array.isArray(story.components) && story.components.length > 0
        ? story.components
        : [UNSPECIFIED_COMPONENT];
    components.forEach((component) => {
      if (!groups.has(component)) {
        groups.set(component, []);
        order.push(component);
      }
      groups.get(component).push(story);
    });
  });

  groups.forEach((stories) => {
    stories.sort((a, b) => {
      const aTitle = a.title || '';
      const bTitle = b.title || '';
      const compare = aTitle.localeCompare(bTitle, undefined, { sensitivity: 'base' });
      if (compare !== 0) {
        return compare;
      }
      return (a.id || 0) - (b.id || 0);
    });
  });

  return { groups, order };
}

function enumerateRequirementEntries(context = {}) {
  const flatStories = Array.isArray(context.flat) ? context.flat : [];
  const { groups, order } = groupStoriesByComponent(flatStories);
  const requirements = [];
  let componentSequence = 0;

  order.forEach((component) => {
    const stories = groups.get(component) ?? [];
    if (stories.length === 0) {
      return;
    }
    componentSequence += 1;
    stories.forEach((story, storyIndex) => {
      const storySequence = storyIndex + 1;
      const identifier = `REQ-${String(componentSequence).padStart(2, '0')}-${String(
        storySequence
      ).padStart(2, '0')}`;
      requirements.push({
        id: identifier,
        componentKey: component,
        componentDisplayName: componentDisplayName(component),
        componentSequence,
        storySequence,
        story,
      });
    });
  });

  return { flatStories, groups, order, requirements };
}

function buildCommonTestDocument(context = {}) {
  const storyMap =
    context.map instanceof Map
      ? context.map
      : new Map((Array.isArray(context.flat) ? context.flat : []).map((story) => [story.id, story]));
  const { flatStories, groups, order, requirements } = enumerateRequirementEntries(context);

  const totalTests = flatStories.reduce((sum, story) => {
    if (!Array.isArray(story.acceptanceTests)) {
      return sum;
    }
    return sum + story.acceptanceTests.length;
  }, 0);

  const lines = [];
  lines.push('# Common Test Document');
  lines.push('');
  lines.push('## 1. Document Control');
  lines.push('');
  lines.push('| Field | Detail |');
  lines.push('| --- | --- |');
  lines.push('| Template | Common Test Document template |');
  lines.push(`| Generated On | ${now()} |`);
  lines.push(`| Total User Stories | ${flatStories.length} |`);
  lines.push(`| Total Acceptance Tests | ${totalTests} |`);
  lines.push(`| Requirements Covered | ${requirements.length} |`);
  lines.push('');

  lines.push('## 2. Test Strategy & Scope');
  lines.push('');
  lines.push(
    'Testing is organised by AIPM component so every requirement has at least one verification scenario. '
      +
      'Procedures combine existing acceptance tests with additional guidance on environment, data, and evidence collection.'
  );
  lines.push('');
  if (flatStories.length === 0) {
    lines.push('No user stories are available. Capture stories to generate test documentation.');
    lines.push('');
    lines.push('## 3. Requirement Traceability Matrix');
    lines.push('');
    lines.push('No requirements have been catalogued yet, so traceability cannot be established.');
    lines.push('');
    lines.push('## 4. Detailed Test Procedures');
    lines.push('');
    lines.push('Test procedures will populate automatically once requirements are defined.');
    lines.push('');
    lines.push('## 5. Test Environment & Tooling');
    lines.push('');
    lines.push('- Core Application: AIPM web client and backend services.');
    lines.push('- Tooling: Modern Chromium-based browser, SQLite database seeded with sample data.');
    lines.push('- Automation Hooks: REST API endpoints under `/api/*` for scripted verification.');
    lines.push('');
    lines.push('## 6. Risks & Mitigations');
    lines.push('');
    lines.push('- Incomplete requirements: collaborate with product owners to capture missing stories.');
    lines.push('- Environment drift: document configuration and capture evidence before upgrades.');
    lines.push('');
    lines.push('## 7. References & Approvals');
    lines.push('');
    lines.push('- Product strategy overview');
    lines.push('- INVEST guideline reference');
    lines.push('- QA sign-off checklist');
    return { title: 'Common Test Document', content: lines.join('\n') };
  }

  const summaryRows = [];
  const requirementsByComponent = new Map();
  order.forEach((component) => {
    const stories = groups.get(component) ?? [];
    if (stories.length === 0) {
      return;
    }
    const componentTests = stories.reduce((sum, story) => {
      if (!Array.isArray(story.acceptanceTests)) {
        return sum;
      }
      return sum + story.acceptanceTests.length;
    }, 0);
    summaryRows.push(`| ${componentDisplayName(component)} | ${stories.length} | ${componentTests} |`);
    requirementsByComponent.set(
      component,
      requirements.filter((entry) => entry.componentKey === component)
    );
  });

  lines.push('## 3. Requirement Traceability Matrix');
  lines.push('');
  if (requirements.length === 0) {
    lines.push('No requirements have been catalogued yet, so traceability cannot be established.');
  } else {
    lines.push('| Requirement | Story | Primary Test | Coverage |');
    lines.push('| --- | --- | --- | --- |');
    requirements.forEach((entry) => {
      const story = entry.story || {};
      const tests = Array.isArray(story.acceptanceTests) ? story.acceptanceTests : [];
      const primaryTest = tests.length
        ? formatMarkdownTableCell(
            tests[0].title && tests[0].title.trim() ? tests[0].title.trim() : 'Scenario 1'
          )
        : 'Pending test design';
      const coverage = tests.length ? 'Full' : 'Pending';
      lines.push(
        `| ${entry.id} | ${formatMarkdownTableCell(story.title || 'Untitled Story')} | ${primaryTest} | ${coverage} |`
      );
    });
  }
  lines.push('');

  lines.push('## 4. Component Test Summaries');
  lines.push('');
  if (summaryRows.length === 0) {
    lines.push('No user stories are available. Capture stories to generate test documentation.');
    return { title: 'Common Test Document', content: lines.join('\n') };
  }

  lines.push('| Component | Stories | Acceptance Tests |');
  lines.push('| --- | ---:| ---:|');
  summaryRows.forEach((row) => lines.push(row));
  lines.push('');

  lines.push('## 5. Detailed Test Procedures');
  lines.push('');

  let componentIndex = 0;
  order.forEach((component) => {
    const componentRequirements = requirementsByComponent.get(component) || [];
    if (componentRequirements.length === 0) {
      return;
    }
    componentIndex += 1;
    lines.push(`### 5.${componentIndex} ${componentDisplayName(component)}`);
    lines.push('');
    lines.push(
      'This section outlines end-to-end verification for the component, combining existing acceptance tests with repeatable QA '
        + 'instructions.'
    );
    lines.push('');

    componentRequirements.forEach((requirement) => {
      const story = requirement.story || {};
      const tests = Array.isArray(story.acceptanceTests) ? story.acceptanceTests : [];
      const storyPoint =
        story.storyPoint != null && story.storyPoint !== '' ? story.storyPoint : 'Unestimated';
      const assignee = story.assigneeEmail || 'Unassigned';
      const path = buildStoryPathLabel(story, storyMap);

      lines.push(`#### ${requirement.id} — ${story.title || 'Untitled Story'}`);
      lines.push('');
      lines.push(`- Component: ${requirement.componentDisplayName}`);
      lines.push(`- Path: ${formatMarkdownTableCell(path)}`);
      lines.push(`- Status: ${formatMarkdownTableCell(story.status || 'Draft')}`);
      lines.push(`- Estimate: ${formatMarkdownTableCell(storyPoint)}`);
      lines.push(`- Assignee: ${formatMarkdownTableCell(assignee)}`);
      lines.push('');

      lines.push('**Requirement Summary**');
      lines.push('');
      lines.push(`- As a ${story.asA || '…'}`);
      lines.push(`- I want ${story.iWant || '…'}`);
      lines.push(`- So that ${story.soThat || '…'}`);
      if (story.description && story.description.trim()) {
        lines.push('');
        lines.push('> ' + story.description.trim().replace(/\r?\n/g, '\n> '));
        lines.push('');
      } else {
        lines.push('');
      }

      lines.push('**Test Objectives**');
      lines.push('');
      lines.push(
        '- Validate end-user workflows align with the requirement narrative and acceptance criteria.'
      );
      lines.push('- Confirm integration touchpoints respond with expected signals and events.');
      lines.push('- Capture evidence (screenshots, logs, API responses) for auditability.');
      lines.push('');

      if (tests.length === 0) {
        lines.push('_No acceptance tests defined. Develop manual or automated coverage before release._');
        lines.push('');
        return;
      }

      tests.forEach((test, testIndex) => {
        const heading = test.title && test.title.trim() ? test.title.trim() : `Scenario ${testIndex + 1}`;
        const testCaseId = `${requirement.id}-TC${String(testIndex + 1).padStart(2, '0')}`;
        lines.push(`##### ${testCaseId} — ${heading}`);
        lines.push('');
        lines.push('| Section | Detail |');
        lines.push('| --- | --- |');
        lines.push(`| Requirement | ${requirement.id} |`);
        lines.push(`| Status | ${formatMarkdownTableCell(test.status || 'Draft')} |`);
        const givenSteps = renderStepList('Given', test.given).slice(1).map((line) => line.replace(/^-\s*/, ''));
        const whenSteps = renderStepList('When', test.when).slice(1).map((line) => line.replace(/^-\s*/, ''));
        const thenSteps = renderStepList('Then', test.then).slice(1).map((line) => line.replace(/^-\s*/, ''));
        const prerequisites = givenSteps.length ? givenSteps.join('<br />') : 'Documented in test data sheet.';
        const procedure = whenSteps.length
          ? whenSteps.map((step, index) => `${index + 1}. ${step}`).join('<br />')
          : 'Execute the primary user journey as described in the requirement summary.';
        const expected = thenSteps.length
          ? thenSteps.map((step, index) => `${index + 1}. ${step}`).join('<br />')
          : 'System responds according to INVEST-compliant acceptance criteria.';
        lines.push(`| Preconditions | ${formatMarkdownTableCell(prerequisites)} |`);
        lines.push(`| Procedure | ${formatMarkdownTableCell(procedure)} |`);
        lines.push(`| Expected Results | ${formatMarkdownTableCell(expected)} |`);
        if (Array.isArray(test.referenceDocuments) && test.referenceDocuments.length > 0) {
          const references = test.referenceDocuments
            .map((doc) => `${doc.name || 'Reference'} (${doc.url || 'N/A'})`)
            .join('<br />');
          lines.push(`| References | ${formatMarkdownTableCell(references)} |`);
        } else {
          lines.push('| References | Requirement specification, design guidelines |');
        }
        if (test.gwtHealth) {
          const healthLabel = test.gwtHealth.satisfied ? 'Pass' : 'Needs review';
          lines.push(`| Gherkin Health | ${healthLabel} |`);
          if (Array.isArray(test.gwtHealth.issues) && test.gwtHealth.issues.length > 0) {
            const issues = test.gwtHealth.issues
              .map((issue) => {
                const criterion = issue.criterion ? `${issue.criterion.toUpperCase()}: ` : '';
                return `${criterion}${issue.message || 'Follow-up required.'}`;
              })
              .join('<br />');
            lines.push(`| Review Notes | ${formatMarkdownTableCell(issues)} |`);
          }
        }
        lines.push('');
      });
    });
  });

  lines.push('## 6. Test Environment & Tooling');
  lines.push('');
  lines.push('- **Application Tier:** AIPM backend services with SQLite persistence.');
  lines.push('- **Client Tier:** Browser-based UI (Chrome 119+ or Firefox 118+ recommended).');
  lines.push('- **Test Data:** Sample dataset generated via `scripts/generate-sample-dataset.mjs`.');
  lines.push('- **Automation Hooks:** REST API calls documented under `/api/*` endpoints.');
  lines.push('- **Monitoring:** Browser devtools network logs, server console output, and database snapshots.');
  lines.push('');

  lines.push('## 7. Risks & Mitigations');
  lines.push('');
  lines.push('- **Scope creep:** Lock sprint backlog before executing regression cycles.');
  lines.push('- **Integration drift:** Pin external dependencies and verify API contracts with mocks.');
  lines.push('- **Insufficient evidence:** Store artefacts in the QA share with timestamps.');
  lines.push('');

  lines.push('## 8. References & Approvals');
  lines.push('');
  lines.push('- AIPM Common Requirement Specification (latest revision).');
  lines.push('- Engineering design review minutes.');
  lines.push('- QA sign-off checklist and retrospective notes.');

  return { title: 'Common Test Document', content: lines.join('\n') };
}

async function buildCommonRequirementSpecificationDocument(context = {}) {
  // Load template
  const template = await loadTemplate('requirement-specification-template');
  
  if (template) {
    // Use template and fill in dynamic data
    const storyMap =
      context.map instanceof Map
        ? context.map
        : new Map((Array.isArray(context.flat) ? context.flat : []).map((story) => [story.id, story]));
    const { flatStories, groups, order, requirements } = enumerateRequirementEntries(context);
    
    let content = template;
    
    // Replace placeholders
    content = content.replace(/\[Project Name\]/g, 'AIPM - AI Project Manager');
    content = content.replace(/\[Date\]/g, now());
    content = content.replace(/\[Author Name\]/g, 'AIPM System');
    content = content.replace(/\[Draft \| Review \| Approved\]/g, 'Generated');
    
    // Add story statistics
    const statsSection = `\n\n## Generated Statistics\n\n- **Total User Stories:** ${flatStories.length}\n- **Requirements Catalogued:** ${requirements.length}\n- **Generated On:** ${now()}\n\n`;
    content = content.replace('## 1. Introduction', statsSection + '## 1. Introduction');
    
    return { title: 'Requirement Specification Document', content };
  }
  
  // Fallback to original implementation if template not found
  const storyMap =
    context.map instanceof Map
      ? context.map
      : new Map((Array.isArray(context.flat) ? context.flat : []).map((story) => [story.id, story]));
  const { flatStories, groups, order, requirements } = enumerateRequirementEntries(context);

  const lines = [];
  lines.push('# Common Requirement Specification');
  lines.push('');
  lines.push('## 1. Document Control');
  lines.push('');
  lines.push('| Field | Detail |');
  lines.push('| --- | --- |');
  lines.push('| Template | Common Requirement Specification template |');
  lines.push(`| Generated On | ${now()} |`);
  lines.push(`| Total User Stories | ${flatStories.length} |`);
  lines.push(`| Requirements Catalogued | ${requirements.length} |`);
  lines.push('');

  lines.push('## 2. About AIPM');
  lines.push('');
  lines.push(
    'AI Project Manager (AIPM) orchestrates agile delivery with AI-assisted story analysis, documentation, and verification '
      +
      'pipelines. The platform centralises story capture, INVEST health assessments, automated acceptance test generation, and '
      +
      'document exports so distributed teams share a single source of truth.'
  );
  lines.push('');
  lines.push('- **Core capabilities:** backlog modelling, documentation generation, traceability, and quality signals.');
  lines.push('- **Primary stakeholders:** product managers, engineers, quality analysts, and compliance reviewers.');
  lines.push('- **Value proposition:** shorten feedback loops by combining structured requirements with AI-authored insights.');
  lines.push('');

  lines.push('## 3. System Design & Architecture');
  lines.push('');
  lines.push(
    'The solution follows a layered architecture. The conceptual block diagram includes:');
  lines.push('- **Presentation Layer:** Browser SPA rendering mindmaps, outlines, and document workflows.');
  lines.push('- **Application Services:** Node.js backend exposing REST APIs for stories, health checks, and document export.');
  lines.push('- **Intelligence Services:** Amazon Bedrock integrations performing INVEST and document synthesis.');
  lines.push('- **Data Layer:** SQLite persistence with traceable relationships between stories, tests, and references.');
  lines.push('- **Integrations:** Webhooks and document download endpoints for downstream tooling.');
  lines.push('');
  lines.push(
    'Signals traverse from UI interactions (create/update stories) to backend validation, onward to AI enrichment, and finally '
      +
      'to persistence and reporting layers. This ensures each requirement change propagates to testing and documentation.'
  );
  lines.push('');

  lines.push('## 4. Operational Workflow & Signalling');
  lines.push('');
  lines.push('- **Story lifecycle:** Draft → Ready → In Progress → Blocked/Approved → Done. Status updates trigger INVEST checks.');
  lines.push('- **Signal propagation:** Story edits invoke acceptance test regeneration, gWT health evaluation, and layout refresh.');
  lines.push('- **Traceability:** Requirement IDs map to acceptance scenarios and reference documents for audit readiness.');
  lines.push('- **Notifications:** UI toasts and document exports inform stakeholders of changes.');
  lines.push('');

  lines.push('## 5. Installation & Deployment');
  lines.push('');
  lines.push('1. Install Node.js 20+ and npm.');
  lines.push('2. Clone the AIPM repository and run `npm install`.');
  lines.push('3. Seed sample data with `npm run seed` or `node scripts/generate-sample-dataset.mjs`.');
  lines.push('4. Launch the backend via `npm run backend` and the static front-end host.');
  lines.push('5. Configure AWS credentials for Amazon Bedrock enhanced analysis.');
  lines.push('6. Verify document generation through the Generate Document modal.');
  lines.push('');

  if (flatStories.length === 0) {
    lines.push('## 6. Requirements Catalogue');
    lines.push('');
    lines.push('No user stories are available. Capture stories to generate requirement documentation.');
    lines.push('');
    lines.push('## 7. Assumptions, Constraints, and Non-functional Requirements');
    lines.push('');
    lines.push('- Availability target: 99.5% for core documentation endpoints.');
    lines.push('- Performance: document generation completes within 5 seconds for 100 stories.');
    lines.push('- Security: enforce role-based access for editing and exporting artefacts.');
    lines.push('');
    lines.push('## 8. References');
    lines.push('');
    lines.push('- Product vision deck');
    lines.push('- QA strategy playbook');
    lines.push('- Amazon Bedrock API documentation');
    lines.push('');
    lines.push('## 9. Glossary & Acronyms');
    lines.push('');
    lines.push('- **AIPM:** AI Project Manager.');
    lines.push('- **INVEST:** Independent, Negotiable, Valuable, Estimable, Small, Testable.');
    lines.push('- **GWT:** Given/When/Then.');
    lines.push('');
    return { title: 'Common Requirement Specification', content: lines.join('\n') };
  }

  const statusCounts = new Map();
  flatStories.forEach((story) => {
    const status = story.status || 'Draft';
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });

  lines.push('## 6. Requirements Catalogue');
  lines.push('');
  lines.push('### 6.1 Portfolio Snapshot');
  lines.push('');
  lines.push('| Status | Stories |');
  lines.push('| --- | ---:|');
  Array.from(statusCounts.keys())
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .forEach((status) => {
      lines.push(`| ${status} | ${statusCounts.get(status)} |`);
    });
  lines.push('');

  lines.push('| Component | Stories | Ready/Done | Blocked |');
  lines.push('| --- | ---:| ---:| ---:|');
  order.forEach((component) => {
    const stories = groups.get(component) ?? [];
    if (stories.length === 0) {
      return;
    }
    let readyCount = 0;
    let blockedCount = 0;
    stories.forEach((story) => {
      const status = (story.status || '').toLowerCase();
      if (['ready', 'approved', 'done'].includes(status)) {
        readyCount += 1;
      }
      if (status === 'blocked') {
        blockedCount += 1;
      }
    });
    lines.push(`| ${componentDisplayName(component)} | ${stories.length} | ${readyCount} | ${blockedCount} |`);
  });
  lines.push('');

  const requirementsByComponent = new Map();
  order.forEach((component) => {
    requirementsByComponent.set(
      component,
      requirements.filter((entry) => entry.componentKey === component)
    );
  });

  let componentIndex = 0;
  order.forEach((component) => {
    const componentRequirements = requirementsByComponent.get(component) || [];
    if (componentRequirements.length === 0) {
      return;
    }
    componentIndex += 1;
    lines.push(`### 6.${componentIndex + 1} ${componentDisplayName(component)}`);
    lines.push('');
    lines.push(
      'The following requirements encapsulate scope, dependencies, and verification expectations for this component.'
    );
    lines.push('');

    componentRequirements.forEach((entry) => {
      const story = entry.story || {};
      const storyPoint =
        story.storyPoint != null && story.storyPoint !== '' ? story.storyPoint : 'Unestimated';
      const componentsList =
        Array.isArray(story.components) && story.components.length > 0
          ? story.components.map((name) => componentDisplayName(name)).join(', ')
          : componentDisplayName(UNSPECIFIED_COMPONENT);
      const assignee = story.assigneeEmail || 'Unassigned';
      const path = buildStoryPathLabel(story, storyMap);
      const tests = Array.isArray(story.acceptanceTests) ? story.acceptanceTests : [];
      const docs = Array.isArray(story.referenceDocuments) ? story.referenceDocuments : [];
      const childLines = collectChildSummaries(story, 0, []);

      lines.push(`#### ${entry.id} ${story.title || 'Untitled Story'}`);
      lines.push('');
      lines.push('| Field | Detail |');
      lines.push('| --- | --- |');
      lines.push(`| Component | ${formatMarkdownTableCell(entry.componentDisplayName)} |`);
      lines.push(`| Status | ${formatMarkdownTableCell(story.status || 'Draft')} |`);
      lines.push(`| Story Point | ${formatMarkdownTableCell(storyPoint)} |`);
      lines.push(`| Assignee | ${formatMarkdownTableCell(assignee)} |`);
      lines.push(`| Path | ${formatMarkdownTableCell(path)} |`);
      lines.push(`| Linked Components | ${formatMarkdownTableCell(componentsList)} |`);
      lines.push(`| Acceptance Tests | ${tests.length} |`);
      lines.push('');

      lines.push('**Requirement Statement**');
      lines.push('');
      lines.push(`- As a ${story.asA || '…'}`);
      lines.push(`- I want ${story.iWant || '…'}`);
      lines.push(`- So that ${story.soThat || '…'}`);
      if (story.description && story.description.trim()) {
        lines.push('');
        lines.push('> ' + story.description.trim().replace(/\r?\n/g, '\n> '));
        lines.push('');
      } else {
        lines.push('');
      }

      lines.push('**Functional Expectations**');
      lines.push('');
      lines.push('- Align UI/UX behaviour with INVEST-compliant acceptance criteria.');
      lines.push('- Ensure data persistence and API responses reflect state transitions.');
      lines.push('- Surface validation errors and success feedback to end users.');
      lines.push('');

      lines.push('**Interfaces & Signalling**');
      lines.push('');
      lines.push('- Trigger story health checks upon status change.');
      lines.push('- Emit document regeneration signal when requirements or acceptance tests update.');
      lines.push('- Maintain websocket or polling hooks (where applicable) for UI synchronisation.');
      lines.push('');

      lines.push('**Verification Overview**');
      lines.push('');
      if (tests.length === 0) {
        lines.push('- Acceptance tests pending authoring.');
      } else {
        tests.forEach((test, index) => {
          const heading = test.title && test.title.trim() ? test.title.trim() : `Scenario ${index + 1}`;
          const outcomes =
            Array.isArray(test.then) && test.then.length > 0
              ? test.then.map((step) => String(step).trim()).join('; ')
              : 'Then steps not specified.';
          lines.push(`- ${heading} (Status: ${test.status || 'Draft'})`);
          lines.push(`  Outcomes: ${outcomes}`);
        });
      }
      lines.push('');

      lines.push('**Dependencies & Child Work**');
      lines.push('');
      if (childLines.length === 0) {
        lines.push('- No child stories linked.');
      } else {
        childLines.forEach((line) => lines.push(line));
      }
      lines.push('');

      lines.push('**Reference Materials**');
      lines.push('');
      if (docs.length === 0) {
        lines.push('- No reference documents recorded.');
      } else {
        listReferenceDocuments(docs).forEach((docLine) => lines.push(docLine));
      }
      lines.push('');

      lines.push('**INVEST & Quality Notes**');
      lines.push('');
      const investHealth = story.investHealth || null;
      const investLines = summarizeInvestWarnings(
        investHealth?.issues || [],
        story.investAnalysis && story.investAnalysis.summary
          ? { summary: story.investAnalysis.summary, source: story.investAnalysis.source }
          : story.investAnalysis
      );
      investLines.forEach((line) => lines.push(line));
      lines.push('');
    });
  });

  lines.push('## 7. Assumptions, Constraints, and Non-functional Requirements');
  lines.push('');
  lines.push('- **Performance:** Generate mindmap and document exports in under 3 seconds for standard datasets.');
  lines.push('- **Security:** Protect API endpoints with authentication and audit logging.');
  lines.push('- **Scalability:** Support concurrent editors with eventual consistency across UI panels.');
  lines.push('- **Compliance:** Maintain traceability from requirements to verification for audits.');
  lines.push('');

  lines.push('## 8. References');
  lines.push('');
  lines.push('- Product vision deck');
  lines.push('- QA strategy playbook');
  lines.push('- OpenAI API documentation');
  lines.push('- Internal UX guidelines for mindmap interactions');
  lines.push('');

  lines.push('## 9. Glossary & Acronyms');
  lines.push('');
  lines.push('- **AIPM:** AI Project Manager.');
  lines.push('- **INVEST:** Independent, Negotiable, Valuable, Estimable, Small, Testable.');
  lines.push('- **GWT:** Given/When/Then.');
  lines.push('- **RACI:** Responsible, Accountable, Consulted, Informed.');
  lines.push('');

  lines.push('## 10. Revision History');
  lines.push('');
  lines.push('| Version | Date | Description | Author |');
  lines.push('| --- | --- | --- | --- |');
  lines.push(`| 1.0 | ${now()} | Auto-generated specification from current backlog | AIPM |`);

  return { title: 'Common Requirement Specification', content: lines.join('\n') };
}

function normalizeDocumentType(type) {
  const normalized = String(type || '').toLowerCase();
  if (
    [
      'test',
      'test-document',
      'test_document',
      'common-test',
      'common-test-document',
      'common_test_document',
    ].includes(normalized)
  ) {
    return 'common-test-document';
  }
  if (
    [
      'system',
      'system-requirement',
      'system_requirement',
      'system-requirement-document',
      'common-requirement',
      'common-requirement-specification',
      'common_requirement_specification',
    ].includes(normalized)
  ) {
    return 'common-requirement-specification';
  }
  return normalized;
}

function defaultDocumentTitle(type) {
  const normalized = normalizeDocumentType(type);
  if (normalized === 'common-test-document') {
    return 'Common Test Document';
  }
  if (normalized === 'common-requirement-specification') {
    return 'Common Requirement Specification';
  }
  return 'AI Project Manager Document';
}

function slugifyFilename(value, fallback = 'document') {
  const base = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (base || 'document') + '.md';
}

function prepareStoriesForDocument(context = {}) {
  const flatStories = Array.isArray(context.flat) ? context.flat : [];
  const storyMap =
    context.map instanceof Map
      ? context.map
      : new Map(flatStories.map((story) => [story.id, story]));

  return flatStories.map((story) => ({
    id: story.id,
    title: story.title || '',
    status: story.status || '',
    storyPoint: story.storyPoint ?? null,
    components: Array.isArray(story.components) ? story.components : [],
    assigneeEmail: story.assigneeEmail || '',
    path: buildStoryPathLabel(story, storyMap),
    investSummary: story.investAnalysis?.summary || '',
    investIssues: Array.isArray(story.investHealth?.issues)
      ? story.investHealth.issues.map((issue) => ({
          criterion: issue.criterion ? String(issue.criterion) : '',
          message: issue.message ? String(issue.message) : '',
          suggestion: issue.suggestion ? String(issue.suggestion) : '',
        }))
      : [],
    acceptanceTests: Array.isArray(story.acceptanceTests)
      ? story.acceptanceTests.map((test) => ({
          id: test.id,
          title: test.title || '',
          status: test.status || '',
          given: Array.isArray(test.given) ? test.given.map((step) => String(step)) : [],
          when: Array.isArray(test.when) ? test.when.map((step) => String(step)) : [],
          then: Array.isArray(test.then) ? test.then.map((step) => String(step)) : [],
          gwtIssues: Array.isArray(test.gwtHealth?.issues)
            ? test.gwtHealth.issues.map((issue) => ({
                criterion: issue.criterion ? String(issue.criterion) : '',
                message: issue.message ? String(issue.message) : '',
                suggestion: issue.suggestion ? String(issue.suggestion) : '',
              }))
            : [],
        }))
      : [],
    referenceDocuments: Array.isArray(story.referenceDocuments)
      ? story.referenceDocuments.map((doc) => ({
          name: doc.name || '',
          url: doc.url || '',
        }))
      : [],
  }));
}

function buildComponentSummary(flatStories) {
  const { groups, order } = groupStoriesByComponent(flatStories);
  return order.map((component) => {
    const entries = groups.get(component) ?? [];
    return {
      component,
      displayName: componentDisplayName(component),
      storyCount: entries.length,
      stories: entries.map((story) => ({
        id: story.id,
        title: story.title || '',
        status: story.status || '',
        storyPoint: story.storyPoint ?? null,
        assigneeEmail: story.assigneeEmail || '',
      })),
    };
  });
}


async function generateDocumentFile(type, context = {}) {
  // Use heuristic generation - Kiro CLI can enhance via terminal interaction
  const document = generateDocumentPayload(type, context);
  return { ...document, source: 'heuristic' };
}

function generateDocumentPayload(type, context = {}) {
  const normalized = String(type || '').toLowerCase();
  if (
    [
      'test',
      'test-document',
      'test_document',
      'common-test',
      'common-test-document',
      'common_test_document',
    ].includes(normalized)
  ) {
    return buildCommonTestDocument(context);
  }
  if (
    [
      'system',
      'system-requirement',
      'system_requirement',
      'system-requirement-document',
      'common-requirement',
      'common-requirement-specification',
      'common_requirement_specification',
    ].includes(normalized)
  ) {
    return buildCommonRequirementSpecificationDocument(context);
  }
  const error = new Error('Unsupported document type');
  error.statusCode = 400;
  throw error;
}

const MEASURABLE_PATTERN = /([0-9]+\s*(ms|s|sec|seconds?|minutes?|hours?|%|percent|users?|items?|requests?|errors?))/i;
const HTTP_STATUS_CODE_PATTERN = /\b(20\d|30\d|40\d|50\d)\b/;
const OBSERVABLE_KEYWORDS = [
  'display',
  'show',
  'visible',
  'see',
  'hide',
  'hidden',
  'reveal',
  'status',
  'update',
  'updated',
  'redirect',
  'navigat',
  'receive',
  'sent',
  'email',
  'message',
  'notification',
  'approved',
  'rejected',
  'enabled',
  'disabled',
  'error',
  'success',
  'log',
  'record',
  'save',
  'persist',
  'create',
  'generated',
  'delete',
  'download',
  'response',
  'http',
  'json',
  'table',
  'list',
  'modal',
  'screen',
  'document',
  'report',
  'audit',
  'chart',
  'value',
  'field',
  'button',
  'link',
  'toast',
  'highlight',
  'select',
  'count',
  'badge',
  'tab',
  'workflow',
  'progress',
  'api',
  'return',
  'flag',
  'equal',
  'match',
  'exists',
  'contain',
  'appear',
  'generated',
  'accessible',
  'render',
  'approve',
  'reject',
  'tooltip',
  'indicat',
  'draw',
  'dod',
  'blocker',
];

function isObservableOutcome(step) {
  const text = typeof step === 'string' ? step.trim() : String(step ?? '').trim();
  if (!text) {
    return false;
  }
  const normalized = text.toLowerCase();
  if (MEASURABLE_PATTERN.test(normalized)) {
    return true;
  }
  if (HTTP_STATUS_CODE_PATTERN.test(normalized) && (normalized.includes('http') || normalized.includes('status'))) {
    return true;
  }
  return OBSERVABLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function measurabilityWarnings(thenSteps) {
  const warnings = [];
  const suggestions = [];
  thenSteps.forEach((step, index) => {
    const text = typeof step === 'string' ? step.trim() : String(step ?? '').trim();
    if (!text) {
      const suggestion =
        `Then step ${index + 1}: describe the expected outcome so testers know what to observe or measure.`;
      warnings.push({
        index,
        message: `Then step ${index + 1} is blank or missing an outcome.`,
        details: 'Then steps should explain what changes, appears, or is validated after the action.',
        suggestion,
      });
      suggestions.push(suggestion);
      return;
    }
    if (!isObservableOutcome(text)) {
      const suggestion =
        `Then step ${index + 1}: explain what is observable (e.g., status updates, confirmation message) or include a quantitative target such as “within 2 seconds”.`;
      warnings.push({
        index,
        message: `Then step ${index + 1} lacks an observable or measurable result.`,
        details: 'Then steps should describe what testers can see, confirm, or measure to verify success.',
        suggestion,
      });
      suggestions.push(suggestion);
    }
  });
  return { warnings, suggestions };
}

async function buildGwtHealth(given, when, then, measurability) {
  const issues = [];
  const hasContent = (steps) => steps.some((step) => step && step.trim().length > 0);

  if (!hasContent(given)) {
    issues.push({
      criterion: 'Given',
      message: 'Provide at least one Given step describing the starting context.',
      details: 'A Given step establishes preconditions so testers can reproduce the scenario.',
      suggestion: 'Example: “Given the user is signed in as an administrator”.',
    });
  }
  if (!hasContent(when)) {
    issues.push({
      criterion: 'When',
      message: 'Add a When step that explains the action under test.',
      details: 'The When step captures the behaviour being exercised in the scenario.',
      suggestion: 'Example: “When they approve the pending request”.',
    });
  }
  if (!hasContent(then)) {
    issues.push({
      criterion: 'Then',
      message: 'Add a Then step outlining the expected result.',
      details: 'Then steps describe the observable outcome that proves the story works.',
      suggestion: 'Example: “Then the request status updates to Approved and a confirmation email is sent”.',
    });
  }

  measurability.forEach((warning) => {
    issues.push({
      criterion: `Then step ${warning.index + 1}`,
      message: warning.message,
      details: warning.details,
      suggestion: warning.suggestion,
    });
  });

  return { satisfied: issues.length === 0, issues };
}

function acceptanceTestColumnsForInsert() {
  if (acceptanceTestsHasTitleColumn) {
    return {
      columns:
        'story_id, title, given, when_step, then_step, status, created_at, updated_at', // prettier-ignore
      placeholders: '?, ?, ?, ?, ?, ?, ?, ?',
    };
  }
  return {
    columns: 'story_id, given, when_step, then_step, status, created_at, updated_at',
    placeholders: '?, ?, ?, ?, ?, ?, ?',
  };
}

async function insertAcceptanceTest(
  db,
  { storyId, title = '', given, when, then, status = ACCEPTANCE_TEST_STATUS_DRAFT, timestamp = now() }
) {
  if (db.constructor.name === 'DynamoDBDataLayer') {
    // DynamoDB implementation
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(client);
    const tableName = process.env.ACCEPTANCE_TESTS_TABLE || 'aipm-backend-prod-acceptance-tests';
    
    const id = Date.now(); // Generate unique ID
    
    await docClient.send(new PutCommand({
      TableName: tableName,
      Item: {
        id,
        storyId: storyId,
        title: acceptanceTestsHasTitleColumn ? title : undefined,
        given: JSON.stringify(given),
        whenStep: JSON.stringify(when),
        thenStep: JSON.stringify(then),
        status,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    }));
    
    return { lastInsertRowid: id };
  } else {
    // SQLite implementation
    const { columns, placeholders } = acceptanceTestColumnsForInsert();
    const statement = db.prepare(`INSERT INTO acceptance_tests (${columns}) VALUES (${placeholders})`);
    const params = acceptanceTestsHasTitleColumn
      ? [
          storyId,
          title,
          JSON.stringify(given),
          JSON.stringify(when),
          JSON.stringify(then),
          status,
          timestamp,
          timestamp,
        ]
      : [
          storyId,
          JSON.stringify(given),
          JSON.stringify(when),
          JSON.stringify(then),
          status,
          timestamp,
          timestamp,
        ];
    
    let result;
    try {
      result = statement.run(...params);
    } catch (error) {
      console.error(`Debug: insertAcceptanceTest SQL error:`, error);
      throw error;
    }
    
    return result;
  }
}

  function insertDependency(db, { storyId, dependsOnStoryId, relationship = STORY_DEPENDENCY_DEFAULT }) {
    const normalizedRelationship = normalizeDependencyRelationship(relationship);
    const statement = db.prepare(
      'INSERT OR IGNORE INTO story_dependencies (story_id, depends_on_story_id, relationship) VALUES (?, ?, ?)' // prettier-ignore
    );
    return statement.run(storyId, dependsOnStoryId, normalizedRelationship);
  }

function normalizeStoryText(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function normalizeIdeaAction(idea) {
  if (!idea) return { action: '', summary: '' };
  let text = String(idea).trim();
  if (!text) return { action: '', summary: '' };
  const summary = text.replace(/\s+/g, ' ');
  text = summary;
  text = text.replace(/^[Gg]iven\s+/, '');
  text = text.replace(/^[Ww]hen\s+/, '');
  text = text.replace(/^[Tt]hen\s+/, '');
  text = text.replace(/^to\s+/, '');
  text = text.replace(/\.$/, '');
  if (!text) return { action: '', summary };
  if (/^I\s+want\s+to\s+/i.test(text)) {
    text = text.replace(/^I\s+want\s+to\s+/i, '');
  }
  if (/^We\s+need\s+to\s+/i.test(text)) {
    text = text.replace(/^We\s+need\s+to\s+/i, '');
  }
  if (/^[A-Z]/.test(text)) {
    text = text.charAt(0).toLowerCase() + text.slice(1);
  }
  const pronounPrefix = /^(?:they|the|a|an|user|customer|system|administrator)\b/i.test(text)
    ? ''
    : 'they ';
  const action = pronounPrefix ? `${pronounPrefix}${text}` : text;
  return { action, summary };
}

function describePersona(persona) {
  const normalized = normalizeStoryText(persona, 'the user');
  if (/^(?:the|a|an)\b/i.test(normalized)) {
    return normalized;
  }
  return `the ${normalized}`;
}

function defaultAcceptanceTestDraft(story, ordinal, reason, idea = '') {
  console.log('defaultAcceptanceTestDraft called:', { storyId: story?.id, ordinal, reason, idea });
  const persona = normalizeStoryText(story.asA, 'the user');
  const action = normalizeStoryText(story.iWant, 'perform the described action');
  const outcome = normalizeStoryText(story.soThat, 'achieve the desired outcome');
  console.log('Normalized story fields:', { persona, action, outcome });
  const titleBase = normalizeStoryText(story.title, `Story ${story.id}`);
  const verificationLabel = reason === 'update' ? 'Update verification' : 'Initial verification';
  const title = acceptanceTestsHasTitleColumn
    ? `${titleBase} – ${verificationLabel} #${ordinal}`
    : '';

  const personaSubject = describePersona(persona);
  const normalizedAction = action.replace(/^to\s+/i, '').replace(/\.$/, '');
  const sanitizedAction = normalizedAction.replace(/^(?:attempts|tries)\s+to\s+/i, '');
  const fallbackAction = sanitizedAction
    ? `attempts to ${sanitizedAction}`
    : 'attempts to perform the described action';
  const { summary: ideaSummary } = normalizeIdeaAction(idea);

  const given = ideaSummary
    ? [
        `Given ${personaSubject} has access to the system`,
        `And the idea "${ideaSummary}" has been prioritised for implementation`,
      ]
    : [`Given ${personaSubject} has access to the system`];

  const when = ideaSummary
    ? [`When ${personaSubject} works on the idea "${ideaSummary}" within the system`]
    : [`When ${personaSubject} ${fallbackAction}`];

  const then = ideaSummary
    ? [
        `Then observable evidence confirms "${ideaSummary}" meets the acceptance criteria`,
        `And ${outcome} is verified with stakeholders`,
      ]
    : [
        `Then ${outcome} is completed within 2 seconds`,
        'And a confirmation code of at least 6 characters is recorded',
      ];

  const result = { title, given, when, then, source: 'fallback', summary: '' };
  console.log('defaultAcceptanceTestDraft result:', { givenCount: given.length, whenCount: when.length, thenCount: then.length });
  return result;
}

function normalizeGeneratedSteps(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry && entry.length > 0);
}



async function generateAcceptanceTestDraft(story, ordinal, reason, { idea = '' } = {}) {
  // Call Semantic API for AI-powered test generation
  try {
    const result = await callSemanticApi('/aipm/acceptance-test-draft', {
      story: story,
      idea: idea || '',
      ordinal: ordinal
    });

    console.log('generateAcceptanceTestDraft result:', JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('Semantic API failed, using fallback:', error);
    // Fallback to heuristic
    const result = defaultAcceptanceTestDraft(story, ordinal, reason, idea);
    console.log('generateAcceptanceTestDraft result:', JSON.stringify(result));
    return result;
  }
}

async function createAutomaticAcceptanceTest(db, story, { reason = 'create', existingCount = null } = {}) {
  try {
    const countRow =
      existingCount != null
        ? { count: existingCount }
        : db.prepare('SELECT COUNT(*) as count FROM acceptance_tests WHERE story_id = ?').get(story.id) || {
            count: 0,
          };
    const ordinal = Number(countRow.count ?? 0) + 1;
    const content = await generateAcceptanceTestDraft(story, ordinal, reason);
    
    if (!content || !content.given || !content.when || !content.then) {
      console.error('createAutomaticAcceptanceTest: Invalid content generated', { content, story: { id: story.id, title: story.title } });
      return null;
    }
    
    return insertAcceptanceTest(db, {
      storyId: story.id,
      title: content.title,
      given: content.given,
      when: content.when,
      then: content.then,
      status: ACCEPTANCE_TEST_STATUS_DRAFT,
    });
  } catch (error) {
    console.error('createAutomaticAcceptanceTest failed:', error, { story: { id: story.id, title: story.title } });
    return null;
  }
}

function markAcceptanceTestsForReview(db, storyId) {
  const statement = db.prepare(
    'UPDATE acceptance_tests SET status = ?, updated_at = ? WHERE story_id = ?' // prettier-ignore
  );
  statement.run(ACCEPTANCE_TEST_STATUS_REVIEW, now(), storyId);
}

function isAcceptanceTestPassed(status) {
  return typeof status === 'string' && status.trim().toLowerCase() === 'pass';
}

async function ensureCanMarkStoryDone(db, storyId) {
  const storyRows = await safeSelectAll(db, 'SELECT id, parent_id, title, status FROM user_stories');
  const childrenByParent = new Map();
  storyRows.forEach((row) => {
    const parentId = row.parent_id == null ? null : Number(row.parent_id);
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push(row);
  });

  const descendants = [];
  const stack = [...(childrenByParent.get(storyId) || [])];
  while (stack.length) {
    const node = stack.pop();
    descendants.push(node);
    const nested = childrenByParent.get(node.id) || [];
    nested.forEach((child) => stack.push(child));
  }

  const incompleteChildren = descendants.filter(
    (child) => safeNormalizeStoryStatus(child.status) !== 'Done'
  );

  const testQuery = acceptanceTestsHasTitleColumn
    ? 'SELECT id, title, status FROM acceptance_tests WHERE story_id = ?'
    : 'SELECT id, status FROM acceptance_tests WHERE story_id = ?';
  const tests = await safeSelectAll(db, testQuery, storyId);
  const failingTests = tests.filter((test) => !isAcceptanceTestPassed(test.status));

  const details = {
    incompleteChildren: incompleteChildren.map((child) => ({
      id: child.id,
      title: child.title || '',
      status: safeNormalizeStoryStatus(child.status),
    })),
    failingTests: failingTests.map((test) => ({
      id: test.id,
      title: acceptanceTestsHasTitleColumn && typeof test.title === 'string' ? test.title : '',
      status: test.status || ACCEPTANCE_TEST_STATUS_DRAFT,
    })),
  };

  if (
    details.incompleteChildren.length > 0 ||
    details.failingTests.length > 0
  ) {
    const error = new Error(
      'Cannot mark story as Done until all child stories are Done and acceptance tests have status Pass.'
    );
    error.statusCode = 409;
    error.code = 'STORY_STATUS_BLOCKED';
    error.details = details;
    throw error;
  }
}

function tableColumns(db, table) {
  try {
    // Check for DynamoDB adapter first
    if (db.safeSelectAll && typeof db.safeSelectAll === 'function') {
      // DynamoDB adapter - return hardcoded schema
      if (table === 'acceptance_tests') {
        return [
          { name: 'id' },
          { name: 'story_id' },
          { name: 'title' },
          { name: 'given' },
          { name: 'when_step' },
          { name: 'then_step' },
          { name: 'status' },
          { name: 'created_at' },
          { name: 'updated_at' }
        ];
      }
      return [];
    } else if (db.prepare) {
      // Native database
      return db.prepare(`PRAGMA table_info(${table})`).all();
    } else {
      // CLI database
      return db._all(`PRAGMA table_info(${table})`);
    }
  } catch (error) {
    if (error && SQLITE_NO_SUCH_TABLE.test(error.message)) {
      throw new Error(`Table not found: ${table}`);
    }
    throw error;
  }
}

async function safeSelectAll(db, sql, ...params) {
  try {
    // Check if this is DynamoDB adapter
    if (db.safeSelectAll && typeof db.safeSelectAll === 'function') {
      return await db.safeSelectAll(sql, ...params);
    }
    
    // SQLite path
    return db.prepare(sql).all(...params);
  } catch (error) {
    if (error && SQLITE_NO_SUCH_TABLE.test(error.message)) {
      throw new Error(`Table not found: ${error.message}`);
    }
    throw error;
  }
}

function ensureColumn(db, table, name, definition) {
  try {
    const existing = tableColumns(db, table).some((column) => column.name === name);
    if (!existing) {
      if (db.exec) {
        // CLI database
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition};`);
      } else {
        // Native database
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition};`);
      }
    }
  } catch (error) {
    // If we get a duplicate column error, the column already exists - ignore it
    if (error.message && error.message.includes('duplicate column name')) {
      console.warn(`[database] Column ${name} already exists in ${table}, skipping`);
      return;
    }
    throw error;
  }
}

function ensureNotNullDefaults(db) {
  db.exec(`
    UPDATE user_stories SET description = '' WHERE description IS NULL;
    UPDATE user_stories SET as_a = '' WHERE as_a IS NULL;
    UPDATE user_stories SET i_want = '' WHERE i_want IS NULL;
    UPDATE user_stories SET so_that = '' WHERE so_that IS NULL;
    UPDATE user_stories SET components = '[]' WHERE components IS NULL OR TRIM(components) = '';
    UPDATE user_stories SET assignee_email = '' WHERE assignee_email IS NULL;
    UPDATE user_stories SET status = 'Draft' WHERE status IS NULL;
    UPDATE acceptance_tests SET status = 'Draft' WHERE status IS NULL;
    UPDATE reference_documents SET name = '' WHERE name IS NULL;
    UPDATE reference_documents SET url = '' WHERE url IS NULL;
    UPDATE tasks SET description = '' WHERE description IS NULL;
    UPDATE tasks SET status = 'Not Started' WHERE status IS NULL OR TRIM(status) = '';
    UPDATE story_dependencies SET relationship = 'depends' WHERE relationship IS NULL OR TRIM(relationship) = '';
  `);
}

async function removeUploadIfLocal(urlPath) {
  const filePath = resolveUploadPath(urlPath);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function ensureDatabase(req = null) {
  const useDevTables = req?.headers?.['x-use-dev-tables'] === 'true';
  console.log('🔧 Using DynamoDB', useDevTables ? '(dev tables)' : '(prod tables)');
  return new DynamoDBDataLayer(useDevTables);
}

function attachChildren(stories) {
  const byId = new Map();
  stories.forEach((story) => {
    story.children = [];
    byId.set(story.id, story);
  });
  const roots = [];
  stories.forEach((story) => {
    if (story.parentId && byId.has(story.parentId)) {
      byId.get(story.parentId).children.push(story);
    } else {
      roots.push(story);
    }
  });
  console.log(`📊 attachChildren: ${stories.length} stories, ${roots.length} roots`);
  if (roots.length > 0) {
    console.log(`📊 First root: ${roots[0].title}, children: ${roots[0].children.length}`);
  }
  return { roots, byId };
}

function hasActiveProgressChild(children) {
  if (!Array.isArray(children) || children.length === 0) {
    return false;
  }
  return children.some((child) => {
    if (!child) return false;
    const status = safeNormalizeStoryStatus(child.status);
    return status === 'In Progress' || status === 'Done';
  });
}

function propagateParentProgressStatus(nodes) {
  function walk(story) {
    if (!story || !Array.isArray(story.children) || story.children.length === 0) {
      return;
    }
    story.children.forEach((child) => walk(child));
    const storyStatus = safeNormalizeStoryStatus(story.status);
    if (storyStatus === 'Ready' && hasActiveProgressChild(story.children)) {
      story.status = 'In Progress';
    }
  }

  nodes.forEach((story) => walk(story));
}

function flattenStories(nodes) {
  const result = [];
  nodes.forEach((node) => {
    result.push(node);
    if (node.children && node.children.length > 0) {
      result.push(...flattenStories(node.children));
    }
  });
  return result;
}

async function loadDependencyRows(db) {
  try {
    // Check if this is DynamoDB adapter
    if (db.safeSelectAll && typeof db.safeSelectAll === 'function') {
      return await db.safeSelectAll('SELECT story_id, depends_on_story_id, relationship FROM story_dependencies ORDER BY story_id, depends_on_story_id');
    }
    
    // SQLite path
    return db
      .prepare('SELECT story_id, depends_on_story_id, relationship FROM story_dependencies ORDER BY story_id, depends_on_story_id')
      .all();
  } catch (error) {
    if (error && SQLITE_NO_SUCH_TABLE.test(error.message)) {
      throw new Error(`Dependencies table not found: ${error.message}`);
    }
    throw error;
  }
}

// Helper function to copy production data to development
async function clearAndCopyData(db, prodStories, prodTests) {
  try {
    // Clear development stories
    const devStoriesStmt = db.prepare('DELETE FROM user_stories');
    devStoriesStmt.run();
    
    // Clear development acceptance tests  
    const devTestsStmt = db.prepare('DELETE FROM acceptance_tests');
    devTestsStmt.run();
    
    // Copy production stories to development
    if (prodStories && prodStories.length > 0) {
      const insertStoryStmt = db.prepare(`
        INSERT INTO user_stories (
          id, title, description, as_a, i_want, so_that, components, story_point,
          assignee_email, status, created_at, updated_at, parent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const story of prodStories) {
        insertStoryStmt.run(
          story.id, story.title, story.description, story.asA, story.iWant,
          story.soThat, JSON.stringify(story.components || []), story.storyPoint,
          story.assigneeEmail, story.status, story.createdAt, story.updatedAt,
          story.parentId
        );
      }
    }
    
    // Copy production acceptance tests to development
    if (prodTests && prodTests.length > 0) {
      const insertTestStmt = db.prepare(`
        INSERT INTO acceptance_tests (
          id, story_id, title, given_step, when_step, then_step, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const test of prodTests) {
        insertTestStmt.run(
          test.id, test.storyId, test.title,
          JSON.stringify(test.given || []),
          JSON.stringify(test.when || []),
          JSON.stringify(test.then || []),
          test.status, test.createdAt, test.updatedAt
        );
      }
    }
    
    console.log(`Copied ${prodStories?.length || 0} stories and ${prodTests?.length || 0} tests to development`);
    
  } catch (error) {
    console.error('Data copy error:', error);
    throw error;
  }
}

async function loadStories(db, options = {}) {
  const { includeAiInvest = false } = options;
  const storyRows = await safeSelectAll(
    db,
    'SELECT * FROM user_stories ORDER BY (parent_id IS NOT NULL), parent_id, id'
  );
  const testRows = await safeSelectAll(db, 'SELECT * FROM acceptance_tests ORDER BY story_id, id');
  console.log('📋 Loaded acceptance tests:', testRows.length);
  if (testRows.length > 0) {
    console.log('📋 First test:', testRows[0]);
  }
  const docRows = await safeSelectAll(db, 'SELECT * FROM reference_documents ORDER BY story_id, id');

  const stories = storyRows.map((row) => {
    const components = normalizeComponentsInput(parseJsonArray(row.components));
    const story = {
      id: row.id,
      mrId: row.mrId || row.mr_id,
      parentId: row.parentId || row.parent_id,
      title: row.title,
      description: row.description ?? '',
      asA: row.asA ?? row.as_a ?? '',
      iWant: row.iWant ?? row.i_want ?? '',
      soThat: row.soThat ?? row.so_that ?? '',
      components,
      storyPoint: row.storyPoint ?? row.story_point ?? 0,
      assigneeEmail: row.assigneeEmail ?? row.assignee_email ?? '',
      status: safeNormalizeStoryStatus(row.status),
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
      acceptanceTests: [],
      referenceDocuments: [],
      tasks: [],
      prs: parseJsonArray(row.prs),
      dependencies: [],
      dependents: [],
      blockedBy: [],
      blocking: [],
    };
    return story;
  });

  const { roots, byId } = attachChildren(stories);
  console.log('📊 Story index size:', byId.size);
  console.log('📊 Story 1767550018420 in byId:', !!byId.get(1767550018420));

  propagateParentProgressStatus(roots);

  const dependencyRows = await loadDependencyRows(db);
  dependencyRows.forEach((row) => {
    const dependent = byId.get(row.story_id);
    const dependency = byId.get(row.depends_on_story_id);
    if (!dependent || !dependency) {
      return;
    }
    const relationship = normalizeDependencyRelationship(row.relationship);
    const dependencyEntry = {
      storyId: dependency.id,
      title: dependency.title,
      status: dependency.status,
      relationship,
    };
    dependent.dependencies.push(dependencyEntry);
    if (relationship === 'blocks') {
      dependent.blockedBy.push(dependencyEntry);
    }
    const dependentEntry = {
      storyId: dependent.id,
      title: dependent.title,
      status: dependent.status,
      relationship,
    };
    dependency.dependents.push(dependentEntry);
    if (relationship === 'blocks') {
      dependency.blocking.push(dependentEntry);
    }
  });

  const sortByStoryId = (a, b) => {
    if (a.storyId === b.storyId) {
      return a.title.localeCompare(b.title);
    }
    return a.storyId - b.storyId;
  };
  stories.forEach((story) => {
    story.dependencies.sort(sortByStoryId);
    story.dependents.sort(sortByStoryId);
    story.blockedBy.sort(sortByStoryId);
    story.blocking.sort(sortByStoryId);
  });

  for (const row of testRows) {
    const story = byId.get(row.storyId);
    console.log(`🔍 Attaching test ${row.id} to story ${row.storyId}, found: ${!!story}`);
    if (!story) continue;
    const given = parseJsonArray(row.given);
    const when = parseJsonArray(row.when_step);
    const then = parseJsonArray(row.then_step);
    const { warnings, suggestions } = measurabilityWarnings(then);
    const gwtHealth = await buildGwtHealth(given, when, then, warnings);
    story.acceptanceTests.push({
      id: row.id,
      storyId: row.storyId,
      title: acceptanceTestsHasTitleColumn ? row.title ?? '' : '',
      given,
      when,
      then,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      measurabilityWarnings: warnings,
      measurabilitySuggestions: suggestions,
      gwtHealth,
    });
  }

  docRows.forEach((row) => {
    const story = byId.get(row.storyId);
    if (!story) return;
    story.referenceDocuments.push({
      id: row.id,
      storyId: row.storyId,
      name: row.name,
      url: row.url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });

  // Read INVEST analysis from DB (already calculated during create/update)
  storyRows.forEach((row) => {
    const story = byId.get(row.id);
    if (!story) return;
    
    // PRs are already loaded in the story object above
    
    // invest_analysis is now a Map object, not a string
    const storedAnalysis = row.invest_analysis || null;
    
    if (storedAnalysis) {
      // Use warnings from invest_analysis
      const warnings = storedAnalysis.warnings || [];
      
      story.investWarnings = warnings;
      story.investSatisfied = warnings.length === 0;
      story.investHealth = { satisfied: story.investSatisfied, issues: warnings };
      story.investAnalysis = storedAnalysis;
    } else {
      // No stored analysis - don't calculate heuristic
      const analysis = {
        warnings: [],
        source: 'none',
        summary: 'No INVEST analysis available. Click "Run AI check" to analyze.'
      };
      applyInvestAnalysisToStory(story, analysis);
    }
  });

  return roots;
}

async function loadStoryWithDetails(db, storyId, options = {}) {
  const { includeAiInvest = false } = options;
  
  let row;
  if (db.constructor.name === 'DynamoDBDataLayer') {
    // DynamoDB implementation
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb');
    
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    const docClient = DynamoDBDocumentClient.from(client);
    const tableName = process.env.STORIES_TABLE || 'aipm-backend-prod-stories';
    
    const result = await docClient.send(new GetCommand({
      TableName: tableName,
      Key: { id: storyId }
    }));
    
    row = result.Item;
  } else {
    // SQLite implementation
    row = db.prepare('SELECT * FROM user_stories WHERE id = ?').get(storyId);
  }
  
  if (!row) {
    return null;
  }

  const story = {
    id: row.id,
    mrId: row.mr_id,
    parentId: row.parent_id || row.parentId,
    title: row.title,
    description: row.description ?? '',
    asA: row.as_a ?? row.asA ?? '',
    iWant: row.i_want ?? row.iWant ?? '',
    soThat: row.so_that ?? row.soThat ?? '',
    components: normalizeComponentsInput(parseJsonArray(row.components)),
    storyPoint: row.story_point ?? row.storyPoint ?? 0,
    assigneeEmail: row.assignee_email ?? row.assigneeEmail ?? '',
    status: safeNormalizeStoryStatus(row.status),
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    acceptanceTests: [],
    referenceDocuments: [],
    children: [],
    dependencies: [],
    dependents: [],
    blockedBy: [],
    blocking: [],
  };

  const testRows = await (async () => {
    console.log('🔍 Loading acceptance tests for story:', storyId, 'DB type:', db.constructor.name);
    if (db.constructor.name === 'DynamoDBDataLayer') {
      // DynamoDB implementation for acceptance tests
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient, ScanCommand } = await import('@aws-sdk/lib-dynamodb');
      
      const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const docClient = DynamoDBDocumentClient.from(client);
      const tableName = process.env.ACCEPTANCE_TESTS_TABLE || 'aipm-backend-prod-acceptance-tests';
      
      try {
        console.log('🔍 Scanning DynamoDB table:', tableName, 'for storyId:', storyId);
        const result = await docClient.send(new ScanCommand({
          TableName: tableName,
          FilterExpression: 'storyId = :storyId',
          ExpressionAttributeValues: {
            ':storyId': storyId
          }
        }));
        
        console.log('🔍 DynamoDB returned', result.Items?.length || 0, 'acceptance tests');
        return result.Items || [];
      } catch (error) {
        console.error('Error loading acceptance tests from DynamoDB:', error);
        return [];
      }
    } else {
      // SQLite implementation
      console.log('🔍 Using SQLite for acceptance tests');
      return safeSelectAll(
        db,
        'SELECT * FROM acceptance_tests WHERE story_id = ? ORDER BY id',
        storyId
      );
    }
  })();
  
  // Ensure testRows is an array
  const testRowsArray = Array.isArray(testRows) ? testRows : [];
  for (const testRow of testRowsArray) {
    const given = parseJsonArray(testRow.given);
    const when = parseJsonArray(testRow.whenStep);
    const then = parseJsonArray(testRow.thenStep);
    const { warnings, suggestions } = measurabilityWarnings(then);
    const gwtHealth = await buildGwtHealth(given, when, then, warnings);
    story.acceptanceTests.push({
      id: testRow.id,
      storyId: testRow.storyId,
      title: acceptanceTestsHasTitleColumn ? testRow.title ?? '' : '',
      given,
      when,
      then,
      status: testRow.status,
      createdAt: testRow.createdAt,
      updatedAt: testRow.updatedAt,
      measurabilityWarnings: warnings,
      measurabilitySuggestions: suggestions,
      gwtHealth,
    });
  }

  const docRows = await (async () => {
    if (db.constructor.name === 'DynamoDBDataLayer') {
      // Reference documents might be stored differently or not exist as separate table
      // For now, return empty array and let the regular API handle this
      return [];
    } else {
      // SQLite implementation
      return safeSelectAll(
        db,
        'SELECT * FROM reference_documents WHERE story_id = ? ORDER BY id',
        storyId
      );
    }
  })();
  
  // Ensure docRows is an array
  const docRowsArray = Array.isArray(docRows) ? docRows : [];
  docRowsArray.forEach((docRow) => {
    story.referenceDocuments.push({
      id: docRow.id,
      storyId: docRow.story_id,
      name: docRow.name,
      url: docRow.url,
      createdAt: docRow.created_at,
      updatedAt: docRow.updated_at,
    });
  });


  const childRows = await (async () => {
    if (db.constructor.name === 'DynamoDBDataLayer') {
      // DynamoDB implementation for child stories - use scan since no index exists
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient, ScanCommand } = await import('@aws-sdk/lib-dynamodb');
      
      const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const docClient = DynamoDBDocumentClient.from(client);
      const tableName = process.env.STORIES_TABLE || 'aipm-backend-prod-stories';
      
      try {
        const result = await docClient.send(new ScanCommand({
          TableName: tableName,
          FilterExpression: 'parentId = :parentId',
          ExpressionAttributeValues: {
            ':parentId': storyId
          },
          ProjectionExpression: 'id, #status',
          ExpressionAttributeNames: {
            '#status': 'status'
          }
        }));
        
        return result.Items || [];
      } catch (error) {
        console.error('Error loading child stories from DynamoDB:', error);
        return [];
      }
    } else {
      // SQLite implementation
      return db.prepare('SELECT id, status FROM user_stories WHERE parent_id = ?').all(storyId);
    }
  })();
  if (safeNormalizeStoryStatus(story.status) === 'Ready' && hasActiveProgressChild(childRows)) {
    story.status = 'In Progress';
  }

  const dependencyRows = (await loadDependencyRows(db)).filter(
    (entry) => entry.story_id === storyId || entry.depends_on_story_id === storyId
  );
  if (dependencyRows.length > 0) {
    const relatedIds = new Set();
    dependencyRows.forEach((entry) => {
      relatedIds.add(entry.story_id);
      relatedIds.add(entry.depends_on_story_id);
    });
    relatedIds.delete(storyId);
    let relatedStories = [];
    if (relatedIds.size > 0) {
      const placeholders = Array.from({ length: relatedIds.size }, () => '?').join(', ');
      const lookupStatement = db.prepare(
        `SELECT id, title, status FROM user_stories WHERE id IN (${placeholders})`
      );
      relatedStories = lookupStatement.all(...Array.from(relatedIds));
    }
    const relatedById = new Map();
    relatedStories.forEach((item) => {
      relatedById.set(item.id, {
        id: item.id,
        title: item.title,
        status: safeNormalizeStoryStatus(item.status),
      });
    });

    dependencyRows.forEach((entry) => {
      const relationship = normalizeDependencyRelationship(entry.relationship);
      if (entry.story_id === storyId) {
        const dependency = relatedById.get(entry.depends_on_story_id);
        if (dependency) {
          const dependencyEntry = {
            storyId: dependency.id,
            title: dependency.title,
            status: dependency.status,
            relationship,
          };
          story.dependencies.push(dependencyEntry);
          if (relationship === 'blocks') {
            story.blockedBy.push(dependencyEntry);
          }
        }
      }
      if (entry.depends_on_story_id === storyId) {
        const dependent = relatedById.get(entry.story_id);
        if (dependent) {
          const dependentEntry = {
            storyId: dependent.id,
            title: dependent.title,
            status: dependent.status,
            relationship,
          };
          story.dependents.push(dependentEntry);
          if (relationship === 'blocks') {
            story.blocking.push(dependentEntry);
          }
        }
      }
    });

    const sortByStoryId = (a, b) => {
      if (a.storyId === b.storyId) {
        return a.title.localeCompare(b.title);
      }
      return a.storyId - b.storyId;
    };
    story.dependencies.sort(sortByStoryId);
    story.dependents.sort(sortByStoryId);
    story.blockedBy.sort(sortByStoryId);
    story.blocking.sort(sortByStoryId);
  }

  // Check if we should use stored analysis or run new AI analysis
  let analysis;
  if (includeAiInvest) {
    // Run new AI analysis when explicitly requested
    analysis = await evaluateInvestAnalysis(
      story,
      {
        acceptanceTests: story.acceptanceTests,
        includeTestChecks: true,
      },
      { includeAiInvest }
    );
  } else if (db.constructor.name === 'DynamoDBDataLayer' && row.invest_analysis) {
    // Use stored analysis for regular requests
    if (row.invest_analysis && row.invest_analysis.source) {
      analysis = row.invest_analysis;
    }
  }
  
  // If no stored analysis, return empty analysis (don't calculate heuristic)
  if (!analysis) {
    analysis = {
      warnings: [],
      source: 'none',
      summary: 'No INVEST analysis available. Click "Run AI check" to analyze.'
    };
  }
  
  applyInvestAnalysisToStory(story, analysis);

  return story;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

async function parseJson(req) {
  // Check if body is already parsed
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  
  const chunks = [];
  for await (const chunk of req) {
    // Ensure chunk is a Buffer
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk, 'utf8'));
    } else {
      console.error('Invalid chunk type:', typeof chunk, chunk);
      throw Object.assign(new Error('Invalid request body format'), { statusCode: 400 });
    }
  }
  if (chunks.length === 0) return {};
  try {
    const body = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(body);
  } catch (error) {
    console.error('JSON parse error:', error.message);
    throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 });
  }
}

async function readRequestBody(req, maxSize = 1024 * 1024) { // 1MB limit
  const chunks = [];
  let totalSize = 0;
  
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > maxSize) {
      throw new Error('Request payload too large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function measurablePayload(payload) {
  const given = ensureArray(payload.given);
  const when = ensureArray(payload.when);
  const then = ensureArray(payload.then);
  if (given.length === 0 || when.length === 0 || then.length === 0) {
    throw Object.assign(new Error('Given/When/Then require at least one entry'), { statusCode: 400 });
  }
  return { given, when, then };
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let filePath = path.join(FRONTEND_DIR, url.pathname);
  if (url.pathname === '/' || url.pathname === '') {
    filePath = path.join(FRONTEND_DIR, 'index.html');
  }
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.html'
        ? 'text/html; charset=utf-8'
        : ext === '.css'
        ? 'text/css; charset=utf-8'
        : ext === '.js'
        ? 'application/javascript; charset=utf-8'
        : 'application/octet-stream';
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(body);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
}

async function serveUpload(pathname, res) {
  const relative = pathname.replace(/^\/uploads\//, '');
  const filePath = resolveUploadPath(`/uploads/${relative}`);
  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Invalid path');
    return;
  }
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.txt'
        ? 'text/plain; charset=utf-8'
        : ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.csv'
        ? 'text/csv; charset=utf-8'
        : ext === '.json'
        ? 'application/json; charset=utf-8'
        : 'application/octet-stream';
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(body);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
}

async function handleFileUpload(req, res, url) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { message: 'Method not allowed' });
    return;
  }
  const filename = url.searchParams.get('filename');
  if (!filename) {
    sendJson(res, 400, { message: 'filename query parameter is required' });
    return;
  }
  const sanitizedBase = sanitizeFilename(filename) || 'upload';
  const ext = path.extname(sanitizedBase);
  const uniqueName = `${Date.now()}-${randomUUID()}${ext}`;
  const destPath = resolveUploadPath(`/uploads/${uniqueName}`);
  if (!destPath) {
    sendJson(res, 400, { message: 'Invalid filename' });
    return;
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_UPLOAD_SIZE) {
      sendJson(res, 413, { message: 'File too large (max 10MB)' });
      return;
    }
    chunks.push(chunk);
  }
  if (total === 0) {
    sendJson(res, 400, { message: 'Empty file upload' });
    return;
  }
  await writeFile(destPath, Buffer.concat(chunks));
  sendJson(res, 201, {
    url: `/uploads/${uniqueName}`,
    originalName: sanitizedBase,
    size: total,
  });
}

export async function createApp() {
  const server = createServer(async (req, res) => {
    // Create db instance per-request to support X-Use-Dev-Tables header
    const db = await ensureDatabase(req);
    
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;
      const method = req.method ?? 'GET';

      if (method === 'DELETE' && pathname.includes('/api/stories/')) {
        await writeFile('/tmp/aipm-request-received.log', `${new Date().toISOString()} - ${method} ${pathname}\n`, { flag: 'a' });
      }

      debugLog(`${method} ${pathname}`, url.search ? `query: ${url.search}` : '');

      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-Use-Dev-Tables',
        });
        res.end();
        return;
      }

      if (pathname === '/api/trigger-deployment' && method === 'POST') {
        try {
          const payload = await parseJson(req);
          const { prNumber } = payload;
          
          if (!prNumber) {
            sendJson(res, 400, { success: false, error: 'PR number is required' });
            return;
          }
          
          const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
          if (!GITHUB_TOKEN) {
            sendJson(res, 500, { success: false, error: 'GitHub token not configured' });
            return;
          }
          
          // Trigger GitHub Actions workflow
          const response = await fetch('https://api.github.com/repos/demian7575/aipm/actions/workflows/deploy-pr-to-dev.yml/dispatches', {
            method: 'POST',
            headers: {
              'Authorization': `token ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ref: 'main',
              inputs: {
                pr_number: prNumber.toString()
              }
            })
          });
          
          if (response.ok) {
            sendJson(res, 200, { 
              success: true, 
              message: `Deployment workflow triggered for PR #${prNumber}` 
            });
          } else {
            const error = await response.text();
            sendJson(res, 500, { 
              success: false, 
              error: `GitHub API error: ${error}` 
            });
          }
        } catch (error) {
          sendJson(res, 500, { success: false, error: error.message });
        }
        return;
      }

      if (pathname === '/api/create-pr' && method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }

      if (pathname === '/api/create-pr' && method === 'POST') {
        await handleCreatePRRequest(req, res);
        return;
      }

      if (pathname === '/health' && method === 'GET') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        const version = process.env.DEPLOY_VERSION || 'unknown';
        const commitHash = process.env.COMMIT_HASH || 'unknown';
        res.end(JSON.stringify({ 
          status: 'running', 
          timestamp: new Date().toISOString(),
          service: 'aipm-backend',
          version: version,
          commit: commitHash
        }));
        return;
      }

    if (pathname === '/api/deploy-pr' && method === 'POST') {
      await handleDeployPRRequest(req, res);
      return;
    }

    if (pathname === '/api/merge-pr' && method === 'POST') {
      await handleMergePR(req, res);
      return;
    }

    if (pathname === '/api/personal-delegate' && method === 'POST') {
      await handleCreatePRWithCodeRequest(req, res);
      return;
    }

    if (pathname === '/api/version' && method === 'GET') {
      const { readFile } = await import('fs/promises');
      const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf-8'));
      
      // Version is replaced during deployment by deploy-to-environment.sh
      const version = { 
        version: 'DEPLOYMENT_VERSION_PLACEHOLDER',
        prNumber: process.env.PR_NUMBER || null,
        environment: process.env.NODE_ENV || 'production',
        deployTime: process.env.DEPLOY_VERSION || null
      };
      
      sendJson(res, 200, version);
      return;
    }



    if (pathname === '/' && method === 'GET') {
      sendJson(res, 200, { status: 'ok', message: 'AIPM Backend API' });
      return;
    }



    if (pathname.startsWith('/uploads/')) {
      await serveUpload(pathname, res);
      return;
    }



    if (pathname === '/api/runtime-data' && method === 'GET') {
      try {
        const body = await exportRuntimeDataBuffer(db);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="app.sqlite"',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Disposition',
        });
        res.end(body);
      } catch (error) {
        if (error && error.code === 'ENOENT') {
          sendJson(res, 404, { message: 'Runtime data not found' });
        } else {
          console.error('Failed to read runtime data', error);
          sendJson(res, 500, {
            message: 'Failed to read runtime data',
            details: error.message,
          });
        }
      }
      return;
    }

    // SSE endpoint for code generation with real-time progress
    const generateCodeStreamMatch = pathname.match(/^\/api\/stories\/([^/]+)\/generate-code-stream$/);
    if (generateCodeStreamMatch && method === 'GET') {
      const storyId = Number(generateCodeStreamMatch[1]);
      const url = new URL(req.url, `http://${req.headers.host}`);
      const prNumber = url.searchParams.get('prNumber');
      const branchName = url.searchParams.get('branchName');

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        // Load story
        const story = await loadStoryWithDetails(db, storyId);
        if (!story) {
          res.write(`data: ${JSON.stringify({ status: 'error', message: 'Story not found' })}\n\n`);
          res.end();
          return;
        }

        // Call Semantic API with stream endpoint
        const response = await fetch(`${SEMANTIC_API_URL}/aipm/code-generation?stream=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            story: story,
            branchName: branchName,
            prNumber: parseInt(prNumber),
            skipGatingTests: process.env.SKIP_GATING_TESTS === 'true'
          })
        });
        
        if (!response.ok) {
          throw new Error(`Semantic API returned ${response.status}`);
        }

        // Proxy SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }

        res.end();
      } catch (error) {
        console.error('SSE proxy error:', error);
        res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
        res.end();
      }
      return;
    }

    if (pathname === '/api/generate-code-branch' && method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      });
      res.end();
      return;
    }

    if (pathname === '/api/generate-code-branch' && method === 'POST') {
      try {
        let payload;
        try {
          payload = await parseJson(req);
        } catch (parseError) {
          console.error('Parse error in generate-code-branch:', parseError.message);
          sendJson(res, 400, { success: false, error: 'Invalid JSON payload' });
          return;
        }

        const { storyId, prNumber, prompt, originalBranch } = payload;
        
        if (!storyId || !prNumber || !prompt) {
          sendJson(res, 400, { success: false, error: 'Missing required fields: storyId, prNumber, prompt' });
          return;
        }

        const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
        const REPO_OWNER = process.env.GITHUB_OWNER || 'demian7575';
        const REPO_NAME = process.env.GITHUB_REPO || 'aipm';
        
        if (!GITHUB_TOKEN) {
          sendJson(res, 400, { success: false, error: 'GitHub token not configured' });
          return;
        }

        // Use existing PR branch
        const prBranch = originalBranch || `feature-story-${storyId}`;
        
        // Get story details for context
        const story = await loadStoryWithDetails(db, storyId);

        // Call Semantic API for code generation
        const result = await callSemanticApi('/aipm/code-generation', {
          story: story,
          branchName: prBranch,
          prNumber: prNumber
        });

        sendJson(res, 200, {
          success: true,
          prNumber: prNumber,
          branch: prBranch,
          prUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/pull/${prNumber}`,
          generatedCode: result.summary || 'Code generated'
        });

      } catch (error) {
        console.error('Generate code branch error:', error);
        sendJson(res, 500, { success: false, error: error.message });
      }
      return;
    }



    if (pathname === '/api/stories' && method === 'GET') {
      const includeAiInvest = toBoolean(url.searchParams.get('includeAiInvest'));
      const stories = await loadStories(db, { includeAiInvest });
      sendJson(res, 200, stories);
      return;
    }

    // SSE endpoint for INVEST analysis with real-time progress
    const investAnalysisStreamMatch = pathname.match(/^\/api\/stories\/([^/]+)\/invest-analysis-stream$/);
    if (investAnalysisStreamMatch && method === 'GET') {
      const storyId = Number(investAnalysisStreamMatch[1]);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        // Load story
        const story = await loadStoryWithDetails(db, storyId);
        if (!story) {
          res.write(`data: ${JSON.stringify({ status: 'error', message: 'Story not found' })}\n\n`);
          res.end();
          return;
        }

        // Strip unnecessary fields to reduce payload size
        const storyForAnalysis = {
          id: story.id,
          title: story.title,
          description: story.description,
          asA: story.asA,
          iWant: story.iWant,
          soThat: story.soThat,
          storyPoint: story.storyPoint,
          components: story.components,
          acceptanceTests: story.acceptanceTests
        };

        // Call Semantic API with stream endpoint
        const response = await fetch(`${SEMANTIC_API_URL}/aipm/invest-analysis?stream=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ story: storyForAnalysis })
        });
        
        if (!response.ok) {
          throw new Error(`Semantic API returned ${response.status}`);
        }

        // Proxy SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }

        res.end();
      } catch (error) {
        console.error('SSE proxy error:', error);
        res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
        res.end();
      }
      return;
    }

    if (pathname === '/api/stories' && method === 'POST') {
      try {
        const payload = await parseJson(req);
        const title = String(payload.title ?? '').trim();
        if (!title) {
          throw Object.assign(new Error('Title is required'), { statusCode: 400 });
        }
        const asA = String(payload.asA ?? '').trim();
        const iWant = String(payload.iWant ?? '').trim();
        const soThat = String(payload.soThat ?? '').trim();
        const description = String(payload.description ?? '').trim();
        const components = normalizeComponentsInput(payload.components, { strict: true });
        const storyPoint = normalizeStoryPoint(payload.storyPoint);
        const assigneeEmail = String(payload.assigneeEmail ?? '').trim();
        const parentId = payload.parentId == null ? null : Number(payload.parentId);
        const acceptanceTests = payload.acceptanceTests || [];
        
        // Create story first
        const timestamp = now();
        
        // Check if using DynamoDB or SQLite
        const db = await ensureDatabase();
        let newStoryId;
        
        if (db.constructor.name === 'DynamoDBDataLayer') {
          // DynamoDB implementation
          const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
          const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb');
          
          const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
          const docClient = DynamoDBDocumentClient.from(client);
          const tableName = process.env.STORIES_TABLE;
          
          // Allow specifying ID (for dev environment mirroring), otherwise generate new one
          newStoryId = payload.id || Date.now();
          
          const dynamoItem = {
            id: newStoryId,
            mrId: 1,
            title,
            description,
            asA: asA,
            iWant: iWant,
            soThat: soThat,
            components: serializeComponents(components),
            storyPoint: storyPoint,
            assigneeEmail: assigneeEmail,
            status: 'Draft',
            createdAt: timestamp,
            updatedAt: timestamp,
            investWarnings: '[]',
            investAnalysis: JSON.stringify({
              source: 'pending',
              summary: '',
              model: ''
            })
          };
          
          if (parentId !== null && parentId !== undefined) {
            dynamoItem.parentId = parentId;
          }
          
          await docClient.send(new PutCommand({
            TableName: tableName,
            Item: dynamoItem
          }));
        } else {
          // SQLite implementation
          const statement = db.prepare(
            'INSERT INTO user_stories (mr_id, parent_id, title, description, as_a, i_want, so_that, components, story_point, assignee_email, status, created_at, updated_at, invest_warnings, invest_analysis) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
          );
          const { lastInsertRowid } = await statement.run(
            parentId,
            title,
            description,
            asA,
            iWant,
            soThat,
            serializeComponents(components),
            storyPoint,
            assigneeEmail,
            'Draft',
            timestamp,
            timestamp,
            '[]',
            JSON.stringify({
              source: 'pending',
              summary: '',
              model: '',
            })
          );
          newStoryId = Number(lastInsertRowid);
        }
        
        // Create acceptance tests BEFORE INVEST analysis
        if (acceptanceTests.length > 0) {
          for (const test of acceptanceTests) {
            const testId = Date.now() + Math.floor(Math.random() * 1000);
            if (db.constructor.name === 'DynamoDBDataLayer') {
              const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
              const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb');
              const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
              const docClient = DynamoDBDocumentClient.from(client);
              await docClient.send(new PutCommand({
                TableName: process.env.ACCEPTANCE_TESTS_TABLE,
                Item: {
                  id: testId,
                  storyId: newStoryId,
                  title: test.title || '',
                  given: Array.isArray(test.given) ? test.given : [test.given],
                  whenStep: Array.isArray(test.when) ? test.when : [test.when],
                  thenStep: Array.isArray(test.then) ? test.then : [test.then],
                  status: test.status || 'Draft',
                  createdAt: timestamp,
                  updatedAt: timestamp
                }
              }));
            } else {
              const stmt = db.prepare(
                'INSERT INTO acceptance_tests (id, story_id, title, given, when_step, then_step, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
              );
              await stmt.run(
                testId,
                newStoryId,
                test.title || '',
                JSON.stringify(Array.isArray(test.given) ? test.given : [test.given]),
                JSON.stringify(Array.isArray(test.when) ? test.when : [test.when]),
                JSON.stringify(Array.isArray(test.then) ? test.then : [test.then]),
                test.status || 'Draft',
                timestamp,
                timestamp
              );
            }
          }
        }
        
        // Analyze INVEST with story ID
        let analysis;
        try {
          analysis = await analyzeInvest({
            id: newStoryId,
            title,
            asA,
            iWant,
            soThat,
            description,
            storyPoint,
            components,
          });
        } catch (error) {
          console.error('❌ AI analysis failed:', error.message);
          // Return 0 score on failure - will trigger threshold check
          analysis = {
            warnings: [],
            ai: { score: 0 },
            source: 'failed',
            summary: `AI analysis failed: ${error.message}`
          };
        }
        const warnings = analysis.warnings;
        const score = analysis.ai?.score || 0;
        
        const INVEST_SCORE_THRESHOLD = 80;
        if (score < INVEST_SCORE_THRESHOLD && !payload.acceptWarnings) {
          if (db.constructor.name === 'DynamoDBDataLayer') {
            const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
            const { DynamoDBDocumentClient, DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
            const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
            const docClient = DynamoDBDocumentClient.from(client);
            await docClient.send(new DeleteCommand({
              TableName: process.env.STORIES_TABLE,
              Key: { id: newStoryId }
            }));
          } else {
            const stmt = db.prepare('DELETE FROM user_stories WHERE id = ?');
            await stmt.run(newStoryId);
          }
          
          sendJson(res, 409, {
            code: 'INVEST_SCORE_TOO_LOW',
            message: `User story INVEST score (${score}) is below threshold (${INVEST_SCORE_THRESHOLD}).`,
            score,
            threshold: INVEST_SCORE_THRESHOLD,
            warnings,
            analysis: {
              source: analysis.source,
              summary: analysis.summary,
              model: analysis.ai?.model || null,
            },
          });
          return;
        }
        
        // Update story with analysis results
        if (db.constructor.name === 'DynamoDBDataLayer') {
          const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
          const { DynamoDBDocumentClient, UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
          const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
          const docClient = DynamoDBDocumentClient.from(client);
          await docClient.send(new UpdateCommand({
            TableName: process.env.STORIES_TABLE,
            Key: { id: newStoryId },
            UpdateExpression: 'SET investWarnings = :warnings, investAnalysis = :analysis',
            ExpressionAttributeValues: {
              ':warnings': JSON.stringify(warnings),
              ':analysis': JSON.stringify({
                source: analysis.source || 'completed',
                summary: analysis.summary || '',
                model: analysis.ai?.model || ''
              })
            }
          }));
        } else {
          const stmt = db.prepare('UPDATE user_stories SET invest_warnings = ?, invest_analysis = ? WHERE id = ?');
          await stmt.run(
            JSON.stringify(warnings),
            JSON.stringify({
              source: analysis.source,
              summary: analysis.summary,
              model: analysis.ai?.model || null,
            }),
            newStoryId
          );
        }
        
        // Return the created story directly without loading all stories
        const createdStory = {
          id: newStoryId,
          title,
          description,
          asA,
          iWant,
          soThat,
          components,
          storyPoint,
          assigneeEmail,
          parentId,
          status: 'Draft',
          createdAt: timestamp,
          updatedAt: timestamp,
          acceptanceTests: [],
          referenceDocuments: [],
          tasks: [],
          dependencies: [],
          dependents: [],
          blockedBy: [],
          blocking: [],
          children: [],
          investWarnings: warnings,
          investSatisfied: warnings.length === 0,
          investHealth: { satisfied: warnings.length === 0, issues: warnings },
          investAnalysis: {
            source: analysis.source,
            summary: analysis.summary,
            model: analysis.ai?.model || null,
          }
        };
        
        sendJson(res, 201, createdStory);
      } catch (error) {
        const status = error.statusCode ?? 500;
        const body = { message: error.message || 'Failed to create story' };
        if (error.code) body.code = error.code;
        if (error.details) body.details = error.details;
        sendJson(res, status, body);
      }
      return;
    }

    // Update story
    const updateMatch = pathname.match(/^\/api\/stories\/(\d+)$/);
    if (updateMatch && method === 'PUT') {
      try {
        const storyId = Number(updateMatch[1]);
        const payload = await parseJson(req);
        
        // Check if using DynamoDB or SQLite
        if (db.constructor.name === 'DynamoDBDataLayer') {
          // DynamoDB update
          const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
          const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
          
          const tableName = process.env.STORIES_TABLE;
          if (!tableName) {
            throw new Error('STORIES_TABLE environment variable not set');
          }
          
          const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
          const docClient = DynamoDBDocumentClient.from(client);
          
          // Get existing story
          const getResult = await docClient.send(new GetCommand({
            TableName: tableName,
            Key: { id: storyId }
          }));
          
          if (!getResult.Item) {
            sendJson(res, 404, { message: 'Story not found' });
            return;
          }
          
          // Build update expression dynamically to handle missing fields
          const updateExpressions = [];
          const expressionAttributeNames = {};
          const expressionAttributeValues = {};
          
          if (payload.title !== undefined) {
            updateExpressions.push('title = :title');
            expressionAttributeValues[':title'] = payload.title;
          }
          if (payload.asA !== undefined) {
            updateExpressions.push('asA = :asA');
            expressionAttributeValues[':asA'] = payload.asA;
          }
          if (payload.iWant !== undefined) {
            updateExpressions.push('iWant = :iWant');
            expressionAttributeValues[':iWant'] = payload.iWant;
          }
          if (payload.soThat !== undefined) {
            updateExpressions.push('soThat = :soThat');
            expressionAttributeValues[':soThat'] = payload.soThat;
          }
          if (payload.description !== undefined) {
            updateExpressions.push('description = :description');
            expressionAttributeValues[':description'] = payload.description;
          }
          if (payload.storyPoint !== undefined) {
            updateExpressions.push('storyPoint = :storyPoint');
            expressionAttributeValues[':storyPoint'] = payload.storyPoint;
          }
          if (payload.assigneeEmail !== undefined) {
            updateExpressions.push('assigneeEmail = :assigneeEmail');
            expressionAttributeValues[':assigneeEmail'] = payload.assigneeEmail;
          }
          if (payload.status !== undefined) {
            updateExpressions.push('#status = :status');
            expressionAttributeNames['#status'] = 'status';
            expressionAttributeValues[':status'] = payload.status;
          }
          if (payload.components !== undefined) {
            updateExpressions.push('components = :components');
            expressionAttributeValues[':components'] = JSON.stringify(payload.components || []);
          }
          if (payload.parentId !== undefined) {
            updateExpressions.push('parentId = :parentId');
            expressionAttributeValues[':parentId'] =
              payload.parentId == null ? null : Number(payload.parentId);
          }
          
          if (updateExpressions.length === 0) {
            sendJson(res, 400, { message: 'No fields to update' });
            return;
          }
          
          // Update story
          await docClient.send(new UpdateCommand({
            TableName: tableName,
            Key: { id: storyId },
            UpdateExpression: 'SET ' + updateExpressions.join(', '),
            ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
            ExpressionAttributeValues: expressionAttributeValues
          }));
        } else {
          // SQLite update
          const existing = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM user_stories WHERE id = ?', [storyId], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });
          
          if (!existing) {
            sendJson(res, 404, { message: 'Story not found' });
            return;
          }
          
          const updates = {
            title: payload.title ?? existing.title,
            asA: payload.asA ?? existing.asA,
            iWant: payload.iWant ?? existing.iWant,
            soThat: payload.soThat ?? existing.soThat,
            description: payload.description ?? existing.description,
            storyPoint: payload.storyPoint ?? existing.storyPoint,
            assigneeEmail: payload.assigneeEmail ?? existing.assigneeEmail,
            status: payload.status ?? existing.status,
            components: JSON.stringify(payload.components ?? JSON.parse(existing.components || '[]')),
            parentId: payload.parentId ?? existing.parent_id
          };
          
          await new Promise((resolve, reject) => {
            db.run(
              `UPDATE user_stories SET 
                title = ?, asA = ?, iWant = ?, soThat = ?, description = ?,
                story_point = ?, assigneeEmail = ?, status = ?, components = ?, parent_id = ?
              WHERE id = ?`,
              [updates.title, updates.asA, updates.iWant, updates.soThat, updates.description,
               updates.storyPoint, updates.assigneeEmail, updates.status, updates.components, updates.parentId, storyId],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });
        }
        
        // Update Task Specification file if story has associated PRs
        // NOTE: Disabled to prevent duplicate commits during code generation
        // Task specifications are now updated during the code generation process
        // await updateTaskSpecificationFile(storyId, payload);
        
        sendJson(res, 200, { success: true, message: 'Story updated' });
      } catch (err) {
        console.error('Update story error:', err);
        sendJson(res, err.statusCode || 500, { message: err.message });
      }
      return;
    }

    // Configuration endpoint - return EC2 endpoints without proxying
    // SSE endpoint for story draft generation with real-time progress
    const storyDraftStreamMatch = pathname.match(/^\/api\/stories\/draft-stream$/);
    if (storyDraftStreamMatch && method === 'GET') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const idea = url.searchParams.get('idea') || '';
      const parentId = url.searchParams.get('parentId');

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        if (!idea) {
          res.write(`data: ${JSON.stringify({ status: 'error', message: 'Idea is required' })}\n\n`);
          res.end();
          return;
        }

        // Get parent story context if provided
        let parent = null;
        if (parentId) {
          const stories = await getAllStories(db);
          parent = flattenStories(stories).find((story) => story.id === Number(parentId)) ?? null;
        }

        // Call Semantic API with stream endpoint
        const response = await fetch(`${SEMANTIC_API_URL}/aipm/story-draft?stream=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request: {
              featureDescription: idea,
              parentId: parentId ? Number(parentId) : undefined,
              parent: parent
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`Semantic API returned ${response.status}`);
        }

        // Proxy SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }

        res.end();
      } catch (error) {
        console.error('SSE proxy error:', error);
        res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
        res.end();
      }
      return;
    }



    const generateDraftStreamMatch = pathname.match(/^\/api\/stories\/([^/]+)\/tests\/generate-draft-stream$/);
    if (generateDraftStreamMatch && method === 'GET') {
      const storyId = Number(generateDraftStreamMatch[1]);
      const url = new URL(req.url, `http://${req.headers.host}`);
      const idea = url.searchParams.get('idea') || '';

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        // Load story
        const story = await loadStoryWithDetails(db, storyId);
        if (!story) {
          res.write(`data: ${JSON.stringify({ status: 'error', message: 'Story not found' })}\n\n`);
          res.end();
          return;
        }

        // Call Semantic API with stream endpoint
        const response = await fetch(`${SEMANTIC_API_URL}/aipm/acceptance-test-draft?stream=true`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            story: story,
            idea: idea || '',
            ordinal: (story.acceptanceTests?.length || 0) + 1
          })
        });
        
        if (!response.ok) {
          throw new Error(`Semantic API returned ${response.status}`);
        }

        // Proxy SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }

        res.end();
      } catch (error) {
        console.error('SSE proxy error:', error);
        res.write(`data: ${JSON.stringify({ status: 'error', message: error.message })}\n\n`);
        res.end();
      }
      return;
    }


    
    const storyIdMatch = pathname.match(/^\/api\/stories\/(\d+)$/);
    if (method === 'DELETE') {
      await writeFile('/tmp/aipm-delete-method.log', `DELETE method detected, pathname: ${pathname}, match: ${!!storyIdMatch}\n`, { flag: 'a' });
    }
    if (storyIdMatch && method === 'GET') {
      const storyId = Number(storyIdMatch[1]);
      try {
        // Use loadStoryWithDetails for proper DynamoDB support
        const story = await loadStoryWithDetails(db, storyId);
        
        if (!story) {
          sendJson(res, 404, { message: 'Story not found' });
          return;
        }
        
        // Add PRs to the story
        const prs = await getStoryPRs(db, storyId);
        story.prs = prs;
        
        // Load children stories
        const childRows = await (async () => {
          if (db.constructor.name === 'DynamoDBDataLayer') {
            const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
            const { DynamoDBDocumentClient, ScanCommand } = await import('@aws-sdk/lib-dynamodb');
            
            const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
            const docClient = DynamoDBDocumentClient.from(client);
            const tableName = process.env.STORIES_TABLE || 'aipm-backend-prod-stories';
            
            try {
              const result = await docClient.send(new ScanCommand({
                TableName: tableName,
                FilterExpression: 'parentId = :parentId',
                ExpressionAttributeValues: {
                  ':parentId': storyId
                }
              }));
              
              return result.Items || [];
            } catch (error) {
              console.error('Error loading child stories from DynamoDB:', error);
              return [];
            }
          } else {
            return db.prepare('SELECT * FROM user_stories WHERE parent_id = ?').all(storyId);
          }
        })();
        
        story.children = childRows.map(row => ({
          id: row.id,
          title: row.title,
          status: safeNormalizeStoryStatus(row.status)
        }));
        
        sendJson(res, 200, story);
      } catch (error) {
        console.error(`Failed to load story ${storyId}:`, error);
        sendJson(res, 500, { message: 'Failed to load story' });
      }
      return;
    }
    if (storyIdMatch && method === 'PATCH') {
      // Delegate to PUT handler for DynamoDB support
      const storyId = Number(storyIdMatch[1]);
      try {
        const payload = await parseJson(req);
        
        // Get existing story
        const existing = await db.getStoryById(storyId);
        if (!existing) {
          sendJson(res, 404, { message: 'Story not found' });
          return;
        }
        
        // Merge with existing values (PATCH semantics)
        const updates = {
          title: payload.title !== undefined ? payload.title : existing.title,
          asA: payload.asA !== undefined ? payload.asA : existing.asA,
          iWant: payload.iWant !== undefined ? payload.iWant : existing.iWant,
          soThat: payload.soThat !== undefined ? payload.soThat : existing.soThat,
          description: payload.description !== undefined ? payload.description : existing.description,
          storyPoint: payload.storyPoint !== undefined ? payload.storyPoint : existing.storyPoint,
          assigneeEmail: payload.assigneeEmail !== undefined ? payload.assigneeEmail : existing.assigneeEmail,
          status: payload.status !== undefined ? payload.status : existing.status,
          components: payload.components !== undefined ? payload.components : existing.components,
          parentId: payload.parentId !== undefined ? payload.parentId : existing.parentId
        };
        
        // Update in DynamoDB
        await db.updateStory(storyId, updates);
        
        // Return updated story
        const updated = await db.getStoryById(storyId);
        sendJson(res, 200, updated);
      } catch (error) {
        console.error('PATCH error:', error);
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to update story' });
      }
      return;
    }

    const dependencyCreateMatch = pathname.match(/^\/api\/stories\/(\d+)\/dependencies$/);
    if (dependencyCreateMatch && method === 'POST') {
      const storyId = Number(dependencyCreateMatch[1]);
      try {
        const payload = await parseJson(req);
        const candidateId =
          payload.dependsOnStoryId ?? payload.storyId ?? payload.dependsOn ?? payload.targetStoryId;
        const dependsOnStoryId = Number(candidateId);
        if (!Number.isFinite(dependsOnStoryId)) {
          throw Object.assign(new Error('Select a valid dependency story'), { statusCode: 400 });
        }
        if (dependsOnStoryId === storyId) {
          throw Object.assign(new Error('Stories cannot depend on themselves'), { statusCode: 400 });
        }

        const relationship = normalizeDependencyRelationship(payload.relationship);

        // Verify both stories exist
        const story = await db.getStoryById(storyId);
        if (!story) {
          throw Object.assign(new Error('Story not found'), { statusCode: 404 });
        }
        const dependencyStory = await db.getStoryById(dependsOnStoryId);
        if (!dependencyStory) {
          throw Object.assign(new Error('Dependency story not found'), { statusCode: 404 });
        }

        // Add dependency (stored in story's dependencies array)
        const dependencies = story.dependencies || [];
        const existingIndex = dependencies.findIndex(d => d.storyId === dependsOnStoryId);
        
        if (existingIndex >= 0) {
          dependencies[existingIndex].relationship = relationship;
        } else {
          dependencies.push({ storyId: dependsOnStoryId, relationship });
        }
        
        await db.updateStory(storyId, { dependencies });

        const refreshed = await loadStoryWithDetails(db, storyId);
        sendJson(res, 201, refreshed ?? null);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to add dependency' });
      }
      return;
    }

    const dependencyDeleteMatch = pathname.match(/^\/api\/stories\/(\d+)\/dependencies\/(\d+)$/);
    if (dependencyDeleteMatch && method === 'DELETE') {
      const storyId = Number(dependencyDeleteMatch[1]);
      const dependsOnStoryId = Number(dependencyDeleteMatch[2]);
      try {
        const story = await db.getStoryById(storyId);
        if (!story) {
          throw Object.assign(new Error('Story not found'), { statusCode: 404 });
        }

        const dependencies = (story.dependencies || []).filter(d => d.storyId !== dependsOnStoryId);
        
        if (dependencies.length === (story.dependencies || []).length) {
          sendJson(res, 404, { message: 'Dependency not found' });
          return;
        }
        
        await db.updateStory(storyId, { dependencies });

        const refreshed = await loadStoryWithDetails(db, storyId);
        sendJson(res, 200, refreshed ?? null);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to remove dependency' });
      }
      return;
    }

    const recheckMatch = pathname.match(/^\/api\/stories\/(\d+)\/health-check$/);
    if (recheckMatch && method === 'POST') {
      const storyId = Number(recheckMatch[1]);
      try {
        const payload = await parseJson(req);
        const includeAiInvest = toBoolean(payload.includeAiInvest);
        console.log('🏥 Health-check endpoint called for story:', storyId, 'includeAiInvest:', includeAiInvest);
        
        const story = await loadStoryWithDetails(db, storyId, { includeAiInvest });
        if (!story) {
          sendJson(res, 404, { message: 'Story not found' });
          return;
        }
        console.log('🏥 Story loaded, investAnalysis source:', story.investAnalysis?.source);
        
        // Save the updated analysis to database if AI analysis was performed
        if (includeAiInvest && story.investAnalysis?.source === 'ai') {
          console.log('🏥 Saving AI analysis to database...');
          
          if (db.constructor.name === 'DynamoDBDataLayer') {
            // DynamoDB update
            const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
            const { DynamoDBDocumentClient, UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
            
            const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
            const docClient = DynamoDBDocumentClient.from(client);
            const tableName = process.env.STORIES_TABLE || 'aipm-backend-prod-stories';
            
            await docClient.send(new UpdateCommand({
              TableName: tableName,
              Key: { id: storyId },
              UpdateExpression: 'SET invest_analysis = :analysis, updated_at = :updatedAt',
              ExpressionAttributeValues: {
                ':analysis': story.investAnalysis || {},
                ':updatedAt': new Date().toISOString()
              }
            }));
            
            console.log('🏥 AI analysis saved to DynamoDB');
          }
        }
        
        sendJson(res, 200, story);
      } catch (error) {
        console.error('🏥 Health-check error:', error);
        const status = error.statusCode ?? 500;
        sendJson(res, status, { error: error.message || 'Failed to refresh story health' });
      }
      return;
    }

    // Run in Staging workflow endpoint


    if (storyIdMatch && method === 'DELETE') {
      const storyId = Number(storyIdMatch[1]);
      await writeFile('/tmp/aipm-delete-start.log', `DELETE started for story ${storyId} at ${new Date().toISOString()}\n`, { flag: 'a' });
      
      try {
        await writeFile('/tmp/aipm-delete-try.log', `Inside try block for story ${storyId}\n`, { flag: 'a' });
        console.log(`🗑️  Starting delete for story ${storyId}`);
        
        // Delete acceptance tests first (DynamoDB only)
        if (db.constructor.name === 'DynamoDBDataLayer') {
          console.log(`  Using DynamoDB for deletion`);
          const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
          const { DynamoDBDocumentClient, DeleteCommand, QueryCommand } = await import('@aws-sdk/lib-dynamodb');
          const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
          const docClient = DynamoDBDocumentClient.from(client);
          
          // Query and delete all acceptance tests for this story
          const testsTableName = process.env.ACCEPTANCE_TESTS_TABLE || 'aipm-backend-prod-acceptance-tests';
          console.log(`  Querying acceptance tests from ${testsTableName}...`);
          const queryResult = await docClient.send(new QueryCommand({
            TableName: testsTableName,
            IndexName: 'storyId-index',
            KeyConditionExpression: 'storyId = :storyId',
            ExpressionAttributeValues: {
              ':storyId': storyId
            }
          }));
          
          console.log(`  Found ${queryResult.Items?.length || 0} acceptance tests`);
          if (queryResult.Items && queryResult.Items.length > 0) {
            for (const test of queryResult.Items) {
              await docClient.send(new DeleteCommand({
                TableName: testsTableName,
                Key: { id: test.id }
              }));
            }
            console.log(`🗑️ Deleted ${queryResult.Items.length} acceptance tests for story ${storyId}`);
          }
          
          // Delete the story
          const storiesTableName = process.env.STORIES_TABLE || 'aipm-backend-prod-stories';
          console.log(`  Deleting story from ${storiesTableName}...`);
          await docClient.send(new DeleteCommand({
            TableName: storiesTableName,
            Key: { id: storyId }
          }));
          console.log(`✅ Deleted story ${storyId}`);
          
        } else {
          // SQLite: Delete acceptance tests
          const deleteTestsStmt = db.prepare('DELETE FROM acceptance_tests WHERE story_id = ?');
          const testsResult = deleteTestsStmt.run(storyId);
          if (testsResult.changes > 0) {
            console.log(`🗑️ Deleted ${testsResult.changes} acceptance tests for story ${storyId}`);
          }
          
          // Delete the story
          const statement = db.prepare('DELETE FROM user_stories WHERE id = ?');
          const result = statement.run(storyId);
          
          if (result.changes === 0) {
            sendJson(res, 404, { message: 'Story not found' });
            return;
          }
        }
        
        console.log(`✅ Successfully deleted story ${storyId}`);
        sendJson(res, 204, {});
      } catch (error) {
        const errorLog = `[${new Date().toISOString()}] Error deleting story ${storyId}: ${error.message}\nStack: ${error.stack}\n`;
        try {
          await writeFile('/tmp/aipm-delete-error.log', errorLog, { flag: 'a' });
        } catch (e) {
          // Ignore file write errors
        }
        console.error('Error deleting story and associated data:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', JSON.stringify(error, null, 2));
        sendJson(res, 500, { message: 'Failed to delete story and associated data', error: error.message });
      }
      return;
    }

    // Story PR endpoints
    const storyPRsMatch = pathname.match(/^\/api\/stories\/(\d+)\/prs$/);
    if (storyPRsMatch && method === 'GET') {
      const storyId = Number(storyPRsMatch[1]);
      try {
        const prs = await getStoryPRs(db, storyId);
        sendJson(res, 200, prs);
      } catch (error) {
        sendJson(res, 500, { message: error.message || 'Failed to get PRs' });
      }
      return;
    }

    if (storyPRsMatch && method === 'POST') {
      const storyId = Number(storyPRsMatch[1]);
      try {
        const payload = await parseJson(req);
        const prs = await addStoryPR(db, storyId, payload);
        sendJson(res, 200, prs);
      } catch (error) {
        sendJson(res, 500, { message: error.message || 'Failed to add PR' });
      }
      return;
    }

    const storyPRMatch = pathname.match(/^\/api\/stories\/(\d+)\/prs\/(\d+)$/);
    if (storyPRMatch && method === 'DELETE') {
      const storyId = Number(storyPRMatch[1]);
      const prNumber = Number(storyPRMatch[2]);
      try {
        const prs = await removeStoryPR(db, storyId, prNumber);
        sendJson(res, 200, prs);
      } catch (error) {
        sendJson(res, 500, { message: error.message || 'Failed to remove PR' });
      }
      return;
    }

    const testDraftMatch = pathname.match(/^\/api\/stories\/(\d+)\/tests\/draft$/);
    if (testDraftMatch && method === 'POST') {
      const storyId = Number(testDraftMatch[1]);
      try {
        const payload = await parseJson(req);
        const idea = typeof payload.idea === 'string' ? payload.idea.trim() : '';
        const allStories = flattenStories(await loadStories(db));
        const story = allStories.find((node) => node.id === storyId);
        if (!story) {
          sendJson(res, 404, { message: 'Story not found' });
          return;
        }
        console.log('Generating draft for story:', { id: story.id, title: story.title, asA: story.asA, iWant: story.iWant, soThat: story.soThat, acceptanceTestsCount: story.acceptanceTests?.length || 0 });
        const ordinal = story.acceptanceTests.length + 1;
        const draft = await generateAcceptanceTestDraft(story, ordinal, 'manual', { idea });
        console.log('Draft generated:', JSON.stringify(draft));
        
        // Ensure arrays are not undefined
        const given = Array.isArray(draft.given) ? draft.given : [];
        const when = Array.isArray(draft.when) ? draft.when : [];
        const then = Array.isArray(draft.then) ? draft.then : [];
        
        console.log('Sending response:', { givenLength: given.length, whenLength: when.length, thenLength: then.length });
        
        sendJson(res, 200, {
          title: draft.title || '',
          given,
          when,
          then,
          source: draft.source || 'fallback',
          summary: draft.summary || '',
          status: ACCEPTANCE_TEST_STATUS_DRAFT,
        });
      } catch (error) {
        console.error('Failed to generate acceptance test draft', error);
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to generate acceptance test draft' });
      }
      return;
    }

    const testDraftResponseMatch = pathname.match(/^\/api\/stories\/(\d+)\/tests\/draft-response$/);
    if (testDraftResponseMatch && method === 'POST') {
      const storyId = Number(testDraftResponseMatch[1]);
      console.log('🟢 DRAFT RESPONSE received for story:', storyId);
      try {
        const payload = await parseJson(req);
        console.log('🟢 DRAFT RESPONSE payload:', JSON.stringify(payload));
        
        // Validate payload
        if (!payload.acceptanceTests || !Array.isArray(payload.acceptanceTests)) {
          sendJson(res, 400, { message: 'Invalid payload: acceptanceTests array required' });
          return;
        }
        
        // Store draft in memory or return success
        // Frontend will handle displaying the drafts
        sendJson(res, 200, { 
          success: true, 
          message: 'Draft received',
          count: payload.acceptanceTests.length 
        });
      } catch (error) {
        console.error('Failed to process draft response', error);
        sendJson(res, 500, { message: error.message || 'Failed to process draft response' });
      }
      return;
    }

    const testCreateMatch = pathname.match(/^\/api\/stories\/(\d+)\/tests$/);
    if (testCreateMatch && method === 'POST') {
      const storyId = Number(testCreateMatch[1]);
      console.log('🔵 TEST CREATION REQUEST:', { storyId, timestamp: new Date().toISOString() });
      try {
        // Re-evaluate title column existence for this request
        const hasTitleColumn = tableColumns(db, 'acceptance_tests').some((column) => column.name === 'title');
        
        const payload = await parseJson(req);
        console.log('🔵 TEST CREATION PAYLOAD:', JSON.stringify(payload));
        const { given, when, then } = measurablePayload(payload);
        
        // Use Kiro-based GWT health analysis
        const { warnings, suggestions } = measurabilityWarnings(then);
        const gwtHealth = await buildGwtHealth(given, when, then, warnings);
        
        if (!gwtHealth.satisfied && !payload.acceptWarnings) {
          sendJson(res, 409, {
            code: 'GWT_HEALTH_WARNINGS',
            message: 'Acceptance test has Given/When/Then quality issues.',
            warnings: gwtHealth.issues,
            gwtHealth: gwtHealth
          });
          return;
        }
        const allStories = flattenStories(await loadStories(db));
        const story = allStories.find((node) => node.id === storyId);
        if (!story) {
          sendJson(res, 404, { message: 'Story not found' });
          return;
        }
        const desiredTitle = hasTitleColumn
          ? String(payload.title ?? '').trim() || `AT-${story.id}-${story.acceptanceTests.length + 1}`
          : '';
        const timestamp = now();
        
        // Temporarily update the global flag for this operation
        const originalFlag = acceptanceTestsHasTitleColumn;
        acceptanceTestsHasTitleColumn = hasTitleColumn;
        
        const { lastInsertRowid } = await insertAcceptanceTest(db, {
          storyId,
          title: desiredTitle,
          given,
          when,
          then,
          status: payload.status ? String(payload.status) : 'Draft',
          timestamp,
        });
        
        console.log('Acceptance test created, lastInsertRowid:', lastInsertRowid);
        
        // Restore the original flag
        acceptanceTestsHasTitleColumn = originalFlag;
        
        // Return the created test directly instead of re-querying (avoids DynamoDB eventual consistency issues)
        const created = {
          id: Number(lastInsertRowid),
          storyId,
          title: desiredTitle,
          given,
          when,
          then,
          status: payload.status ? String(payload.status) : 'Draft',
          createdAt: timestamp,
          updatedAt: timestamp,
          measurabilityWarnings: warnings,
          measurabilitySuggestions: suggestions,
          gwtHealth: { satisfied: true, issues: [] }
        };
        console.log('Returning created test:', created);
        sendJson(res, 201, created);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to create acceptance test' });
      }
      return;
    }

    const testIdMatch = pathname.match(/^\/api\/tests\/(\d+)$/);
    if (testIdMatch && method === 'PATCH') {
      const testId = Number(testIdMatch[1]);
      try {
        const payload = await parseJson(req);
        const { given, when, then } = measurablePayload(payload);
        
        // Use Kiro-based GWT health analysis
        const { warnings, suggestions } = measurabilityWarnings(then);
        const gwtHealth = await buildGwtHealth(given, when, then, warnings);
        
        if (!gwtHealth.satisfied && !payload.acceptWarnings) {
          sendJson(res, 409, {
            code: 'GWT_HEALTH_WARNINGS',
            message: 'Acceptance test has Given/When/Then quality issues.',
            warnings: gwtHealth.issues,
            gwtHealth: gwtHealth
          });
          return;
        }
        const statement = db.prepare(
          'UPDATE acceptance_tests SET given = ?, when_step = ?, then_step = ?, status = ?, updated_at = ? WHERE id = ?' // prettier-ignore
        );
        statement.run(
          JSON.stringify(given),
          JSON.stringify(when),
          JSON.stringify(then),
          payload.status ? String(payload.status) : 'Draft',
          now(),
          testId
        );
        const test = flattenStories(await loadStories(db))
          .flatMap((story) => story.acceptanceTests)
          .find((item) => item.id === testId);
        if (!test) {
          sendJson(res, 404, { message: 'Acceptance test not found' });
        } else {
          sendJson(res, 200, test);
        }
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to update acceptance test' });
      }
      return;
    }

    if (testIdMatch && method === 'DELETE') {
      const testId = Number(testIdMatch[1]);
      const statement = db.prepare('DELETE FROM acceptance_tests WHERE id = ?');
      const result = statement.run(testId);
      if (result.changes === 0) {
        sendJson(res, 404, { message: 'Acceptance test not found' });
      } else {
        sendJson(res, 204, {});
      }
      return;
    }



    // Get available templates
    if (pathname === '/api/templates' && method === 'GET') {
      try {
        const { readdir } = await import('node:fs/promises');
        const files = await readdir(TEMPLATES_DIR);
        const templates = files
          .filter(f => f.endsWith('.md'))
          .map(f => ({
            name: f,
            displayName: f.replace(/-/g, ' ').replace('.md', '').replace(/\b\w/g, l => l.toUpperCase())
          }));
        sendJson(res, 200, templates);
      } catch (error) {
        console.error('Failed to list templates:', error);
        sendJson(res, 500, { message: 'Failed to list templates' });
      }
      return;
    }

    // Get specific template content
    const templateMatch = pathname.match(/^\/api\/templates\/(.+)$/);
    if (templateMatch && method === 'GET') {
      try {
        const templateName = decodeURIComponent(templateMatch[1]);
        const templatePath = path.join(TEMPLATES_DIR, templateName);
        const content = await readFile(templatePath, 'utf8');
        res.writeHead(200, {
          'Content-Type': 'text/markdown',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
      } catch (error) {
        console.error('Failed to read template:', error);
        sendJson(res, 404, { message: 'Template not found' });
      }
      return;
    }

    // Upload template
    if (pathname === '/api/templates/upload' && method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      });
      res.end();
      return;
    }

    if (pathname === '/api/templates/upload' && method === 'POST') {
      try {
        console.log('📤 Template upload request received');
        
        const busboy = (await import('busboy')).default;
        const { createWriteStream } = await import('fs');
        const bb = busboy({ headers: req.headers });
        let uploadError = null;
        let fileReceived = false;
        let writeStreamPromise = null;

        bb.on('file', (name, file, info) => {
          fileReceived = true;
          console.log('📁 File received:', info.filename);
          const { filename } = info;
          if (!filename.endsWith('.md') && !filename.endsWith('.markdown')) {
            console.log('❌ Invalid file type:', filename);
            file.resume();
            return;
          }

          const safeName = filename.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
          const savePath = path.join(TEMPLATES_DIR, safeName);
          console.log('💾 Saving to:', savePath);
          
          writeStreamPromise = new Promise((resolve, reject) => {
            try {
              const writeStream = createWriteStream(savePath);
              file.pipe(writeStream);
              
              writeStream.on('error', (err) => {
                console.error('Write stream error:', err);
                reject(err);
              });
              
              writeStream.on('finish', () => {
                console.log('✅ File saved:', safeName);
                resolve(safeName);
              });
            } catch (err) {
              console.error('Failed to create write stream:', err);
              reject(err);
            }
          });
        });

        bb.on('error', (err) => {
          uploadError = err;
          console.error('Busboy error:', err);
        });

        bb.on('finish', async () => {
          console.log('🏁 Busboy finished. File received:', fileReceived);
          
          if (uploadError) {
            res.writeHead(500, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ message: 'Upload failed: ' + uploadError.message }));
            return;
          }
          
          if (!writeStreamPromise) {
            res.writeHead(400, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ message: 'No valid template file uploaded' }));
            return;
          }
          
          try {
            const savedFile = await writeStreamPromise;
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ message: 'Template uploaded', filename: savedFile }));
          } catch (err) {
            res.writeHead(500, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ message: 'Upload failed: ' + err.message }));
          }
        });

        req.pipe(bb);
      } catch (error) {
        console.error('Failed to upload template:', error);
        sendJson(res, 500, { message: 'Failed to upload template: ' + error.message });
      }
      return;
    }



    const docCreateMatch = pathname.match(/^\/api\/stories\/(\d+)\/reference-documents$/);
    if (docCreateMatch && method === 'POST') {
      const storyId = Number(docCreateMatch[1]);
      try {
        const payload = await parseJson(req);
        const name = String(payload.name ?? '').trim();
        const urlValue = String(payload.url ?? '').trim();
        if (!name || !urlValue) {
          throw Object.assign(new Error('Name and URL are required'), { statusCode: 400 });
        }
        if (!isLocalUpload(urlValue)) {
          try {
            const parsed = new URL(urlValue);
            if (!(parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
              throw new Error('Only http(s) URLs are allowed');
            }
          } catch {
            throw Object.assign(new Error('URL must be http(s) or an uploaded document'), {
              statusCode: 400,
            });
          }
        }
        const statement = db.prepare(
          'INSERT INTO reference_documents (story_id, name, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)' // prettier-ignore
        );
        const timestamp = now();
        const { lastInsertRowid } = statement.run(storyId, name, urlValue, timestamp, timestamp);
        const story = flattenStories(await loadStories(db)).find((node) => node.id === storyId);
        const created = story?.referenceDocuments.find((doc) => doc.id === Number(lastInsertRowid)) ?? null;
        sendJson(res, 201, created);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to create reference document' });
      }
      return;
    }

    const docIdMatch = pathname.match(/^\/api\/reference-documents\/(\d+)$/);
    if (docIdMatch && method === 'DELETE') {
      const docId = Number(docIdMatch[1]);
      const existing = db.prepare('SELECT * FROM reference_documents WHERE id = ?').get(docId);
      if (!existing) {
        sendJson(res, 404, { message: 'Reference document not found' });
      } else {
        const statement = db.prepare('DELETE FROM reference_documents WHERE id = ?');
        statement.run(docId);
        try {
          await removeUploadIfLocal(existing.url);
        } catch (error) {
          console.error('Failed to remove uploaded file', error);
        }
        sendJson(res, 204, {});
      }
      return;
    }

    // Handle API 404s before falling back to static files
    // Deployment notifications API
    // RTM APIs
    // GET /api/test-results - Get latest test results
    if (pathname === '/api/test-results' && method === 'GET') {
      try {
        const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, ScanCommand } = await import('@aws-sdk/lib-dynamodb');
        const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        const docClient = DynamoDBDocumentClient.from(client);
        
        const result = await docClient.send(new ScanCommand({
          TableName: 'aipm-backend-prod-test-results',
          Limit: 1000
        }));
        
        sendJson(res, 200, result.Items || []);
        return;
      } catch (error) {
        console.error('Error getting test results:', error);
        sendJson(res, 500, { error: 'Failed to get test results' });
        return;
      }
    }

    if (pathname === '/api/rtm/matrix' && method === 'GET') {
      try {
        const stories = await db.getAllStories();
        
        // Get latest test results
        const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
        const { DynamoDBDocumentClient, ScanCommand } = await import('@aws-sdk/lib-dynamodb');
        const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        const docClient = DynamoDBDocumentClient.from(client);
        
        let testResults = {};
        try {
          const result = await docClient.send(new ScanCommand({
            TableName: 'aipm-backend-prod-test-results',
            Limit: 1000
          }));
          
          // Group by testId, keep latest
          for (const item of result.Items || []) {
            if (!testResults[item.testId] || item.timestamp > testResults[item.testId].timestamp) {
              testResults[item.testId] = item;
            }
          }
        } catch (e) {
          console.warn('Test results table not available:', e.message);
        }
        
        // Compute coverage for each story (return ALL stories for hierarchy)
        const matrixData = await Promise.all(stories.map(async (story) => {
          const children = stories.filter(s => s.parentId === story.id);
          const latestTestRun = await db.getLatestTestRunByStoryId(story.id);
          
          // Get acceptance tests for this story
          const acceptanceTests = await getAcceptanceTests(db, story.id);
          
          // Count test results for this story's acceptance tests
          const testIds = acceptanceTests.map(t => String(t.id));
          const passedTests = testIds.filter(id => testResults[id]?.status === 'PASS').length;
          const failedTests = testIds.filter(id => testResults[id]?.status === 'FAIL').length;
          const totalTests = testIds.length;
          
          return {
            id: story.id,
            title: story.title,
            status: story.status,
            parentId: story.parentId,
            coverage: {
              stories: children.length,
              acceptanceTests: totalTests,
              code: story.status === 'Done' ? 1 : 0,
              docs: story.referenceDocuments?.length || 0,
              ci: totalTests > 0 ? {
                count: totalTests,
                passed: passedTests,
                failed: failedTests,
                status: failedTests > 0 ? 'FAIL' : passedTests > 0 ? 'PASS' : 'PENDING'
              } : { count: 0, status: null }
            }
          };
        }));
        
        sendJson(res, 200, matrixData);
        return;
      } catch (error) {
        console.error('Error getting RTM matrix:', error);
        sendJson(res, 500, { error: 'Failed to get RTM matrix' });
        return;
      }
    }

    if (pathname.startsWith('/api/rtm/evidence/') && method === 'GET') {
      try {
        const parts = pathname.split('/');
        const storyId = parseInt(parts[4]);
        const type = parts[5];
        
        const story = await db.getStoryById(storyId);
        if (!story) {
          sendJson(res, 404, { error: 'Story not found' });
          return;
        }
        
        let evidence = [];
        
        switch (type) {
          case 'stories':
            const allStories = await db.getAllStories();
            evidence = allStories
              .filter(s => s.parentId === storyId)
              .map(s => ({
                id: s.id,
                title: s.title,
                status: s.status,
                type: 'story'
              }));
            break;
            
          case 'acceptanceTests':
            evidence = (story.acceptanceTests || []).map(t => ({
              id: t.id,
              title: t.title || t.name,
              status: t.status,
              type: 'test'
            }));
            break;
            
          case 'code':
            if (story.status === 'Done') {
              evidence = [{
                id: story.id,
                title: `Story ${story.id} - Completed`,
                status: 'Done',
                type: 'code'
              }];
            }
            break;
            
          case 'docs':
            evidence = (story.referenceDocuments || []).map((doc, idx) => ({
              id: `doc-${idx}`,
              title: doc.title || doc.name || doc,
              url: doc.url || doc,
              type: 'document'
            }));
            break;
            
          case 'ci':
            const testRun = await db.getLatestTestRunByStoryId(storyId);
            if (testRun) {
              evidence = testRun.testResults.map(t => ({
                id: t.testId,
                title: t.testName,
                status: t.status,
                type: 'ci-test',
                runId: testRun.runId,
                timestamp: testRun.timestamp
              }));
            }
            break;
        }
        
        sendJson(res, 200, evidence);
        return;
      } catch (error) {
        console.error('Error getting RTM evidence:', error);
        sendJson(res, 500, { error: 'Failed to get evidence' });
        return;
      }
    }



    await serveStatic(req, res);
    } catch (error) {
      console.error('Request error:', error.message);
      if (error.message === 'Request payload too large') {
        res.writeHead(413, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ error: 'Payload too large' }));
      } else {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  });

  server.on('close', () => {
    db.close();
  });

  return server;
}

export async function startServer(port = 4000) {
  const app = await createApp();
  return new Promise((resolve, reject) => {
    app.listen(port, () => {
      console.log(`🚀 AIPM Backend Server started on port ${port}`);
      debugLog(`Debug logging enabled: ${DEBUG}`);
      debugLog(`Environment: ${process.env.NODE_ENV || 'production'}`);
      
      resolve(app);
    });
    app.once('error', reject);
  });
}
