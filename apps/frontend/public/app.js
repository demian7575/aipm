const storyListEl = document.getElementById('story-list');
const detailsContainer = document.querySelector('.story-details');
const detailsPlaceholder = document.getElementById('details-placeholder');
const refreshBtn = document.getElementById('refresh-btn');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalEl = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalCloseBtn = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');

let stories = [];
let selectedStoryId = null;

async function loadStories() {
  const response = await fetch('/api/stories');
  if (!response.ok) {
    throw new Error('Failed to load stories');
  }
  stories = await response.json();
  renderStoryList();
  if (selectedStoryId) {
    const story = stories.find((item) => item.id === selectedStoryId);
    if (story) {
      renderStoryDetails(story);
    } else {
      selectedStoryId = null;
      renderEmptyDetails();
    }
  }
}

function renderStoryList() {
  storyListEl.innerHTML = '';
  stories.forEach((story) => {
    const li = document.createElement('li');
    li.textContent = `${story.title} (SP: ${story.storyPoint ?? '—'})`;
    li.dataset.storyId = story.id;
    if (story.id === selectedStoryId) {
      li.classList.add('active');
    }
    li.addEventListener('click', () => {
      selectedStoryId = story.id;
      renderStoryList();
      renderStoryDetails(story);
    });
    storyListEl.appendChild(li);
  });
}

function renderEmptyDetails() {
  detailsContainer.innerHTML = '';
  detailsContainer.appendChild(detailsPlaceholder);
  detailsPlaceholder.classList.remove('hidden');
}

function renderStoryDetails(story) {
  detailsPlaceholder.classList.add('hidden');
  detailsContainer.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'details-header';
  const title = document.createElement('h2');
  title.textContent = story.title;
  header.appendChild(title);

  const form = document.createElement('form');
  form.className = 'details-grid';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      title: formData.get('title').trim(),
      description: formData.get('description').trim(),
      storyPoint: formData.get('storyPoint') ? Number(formData.get('storyPoint')) : null,
      assigneeEmail: formData.get('assigneeEmail').trim(),
    };

    const response = await fetch(`/api/stories/${story.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      alert('Failed to save story');
      return;
    }

    const updated = await response.json();
    const index = stories.findIndex((item) => item.id === story.id);
    stories[index] = { ...stories[index], ...updated };
    renderStoryList();
    renderStoryDetails({ ...stories[index], acceptanceTests: story.acceptanceTests, referenceDocuments: story.referenceDocuments });
  });

  form.innerHTML = `
    <div class="field-group">
      <label for="title-input">Title</label>
      <input id="title-input" name="title" type="text" value="${escapeHtml(story.title)}" required />
    </div>
    <div class="field-group">
      <label for="story-point-input">Story Point</label>
      <input id="story-point-input" name="storyPoint" type="number" min="0" value="${story.storyPoint ?? ''}" />
    </div>
    <div class="field-group">
      <label for="assignee-email-input">Assignee Email</label>
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <input id="assignee-email-input" name="assigneeEmail" type="text" value="${escapeHtml(story.assigneeEmail ?? '')}" placeholder="name@example.com" />
        <button type="button" class="secondary" ${story.assigneeEmail ? '' : 'disabled'} data-action="email">Email</button>
      </div>
    </div>
    <div class="field-group">
      <label for="description-input">Description</label>
      <textarea id="description-input" name="description">${escapeHtml(story.description || '')}</textarea>
    </div>
    <div style="grid-column: span 2; display:flex; gap:0.5rem;">
      <button type="submit">Save Story</button>
      <button type="button" class="secondary" data-action="reference">Reference Documents</button>
    </div>
  `;

  form.querySelector('[data-action="email"]').addEventListener('click', () => {
    const email = form.assigneeEmail.value.trim();
    if (!email) return;
    window.open(`mailto:${email}`);
  });

  form.querySelector('[data-action="reference"]').addEventListener('click', () => {
    openReferenceModal(story.id);
  });

  const acceptanceSection = document.createElement('div');
  acceptanceSection.innerHTML = '<h3>Acceptance Tests</h3>';
  const acceptanceTable = document.createElement('table');
  acceptanceTable.className = 'table-list';
  acceptanceTable.innerHTML = `
    <thead>
      <tr>
        <th>Title</th>
        <th>Expected Result</th>
      </tr>
    </thead>
    <tbody>
      ${story.acceptanceTests && story.acceptanceTests.length
        ? story.acceptanceTests
            .map(
              (test) => `
          <tr>
            <td>${escapeHtml(test.title)}</td>
            <td>${escapeHtml(test.expectedResult)}</td>
          </tr>
        `
            )
            .join('')
        : '<tr><td colspan="2">No acceptance tests yet.</td></tr>'}
    </tbody>
  `;
  acceptanceSection.appendChild(acceptanceTable);

  const referenceSection = document.createElement('div');
  referenceSection.innerHTML = '<h3>Reference Documents</h3>';
  const referenceTable = document.createElement('table');
  referenceTable.className = 'table-list';
  referenceTable.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>URL</th>
      </tr>
    </thead>
    <tbody>
      ${story.referenceDocuments && story.referenceDocuments.length
        ? story.referenceDocuments
            .map(
              (doc) => `
          <tr>
            <td>${escapeHtml(doc.name)}</td>
            <td><a href="${doc.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(doc.url)}</a></td>
          </tr>
        `
            )
            .join('')
        : '<tr><td colspan="2">No reference documents yet.</td></tr>'}
    </tbody>
  `;
  referenceSection.appendChild(referenceTable);

  detailsContainer.appendChild(header);
  detailsContainer.appendChild(form);
  detailsContainer.appendChild(acceptanceSection);
  detailsContainer.appendChild(referenceSection);
}

