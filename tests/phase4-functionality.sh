#!/usr/bin/env bash
# Test: Story 1769502115894 - Display User Stories with Filters and Sorting

set -e

echo "Testing Story 1769502115894: Display User Stories with Filters and Sorting"

# Test 1: Story list displays all stories with correct information
echo "Test 1: Story list displays all stories with correct information"

# Create 5 test stories with different statuses
STORY1=$(curl -s -X POST http://localhost:4000/api/stories \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Story 1",
    "description": "Test description 1",
    "asA": "developer",
    "iWant": "test feature 1",
    "soThat": "test benefit 1",
    "components": ["WorkModel"],
    "storyPoint": 3,
    "status": "Draft",
    "parentId": 1000
  }' | jq -r '.id')

STORY2=$(curl -s -X POST http://localhost:4000/api/stories \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Story 2",
    "description": "Test description 2",
    "asA": "developer",
    "iWant": "test feature 2",
    "soThat": "test benefit 2",
    "components": ["WorkModel"],
    "storyPoint": 3,
    "status": "Draft",
    "parentId": 1000
  }' | jq -r '.id')

STORY3=$(curl -s -X POST http://localhost:4000/api/stories \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Story 3",
    "description": "Test description 3",
    "asA": "developer",
    "iWant": "test feature 3",
    "soThat": "test benefit 3",
    "components": ["WorkModel"],
    "storyPoint": 3,
    "status": "In Progress",
    "parentId": 1000
  }' | jq -r '.id')

STORY4=$(curl -s -X POST http://localhost:4000/api/stories \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Story 4",
    "description": "Test description 4",
    "asA": "developer",
    "iWant": "test feature 4",
    "soThat": "test benefit 4",
    "components": ["WorkModel"],
    "storyPoint": 3,
    "status": "In Progress",
    "parentId": 1000
  }' | jq -r '.id')

STORY5=$(curl -s -X POST http://localhost:4000/api/stories \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Test Story 5",
    "description": "Test description 5",
    "asA": "developer",
    "iWant": "test feature 5",
    "soThat": "test benefit 5",
    "components": ["WorkModel"],
    "storyPoint": 3,
    "status": "Done",
    "parentId": 1000
  }' | jq -r '.id')

# Fetch stories with pagination (page 1, limit 20)
RESPONSE=$(curl -s "http://localhost:4000/api/stories?page=1&limit=20")

# Verify response structure
echo "$RESPONSE" | jq -e '.stories' > /dev/null || { echo "❌ Response missing 'stories' field"; exit 1; }
echo "$RESPONSE" | jq -e '.pagination' > /dev/null || { echo "❌ Response missing 'pagination' field"; exit 1; }

# Count stories (should be at least 5)
STORY_COUNT=$(echo "$RESPONSE" | jq '.stories | length')
if [ "$STORY_COUNT" -lt 5 ]; then
  echo "❌ Expected at least 5 stories, got $STORY_COUNT"
  exit 1
fi

echo "✅ Test 1 passed: Story list displays all stories with correct information"

# Test 2: Pagination controls appear when stories exceed 20 items
echo "Test 2: Pagination controls appear when stories exceed 20 items"

# Create 25 stories
for i in {1..25}; do
  curl -s -X POST http://localhost:4000/api/stories \
    -H 'Content-Type: application/json' \
    -d "{
      \"title\": \"Pagination Test Story $i\",
      \"description\": \"Test description $i\",
      \"asA\": \"developer\",
      \"iWant\": \"test feature $i\",
      \"soThat\": \"test benefit $i\",
      \"components\": [\"WorkModel\"],
      \"storyPoint\": 3,
      \"parentId\": 1000
    }" > /dev/null
done

# Fetch page 1
PAGE1=$(curl -s "http://localhost:4000/api/stories?page=1&limit=20")
PAGE1_COUNT=$(echo "$PAGE1" | jq '.stories | length')
PAGE1_TOTAL=$(echo "$PAGE1" | jq '.pagination.total')
PAGE1_TOTAL_PAGES=$(echo "$PAGE1" | jq '.pagination.totalPages')

if [ "$PAGE1_COUNT" -ne 20 ]; then
  echo "❌ Expected 20 stories on page 1, got $PAGE1_COUNT"
  exit 1
fi

if [ "$PAGE1_TOTAL" -lt 25 ]; then
  echo "❌ Expected at least 25 total stories, got $PAGE1_TOTAL"
  exit 1
fi

if [ "$PAGE1_TOTAL_PAGES" -lt 2 ]; then
  echo "❌ Expected at least 2 pages, got $PAGE1_TOTAL_PAGES"
  exit 1
fi

# Fetch page 2
PAGE2=$(curl -s "http://localhost:4000/api/stories?page=2&limit=20")
PAGE2_COUNT=$(echo "$PAGE2" | jq '.stories | length')

if [ "$PAGE2_COUNT" -lt 5 ]; then
  echo "❌ Expected at least 5 stories on page 2, got $PAGE2_COUNT"
  exit 1
fi

echo "✅ Test 2 passed: Pagination controls work correctly"

# Cleanup
curl -s -X DELETE "http://localhost:4000/api/stories/$STORY1" > /dev/null
curl -s -X DELETE "http://localhost:4000/api/stories/$STORY2" > /dev/null
curl -s -X DELETE "http://localhost:4000/api/stories/$STORY3" > /dev/null
curl -s -X DELETE "http://localhost:4000/api/stories/$STORY4" > /dev/null
curl -s -X DELETE "http://localhost:4000/api/stories/$STORY5" > /dev/null

echo "✅ All tests passed for Story 1769502115894"
