// Example frontend code to handle synchronous workflow
async function generateStoryWithKiro(idea, parentId) {
  try {
    // Call the template-based enhance endpoint
    const response = await fetch('http://44.220.45.57:8081/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: 'user-story-generation',
        input: {
          idea: idea,
          parentId: parentId,
          frontendUrl: 'http://44.220.45.57:3000'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Extract story data from Kiro CLI response
    let storyData = null;
    if (result.storyData) {
      storyData = result.storyData;
    } else if (result.enhanced) {
      // Try to parse story data from enhanced response
      const jsonMatch = result.enhanced.match(/\{[^}]*"storyId"[^}]*\}/);
      if (jsonMatch) {
        try {
          storyData = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.warn('Could not parse story data from response');
        }
      }
    }

    if (storyData) {
      // Story data received - update modal immediately
      console.log('Story created:', storyData);
      
      // Refresh story list to show new story
      await loadStories();
      
      // Show success message
      showToast(`Story "${storyData.title}" created successfully!`, 'success');
      
      return storyData;
    } else {
      // Fallback - story was posted but we don't have the data
      showToast('Story created successfully! Please refresh to see it.', 'success');
      return null;
    }

  } catch (error) {
    console.error('Story generation error:', error);
    showToast('Failed to generate story: ' + error.message, 'error');
    throw error;
  }
}
