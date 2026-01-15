import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const STORIES_TABLE = 'aipm-backend-prod-stories';
const TESTS_TABLE = 'aipm-backend-prod-acceptance-tests';

const doc = readFileSync('./documents/user-stories.md', 'utf-8');
const lines = doc.split('\n');

let storyIdCounter = 1000;
let testIdCounter = 1;

async function rebuild() {
  let currentRoot = null;
  let currentSub = null;
  let currentStory = null;
  let inAcceptance = false;
  let acceptanceBuffer = { given: [], when: [], then: [] };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Root category
    if (line.match(/^Root \d+ —/)) {
      const match = line.match(/^Root (\d+) — (.+)$/);
      const rootNum = parseInt(match[1]);
      const title = match[2];
      const id = rootNum * 1000;
      
      currentRoot = { id, title, children: [] };
      await createStory(currentRoot, null);
      console.log(`Created Root: ${title} (${id})`);
    }
    
    // Sub-category
    else if (line.match(/^\d+\.\d+ /)) {
      const match = line.match(/^(\d+)\.(\d+) (.+)$/);
      const rootNum = parseInt(match[1]);
      const subNum = parseInt(match[2]);
      const title = match[3];
      const id = rootNum * 1000 + subNum * 10;
      
      currentSub = { id, title, parent_id: currentRoot.id };
      await createStory(currentSub, currentRoot.id);
      console.log(`  Created Sub: ${title} (${id})`);
    }
    
    // User Story
    else if (line.match(/^US-\d+ —/)) {
      // Save previous story's acceptance test if exists
      if (currentStory && (acceptanceBuffer.given.length || acceptanceBuffer.when.length || acceptanceBuffer.then.length)) {
        await createAcceptanceTest(currentStory.id, acceptanceBuffer);
      }
      acceptanceBuffer = { given: [], when: [], then: [] };
      inAcceptance = false;
      
      const match = line.match(/^US-(\d+) — (.+)$/);
      const usNum = parseInt(match[1]);
      const title = match[2];
      const id = usNum;
      
      const parentId = currentSub ? currentSub.id : currentRoot.id;
      currentStory = { id, title, parent_id: parentId };
      
      // Read description (As a / I want / So that)
      let desc = [];
      for (let j = i + 1; j < i + 10 && j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('As a') || nextLine.startsWith('I want') || nextLine.startsWith('So that')) {
          desc.push(nextLine);
        }
        if (nextLine.startsWith('Acceptance')) break;
      }
      currentStory.description = desc.join(' ');
      
      await createStory(currentStory, parentId);
      console.log(`    Created Story: ${title} (${id})`);
    }
    
    // Acceptance test section
    else if (line.startsWith('Acceptance')) {
      inAcceptance = true;
      acceptanceBuffer = { given: [], when: [], then: [] };
    }
    else if (inAcceptance && line.startsWith('Given ')) {
      acceptanceBuffer.given.push(line.replace('Given ', ''));
    }
    else if (inAcceptance && line.startsWith('When ')) {
      acceptanceBuffer.when.push(line.replace('When ', ''));
    }
    else if (inAcceptance && line.startsWith('Then ')) {
      acceptanceBuffer.then.push(line.replace('Then ', ''));
    }
    else if (inAcceptance && line.startsWith('And ')) {
      // Add to last array
      const lastLine = line.replace('And ', '');
      if (acceptanceBuffer.then.length > 0) {
        acceptanceBuffer.then.push(lastLine);
      } else if (acceptanceBuffer.when.length > 0) {
        acceptanceBuffer.when.push(lastLine);
      } else if (acceptanceBuffer.given.length > 0) {
        acceptanceBuffer.given.push(lastLine);
      }
    }
  }
  
  // Save last story's acceptance test
  if (currentStory && (acceptanceBuffer.given.length || acceptanceBuffer.when.length || acceptanceBuffer.then.length)) {
    await createAcceptanceTest(currentStory.id, acceptanceBuffer);
  }
  
  console.log('\nDone!');
}

async function createStory(story, parentId) {
  await docClient.send(new PutCommand({
    TableName: STORIES_TABLE,
    Item: {
      id: story.id,
      title: story.title,
      description: story.description || '',
      parent_id: parentId,
      status: 'Draft',
      story_point: 0,
      components: ['WorkModel'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }));
}

async function createAcceptanceTest(storyId, acceptance) {
  if (!acceptance.given.length && !acceptance.when.length && !acceptance.then.length) {
    return;
  }
  
  const testId = Date.now() + testIdCounter++;
  await docClient.send(new PutCommand({
    TableName: TESTS_TABLE,
    Item: {
      id: testId,
      story_id: storyId,
      title: `Acceptance test for US-${String(storyId).padStart(4, '0')}`,
      given: acceptance.given,
      when_step: acceptance.when,
      then_step: acceptance.then,
      status: 'Draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }));
  console.log(`      Created acceptance test for story ${storyId}`);
}

rebuild();
