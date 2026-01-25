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
          // Check if this is SSE mode
          if (pending.isSSE) {
            // Transform response for frontend compatibility
            let transformedResponse = response;
            
            // If response has title/given/when/then, wrap it for frontend
            if (response.title && response.given && !response.status) {
              transformedResponse = {
                status: 'complete',
                success: true,
                acceptanceTests: [{
                  title: response.title,
                  given: response.given,
                  when: response.when,
                  then: response.then
                }],
                elapsed: 0
              };
            }
            
            // Send SSE event
            pending.res.write(`data: ${JSON.stringify(transformedResponse)}\n\n`);
            
            // If complete, close connection and cleanup
            if (transformedResponse.status === 'complete' || transformedResponse.status === 'error') {
              pending.res.end();
              pendingRequests.delete(requestId);
              
              // Notify Session Pool that Kiro is done
              notifySessionPoolComplete(requestId);
            }
          } else {
            // Regular mode - resolve promise
            pending.resolve(response);
            pendingRequests.delete(requestId);
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

  // Generic template-based endpoint
  // Remove /api/ prefix from pathname before converting to template name
  const cleanPath = url.pathname.replace(/^\/api/, '');
  const templateName = `${req.method}${cleanPath.replace(/\//g, '-')}.md`;
  const templatePath = join(TEMPLATES_DIR, templateName);

  console.log(`📝 ${req.method} ${url.pathname} → ${templateName} (v2.1 - ${new Date().toISOString()})`);

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
      
      // Check if SSE mode requested
      const isSSE = url.searchParams.get('stream') === 'true' || parameters.stream === true;
      
      // Build prompt with template path and ALL parameters (single line)
      let parameterPairs = [];
      for (const [key, value] of Object.entries(parameters)) {
        if (key !== 'requestId' && key !== 'stream') {
          const formattedValue = typeof value === 'object' ? JSON.stringify(value) : value;
          parameterPairs.push(`${key}: ${formattedValue}`);
        }
      }
      
      // CRITICAL: Pass template PATH, NOT content
      // Kiro CLI MUST read the template file itself
      // DO NOT embed template content in prompt - it makes prompt too large
      const prompt = `Read template at ${templatePath}. Input: ${parameterPairs.join(', ')}. Request ID: ${requestId}`;
      
      console.log(`🤖 Sending to session pool (requestId: ${requestId}, SSE: ${isSSE})...`);
      console.log(`📋 Template: ${templatePath}`);
      console.log(`📋 Parameters: ${parameterPairs.join(', ')}`);
      
      if (isSSE) {
        // SSE mode - keep connection open
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        // Store response object for SSE
        pendingRequests.set(requestId, { res, isSSE: true });
        
        // Timeout after 180 seconds (code generation can take time)
        setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            res.write(`data: ${JSON.stringify({ status: 'error', message: 'Request timeout' })}\n\n`);
            res.end();
            pendingRequests.delete(requestId);
          }
        }, 180000);
        
      } else {
        // Regular mode - create promise and wait for response
        const responsePromise = new Promise((resolve, reject) => {
          pendingRequests.set(requestId, { resolve, reject, isSSE: false });
          
          setTimeout(() => {
            if (pendingRequests.has(requestId)) {
              pendingRequests.delete(requestId);
              reject(new Error('Request timeout'));
            }
          }, 180000);
        });
        
        // Send to session pool
        fetch(`${SESSION_POOL_URL}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        }).catch(err => {
          console.error('Error sending to session pool:', err);
          if (pendingRequests.has(requestId)) {
            const pending = pendingRequests.get(requestId);
            pending.reject(err);
            pendingRequests.delete(requestId);
          }
        });
        
        // Wait for response
        const result = await responsePromise;
        console.log(`✅ Response received for requestId: ${requestId}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      }
      
      // For SSE mode, send to session pool (response handled by callback endpoint)
      if (isSSE) {
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
      }

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
