import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Amazon AI Configuration
function readAmazonAiConfig() {
  const region = process.env.AWS_REGION || process.env.AI_PM_AWS_REGION || 'us-east-1';
  const enabled = process.env.AI_PM_DISABLE_AMAZON_AI !== '1' && 
                  process.env.AI_PM_DISABLE_AMAZON_AI !== 'true' &&
                  process.env.NODE_ENV !== 'test';
  
  return {
    enabled,
    region,
    model: process.env.AI_PM_BEDROCK_MODEL || 'anthropic.claude-3-sonnet-20240229-v1:0',
    maxTokens: parseInt(process.env.AI_PM_MAX_TOKENS || '4000', 10),
    temperature: parseFloat(process.env.AI_PM_TEMPERATURE || '0.1'),
  };
}

// Initialize Bedrock client
let bedrockClient = null;

function getBedrockClient() {
  if (!bedrockClient) {
    const config = readAmazonAiConfig();
    bedrockClient = new BedrockRuntimeClient({ region: config.region });
  }
  return bedrockClient;
}

// Generic Bedrock request function
async function invokeBedrockModel(prompt, config) {
  const client = getBedrockClient();
  
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const command = new InvokeModelCommand({
    modelId: config.model,
    body,
    contentType: 'application/json',
    accept: 'application/json'
  });

  try {
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.content[0].text;
  } catch (error) {
    console.error('Bedrock invocation failed:', error);
    throw new Error(`Amazon Bedrock request failed: ${error.message}`);
  }
}

// INVEST Analysis using Amazon Bedrock
export async function requestInvestAnalysisFromAmazonAi(story, options, config) {
  if (!config.enabled) {
    return null;
  }

  const acceptanceTests = (options && Array.isArray(options.acceptanceTests) && options.acceptanceTests) || [];
  
  const prompt = `Analyze this user story for INVEST criteria compliance and provide feedback in JSON format.

User Story:
- Title: ${story.title || 'Untitled'}
- As a: ${story.asA || 'user'}
- I want: ${story.iWant || 'functionality'}
- So that: ${story.soThat || 'benefit'}
- Description: ${story.description || 'No description'}
- Story Points: ${story.storyPoint || 0}
- Components: ${JSON.stringify(story.components || [])}

Acceptance Tests:
${acceptanceTests.map((test, i) => `${i + 1}. Given: ${test.given}, When: ${test.when}, Then: ${test.then}`).join('\n')}

Please analyze this story against INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable) and respond with JSON in this exact format:

{
  "warnings": [
    {
      "criterion": "Independent|Negotiable|Valuable|Estimable|Small|Testable",
      "message": "Specific issue description",
      "severity": "warning|error"
    }
  ],
  "summary": "Brief overall assessment of the story quality",
  "model": "${config.model}"
}

Focus on actionable feedback that helps improve the story quality.`;

  try {
    const response = await invokeBedrockModel(prompt, config);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Amazon Bedrock response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      summary: parsed.summary || '',
      model: parsed.model || config.model
    };
  } catch (error) {
    console.error('Amazon AI INVEST analysis failed:', error);
    throw error;
  }
}

// Document Generation using Amazon Bedrock
export async function requestDocumentFromAmazonAi(type, context, config) {
  if (!config?.enabled) {
    return null;
  }

  const stories = context.stories || [];
  const normalizedType = type === 'test' ? 'Test Requirements' : 'System Requirements';
  
  const prompt = `Generate a comprehensive ${normalizedType} document based on the following user stories.

Stories:
${stories.map(story => `
- ID: ${story.id}
- Title: ${story.title}
- Description: ${story.description}
- As a: ${story.asA}
- I want: ${story.iWant}
- So that: ${story.soThat}
- Components: ${JSON.stringify(story.components)}
`).join('\n')}

Please generate a professional ${normalizedType} document in Markdown format and respond with JSON in this exact format:

{
  "title": "Document title",
  "markdown": "Complete markdown content of the document including headers, sections, and detailed requirements"
}

The document should include:
- Executive summary
- Scope and objectives
- Detailed requirements organized by component
- Acceptance criteria
- Testing approach (if test document)
- Implementation guidelines (if system document)`;

  try {
    const response = await invokeBedrockModel(prompt, config);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Amazon Bedrock response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const markdown = typeof parsed.markdown === 'string' ? parsed.markdown.trim() : '';
    
    if (!markdown) {
      throw new Error('Amazon Bedrock response did not include markdown content');
    }

    return {
      title: parsed.title || `${normalizedType} Document`,
      content: markdown
    };
  } catch (error) {
    console.error('Amazon AI document generation failed:', error);
    throw error;
  }
}

// Acceptance Test Draft Generation using Amazon Bedrock
export async function requestAcceptanceTestDraftFromAmazonAi(story, ordinal, reason, config, { idea = '' } = {}) {
  if (!config.enabled) {
    return null;
  }

  const prompt = `Generate an acceptance test for this user story in Given/When/Then format.

User Story:
- Title: ${story.title || 'Untitled'}
- As a: ${story.asA || 'user'}
- I want: ${story.iWant || 'functionality'}
- So that: ${story.soThat || 'benefit'}
- Description: ${story.description || 'No description'}

Test Context:
- Test number: ${ordinal}
- Reason: ${reason}
- Additional idea: ${idea}

Please generate a specific, testable acceptance test and respond with JSON in this exact format:

{
  "given": ["Precondition 1", "Precondition 2"],
  "when": ["Action 1", "Action 2"],
  "then": ["Expected result 1", "Expected result 2"],
  "titleSuffix": "Brief test scenario description",
  "summary": "Brief explanation of what this test validates"
}

Make the test specific, measurable, and directly related to the user story.`;

  try {
    const response = await invokeBedrockModel(prompt, config);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Amazon Bedrock response did not contain valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    const given = Array.isArray(parsed.given) ? parsed.given.filter(Boolean) : [];
    const when = Array.isArray(parsed.when) ? parsed.when.filter(Boolean) : [];
    const then = Array.isArray(parsed.then) ? parsed.then.filter(Boolean) : [];

    if (!given.length || !when.length || !then.length) {
      throw new Error('Amazon Bedrock response missing Given/When/Then content');
    }

    return {
      given,
      when,
      then,
      titleSuffix: parsed.titleSuffix || '',
      summary: parsed.summary || ''
    };
  } catch (error) {
    console.error('Amazon AI acceptance test generation failed:', error);
    throw error;
  }
}

export { readAmazonAiConfig };
