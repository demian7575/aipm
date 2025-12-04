// Kiro CLI integration for AI tasks
import { spawn } from 'child_process';

const KIRO_TIMEOUT = 60000; // 60 seconds

/**
 * Call Kiro CLI with a prompt and get response
 */
async function callKiro(prompt, { timeoutMs = KIRO_TIMEOUT } = {}) {
  return new Promise((resolve, reject) => {
    const kiro = spawn('kiro-cli', ['chat'], {
      env: process.env,
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';
    
    const timeout = setTimeout(() => {
      kiro.kill();
      reject(new Error('Kiro CLI timeout'));
    }, timeoutMs);

    kiro.stdout.on('data', (data) => {
      output += data.toString();
    });

    kiro.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    kiro.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Kiro CLI failed: ${errorOutput}`));
      }
    });

    // Send prompt to Kiro
    kiro.stdin.write(prompt + '\n');
    kiro.stdin.write('/quit\n');
    kiro.stdin.end();
  });
}

/**
 * Analyze user story INVEST criteria using Kiro
 */
export async function analyzeInvestWithKiro(story, options = {}) {
  const prompt = `Analyze this user story for INVEST criteria:

Title: ${story.title}
As a: ${story.asA || 'Not specified'}
I want: ${story.iWant || 'Not specified'}
So that: ${story.soThat || 'Not specified'}
Description: ${story.description || 'Not specified'}
Story Points: ${story.storyPoint || 0}
Components: ${JSON.stringify(story.components || [])}
${options.acceptanceTests?.length ? `Acceptance Tests: ${options.acceptanceTests.length} tests defined` : 'No acceptance tests'}

Evaluate each INVEST criterion (Independent, Negotiable, Valuable, Estimable, Small, Testable).
For each criterion that fails, provide:
1. criterion: the INVEST letter
2. message: brief issue description
3. suggestion: how to fix it

Respond ONLY with valid JSON in this exact format:
{
  "summary": "overall assessment",
  "warnings": [
    {"criterion": "Independent", "message": "issue", "suggestion": "fix"}
  ]
}`;

  try {
    const response = await callKiro(prompt);
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*"warnings"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Kiro response');
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    return {
      warnings: result.warnings || [],
      summary: result.summary || '',
      model: 'kiro-cli',
      raw: response
    };
  } catch (error) {
    console.error('Kiro INVEST analysis failed:', error);
    return null;
  }
}

/**
 * Generate user story draft using Kiro
 */
export async function generateStoryDraftWithKiro(title) {
  const prompt = `Generate a user story for: "${title}"

Create a well-formed user story with:
- As a: (persona)
- I want: (goal)
- So that: (benefit)
- Description: (detailed explanation)

Respond ONLY with valid JSON:
{
  "asA": "persona",
  "iWant": "goal",
  "soThat": "benefit",
  "description": "detailed description"
}`;

  try {
    const response = await callKiro(prompt);
    const jsonMatch = response.match(/\{[\s\S]*"description"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Kiro response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Kiro story generation failed:', error);
    return null;
  }
}

/**
 * Generate acceptance test using Kiro
 */
export async function generateAcceptanceTestWithKiro(story) {
  const prompt = `Generate an acceptance test for this user story:

Title: ${story.title}
As a: ${story.asA}
I want: ${story.iWant}
So that: ${story.soThat}

Create a Given-When-Then acceptance test.
Respond ONLY with valid JSON:
{
  "title": "test title",
  "given": ["precondition 1", "precondition 2"],
  "when": ["action 1", "action 2"],
  "then": ["expected result 1", "expected result 2"]
}`;

  try {
    const response = await callKiro(prompt);
    const jsonMatch = response.match(/\{[\s\S]*"then"[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON in Kiro response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Kiro test generation failed:', error);
    return null;
  }
}
