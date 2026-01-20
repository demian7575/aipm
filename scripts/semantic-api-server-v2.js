#!/usr/bin/env node
import http from 'http';
import crypto from 'crypto';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '../templates');
const PORT = process.env.SEMANTIC_API_PORT || 8083;
const SESSION_POOL_URL = process.env.SESSION_POOL_URL || 'http://localhost:8082';

// Store pending requests
const pendingRequests = new Map();

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

  // Response endpoint for Kiro curl callbacks
  if (url.pathname === '/api/draft-response' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const response = JSON.parse(body);
        const requestId = response.requestId;
        
        console.log(`📥 Received draft-response for requestId: ${requestId}`);
        
        // Find pending request and resolve it
        const pending = pendingRequests.get(requestId);
        if (pending) {
          pending.resolve(response);
          pendingRequests.delete(requestId);
        } else {
          console.warn(`⚠️  No pending request found for requestId: ${requestId}`);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      } catch (error) {
        console.error(`❌ Error processing draft-response:`, error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Acceptance test response endpoint
  if (url.pathname === '/api/acceptance-test-response' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const response = JSON.parse(body);
        const requestId = response.requestId;
        
        console.log(`📥 Received acceptance-test-response for requestId: ${requestId}`);
        
        const pending = pendingRequests.get(requestId);
        if (pending) {
          pending.resolve(response);
          pendingRequests.delete(requestId);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      } catch (error) {
        console.error(`❌ Error processing acceptance-test-response:`, error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // INVEST analysis response endpoint
  if (url.pathname === '/api/invest-response' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const response = JSON.parse(body);
        const requestId = response.requestId;
        
        console.log(`📥 Received invest-response for requestId: ${requestId}`);
        
        const pending = pendingRequests.get(requestId);
        if (pending) {
          pending.resolve(response);
          pendingRequests.delete(requestId);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      } catch (error) {
        console.error(`❌ Error processing invest-response:`, error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // GWT analysis response endpoint
  if (url.pathname === '/api/gwt-response' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const response = JSON.parse(body);
        const requestId = response.requestId;
        
        console.log(`📥 Received gwt-response for requestId: ${requestId}`);
        
        const pending = pendingRequests.get(requestId);
        if (pending) {
          pending.resolve(response);
          pendingRequests.delete(requestId);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'received' }));
      } catch (error) {
        console.error(`❌ Error processing gwt-response:`, error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Generic template-based endpoint
  const templateName = `${req.method}${url.pathname.replace(/\//g, '-')}.md`;
  const templatePath = join(TEMPLATES_DIR, templateName);

  console.log(`📝 ${req.method} ${url.pathname} → ${templateName}`);

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
      
      // Build prompt with template path and ALL parameters (single line)
      let parameterPairs = [];
      for (const [key, value] of Object.entries(parameters)) {
        if (key !== 'requestId') {
          const formattedValue = typeof value === 'object' ? JSON.stringify(value) : value;
          parameterPairs.push(`${key}: ${formattedValue}`);
        }
      }
      
      const prompt = `Read the template file at ${templatePath} and generate output using this input data: ${parameterPairs.join(', ')}. Request ID: ${requestId}`;
      
      console.log(`🤖 Sending to session pool (requestId: ${requestId})...`);
      console.log(`📋 Parameters: ${parameterPairs.join(', ')}`);
      
      // Create promise for response
      const responsePromise = new Promise((resolve, reject) => {
        pendingRequests.set(requestId, { resolve, reject });
        
        // Timeout after 120 seconds
        setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            reject(new Error('Request timeout'));
          }
        }, 120000);
      });
      
      // Send to session pool (don't wait for completion)
      fetch(`${SESSION_POOL_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      }).catch(err => {
        console.error('Error sending to session pool:', err);
        if (pendingRequests.has(requestId)) {
          pendingRequests.get(requestId).reject(err);
          pendingRequests.delete(requestId);
        }
      });

      // Wait for Kiro to curl back with response
      const result = await responsePromise;
      console.log(`✅ Response received for requestId: ${requestId}`);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));

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
