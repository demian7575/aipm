const API_BASE = '';
const STORAGE_KEY = 'ai-pm-expanded';

const state = {
  mergeRequests: [],
  stories: new Map(),
  tests: new Map(),
  activeMrId: null,
  selectedStoryId: null,
  expanded: new Set(),
  radius: 360,
  drag: null
};

let pointerListenerBound = false;

const outlineEl = document.getElementById('outline-tree');
const mindmapEl = document.getElementById('mindmap-canvas');
const detailEl = document.getElementById('detail-content');
const githubEl = document.getElementById('github-status');

const outlineControls = {
  expandAll: document.getElementById('expand-all'),
  collapseAll: document.getElementById('collapse-all'),
  depthInput: document.getElementById('expand-depth'),
  applyDepth: document.getElementById('apply-depth')
};

const headerControls = {
  refresh: document.getElementById('refresh-button'),
  reset: document.getElementById('reset-button'),
  radius: document.getElementById('mindmap-radius')
};

const loadExpanded = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    if (Array.isArray(saved)) {
      state.expanded = new Set(saved);
    }
  } catch (error) {
    state.expanded = new Set();
  }
};

const saveExpanded = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(state.expanded)));
};

const fetchJSON = async (url, options) => {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options
  });
  if (!response.ok) {
    let details = await response.text();
    try {
      details = JSON.parse(details);
    } catch (error) {
      details = { message: details };
    }
    const err = new Error(details.message ?? 'Request failed');
    err.details = details;
    throw err;
  }
  return response.status === 204 ? null : response.json();
};

const loadState = async () => {
  const data = await fetchJSON('/api/state');
  state.mergeRequests = data.mergeRequests;
  state.stories = new Map(data.stories.map((story) => [story.id, story]));
  state.tests = new Map(data.tests.map((test) => [test.id, test]));
  if (!state.activeMrId && data.mergeRequests.length > 0) {
    state.activeMrId = data.mergeRequests[0].id;
  }
  if (state.selectedStoryId && !state.stories.has(state.selectedStoryId)) {
    state.selectedStoryId = null;
  }
};

const storyChildren = (storyId) =>
  Array.from(state.stories.values()).filter((story) => story.parentId === storyId).sort((a, b) => a.order - b.order);

const rootStories = () =>
  Array.from(state.stories.values())
    .filter((story) => story.mrId === state.activeMrId && story.parentId === null)
    .sort((a, b) => a.order - b.order);

const buildStoryTree = (stories) =>
  stories.map((story) => ({ story, children: buildStoryTree(storyChildren(story.id)) }));

const toggleSubtree = (storyId, expanded) => {
  const stack = [storyId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (expanded) state.expanded.add(current);
    else state.expanded.delete(current);
    storyChildren(current).forEach((child) => stack.push(child.id));
  }
  saveExpanded();
  renderOutline();
  renderMindmap();
};

const toggleExpanded = (storyId, expanded = !state.expanded.has(storyId)) => {
  if (expanded) state.expanded.add(storyId);
  else state.expanded.delete(storyId);
  saveExpanded();
  renderOutline();
  renderMindmap();
};

const expandToDepth = (depth) => {
  state.expanded.clear();
  const traverse = (nodes, level) => {
    if (level > depth) return;
    nodes.forEach((node) => {
      state.expanded.add(node.story.id);
      traverse(node.children, level + 1);
    });
  };
  traverse(buildStoryTree(rootStories()), 1);
  saveExpanded();
  renderOutline();
  renderMindmap();
};

