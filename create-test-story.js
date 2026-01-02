#!/usr/bin/env node

import http from 'node:http';

const postData = JSON.stringify({
  title: 'Test User Story',
  asA: 'user',
  iWant: 'to test the system',
  soThat: 'I can verify functionality',
  description: 'Basic test story for system verification',
  components: ['System'],
  storyPoint: 1,
  assigneeEmail: 'test@example.com'
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/stories',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(`✅ User story created successfully!`);
    console.log(`Status: ${res.statusCode}`);
    if (data) {
      try {
        const response = JSON.parse(data);
        console.log(`Story ID: ${response.id}`);
        console.log(`Title: ${response.title}`);
      } catch (e) {
        console.log('Response:', data);
      }
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Error creating story: ${e.message}`);
});

req.write(postData);
req.end();
