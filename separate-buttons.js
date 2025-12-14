function separateButtons() {
  document.querySelectorAll('.generate-code-pr-btn').forEach(btn => {
    const taskId = btn.dataset.taskId;
    
    const generateBtn = document.createElement('button');
    generateBtn.textContent = 'Generate Code';
    generateBtn.onclick = () => generateCode(taskId);
    
    const prBtn = document.createElement('button');
    prBtn.textContent = 'Create PR';
    prBtn.onclick = () => createPR(taskId);
    
    btn.parentNode.insertBefore(generateBtn, btn);
    btn.parentNode.insertBefore(prBtn, btn);
    btn.remove();
  });
}

async function generateCode(taskId) {
  const btn = event.target;
  btn.disabled = true;
  btn.textContent = 'Generating...';
  
  for (let i = 0; i < 10; i++) {
    try {
      await fetch('/api/kiro/generate', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const testResult = await fetch('/api/gating-tests', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
        headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json());
      
      if (testResult.passed) {
        await fetch('/api/deploy/dev', {
          method: 'POST',
          body: JSON.stringify({ taskId }),
          headers: { 'Content-Type': 'application/json' }
        });
        btn.textContent = 'Generated';
        btn.disabled = false;
        return;
      }
    } catch (e) {}
  }
  
  btn.textContent = 'Generate Code';
  btn.disabled = false;
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
    btn.textContent = 'Created';
  } catch (e) {
    btn.textContent = 'Create PR';
  }
  
  btn.disabled = false;
}

document.addEventListener('DOMContentLoaded', separateButtons);
