// Replace existing "Generate Code & PR" button with separate buttons
function splitGenerateCodePRButton() {
  const existingButtons = document.querySelectorAll('.generate-code-pr-button');
  
  existingButtons.forEach(button => {
    const taskCard = button.closest('.task-card');
    const taskId = taskCard.dataset.taskId;
    
    // Create Generate Code button
    const generateBtn = document.createElement('button');
    generateBtn.className = 'generate-code-btn';
    generateBtn.textContent = 'Generate Code';
    generateBtn.onclick = () => handleGenerateCode(taskId);
    
    // Create PR button
    const prBtn = document.createElement('button');
    prBtn.className = 'create-pr-btn';
    prBtn.textContent = 'Create PR';
    prBtn.onclick = () => handleCreatePR(taskId);
    
    // Replace original button
    button.parentNode.insertBefore(generateBtn, button);
    button.parentNode.insertBefore(prBtn, button);
    button.remove();
  });
}

// Handle Generate Code with AI and gating tests
async function handleGenerateCode(taskId) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  
  try {
    await generateCodeWithKiro(taskId);
    btn.textContent = 'Generated';
  } catch (error) {
    btn.textContent = 'Generate Code';
    alert(`Error: ${error.message}`);
  } finally {
    btn.disabled = false;
  }
}

// Generate code with Kiro AI and run gating tests
async function generateCodeWithKiro(taskId) {
  for (let iteration = 0; iteration < 10; iteration++) {
    // Generate code with Kiro AI
    const codeResponse = await fetch('/api/kiro/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    });
    
    if (!codeResponse.ok) throw new Error('Code generation failed');
    
    // Run gating tests
    const testResponse = await fetch('/api/gating-tests/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    });
    
    const testResult = await testResponse.json();
    
    if (testResult.allPassed) {
      // Deploy to development environment
      await deployToDev(taskId);
      return;
    }
    
    // Fix code based on test results
    await fetch('/api/kiro/fix-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, testResults: testResult.failures })
    });
  }
  
  throw new Error('Max iterations reached without passing all tests');
}

// Deploy to development environment
async function deployToDev(taskId) {
  const response = await fetch('/api/deploy/dev', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId })
  });
  
  if (!response.ok) throw new Error('Deployment failed');
}

// Handle Create PR
async function handleCreatePR(taskId) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Creating...';
  
  try {
    const response = await fetch('/api/github/create-pr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    });
    
    if (!response.ok) throw new Error('PR creation failed');
    
    btn.textContent = 'PR Created';
  } catch (error) {
    btn.textContent = 'Create PR';
    alert(`Error: ${error.message}`);
  } finally {
    btn.disabled = false;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', splitGenerateCodePRButton);
