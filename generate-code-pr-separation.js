/**
 * Separates Generate Code & PR button into two distinct buttons
 */
function separateButtons() {
  const existingButtons = document.querySelectorAll('.generate-code-pr-btn');
  
  existingButtons.forEach(button => {
    const parent = button.parentElement;
    
    // Create Generate Code button
    const generateBtn = document.createElement('button');
    generateBtn.className = 'generate-code-btn';
    generateBtn.textContent = 'Generate Code';
    generateBtn.onclick = () => handleGenerateCode(button.dataset.taskId);
    
    // Create PR button
    const prBtn = document.createElement('button');
    prBtn.className = 'create-pr-btn';
    prBtn.textContent = 'Create PR';
    prBtn.onclick = () => handleCreatePR(button.dataset.taskId);
    
    // Replace original button
    parent.insertBefore(generateBtn, button);
    parent.insertBefore(prBtn, button);
    button.remove();
  });
}

/**
 * Handles AI code generation with gating tests
 * @param {string} taskId - Task identifier
 */
async function handleGenerateCode(taskId) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  
  try {
    await generateCodeWithGating(taskId);
    btn.textContent = 'Generated';
  } catch (error) {
    btn.textContent = 'Generate Code';
    console.error('Code generation failed:', error);
  } finally {
    btn.disabled = false;
  }
}

/**
 * Generates code using Kiro AI with iterative gating tests
 * @param {string} taskId - Task identifier
 */
async function generateCodeWithGating(taskId) {
  for (let i = 0; i < 10; i++) {
    // Generate code with Kiro
    const codeResponse = await fetch('/api/kiro/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    });
    
    if (!codeResponse.ok) throw new Error('Code generation failed');
    
    // Run gating tests
    const testResponse = await fetch('/api/gating-tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    });
    
    const testResult = await testResponse.json();
    
    if (testResult.passed) {
      // Deploy to dev environment
      await fetch('/api/deploy/dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });
      return;
    }
  }
  
  throw new Error('Max iterations reached');
}

/**
 * Handles PR creation
 * @param {string} taskId - Task identifier
 */
async function handleCreatePR(taskId) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Creating...';
  
  try {
    const response = await fetch('/api/github/pr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    });
    
    if (!response.ok) throw new Error('PR creation failed');
    
    btn.textContent = 'Created';
  } catch (error) {
    btn.textContent = 'Create PR';
    console.error('PR creation failed:', error);
  } finally {
    btn.disabled = false;
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', separateButtons);
