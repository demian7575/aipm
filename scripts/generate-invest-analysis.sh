#!/bin/bash

echo "Generating INVEST analysis for all leaf stories..."

# Get all leaf story IDs
LEAF_STORIES=$(node -e "
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

(async () => {
  const stories = await docClient.send(new ScanCommand({ TableName: 'aipm-backend-prod-stories' }));
  const childrenMap = new Map();
  stories.Items.forEach(s => {
    if (s.parent_id) {
      if (!childrenMap.has(s.parent_id)) childrenMap.set(s.parent_id, []);
      childrenMap.get(s.parent_id).push(s.id);
    }
  });
  const leaves = stories.Items.filter(s => s.parent_id && !childrenMap.has(s.id));
  leaves.forEach(l => console.log(\`\${l.id}|\${l.title}|\${l.as_a}|\${l.i_want}|\${l.so_that}\`));
})();
")

TOTAL=$(echo "$LEAF_STORIES" | wc -l)
COUNTER=0

echo "$LEAF_STORIES" | while IFS='|' read -r id title as_a i_want so_that; do
  COUNTER=$((COUNTER + 1))
  echo "[$COUNTER/$TOTAL] Analyzing story $id: $title"
  
  ssh -n -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@44.220.45.57 "echo 'Read and follow the template file: ./aipm/templates/invest-analysis.md

Story ID: $id
Story Title: $title
As a: $as_a
I want: $i_want
So that: $so_that

Execute the template instructions exactly as written.' | timeout 30 kiro-cli chat --no-interactive --trust-all-tools 2>&1 | grep -E '(success|error)' || echo 'Timeout'"
  
  sleep 2
done

echo "Done!"
