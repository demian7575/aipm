// Simplified AIPM Frontend
const API_BASE = window.CONFIG?.API_BASE_URL || '';

// State
let stories = [];
let selectedStoryId = null;

// DOM elements
const outlineEl = document.getElementById('outline-tree');
const mindmapEl = document.getElementById('mindmap-canvas');
const detailsEl = document.getElementById('details-content');

// API calls
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

async function loadStories() {
  try {
    stories = await api('/api/stories');
    render();
  } catch (error) {
    console.error('Failed to load stories:', error);
  }
}

async function createStory(data) {
  try {
    const story = await api('/api/stories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await loadStories();
    return story;
  } catch (error) {
    console.error('Failed to create story:', error);
  }
}

// Rendering
function renderOutline() {
  outlineEl.innerHTML = '';
  stories.forEach(story => {
    const div = document.createElement('div');
    div.className = 'story-item';
    div.textContent = story.title;
    div.onclick = () => selectStory(story.id);
    outlineEl.appendChild(div);
  });
}

function renderMindmap() {
  mindmapEl.innerHTML = '';
  stories.forEach((story, index) => {
    const node = document.createElement('div');
    node.className = 'mindmap-node';
    node.textContent = story.title;
    node.style.left = `${index * 200}px`;
    node.style.top = '50px';
    node.onclick = () => selectStory(story.id);
    mindmapEl.appendChild(node);
  });
}

function renderDetails() {
  const story = stories.find(s => s.id === selectedStoryId);
  if (!story) {
    detailsEl.innerHTML = '<p>Select a story to view details</p>';
    return;
  }
  
  detailsEl.innerHTML = `
    <h3>${story.title}</h3>
    <p>${story.description || 'No description'}</p>
    <p>Status: ${story.status}</p>
    <p>Points: ${story.storyPoint || 0}</p>
  `;
}

function render() {
  renderOutline();
  renderMindmap();
  renderDetails();
}

function selectStory(id) {
  selectedStoryId = id;
  render();
}

// Initialize
loadStories();
