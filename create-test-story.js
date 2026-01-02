#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const story = {
  id: Date.now(),
  title: "test",
  description: "Basic test user story",
  asA: "user",
  iWant: "to test the system",
  soThat: "I can verify functionality",
  components: ["WorkModel"],
  storyPoint: 1,
  assigneeEmail: "",
  status: "Draft",
  parentId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

try {
  await docClient.send(new PutCommand({
    TableName: 'aipm-backend-prod-stories',
    Item: story
  }));
  
  console.log('✅ Created test user story:', story.id);
  console.log('📋 Story details:', JSON.stringify(story, null, 2));
} catch (error) {
  console.error('❌ Failed to create story:', error);
}
