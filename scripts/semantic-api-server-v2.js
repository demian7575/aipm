#!/usr/bin/env node
import http from 'http';
import crypto from 'crypto';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '..', 'templates');
const PORT = process.env.SEMANTIC_API_PORT || 8083;
const SESSION_POOL_URL = process.env.SESSION_POOL_URL || 'http://localhost:8082';

// Store pending requests
const pendingRequests = new Map();

// Notify Session Pool that request is complete
async function notifySessionPoolComplete(requestId) {
  try {
    const response = await fetch(`${SESSION_POOL_URL}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId })
    });
    
    if (response.ok) {
      console.log(`✅ Notified Session Pool: requestId ${requestId} complete`);
    } else {
      console.log(`⚠️  Failed to notify Session Pool: ${response.status}`);
    }
  } catch (error) {
    console.log(`⚠️  Error notifying Session Pool: ${error.message}`);
  }
}

console.log(`🚀 Semantic API v2 starting...`);
console.log(`📁 Templates: ${TEMPLATES_DIR}`);
console.log(`🔗 Session Pool: ${SESSION_POOL_URL}`);

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', sessionPool: SESSION_POOL_URL }));
    return;
  }

  // Generic response endpoint for all Kiro curl callbacks
  if (url.pathname.startsWith('/api/') && url.pathname.endsWith('-response') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const response = JSON.parse(body);
        const requestId = response.requestId;
        
        console.log(`📥 Received ${url.pathname} for requestId: ${requestId}`);
        
        // Find pending request
        const pending = pendingRequests.get(requestId);
        if (pending) {
          // Send SSE event
          pending.res.write(`data: ${JSON.stringify(response)}\n\n`);
          
          // If complete, close connection and cleanup
          if (response.status === 'complete' || response.status === 'error') {
            pending.res.end();
            pendingRequests.delete(requestId);
            
            // Notify Session Pool that Kiro is done
            notifySessionPoolComplete(requestId);
          }
        } else {
          console.warn(`⚠️  No pending request found for requestId: ${requestId}`);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      } catch (error) {
        console.error(`❌ Error processing ${url.pathname}:`, error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Generic template-based endpoint (SSE only)
  const cleanPath = url.pathname.replace(/^\/api/, '');
  const templateName = `${req.method}${cleanPath.replace(/\//g, '-')}.md`;
  const templatePath = join(TEMPLATES_DIR, templateName);

  console.log(`📝 ${req.method} ${url.pathname} → ${templateName} (SSE mode)`);

  if (!existsSync(templatePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Template not found', template: templateName }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const parameters = body ? JSON.parse(body) : Object.fromEntries(url.searchParams);
      
      // Generate requestId if not provided
      const requestId = parameters.requestId || crypto.randomUUID();
      
      // Add requestId to parameters for template access
      const inputData = { ...parameters, requestId };
      
      // Build prompt with clear input data separation
      const prompt = `Read and execute template at ${templatePath}.

IMPORTANT: Do NOT comment on or describe the input data. Extract variables silently and proceed directly to execution.

---INPUT---
${JSON.stringify(inputData)}
---END INPUT---`;
      
      console.log(`🤖 Sending to session pool (requestId: ${requestId})...`);
      console.log(`📋 Template: ${templatePath}`);
      
      // SSE mode - keep connection open
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      
      // Store response object for SSE
      pendingRequests.set(requestId, { res });
      
      // Timeout after 300 seconds (5 minutes) to allow complex code generation
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          res.write(`data: ${JSON.stringify({ status: 'error', message: 'Request timeout' })}\n\n`);
          res.end();
          pendingRequests.delete(requestId);
        }
      }, 300000);
      
      // Send to session pool
      fetch(`${SESSION_POOL_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, requestId })
      }).catch(err => {
        console.error('Error sending to session pool:', err);
        if (pendingRequests.has(requestId)) {
          const pending = pendingRequests.get(requestId);
          pending.res.write(`data: ${JSON.stringify({ status: 'error', message: err.message })}\n\n`);
          pending.res.end();
          pendingRequests.delete(requestId);
        }
      });

    } catch (error) {
      console.error(`❌ Error:`, error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Semantic API v2 running on port ${PORT}`);
});
