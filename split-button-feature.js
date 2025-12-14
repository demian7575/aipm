function splitButtons() {
  document.querySelectorAll('.generate-code-pr-btn').forEach(btn => {
    const taskId = btn.dataset.taskId;
    
    const generateBtn = document.createElement('button');
    generateBtn.textContent = 'Generate Code';
    generateBtn.onclick = () => handleGenerateCode(taskId);
    
    const prBtn = document.createElement('button');
    prBtn.textContent = 'Create PR';
    prBtn.onclick = () => handleCreatePR(taskId);
    
    btn.parentNode.insertBefore(generateBtn, btn);
    btn.parentNode.insertBefore(prBtn, btn);
    btn.remove();
  });
}

async function handleGenerateCode(taskId) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  
  for (let i = 0; i < 10; i++) {
    try {
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
        btn.disabled = false;
        return;
      }
    } catch (e) {}
  }
  
  btn.textContent = 'Generate Code';
  btn.disabled = false;
}

async function handleCreatePR(taskId) {
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
  } catch (e) {
    btn.textContent = 'Create PR';
  }
  
  btn.disabled = false;
}

document.addEventListener('DOMContentLoaded', splitButtons);
