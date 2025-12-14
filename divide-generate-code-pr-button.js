// Divide Generate Code & PR button into separate buttons
function divideGenerateCodePRButton() {
  document.querySelectorAll('.generate-code-pr-btn').forEach(button => {
    const parent = button.parentElement;
    
    // Create Generate Code button
    const generateBtn = document.createElement('button');
    generateBtn.textContent = 'Generate Code';
    generateBtn.className = 'generate-code-btn';
    generateBtn.onclick = () => generateCode(button.dataset.taskId);
    
    // Create PR button
    const prBtn = document.createElement('button');
    prBtn.textContent = 'Create PR';
    prBtn.className = 'create-pr-btn';
    prBtn.onclick = () => createPR(button.dataset.taskId);
    
    parent.insertBefore(generateBtn, button);
    parent.insertBefore(prBtn, button);
    button.remove();
  });
}

async function generateCode(taskId) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  
  try {
    for (let i = 0; i < 10; i++) {
      // Generate code with Kiro AI
      await fetch('/api/kiro/generate', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Run gating tests
      const testResult = await fetch('/api/gating-tests', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
        headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json());
      
      if (testResult.passed) {
        // Deploy to dev environment
        await fetch('/api/deploy/dev', {
          method: 'POST',
          body: JSON.stringify({ taskId }),
          headers: { 'Content-Type': 'application/json' }
        });
        
        btn.textContent = 'Generated & Deployed';
        return;
      }
    }
    throw new Error('Max iterations reached');
  } catch (error) {
    btn.textContent = 'Generate Code';
    alert('Generation failed: ' + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function createPR(taskId) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Creating...';
  
  try {
    await fetch('/api/github/create-pr', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    btn.textContent = 'PR Created';
  } catch (error) {
    btn.textContent = 'Create PR';
    alert('PR creation failed: ' + error.message);
  } finally {
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', divideGenerateCodePRButton);