const buildTreeDom = (nodes, level = 1) => {
  const list = document.createElement('div');
  nodes.forEach((node) => {
    const item = document.createElement('div');
    item.className = 'tree-item';
    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';
    nodeEl.setAttribute('role', 'treeitem');
    nodeEl.setAttribute('aria-level', String(level));
    nodeEl.setAttribute('data-id', node.story.id);
    nodeEl.setAttribute('tabindex', '-1');
    nodeEl.setAttribute('aria-expanded', state.expanded.has(node.story.id));
    nodeEl.setAttribute('aria-selected', state.selectedStoryId === node.story.id);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'toggle';
    toggle.textContent = state.expanded.has(node.story.id) ? '−' : '+';
    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      if (event.shiftKey) {
        toggleSubtree(node.story.id, !state.expanded.has(node.story.id));
      } else {
        toggleExpanded(node.story.id);
      }
    });
    nodeEl.appendChild(toggle);

    const label = document.createElement('span');
    label.textContent = node.story.title;
    nodeEl.appendChild(label);

    nodeEl.addEventListener('click', () => {
      state.selectedStoryId = node.story.id;
      renderOutline();
      renderMindmap();
      renderDetail();
    });

    nodeEl.addEventListener('dblclick', () => toggleExpanded(node.story.id));

    item.appendChild(nodeEl);

    if (node.children.length > 0 && state.expanded.has(node.story.id)) {
      const childrenEl = document.createElement('div');
      childrenEl.className = 'tree-children';
      childrenEl.setAttribute('role', 'group');
      childrenEl.appendChild(buildTreeDom(node.children, level + 1));
      item.appendChild(childrenEl);
    }

    list.appendChild(item);
  });
  return list;
};

const renderOutline = () => {
  outlineEl.innerHTML = '';
  const tree = buildStoryTree(rootStories());
  outlineEl.appendChild(buildTreeDom(tree));
  bindOutlineKeyboard();
};

const bindOutlineKeyboard = () => {
  const nodes = Array.from(outlineEl.querySelectorAll('.tree-node'));
  nodes.forEach((node) => {
    node.addEventListener('keydown', (event) => {
      const currentIndex = nodes.indexOf(node);
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          const next = nodes[currentIndex + 1];
          if (next) next.focus();
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          const prev = nodes[currentIndex - 1];
          if (prev) prev.focus();
          break;
        }
        case 'ArrowRight': {
          event.preventDefault();
          const id = node.dataset.id;
          if (!state.expanded.has(id)) toggleExpanded(id, true);
          break;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          const id = node.dataset.id;
          if (state.expanded.has(id)) toggleExpanded(id, false);
          break;
        }
        case 'Enter': {
          event.preventDefault();
          const id = node.dataset.id;
          state.selectedStoryId = id;
          renderOutline();
          renderMindmap();
          renderDetail();
          break;
        }
        default:
          break;
      }
    });
  });
  const selected = nodes.find((node) => node.dataset.id === state.selectedStoryId);
  (selected ?? nodes[0])?.focus();
};

const computeLayout = (nodes) => {
  const placements = [];
  const horizontalGap = Math.max(state.radius / 2, 160);
  const verticalGap = 90;
  let nextY = 0;

  const assign = (node, depth) => {
    if (node.children.length === 0) {
      const y = nextY;
      nextY += verticalGap;
      placements.push({ id: node.story.id, x: depth * horizontalGap, y, story: node.story, depth });
      return y;
    }
    const childPositions = node.children.map((child) => assign(child, depth + 1));
    const y = childPositions.reduce((sum, value) => sum + value, 0) / childPositions.length;
    placements.push({ id: node.story.id, x: depth * horizontalGap, y, story: node.story, depth });
    return y;
  };

  nodes.forEach((node, index) => {
    assign(node, 0);
    if (index < nodes.length - 1) {
      nextY += verticalGap;
    }
  });

  if (placements.length === 0) {
    return placements;
  }

  const totalHeight = Math.max(nextY - verticalGap, verticalGap);
  const offsetY = totalHeight / 2;
  return placements.map((placement) => ({ ...placement, y: placement.y - offsetY }));
};

