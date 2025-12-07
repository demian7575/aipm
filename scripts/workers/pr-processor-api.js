#!/usr/bin/env node
import http from 'http';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_PATH = resolve(__dirname, '../..');

const PORT = 8082;
const WORKER_POOL_URL = 'http://localhost:8081';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  if (req.url === '/api/process-pr' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        const { prNumber, branch, repo, owner, taskDetails } = JSON.parse(body);
        
        console.log(`📋 Processing PR #${prNumber} on branch ${branch}`);
        
        res.writeHead(202, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'accepted', prNumber, branch }));
        
        setImmediate(() => processInBackground(prNumber, branch, repo, owner, taskDetails));
      } catch (error) {
        console.error(`❌ Parse error:`, error.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

async function processInBackground(prNumber, branch, repo, owner, taskDetails) {
  try {
    const repoPath = REPO_PATH;
    
    try {
      execSync('git stash', { cwd: repoPath, stdio: 'ignore' });
    } catch (e) {}
    
    execSync(`git fetch origin ${branch}`, { cwd: repoPath, stdio: 'inherit' });
    execSync(`git checkout ${branch}`, { cwd: repoPath, stdio: 'inherit' });
    
    console.log(`✅ Checked out branch ${branch}`);
    
    const response = await fetch(`${WORKER_POOL_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Read TASK.md and implement the feature. ${taskDetails}`,
        timeoutMs: 300000
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Kiro completed for PR #${prNumber}`);
      
      try {
        execSync('git add -A', { cwd: repoPath });
        execSync('git commit -m "feat: implement feature via Kiro CLI"', { cwd: repoPath });
        execSync(`git push origin ${branch}`, { cwd: repoPath });
        console.log(`✅ Pushed changes to PR #${prNumber}`);
      } catch (e) {
        console.error(`❌ Git operations failed for PR #${prNumber}:`, e.message);
      }
    } else {
      console.error(`❌ Kiro failed for PR #${prNumber}:`, result.error);
    }
  } catch (error) {
    console.error(`❌ Processing failed for PR #${prNumber}:`, error.message);
  }
}

function tryListen(port) {
  server.listen(port, () => {
    console.log(`🚀 PR Processor API on port ${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} in use, trying ${port + 1}`);
      tryListen(port + 1);
    } else {
      throw err;
    }
  });
}

tryListen(PORT);
