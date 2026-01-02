/**
 * Story ID Display Module
 * Adds story ID visibility to the AIPM interface
 */

function addStoryIdDisplay() {
  // Add CSS for story ID display
  const style = document.createElement('style');
  style.textContent = `
    .story-id {
      font-family: monospace;
      font-size: 0.8em;
      color: #666;
      margin-right: 8px;
      padding: 2px 6px;
      background: #f0f0f0;
      border-radius: 3px;
    }
    
    .story-title-with-id {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `;
  document.head.appendChild(style);
  
  // Function to display story ID in story elements
  function displayStoryId(storyElement, story) {
    if (!story.id) return;
    
    const titleElement = storyElement.querySelector('.story-title, h3, .title');
    if (titleElement && !titleElement.querySelector('.story-id')) {
      const idSpan = document.createElement('span');
      idSpan.className = 'story-id';
      idSpan.textContent = `#${story.id}`;
      
      // Wrap title content if needed
      if (!titleElement.classList.contains('story-title-with-id')) {
        titleElement.classList.add('story-title-with-id');
        titleElement.insertBefore(idSpan, titleElement.firstChild);
      }
    }
  }
  
  // Observer to watch for new story elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Find story elements
          const storyElements = node.querySelectorAll ? 
            node.querySelectorAll('[data-story-id], .story-item, .mindmap-node') : [];
          
          storyElements.forEach((element) => {
            const storyId = element.dataset.storyId || element.dataset.id;
            if (storyId) {
              displayStoryId(element, { id: storyId });
            }
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Apply to existing elements
  document.querySelectorAll('[data-story-id], .story-item, .mindmap-node').forEach((element) => {
    const storyId = element.dataset.storyId || element.dataset.id;
    if (storyId) {
      displayStoryId(element, { id: storyId });
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addStoryIdDisplay);
} else {
  addStoryIdDisplay();
}

export { addStoryIdDisplay };
