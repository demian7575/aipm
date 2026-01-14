#!/bin/bash

# Generate acceptance tests for all user stories

API_URL="http://44.220.45.57/api/stories"

echo "Fetching all stories..."
STORIES=$(curl -s "$API_URL" | jq -r '.[] | "\(.id)|\(.title // "Untitled")|\(.description // "No description")"')

STORY_COUNT=$(echo "$STORIES" | wc -l)
echo "Found $STORY_COUNT stories"
echo ""

COUNTER=0
while IFS='|' read -r story_id title description; do
  COUNTER=$((COUNTER + 1))
  echo "[$COUNTER/$STORY_COUNT] Processing story $story_id: $title"
  
  ssh -n -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@44.220.45.57 "echo 'Read and follow the template file: ./aipm/templates/acceptance-test-generation.md

Story ID: $story_id
Story Title: $title
Story Description: $description

Execute the template instructions exactly as written.' | timeout 30 kiro-cli chat --no-interactive --trust-all-tools 2>&1 | grep -E '(Test created successfully|error)' || echo 'Timeout or error'"
  
  echo "Completed story $story_id"
  echo "---"
  sleep 3
done <<< "$STORIES"

echo "Done! Generated tests for $STORY_COUNT stories"
