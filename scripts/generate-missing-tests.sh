#!/bin/bash

# Get stories without acceptance tests
echo "Finding stories without acceptance tests..."

aws dynamodb scan --table-name aipm-backend-prod-stories | jq -r '.Items[].id.N' | sort > /tmp/all_story_ids.txt
aws dynamodb scan --table-name aipm-backend-prod-acceptance-tests | jq -r '.Items[].story_id.N' | sort -u > /tmp/stories_with_tests.txt
STORIES_WITHOUT_TESTS=$(comm -23 /tmp/all_story_ids.txt /tmp/stories_with_tests.txt)

TOTAL=$(echo "$STORIES_WITHOUT_TESTS" | wc -l)
echo "Found $TOTAL stories without acceptance tests"
echo ""

COUNTER=0
for story_id in $STORIES_WITHOUT_TESTS; do
  COUNTER=$((COUNTER + 1))
  
  # Get story details
  STORY=$(aws dynamodb get-item --table-name aipm-backend-prod-stories --key "{\"id\":{\"N\":\"$story_id\"}}" | jq -r '.Item')
  TITLE=$(echo "$STORY" | jq -r '.title.S // "Untitled"')
  DESC=$(echo "$STORY" | jq -r '.description.S // "No description"')
  
  echo "[$COUNTER/$TOTAL] Processing story $story_id: $TITLE"
  
  ssh -n -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no ec2-user@44.220.45.57 "echo 'Read and follow the template file: ./aipm/templates/acceptance-test-generation.md

Story ID: $story_id
Story Title: $TITLE
Story Description: $DESC

Execute the template instructions exactly as written.' | timeout 30 kiro-cli chat --no-interactive --trust-all-tools 2>&1 | grep -E '(Test created successfully|error)' || echo 'Timeout or error'"
  
  echo "---"
  sleep 3
done

echo "Done! Generated tests for $TOTAL stories"
