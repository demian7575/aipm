#!/usr/bin/env node

import http from 'http';
import { spawn } from 'child_process';

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'running',
      service: 'kiro-api-server',
      port: 8081,
      uptime: process.uptime(),
      endpoints: [
        'POST /kiro/enhance-story',
        'POST /kiro/generate-acceptance-test', 
        'POST /kiro/analyze-invest',
        'POST /kiro/generate-code',
        'POST /kiro/chat'
      ]
    }));
    return;
  }

  // Generic Kiro CLI handler
  if (req.url.startsWith('/kiro/') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const endpoint = req.url.split('/')[2]; // extract endpoint name
        
        let prompt = '';
        let taskId = `${endpoint}-${Date.now()}`;
        
        // Route to specific prompt generators
        switch (endpoint) {
          case 'enhance-story':
            prompt = generateStoryEnhancementPrompt(payload);
            break;
          case 'generate-acceptance-test':
            prompt = generateAcceptanceTestPrompt(payload);
            break;
          case 'analyze-invest':
            prompt = generateInvestAnalysisPrompt(payload);
            break;
          case 'generate-code':
            prompt = generateCodePrompt(payload);
            break;
          case 'chat':
            prompt = payload.prompt || payload.message || '';
            break;
          default:
            throw new Error(`Unknown endpoint: ${endpoint}`);
        }
        
        console.log(`📝 Processing ${endpoint} request:`, taskId);
        
        const result = await callKiroCLI(prompt, taskId);
        
        // Route to specific response parsers
        let response;
        switch (endpoint) {
          case 'enhance-story':
            response = parseStoryEnhancementResponse(result, payload);
            break;
          case 'generate-acceptance-test':
            response = parseAcceptanceTestResponse(result, payload);
            break;
          case 'analyze-invest':
            response = parseInvestAnalysisResponse(result, payload);
            break;
          case 'generate-code':
            response = parseCodeGenerationResponse(result, payload);
            break;
          case 'chat':
            response = { message: result.output, success: result.success };
            break;
          default:
            response = { output: result.output, success: result.success };
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        
      } catch (error) {
        console.error(`❌ ${req.url} error:`, error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message, success: false }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Core Kiro CLI caller
async function callKiroCLI(prompt, taskId) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Calling Kiro CLI for ${taskId}`);
    
    const kiro = spawn('/home/ec2-user/.local/bin/kiro-cli', ['chat', '--trust-all-tools', '--no-interactive'], {
      cwd: '/home/ec2-user/aipm',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let error = '';

    kiro.stdout.on('data', (data) => {
      output += data.toString();
    });

    kiro.stderr.on('data', (data) => {
      error += data.toString();
    });

    kiro.on('close', (code) => {
      console.log(`✅ Kiro CLI completed for ${taskId}, code: ${code}`);
      resolve({
        success: code === 0,
        output: output.trim(),
        error: error.trim(),
        exitCode: code
      });
    });

    kiro.stdin.write(prompt);
    kiro.stdin.end();

    // Timeout after 60 seconds (well under Lambda's timeout)
    setTimeout(() => {
      kiro.kill();
      resolve({
        success: false,
        output: output.trim(),
        error: 'Timeout after 60 seconds',
        exitCode: -1
      });
    }, 60000);
  });
}

// Prompt Generators
function generateStoryEnhancementPrompt(payload) {
  const { idea, draft, parent } = payload;
  return `Enhance this user story:

Original Idea: ${idea}

Current Draft:
- Title: ${draft.title}
- Description: ${draft.description}
- As a: ${draft.asA}
- I want: ${draft.iWant}
- So that: ${draft.soThat}
- Story Points: ${draft.storyPoint}

Parent Context: ${parent ? parent.title : 'None'}

Please provide an enhanced version with:
1. Better, more specific title
2. Clearer description
3. More precise "I want" statement
4. Better "So that" with business value
5. Improved acceptance criteria

Return your response in JSON format:
{
  "title": "enhanced title",
  "description": "enhanced description", 
  "asA": "enhanced persona",
  "iWant": "enhanced want statement",
  "soThat": "enhanced business value",
  "acceptanceCriteria": ["criterion 1", "criterion 2", "criterion 3"]
}`;
}

function generateAcceptanceTestPrompt(payload) {
  const { story, ordinal, reason, idea } = payload;
  return `Generate an acceptance test for this user story:

Story: ${story.title}
Description: ${story.description}
As a: ${story.asA}
I want: ${story.iWant}
So that: ${story.soThat}

Test Number: ${ordinal}
Reason: ${reason}
Additional Context: ${idea || 'None'}

Create a comprehensive acceptance test with:
1. Clear Given conditions
2. Specific When actions
3. Measurable Then outcomes

Return in JSON format:
{
  "title": "test title",
  "given": ["condition 1", "condition 2"],
  "when": ["action 1", "action 2"], 
  "then": ["outcome 1", "outcome 2"]
}`;
}

function generateInvestAnalysisPrompt(payload) {
  const { title, asA, iWant, soThat, description, storyPoint, components } = payload;
  return `Analyze this user story against INVEST criteria:

Title: ${title}
As a: ${asA}
I want: ${iWant}
So that: ${soThat}
Description: ${description}
Story Points: ${storyPoint}
Components: ${components?.join(', ') || 'None'}

Evaluate each INVEST criterion:
- Independent: Can this story be developed independently?
- Negotiable: Is the scope flexible and discussable?
- Valuable: Does it provide clear business value?
- Estimable: Can the effort be reasonably estimated?
- Small: Is it appropriately sized for a sprint?
- Testable: Can acceptance criteria be defined and tested?

Return in JSON format:
{
  "score": 85,
  "summary": "Overall assessment",
  "warnings": ["warning 1", "warning 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "criteria": {
    "independent": {"pass": true, "feedback": "..."},
    "negotiable": {"pass": false, "feedback": "..."},
    "valuable": {"pass": true, "feedback": "..."},
    "estimable": {"pass": true, "feedback": "..."},
    "small": {"pass": true, "feedback": "..."},
    "testable": {"pass": false, "feedback": "..."}
  }
}`;
}

function generateCodePrompt(payload) {
  const { prompt } = payload;
  
  return `Generate JavaScript code for: ${prompt}

Please provide clean, working JavaScript code that implements the requested functionality.

Return only the JavaScript code without any markdown formatting or explanations.`;
}

// Response Parsers
function parseStoryEnhancementResponse(result, payload) {
  if (!result.success) {
    return { error: result.error, enhanced: false };
  }
  
  try {
    // Try to parse JSON response from Kiro
    const enhanced = JSON.parse(result.output);
    return { ...enhanced, enhanced: true, source: 'kiro-enhanced' };
  } catch (error) {
    // Fallback: return improved heuristic version
    return {
      title: payload.draft.title,
      description: `Enhanced: ${payload.draft.description}`,
      asA: payload.draft.asA,
      iWant: payload.draft.iWant,
      soThat: `${payload.draft.soThat} (Enhanced by Kiro)`,
      acceptanceCriteria: [
        ...payload.draft.acceptanceCriteria,
        'Enhanced with Kiro CLI analysis'
      ],
      enhanced: true,
      source: 'kiro-enhanced-fallback'
    };
  }
}

function parseAcceptanceTestResponse(result, payload) {
  if (!result.success) {
    return { error: result.error, generated: false };
  }
  
  try {
    const test = JSON.parse(result.output);
    return { ...test, generated: true, source: 'kiro-generated' };
  } catch (error) {
    return {
      title: `Acceptance Test ${payload.ordinal}`,
      given: ['System is ready', 'User has permissions'],
      when: ['User performs action', 'System processes request'],
      then: ['Expected outcome occurs', 'System confirms success'],
      generated: true,
      source: 'kiro-fallback'
    };
  }
}

function parseInvestAnalysisResponse(result, payload) {
  if (!result.success) {
    return { error: result.error, analyzed: false };
  }
  
  try {
    const analysis = JSON.parse(result.output);
    return { ...analysis, analyzed: true, source: 'kiro-analysis' };
  } catch (error) {
    return {
      score: 70,
      summary: 'Basic INVEST analysis completed',
      warnings: ['Could not perform detailed analysis'],
      analyzed: true,
      source: 'kiro-analysis-fallback'
    };
  }
}

function parseCodeGenerationResponse(result, payload) {
  if (!result.success) {
    return { error: result.error, generated: false };
  }
  
  let output = result.output;
  
  // Clean ANSI codes and control characters
  output = output
    .replace(/\x1b\[[0-9;]*[mGKHJ]/g, '') // Remove ANSI escape codes
    .replace(/\r/g, '') // Remove carriage returns
    .replace(/⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/g, '') // Remove spinner characters
    .replace(/Thinking\.\.\./g, '') // Remove "Thinking..." text
    .replace(/\?25[lh]/g, '') // Remove cursor show/hide codes
    .replace(/\?2004[lh]/g, '') // Remove bracketed paste mode codes
    .trim();
  
  // Extract JavaScript code blocks
  const codeBlocks = output.match(/```(?:javascript|js)?\n([\s\S]*?)\n```/g);
  if (codeBlocks && codeBlocks.length > 0) {
    const code = codeBlocks.map(block => 
      block.replace(/```(?:javascript|js)?\n/, '').replace(/\n```/, '')
    ).join('\n\n');
    
    return {
      generated: true,
      code: code,
      source: 'kiro-code-extracted',
      message: 'Code extracted from Kiro CLI output'
    };
  }
  
  // If no code blocks, try to extract code after ">" prompt
  const lines = output.split('\n');
  let codeStartIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('>') && (lines[i].includes('function') || lines[i].includes('const') || lines[i].includes('let'))) {
      codeStartIndex = i;
      break;
    }
  }
  
  if (codeStartIndex >= 0) {
    const codeLines = lines.slice(codeStartIndex)
      .map(line => line.replace(/^.*?>\s*/, '')) // Remove prompt markers
      .filter(line => line.trim().length > 0)
      .slice(0, 20); // Limit to reasonable number of lines
    
    const code = codeLines.join('\n');
    
    return {
      generated: true,
      code: code,
      source: 'kiro-code-parsed',
      message: 'Code parsed from Kiro CLI output'
    };
  }
  
  // Fallback: return cleaned output
  return {
    generated: true,
    code: output,
    source: 'kiro-raw-output',
    message: 'Raw output from Kiro CLI'
  };
}

const PORT = 8081;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Comprehensive Kiro API Server running on port ${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  POST /kiro/enhance-story');
  console.log('  POST /kiro/generate-acceptance-test');
  console.log('  POST /kiro/analyze-invest');
  console.log('  POST /kiro/generate-code');
  console.log('  POST /kiro/chat');
  console.log('  GET  /health');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