function escapeHtml(value) {
  const text = value == null ? '' : String(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function openModal(title, bodyContent) {
  modalTitle.textContent = title;
  modalBody.innerHTML = '';
  modalBody.appendChild(bodyContent);
  modalBackdrop.classList.remove('hidden');
  modalEl.classList.remove('hidden');
  modalCloseBtn.focus();
}

function closeModal() {
  modalBackdrop.classList.add('hidden');
  modalEl.classList.add('hidden');
}

modalBackdrop.addEventListener('click', closeModal);
modalCloseBtn.addEventListener('click', closeModal);

async function openReferenceModal(storyId) {
  const story = stories.find((item) => item.id === storyId);
  if (!story) return;

  const container = document.createElement('div');
  container.className = 'reference-list';

  const listWrapper = document.createElement('div');
  listWrapper.className = 'reference-list';

  function renderDocs() {
    listWrapper.innerHTML = '';
    if (!story.referenceDocuments || story.referenceDocuments.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No reference documents yet.';
      listWrapper.appendChild(empty);
      return;
    }
    story.referenceDocuments.forEach((doc) => {
      const item = document.createElement('div');
      item.className = 'reference-item';

      const link = document.createElement('a');
      link.href = doc.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = doc.name;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', async () => {
        await fetch(`/api/stories/${storyId}/reference-documents/${doc.id}`, {
          method: 'DELETE',
        });
        story.referenceDocuments = story.referenceDocuments.filter((item) => item.id !== doc.id);
        renderDocs();
        renderStoryDetails({ ...story });
      });

      item.append(link, removeBtn);
      listWrapper.appendChild(item);
    });
  }

  const form = document.createElement('form');
  form.className = 'reference-form';
  form.innerHTML = `
    <div class="field-group">
      <label for="doc-name">Name</label>
      <input id="doc-name" name="name" type="text" required />
    </div>
    <div class="field-group">
      <label for="doc-url">URL</label>
      <input id="doc-url" name="url" type="text" required />
    </div>
    <button type="submit">Add Document</button>
  `;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: formData.get('name').trim(),
      url: formData.get('url').trim(),
    };
    if (!payload.name || !payload.url) {
      return;
    }

    const response = await fetch(`/api/stories/${storyId}/reference-documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      alert('Failed to add document');
      return;
    }

    const doc = await response.json();
    story.referenceDocuments = [...(story.referenceDocuments || []), doc];
    form.reset();
    renderDocs();
    renderStoryDetails({ ...story });
  });

  renderDocs();
  container.appendChild(listWrapper);
  container.appendChild(form);
  openModal('Reference Document List', container);
}

refreshBtn.addEventListener('click', () => {
  loadStories().catch((error) => alert(error.message));
});

loadStories().catch((error) => {
  alert(error.message);
});