const renderMindmap = () => {
  const tree = buildStoryTree(rootStories());
  const nodes = computeLayout(tree);
  mindmapEl.innerHTML = '';
  if (nodes.length === 0) {
    mindmapEl.setAttribute('viewBox', '-200 -200 400 400');
    return;
  }

  const padding = 120;
  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y));
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;
  mindmapEl.setAttribute('viewBox', `${(minX - padding).toFixed(2)} ${(minY - padding).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`);

  const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodes.forEach((node) => {
    const story = state.stories.get(node.id);
    if (story.parentId) {
      const parent = nodes.find((candidate) => candidate.id === story.parentId);
      if (parent) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', parent.x.toFixed(2));
        line.setAttribute('y1', parent.y.toFixed(2));
        line.setAttribute('x2', node.x.toFixed(2));
        line.setAttribute('y2', node.y.toFixed(2));
        line.setAttribute('stroke', 'rgba(148,163,184,0.4)');
        line.setAttribute('stroke-width', '2');
        edgesGroup.appendChild(line);
      }
    }
  });
  mindmapEl.appendChild(edgesGroup);

  const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  nodes.forEach((node) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('mindmap-node');
    if (node.id === state.selectedStoryId) group.classList.add('selected');
    group.setAttribute('transform', `translate(${node.x.toFixed(2)}, ${node.y.toFixed(2)})`);
    group.dataset.id = node.id;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '28');
    group.appendChild(circle);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = node.story.title;
    text.setAttribute('pointer-events', 'none');
    text.setAttribute('x', '40');
    text.setAttribute('y', '4');
    text.setAttribute('text-anchor', 'start');
    group.appendChild(text);

    const selectStory = () => {
      state.selectedStoryId = node.id;
      renderOutline();
      renderMindmap();
      renderDetail();
    };

    group.addEventListener('click', selectStory);
    circle.addEventListener('click', (event) => {
      event.stopPropagation();
      selectStory();
    });

    group.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      mindmapEl.setPointerCapture(event.pointerId);
      state.drag = { storyId: node.id, origin: { x: event.clientX, y: event.clientY }, dropTarget: null };
    });

    group.addEventListener('pointerenter', () => {
      if (state.drag && state.drag.storyId !== node.id) {
        state.drag.dropTarget = node.id;
      }
    });

    group.addEventListener('pointerleave', () => {
      if (state.drag && state.drag.dropTarget === node.id) {
        state.drag.dropTarget = null;
      }
    });

    nodesGroup.appendChild(group);
  });

  mindmapEl.appendChild(nodesGroup);

  if (!pointerListenerBound) {
    mindmapEl.addEventListener('pointerup', async (event) => {
      if (!state.drag) return;
      try {
        mindmapEl.releasePointerCapture(event.pointerId);
      } catch (error) {
        // ignore when capture was not set
      }
      const { storyId, dropTarget } = state.drag;
      state.drag = null;
      if (!dropTarget || dropTarget === storyId) return;
      try {
        await fetchJSON(`/api/stories/${storyId}/move`, {
          method: 'PATCH',
          body: JSON.stringify({ parentId: dropTarget })
        });
        await loadState();
        renderOutline();
        renderMindmap();
        renderDetail();
      } catch (error) {
        alert(`Unable to move story: ${error.message}`);
      }
    });

    mindmapEl.addEventListener('pointercancel', () => {
      state.drag = null;
    });
    pointerListenerBound = true;
  }
};

const renderGithubStatus = () => {
  githubEl.innerHTML = '';
  if (!state.activeMrId) return;
  const mr = state.mergeRequests.find((item) => item.id === state.activeMrId);
  if (!mr) return;
  const branchRow = document.createElement('div');
  branchRow.className = 'github-row';
  branchRow.innerHTML = `<span>Branch</span><strong>${mr.branch}</strong>`;
  const driftRow = document.createElement('div');
  driftRow.className = 'github-row';
  driftRow.innerHTML = `<span>Drift</span><strong>${mr.drift ? 'Yes' : 'No'}</strong>`;
  const syncRow = document.createElement('div');
  syncRow.className = 'github-row';
  syncRow.innerHTML = `<span>Last Sync</span><strong>${new Date(mr.lastSyncAt).toLocaleString()}</strong>`;
  const button = document.createElement('button');
  button.textContent = 'Update Branch';
  button.addEventListener('click', async () => {
    try {
      await fetchJSON(`/api/merge-requests/${mr.id}/update-branch`, { method: 'POST' });
      await loadState();
      renderGithubStatus();
    } catch (error) {
      alert(`Update branch failed: ${error.message}`);
    }
  });

  githubEl.append(branchRow, driftRow, syncRow, button);
};

