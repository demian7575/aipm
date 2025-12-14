// Replace Generate Code & PR button with separate buttons
function replaceButtons() {
  document.querySelectorAll('.generate-code-pr-btn').forEach(btn => {
    const parent = btn.parentElement;
    
    const generateBtn = document.createElement('button');
    generateBtn.textContent = 'Generate Code';
    generateBtn.className = 'generate-code-btn';
    generateBtn.onclick = () => showGenerateModal(btn.dataset.taskId);
    
    const prBtn = document.createElement('button');
    prBtn.textContent = 'Create PR';
    prBtn.className = 'create-pr-btn';
    prBtn.onclick = () => showPRModal(btn.dataset.taskId);
    
    parent.insertBefore(generateBtn, btn);
    parent.insertBefore(prBtn, btn);
    btn.remove();
  });
}

function showGenerateModal(taskId) {
  const modal = createModal('Generate Code', `
    <input type="text" id="task-title" placeholder="Task Title" required>
    <textarea id="objective" placeholder="Objective" required></textarea>
    <textarea id="constraints" placeholder="Constraints"></textarea>
    <button onclick="generateCode('${taskId}')">Generate</button>
    <button onclick="closeModal()">Cancel</button>
  `);
  document.body.appendChild(modal);
}

function showPRModal(taskId) {
  const modal = createModal('Create PR', `
    <input type="url" id="repo-url" placeholder="Repository URL" required>
    <input type="text" id="branch" placeholder="Branch Name" required>
    <input type="text" id="pr-title" placeholder="PR Title" required>
    <textarea id="description" placeholder="Description"></textarea>
    <button onclick="createPR('${taskId}')">Create PR</button>
    <button onclick="closeModal()">Cancel</button>
  `);
  document.body.appendChild(modal);
}

function createModal(title, content) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>${title}</h3>
      ${content}
    </div>
  `;
  return modal;
}

async function generateCode(taskId) {
  const data = {
    taskId,
    title: document.getElementById('task-title').value,
    objective: document.getElementById('objective').value,
    constraints: document.getElementById('constraints').value
  };
  
  try {
    await fetch('/api/generate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    closeModal();
    alert('Code generation started');
  } catch (e) {
    alert('Error generating code');
  }
}

async function createPR(taskId) {
  const data = {
    taskId,
    repoUrl: document.getElementById('repo-url').value,
    branch: document.getElementById('branch').value,
    title: document.getElementById('pr-title').value,
    description: document.getElementById('description').value
  };
  
  try {
    await fetch('/api/create-pr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    closeModal();
    alert('PR created successfully');
  } catch (e) {
    alert('Error creating PR');
  }
}

function closeModal() {
  document.querySelector('.modal')?.remove();
}

document.addEventListener('DOMContentLoaded', replaceButtons);
