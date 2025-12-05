// Kiro CLI API endpoints for Lambda to call
import { spawn } from 'child_process';

const KIRO_TIMEOUT = 120000; // 2 minutes

/**
 * Call Kiro CLI with a prompt and return JSON response
 */
async function callKiroWithPrompt(prompt, timeoutMs = KIRO_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const kiro = spawn('kiro-cli', ['chat'], {
      env: process.env,
      cwd: '/home/ec2-user/aipm'
    });

    let output = '';
    
    const timeout = setTimeout(() => {
      kiro.kill();
      reject(new Error('Kiro CLI timeout'));
    }, timeoutMs);

    kiro.stdout.on('data', (data) => {
      output += data.toString();
    });

    kiro.on('close', () => {
      clearTimeout(timeout);
      
      try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          resolve(JSON.parse(jsonMatch[0]));
        } else {
          reject(new Error('No valid JSON in Kiro response'));
        }
      } catch (error) {
        reject(new Error(`Failed to parse Kiro response: ${error.message}`));
      }
    });

    kiro.stdin.write(prompt + '\n\n');
    kiro.stdin.write('/quit\n');
    kiro.stdin.end();
  });
}

/**
 * Generic Kiro endpoint handler
 */
async function handleKiroRequest(req, res, config) {
  try {
    const validation = config.validate(req.body);
    if (!validation.valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: validation.error }));
      return;
    }

    const prompt = config.buildPrompt(req.body);
    const result = await callKiroWithPrompt(prompt);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    
  } catch (error) {
    console.error(`${config.name} failed:`, error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * Endpoint configurations
 */
const ENDPOINTS = {
  generateStory: {
    name: 'Story generation',
    validate: (body) => body.idea ? { valid: true } : { valid: false, error: 'Idea is required' },
    buildPrompt: ({ idea, parentStory }) => `You are an expert Agile coach. Generate a high-quality user story following INVEST principles.

Input:
- Idea: "${idea}"
${parentStory ? `- Parent Story: "${parentStory.title}"` : ''}
${parentStory?.asA ? `- Parent Persona: "${parentStory.asA}"` : ''}
${parentStory?.components ? `- Parent Components: ${JSON.stringify(parentStory.components)}` : ''}

Requirements:
1. INDEPENDENT: Story should be self-contained
2. NEGOTIABLE: Focus on WHAT, not HOW
3. VALUABLE: Clear business value
4. ESTIMABLE: Specific enough to estimate
5. SMALL: Can be completed in one sprint
6. TESTABLE: Has clear acceptance criteria

Generate a user story with:
- title: Concise, descriptive title (max 100 chars)
- asA: Appropriate persona (User/Developer/PM/Admin/Tester)
- iWant: Clear, specific goal (use the idea text, don't over-engineer)
- soThat: Meaningful business benefit (not generic)
- storyPoint: Estimate 1-8 based on complexity
- components: Array of relevant components
- acceptanceCriteria: 3-5 testable criteria

Respond ONLY with valid JSON in this exact format:
{
  "title": "...",
  "asA": "...",
  "iWant": "...",
  "soThat": "...",
  "storyPoint": 3,
  "components": ["..."],
  "acceptanceCriteria": ["...", "...", "..."]
}`
  },
  
  generateTest: {
    name: 'Test generation',
    validate: (body) => body.story ? { valid: true } : { valid: false, error: 'Story is required' },
    buildPrompt: ({ story }) => `Generate a comprehensive acceptance test for this user story:

Title: ${story.title}
As a: ${story.asA}
I want: ${story.iWant}
So that: ${story.soThat}

Create a Given-When-Then acceptance test that:
- Tests the core functionality
- Is specific and measurable
- Covers happy path
- Includes clear verification steps

Respond ONLY with valid JSON:
{
  "title": "Test title",
  "given": ["precondition 1", "precondition 2"],
  "when": ["action 1", "action 2"],
  "then": ["expected result 1", "expected result 2", "expected result 3"]
}`
  },
  
  analyzeInvest: {
    name: 'INVEST analysis',
    validate: (body) => body.story ? { valid: true } : { valid: false, error: 'Story is required' },
    buildPrompt: ({ story }) => `Analyze this user story for INVEST compliance:

Title: ${story.title}
As a: ${story.asA || 'Not specified'}
I want: ${story.iWant || 'Not specified'}
So that: ${story.soThat || 'Not specified'}
Story Points: ${story.storyPoint || 0}
Acceptance Tests: ${story.acceptanceTests?.length || 0}

Evaluate each INVEST criterion and provide specific, actionable feedback.

Respond ONLY with valid JSON:
{
  "summary": "Overall assessment in 1-2 sentences",
  "warnings": [
    {
      "criterion": "Independent|Negotiable|Valuable|Estimable|Small|Testable",
      "message": "Specific issue",
      "suggestion": "How to fix it"
    }
  ]
}`
  }
};

/**
 * Exported endpoint handlers
 */
export const generateStoryWithKiro = (req, res) => handleKiroRequest(req, res, ENDPOINTS.generateStory);
export const generateAcceptanceTestWithKiro = (req, res) => handleKiroRequest(req, res, ENDPOINTS.generateTest);
export const analyzeInvestWithKiro = (req, res) => handleKiroRequest(req, res, ENDPOINTS.analyzeInvest);