const renderDetail = () => {
  detailEl.innerHTML = '';
  if (!state.selectedStoryId) {
    const placeholder = document.createElement('p');
    placeholder.className = 'placeholder';
    placeholder.textContent = 'Select a story to view details.';
    detailEl.appendChild(placeholder);
    return;
  }
  const story = state.stories.get(state.selectedStoryId);
  if (!story) return;
  const tests = story.testIds.map((id) => state.tests.get(id)).filter(Boolean);

  const template = document.getElementById('story-form-template');
  const form = template.content.firstElementChild.cloneNode(true);
  form.elements.title.value = story.title;
  form.elements.asA.value = story.asA;
  form.elements.iWant.value = story.iWant;
  form.elements.soThat.value = story.soThat;

  const investMessages = form.querySelector('#invest-messages');
  investMessages.innerHTML = '';
  const investEntries = Object.entries(story.invest);
  investEntries.forEach(([key, value]) => {
    const item = document.createElement('li');
    item.textContent = `${key.toUpperCase()}: ${value ? '✅' : '⚠️'}`;
    investMessages.appendChild(item);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = {
      title: form.elements.title.value,
      asA: form.elements.asA.value,
      iWant: form.elements.iWant.value,
      soThat: form.elements.soThat.value
    };
    try {
      await fetchJSON(`/api/stories/${story.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      await loadState();
      renderOutline();
      renderMindmap();
      renderDetail();
    } catch (error) {
      alert(`Failed to save story: ${error.message}`);
    }
  });

  form.querySelector('.delete-story').addEventListener('click', async () => {
    if (!confirm('Delete this story and all descendants?')) return;
    try {
      await fetchJSON(`/api/stories/${story.id}`, { method: 'DELETE' });
      await loadState();
      state.expanded = new Set(Array.from(state.expanded).filter((id) => state.stories.has(id)));
      saveExpanded();
      state.selectedStoryId = null;
      renderOutline();
      renderMindmap();
      renderDetail();
    } catch (error) {
      alert(`Unable to delete story: ${error.message}`);
    }
  });

  const testList = form.querySelector('#test-list');
  const testTemplate = document.getElementById('test-form-template');
  tests.forEach((test) => {
    const formEl = testTemplate.content.firstElementChild.cloneNode(true);
    formEl.dataset.testId = test.id;
    formEl.elements.given.value = test.given.join('\n');
    formEl.elements.when.value = test.when.join('\n');
    formEl.elements.then.value = test.then.join('\n');
    formEl.elements.status.value = test.status;
    const flagsEl = formEl.querySelector('.test-flags');
    if (test.ambiguityFlags.length > 0) {
      flagsEl.textContent = `Ambiguity: ${test.ambiguityFlags.join(', ')}`;
    } else {
      flagsEl.textContent = 'No ambiguity detected';
    }

    formEl.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = {
        given: formEl.elements.given.value.split('\n').filter(Boolean),
        when: formEl.elements.when.value.split('\n').filter(Boolean),
        then: formEl.elements.then.value.split('\n').filter(Boolean),
        status: formEl.elements.status.value
      };
      try {
        await fetchJSON(`/api/tests/${test.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        await loadState();
        renderDetail();
        renderOutline();
        renderMindmap();
      } catch (error) {
        alert(`Failed to save test: ${error.message}`);
      }
    });

    formEl.querySelector('.delete-test').addEventListener('click', async () => {
      try {
        await fetchJSON(`/api/tests/${test.id}`, { method: 'DELETE' });
        await loadState();
        renderDetail();
        renderOutline();
        renderMindmap();
      } catch (error) {
        alert(`Failed to delete test: ${error.message}`);
      }
    });

    testList.appendChild(formEl);
  });

  detailEl.appendChild(form);

  const childSection = document.createElement('section');
  childSection.className = 'creation-section';
  childSection.innerHTML = `
    <h3>Add Child Story</h3>
    <form class="child-story-form">
      <label>Title<input name="title" required maxlength="160" /></label>
      <label>As a<input name="asA" required /></label>
      <label>I want<textarea name="iWant" required></textarea></label>
      <label>So that<textarea name="soThat" required></textarea></label>
      <button type="submit">Create Child Story</button>
    </form>
  `;
  const childForm = childSection.querySelector('form');
  childForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = {
      mrId: story.mrId,
      parentId: story.id,
      title: childForm.elements.title.value,
      asA: childForm.elements.asA.value,
      iWant: childForm.elements.iWant.value,
      soThat: childForm.elements.soThat.value
    };
    try {
      await fetchJSON('/api/stories', { method: 'POST', body: JSON.stringify(body) });
      childForm.reset();
      state.expanded.add(story.id);
      saveExpanded();
      await loadState();
      renderOutline();
      renderMindmap();
      renderDetail();
    } catch (error) {
      alert(`Unable to create child story: ${error.message}`);
    }
  });

  const testSection = document.createElement('section');
  testSection.className = 'creation-section';
  testSection.innerHTML = `
    <h3>Add Acceptance Test</h3>
    <form class="new-test-form">
      <label>Given<textarea name="given" required></textarea></label>
      <label>When<textarea name="when" required></textarea></label>
      <label>Then<textarea name="then" required></textarea></label>
      <button type="submit">Create Acceptance Test</button>
    </form>
  `;
  const newTestForm = testSection.querySelector('form');
  newTestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = {
      storyId: story.id,
      given: newTestForm.elements.given.value.split('\n').filter(Boolean),
      when: newTestForm.elements.when.value.split('\n').filter(Boolean),
      then: newTestForm.elements.then.value.split('\n').filter(Boolean)
    };
    try {
      await fetchJSON('/api/tests', { method: 'POST', body: JSON.stringify(body) });
      newTestForm.reset();
      await loadState();
      renderDetail();
      renderOutline();
      renderMindmap();
    } catch (error) {
      alert(`Unable to create acceptance test: ${error.message}`);
    }
  });

  detailEl.append(childSection, testSection);
};

