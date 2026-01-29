---
inclusion: fileMatch
patterns:
  - "apps/frontend/**"
---

# Frontend UI Guidelines

## Architecture

**No framework** - Vanilla JavaScript with native APIs
- DOM manipulation: `document.querySelector()`, `createElement()`
- HTTP: `fetch()` API
- Real-time: Server-Sent Events (SSE)
- State: In-memory objects + localStorage for persistence

## Component Structure

```javascript
// ✅ DO - Modular functions
async function loadStories() {
  const response = await fetch(`${API_URL}/api/stories`);
  const { data } = await response.json();
  renderOutline(data);
  renderMindmap(data);
}

function renderOutline(stories) {
  const container = document.getElementById('outline-panel');
  container.innerHTML = stories.map(s => `
    <div class="story-item" data-id="${s.id}">
      ${s.title}
    </div>
  `).join('');
}

// ❌ DON'T - Monolithic code
function doEverything() {
  // 500 lines of mixed concerns
}
```

## Event Handling

```javascript
// ✅ DO - Event delegation
document.getElementById('outline-panel').addEventListener('click', (e) => {
  if (e.target.matches('.story-item')) {
    selectStory(e.target.dataset.id);
  }
});

// ❌ DON'T - Individual listeners
stories.forEach(s => {
  document.getElementById(s.id).addEventListener('click', ...);
});
```

## SSE for Real-time Updates

```javascript
// ✅ DO - SSE with toast notifications
function callSemanticAPI(endpoint, payload) {
  const eventSource = new EventSource(`${SEMANTIC_API_URL}${endpoint}`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'progress') {
      showToast(data.message, 'info');
    } else if (data.type === 'complete') {
      showToast(data.message, 'success');
      eventSource.close();
    }
  };
  
  eventSource.onerror = () => {
    showToast('Connection failed', 'error');
    eventSource.close();
  };
}
```

## State Management

```javascript
// ✅ DO - Simple state object
const appState = {
  stories: [],
  selectedStoryId: null,
  expandedNodes: new Set(),
  panelVisibility: {
    outline: true,
    mindmap: true,
    details: true
  }
};

// Persist to localStorage
function saveState() {
  localStorage.setItem('aipm-state', JSON.stringify({
    expandedNodes: Array.from(appState.expandedNodes),
    panelVisibility: appState.panelVisibility
  }));
}
```

## Mindmap Rendering

```javascript
// ✅ DO - SVG with data attributes
function renderMindmap(stories) {
  const svg = document.getElementById('mindmap-svg');
  svg.innerHTML = stories.map(story => `
    <g class="node" data-id="${story.id}">
      <rect x="${story.x}" y="${story.y}" width="200" height="80"/>
      <text x="${story.x + 10}" y="${story.y + 40}">${story.title}</text>
    </g>
  `).join('');
}
```

## Toast Notifications

```javascript
// ✅ DO - Dynamic duration based on message length
function showToast(message, type = 'info') {
  const duration = Math.max(5000, Math.min(message.length * 50, 10000));
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), duration);
}
```

## Never

- ❌ Use jQuery or other libraries
- ❌ Inline styles (use CSS classes)
- ❌ Global variables (use module scope or appState)
- ❌ Synchronous XHR
- ❌ `innerHTML` with user input (XSS risk)
