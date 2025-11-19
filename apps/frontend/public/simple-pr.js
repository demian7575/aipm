// Simple PR creation functionality
export function kebabCase(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export async function createAutomaticPR(story, apiBaseUrl = '') {
  if (!story) return;
  
  const branchName = `feature/story-${story.id}-${kebabCase(story.title || 'implementation')}`;
  const prTitle = `Implement: ${story.title || `Story ${story.id}`}`;
  
  const prBody = `
## Story Implementation

**Story ID:** ${story.id}
**Title:** ${story.title || 'Untitled'}

### User Story
- **As a:** ${story.asA || 'user'}
- **I want:** ${story.iWant || 'to implement this feature'}
- **So that:** ${story.soThat || 'I can achieve my goal'}

### Acceptance Criteria
${story.acceptanceTests?.map(test => 
  `- **${test.title}**\n  - Given: ${test.given?.join(', ') || 'N/A'}\n  - When: ${test.when?.join(', ') || 'N/A'}\n  - Then: ${test.then?.join(', ') || 'N/A'}`
).join('\n') || 'No acceptance tests defined'}

### Components
${story.components ? JSON.parse(story.components).join(', ') : 'None specified'}

---
*Auto-generated from AIPM Story #${story.id}*
`;

  const response = await fetch(`${apiBaseUrl}/api/create-pr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      storyId: story.id,
      branchName,
      prTitle,
      prBody: prBody.trim(),
      story
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

export function createPRButton(story, onSuccess, onError) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.textContent = 'Create PR';
  
  button.addEventListener('click', async () => {
    try {
      button.disabled = true;
      button.textContent = 'Creating PR...';
      
      const result = await createAutomaticPR(story);
      
      if (result.success) {
        onSuccess?.(result);
        if (result.prUrl) {
          window.open(result.prUrl, '_blank');
        }
      } else {
        onError?.(result.error || 'Failed to create PR');
      }
    } catch (error) {
      console.error('Error creating PR:', error);
      onError?.(error.message || 'Failed to create PR');
    } finally {
      button.disabled = false;
      button.textContent = 'Create PR';
    }
  });
  
  return button;
}
