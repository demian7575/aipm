// Replace existing Generate Code & PR button with separate buttons
function replaceGenerateCodePRButton() {
  document.querySelectorAll('.generate-code-pr-button').forEach(button => {
    const container = button.parentElement;
    
    // Create Generate Code button
    const generateBtn = document.createElement('button');
    generateBtn.className = 'generate-code-btn';
    generateBtn.textContent = 'Generate Code';
    generateBtn.onclick = () => openGenerateCodeModal(button.dataset.storyId);
    
    // Create PR button
    const prBtn = document.createElement('button');
    prBtn.className = 'create-pr-btn';
    prBtn.textContent = 'Create PR';
    prBtn.onclick = () => openCreatePRModal(button.dataset.storyId);
    
    container.insertBefore(generateBtn, button);
    container.insertBefore(prBtn, button);
    button.remove();
  });
}

// Generate Code modal
function openGenerateCodeModal(storyId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Generate Code</h3>
      <form id="generate-form">
        <label>Task Title:</label>
        <input type="text" name="title" required>
        <label>Objective:</label>
        <textarea name="objective" required></textarea>
        <label>Constraints:</label>
        <textarea name="constraints"></textarea>
        <div class="modal-actions">
          <button type="submit">Generate</button>
          <button type="button" onclick="closeModal()">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('generate-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          title: formData.get('title'),
          objective: formData.get('objective'),
          constraints: formData.get('constraints')
        })
      });
      
      if (response.ok) {
        alert('Code generation started');
        closeModal();
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };
}

// Create PR modal
function openCreatePRModal(storyId) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Create Pull Request</h3>
      <form id="pr-form">
        <label>Repository URL:</label>
        <input type="url" name="repoUrl" required>
        <label>Branch Name:</label>
        <input type="text" name="branch" required>
        <label>PR Title:</label>
        <input type="text" name="title" required>
        <label>Description:</label>
        <textarea name="description"></textarea>
        <div class="modal-actions">
          <button type="submit">Create PR</button>
          <button type="button" onclick="closeModal()">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('pr-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
      const response = await fetch('/api/create-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          repoUrl: formData.get('repoUrl'),
          branch: formData.get('branch'),
          title: formData.get('title'),
          description: formData.get('description')
        })
      });
      
      if (response.ok) {
        alert('PR created successfully');
        closeModal();
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };
}

function closeModal() {
  document.querySelector('.modal')?.remove();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', replaceGenerateCodePRButton);