const initializeEvents = () => {
  outlineControls.expandAll.addEventListener('click', () => {
    const tree = buildStoryTree(rootStories());
    const gather = (nodes) => {
      nodes.forEach((node) => {
        state.expanded.add(node.story.id);
        gather(node.children);
      });
    };
    state.expanded.clear();
    gather(tree);
    saveExpanded();
    renderOutline();
    renderMindmap();
  });

  outlineControls.collapseAll.addEventListener('click', () => {
    state.expanded.clear();
    saveExpanded();
    renderOutline();
    renderMindmap();
  });

  outlineControls.applyDepth.addEventListener('click', () => {
    const depth = Number(outlineControls.depthInput.value) || 1;
    expandToDepth(depth);
  });

  headerControls.refresh.addEventListener('click', async () => {
    await loadState();
    renderOutline();
    renderMindmap();
    renderDetail();
    renderGithubStatus();
  });

  headerControls.reset.addEventListener('click', async () => {
    if (!confirm('Reset in-memory data to seed state?')) return;
    await fetchJSON('/api/reset', { method: 'POST' });
    await loadState();
    state.selectedStoryId = null;
    renderOutline();
    renderMindmap();
    renderDetail();
    renderGithubStatus();
  });

  headerControls.radius.addEventListener('input', (event) => {
    state.radius = Number(event.target.value);
    renderMindmap();
  });
};

const bootstrap = async () => {
  loadExpanded();
  initializeEvents();
  await loadState();
  if (rootStories().length > 0) {
    rootStories().forEach((story) => state.expanded.add(story.id));
  }
  saveExpanded();
  renderOutline();
  renderMindmap();
  renderDetail();
  renderGithubStatus();
};

bootstrap();
