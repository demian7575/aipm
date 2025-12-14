/**
 * Replaces single "Generate Code & PR" button with separate buttons
 */
function createSeparateButtons(taskCard) {
  const existingButton = taskCard.querySelector('.generate-code-pr-btn');
  if (existingButton) {
    existingButton.remove();
  }

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';

  const generateCodeBtn = createGenerateCodeButton();
  const createPRBtn = createPRButton();

  buttonContainer.appendChild(generateCodeBtn);
  buttonContainer.appendChild(createPRBtn);
  taskCard.appendChild(buttonContainer);
}

/**
 * Creates Generate Code button with AI integration
 */
function createGenerateCodeButton() {
  const button = document.createElement('button');
  button.className = 'generate-code-btn';
  button.textContent = 'Generate Code';
  button.onclick = handleGenerateCode;
  return button;
}

/**
 * Creates Create PR button
 */
function createPRButton() {
  const button = document.createElement('button');
  button.className = 'create-pr-btn';
  button.textContent = 'Create PR';
  button.onclick = handleCreatePR;
  return button;
}

/**
 * Handles code generation with AI and gating tests
 */
async function handleGenerateCode(event) {
  const button = event.target;
  const taskCard = button.closest('.task-card');
  const taskId = taskCard.dataset.taskId;

  try {
    button.disabled = true;
    button.textContent = 'Generating...';

    const result = await generateCodeWithGating(taskId);
    
    if (result.success) {
      button.textContent = 'Code Generated';
      showNotification('Code generation completed successfully', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    button.textContent = 'Generate Code';
    showNotification(`Code generation failed: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

/**
 * Generates code using AI with iterative gating tests
 */
async function generateCodeWithGating(taskId) {
  const maxIterations = 10;
  let iteration = 0;

  while (iteration < maxIterations) {
    try {
      // Generate code with Kiro AI
      const codeResult = await fetch('/api/kiro/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });

      if (!codeResult.ok) throw new Error('Code generation failed');

      // Run gating tests
      const testResult = await fetch('/api/gating-tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      });

      const testData = await testResult.json();

      if (testData.allPassed) {
        // Deploy to development environment
        await deployToDev(taskId);
        return { success: true };
      }

      iteration++;
      showNotification(`Gating tests failed. Retrying... (${iteration}/${maxIterations})`, 'warning');
      
    } catch (error) {
      iteration++;
      if (iteration >= maxIterations) {
        return { success: false, error: `Max iterations reached: ${error.message}` };
      }
    }
  }

  return { success: false, error: 'Max iterations reached without passing tests' };
}

/**
 * Deploys code to development environment
 */
async function deployToDev(taskId) {
  const response = await fetch('/api/deploy/dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId })
  });

  if (!response.ok) {
    throw new Error('Deployment to dev environment failed');
  }

  showNotification('Code deployed to development environment', 'success');
}

/**
 * Handles PR creation
 */
async function handleCreatePR(event) {
  const button = event.target;
  const taskCard = button.closest('.task-card');
  const taskId = taskCard.dataset.taskId;

  try {
    button.disabled = true;
    button.textContent = 'Creating PR...';

    const response = await fetch('/api/github/create-pr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    });

    if (!response.ok) throw new Error('PR creation failed');

    const result = await response.json();
    button.textContent = 'PR Created';
    showNotification(`PR created: ${result.prUrl}`, 'success');
    
  } catch (error) {
    button.textContent = 'Create PR';
    showNotification(`PR creation failed: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

/**
 * Shows notification to user
 */
function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

/**
 * Initialize button separation for all task cards
 */
function initializeButtonSeparation() {
  const taskCards = document.querySelectorAll('.task-card');
  taskCards.forEach(createSeparateButtons);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeButtonSeparation);
