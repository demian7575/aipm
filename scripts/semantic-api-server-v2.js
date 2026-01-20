#!/usr/bin/env node
import http from 'http';
import { existsSync, readFile } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '../templates');
const PORT = process.env.SEMANTIC_API_PORT || 8083;
const SESSION_POOL_URL = process.env.SESSION_POOL_URL || 'http://localhost:8082';

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
      
      // Read template
      const templateContent = await readFile(templatePath, 'utf-8');
      
      // Build prompt
      const prompt = `${templateContent}\n\n## Input Data\n${JSON.stringify(parameters, null, 2)}\n\nGenerate the output and return ONLY the JSON object, no explanations.`;
      
      console.log(`🤖 Sending to session pool...`);
      
      // Send to session pool
      const poolResponse = await fetch(`${SESSION_POOL_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      if (!poolResponse.ok) {
        throw new Error(`Session pool error: ${poolResponse.statusText}`);
      }

      const result = await poolResponse.json();
      console.log(`✅ Response received`);

      // Extract JSON from output
      const jsonMatch = result.output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in output');
      }

      const jsonResult = JSON.parse(jsonMatch[0]);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(jsonResult));

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
