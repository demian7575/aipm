/**
 * Fix Done button functionality in story details panel
 * Ensures the Done button works correctly and updates story status
 */

// Fix Done button event handler
function fixDoneButtonFunctionality() {
  // Find the Done button in the details panel
  const doneButton = document.querySelector('#mark-done-btn');
  
  if (doneButton) {
    // Remove existing event listeners to prevent conflicts
    const newButton = doneButton.cloneNode(true);
    doneButton.parentNode.replaceChild(newButton, doneButton);
    
    // Add fixed event listener
    newButton.addEventListener('click', async (event) => {
      event.preventDefault();
      
      // Get current story from state
      const currentStory = state.selectedStory;
      if (!currentStory) return;
      
      // Disable button during processing
      newButton.disabled = true;
      newButton.textContent = 'Processing...';
      
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/stories/${currentStory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: currentStory.title,
            status: 'Done',
            acceptWarnings: true
          })
        });
        
        if (response.ok) {
          await loadStories();
          showToast('Story marked as Done', 'success');
        } else {
          const errorData = await response.json().catch(() => null);
          showToast(`Failed to mark story as Done: ${errorData?.message || 'Unknown error'}`, 'error');
        }
      } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
      } finally {
        // Re-enable button
        newButton.disabled = false;
        newButton.textContent = 'Done';
      }
    });
  }
}

// Initialize fix when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', fixDoneButtonFunctionality);
} else {
  fixDoneButtonFunctionality();
}

// Also fix when story details are rendered
const originalRenderStoryDetails = window.renderStoryDetails;
if (originalRenderStoryDetails) {
  window.renderStoryDetails = function(...args) {
    const result = originalRenderStoryDetails.apply(this, args);
    setTimeout(fixDoneButtonFunctionality, 100);
    return result;
  };
}
