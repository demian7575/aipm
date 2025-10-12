const API_BASE = '';
const STORAGE_KEY = 'ai-pm-expanded';
const PANEL_STORAGE_KEY = 'ai-pm-panels';

const NODE_WIDTH = 200;
const NODE_HEIGHT = 60;
const POSITION_STORAGE_PREFIX = 'ai-pm-mindmap-positions:';
const AUTO_LAYOUT_STORAGE_PREFIX = 'ai-pm-mindmap-auto-layout:';
const AUTO_LAYOUT_MARGIN_X = 200;
const AUTO_LAYOUT_MARGIN_Y = 80;

const state = {
  mergeRequests: [],
  stories: new Map(),
  tests: new Map(),
  activeMrId: null,
  selectedStoryId: null,
  expanded: new Set(),
  radius: 360,
  drag: null,
  customPositions: new Map(),
  autoLayout: true,
  panelVisibility: {
    outline: true,
    mindmap: true,
    detail: true,
    github: false
  }
};

let pointerListenerBound = false;

const outlineEl = document.getElementById('outline-tree');
const mindmapEl = document.getElementById('mindmap-canvas');
const detailEl = document.getElementById('detail-content');
const githubEl = document.getElementById('github-status');

const panelElements = {
  outline: document.querySelector('.panel.outline'),
  mindmap: document.querySelector('.panel.mindmap'),
  detail: document.querySelector('.panel.detail'),
  github: document.querySelector('.panel.github')
};

const outlineControls = {
  expandAll: document.getElementById('expand-all'),
  collapseAll: document.getElementById('collapse-all'),
  depthInput: document.getElementById('expand-depth'),
  applyDepth: document.getElementById('apply-depth')
};

const headerControls = {
  refresh: document.getElementById('refresh-button'),
  reset: document.getElementById('reset-button'),
  radius: document.getElementById('mindmap-radius'),
  autoArrange: document.getElementById('auto-arrange'),
  layoutStatus: document.getElementById('layout-status')
};

const panelToggles = {
  outline: document.getElementById('toggle-outline'),
  mindmap: document.getElementById('toggle-mindmap'),
  detail: document.getElementById('toggle-detail'),
  github: document.getElementById('toggle-github')
};

const openModal = ({ title, content, onClose }) => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const modal = document.createElement('div');
  modal.className = 'modal';

  const header = document.createElement('div');
  header.className = 'modal-header';
  const heading = document.createElement('h2');
  const headingId = `modal-title-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  heading.id = headingId;
  heading.textContent = title;
  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'modal-close';
  closeButton.setAttribute('aria-label', 'Close dialog');
  closeButton.textContent = '×';
  header.appendChild(heading);
  header.appendChild(closeButton);

  overlay.setAttribute('aria-labelledby', headingId);

  const body = document.createElement('div');
  body.className = 'modal-body';
  if (typeof content === 'function') {
    const node = content();
    if (node) body.appendChild(node);
  } else if (content) {
    body.appendChild(content);
  }

  modal.appendChild(header);
  modal.appendChild(body);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const remove = () => {
    document.removeEventListener('keydown', onKeyDown);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      remove();
    }
  };

  document.addEventListener('keydown', onKeyDown);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      remove();
    }
  });

  closeButton.addEventListener('click', () => remove());

  const firstInput = modal.querySelector('input, textarea, select, button');
  if (firstInput) {
    setTimeout(() => {
      firstInput.focus();
    }, 0);
  }

  return remove;
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

const defaultVisibility = () => ({
  outline: true,
  mindmap: true,
  detail: true,
  github: false
});

const loadPanelVisibility = () => {
  try {
    const raw = localStorage.getItem(PANEL_STORAGE_KEY);
    if (!raw) {
      state.panelVisibility = defaultVisibility();
      return;
    }
    const parsed = JSON.parse(raw);
    const next = defaultVisibility();
    Object.keys(next).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        next[key] = Boolean(parsed[key]);
      }
    });
    state.panelVisibility = next;
  } catch (error) {
    state.panelVisibility = defaultVisibility();
  }
};

const savePanelVisibility = () => {
  localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(state.panelVisibility));
};

const applyPanelVisibility = () => {
  Object.entries(panelElements).forEach(([key, element]) => {
    if (!element) return;
    const visible = state.panelVisibility[key] !== false;
    element.classList.toggle('is-hidden', !visible);
    element.setAttribute('aria-hidden', visible ? 'false' : 'true');
  });
  Object.entries(panelToggles).forEach(([key, input]) => {
    if (!input) return;
    input.checked = state.panelVisibility[key] !== false;
  });
};

const positionStorageKey = (mrId) => `${POSITION_STORAGE_PREFIX}${mrId}`;

const loadPositions = (mrId) => {
  if (!mrId) return new Map();
  try {
    const raw = localStorage.getItem(positionStorageKey(mrId));
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Map();
    return new Map(
      parsed
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const { id, x, y } = entry;
          if (typeof id !== 'string' || typeof x !== 'number' || typeof y !== 'number') return null;
          return [id, { x, y }];
        })
        .filter(Boolean)
    );
  } catch (error) {
    return new Map();
  }
};

const savePositions = () => {
  if (!state.activeMrId || state.autoLayout) return;
  const entries = Array.from(state.customPositions.entries()).map(([id, value]) => ({
    id,
    x: Number.isFinite(value.x) ? value.x : 0,
    y: Number.isFinite(value.y) ? value.y : 0
  }));
  localStorage.setItem(positionStorageKey(state.activeMrId), JSON.stringify(entries));
};

const clearPositions = (mrId) => {
  if (!mrId) return;
  localStorage.removeItem(positionStorageKey(mrId));
};

const autoLayoutStorageKey = (mrId) => `${AUTO_LAYOUT_STORAGE_PREFIX}${mrId}`;

const loadAutoLayout = (mrId) => {
  if (!mrId) return true;
  const raw = localStorage.getItem(autoLayoutStorageKey(mrId));
  if (raw === null) return true;
  return raw !== 'false';
};

const saveAutoLayout = () => {
  if (!state.activeMrId) return;
  localStorage.setItem(autoLayoutStorageKey(state.activeMrId), state.autoLayout ? 'true' : 'false');
};

const updateAutoLayoutControls = () => {
  if (headerControls.autoArrange) {
    headerControls.autoArrange.textContent = state.autoLayout
      ? 'Re-run Auto Layout'
      : 'Restore Auto Layout';
    headerControls.autoArrange.setAttribute('aria-pressed', state.autoLayout ? 'true' : 'false');
  }
  if (headerControls.layoutStatus) {
    headerControls.layoutStatus.textContent = state.autoLayout
      ? 'Layout: Automatic'
      : 'Layout: Manual (drag to reposition)';
  }
};

const pruneCustomPositions = () => {
  if (!state.activeMrId) return;
  const filtered = new Map();
  state.customPositions.forEach((value, id) => {
    if (state.stories.has(id)) {
      filtered.set(id, value);
    }
  });
  state.customPositions = filtered;
  if (!state.autoLayout) {
    savePositions();
  }
};

const handleStorySelection = (storyId) => {
  if (!storyId) return;
  const story = state.stories.get(storyId);
  if (!story) return;
  const previousMr = state.activeMrId;
  state.activeMrId = story.mrId;
  state.selectedStoryId = storyId;
  let changed = false;
  let ancestorId = story.parentId;
  while (ancestorId) {
    if (!state.expanded.has(ancestorId)) {
      state.expanded.add(ancestorId);
      changed = true;
    }
    const parent = state.stories.get(ancestorId);
    ancestorId = parent?.parentId ?? null;
  }
  if (changed) saveExpanded();
  if (previousMr !== state.activeMrId) {
    state.autoLayout = loadAutoLayout(state.activeMrId);
    state.customPositions = state.autoLayout ? new Map() : loadPositions(state.activeMrId);
    if (!state.autoLayout) {
      pruneCustomPositions();
    } else {
      clearPositions(state.activeMrId);
    }
    updateAutoLayoutControls();
  }
  renderOutline();
  renderMindmap();
  renderDetail();
  if (previousMr !== state.activeMrId) {
    renderGithubStatus();
  }
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
    const payload = typeof details === 'object' && details !== null ? details : { message: details };
    const err = new Error(payload.message ?? 'Request failed');
    err.code = payload.code ?? null;
    err.payload = payload;
    err.details = payload.details && typeof payload.details === 'object' ? payload.details : payload;
    if (err.details && typeof err.details === 'object' && 'allowOverride' in err.details) {
      err.allowOverride = Boolean(err.details.allowOverride);
    }
    throw err;
  }
  return response.status === 204 ? null : response.json();
};

const formatInvestError = (error, prefix) => {
  const violations = Array.isArray(error.details?.violations) ? error.details.violations : [];
  if (violations.length === 0) {
    return `${prefix}: ${error.message}`;
  }
  const lines = violations.map(
    (violation) => `• ${violation.label ?? violation.principle}: ${violation.suggestion ?? violation.message}`
  );
  return `${prefix}. INVEST feedback:\n${lines.join('\n')}`;
};

const formatTestabilityError = (error, prefix) => {
  const feedback = error.details?.feedback ?? error.details?.measurabilityFeedback;
  const issues = Array.isArray(feedback?.issues)
    ? feedback.issues
    : Array.isArray(error.details?.measurability?.offending)
    ? error.details.measurability.offending.map((issue) => ({
        index: issue.index,
        text: issue.text,
        criteria: 'Then step must describe a measurable, verifiable outcome.',
        suggestion: `Add a measurable outcome to "${issue.text}" (e.g., include a numeric threshold or time limit).`,
        examples: [
          'response time ≤ 500 ms',
          'success rate ≥ 95%',
          'audit log entry contains requestId'
        ]
      }))
    : [];

  if (issues.length === 0) {
    return `${prefix}: ${error.message}`;
  }

  const lines = issues.map((issue) => {
    const stepLabel = issue.index === undefined ? 'Step' : `Step ${issue.index + 1}`;
    const detail = issue.suggestion ?? `Add a measurable outcome to "${issue.text}".`;
    const criteria = issue.criteria ? `${issue.criteria} ` : '';
    const examples = Array.isArray(issue.examples) && issue.examples.length > 0
      ? ` Examples: ${issue.examples.slice(0, 3).join(', ')}.`
      : '';
    return `• ${stepLabel}: ${criteria}${detail}${examples}`;
  });

  if (Array.isArray(feedback?.examples) && feedback.examples.length > 0) {
    lines.push(
      `• Suggested measurable parameters: ${feedback.examples.slice(0, 5).join(', ')}`
    );
  }

  return `${prefix}. Testability feedback:\n${lines.join('\n')}`;
};

const loadState = async () => {
  const data = await fetchJSON('/api/state');
  state.mergeRequests = data.mergeRequests;
  state.stories = new Map(data.stories.map((story) => [story.id, story]));
  state.tests = new Map(data.tests.map((test) => [test.id, test]));
  const previousMr = state.activeMrId;
  if (!state.activeMrId && data.mergeRequests.length > 0) {
    state.activeMrId = data.mergeRequests[0].id;
  }
  if (state.selectedStoryId && !state.stories.has(state.selectedStoryId)) {
    state.selectedStoryId = null;
  }
  state.autoLayout = loadAutoLayout(state.activeMrId);
  if (state.autoLayout) {
    state.customPositions = new Map();
  } else if (state.activeMrId) {
    state.customPositions = loadPositions(state.activeMrId);
    pruneCustomPositions();
  }
  updateAutoLayoutControls();
};

const storyChildren = (storyId) =>
  Array.from(state.stories.values()).filter((story) => story.parentId === storyId).sort((a, b) => a.order - b.order);

const rootStories = () =>
  Array.from(state.stories.values())
    .filter((story) => story.mrId === state.activeMrId && story.parentId === null)
    .sort((a, b) => a.order - b.order);

const buildStoryTree = (stories) =>
  stories.map((story) => ({ story, children: buildStoryTree(storyChildren(story.id)) }));

const buildMindmapTree = (stories) =>
  stories.map((story) => ({
    story,
    children: state.expanded.has(story.id) ? buildMindmapTree(storyChildren(story.id)) : []
  }));

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
      handleStorySelection(node.story.id);
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
          handleStorySelection(node.dataset.id);
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
      placements.push({
        id: node.story.id,
        x: AUTO_LAYOUT_MARGIN_X + depth * horizontalGap,
        y,
        story: node.story,
        depth
      });
      return y;
    }
    const childPositions = node.children.map((child) => assign(child, depth + 1));
    const y = childPositions.reduce((sum, value) => sum + value, 0) / childPositions.length;
    placements.push({
      id: node.story.id,
      x: AUTO_LAYOUT_MARGIN_X + depth * horizontalGap,
      y,
      story: node.story,
      depth
    });
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
  return placements.map((placement) => ({
    ...placement,
    y: placement.y - offsetY + (state.autoLayout ? AUTO_LAYOUT_MARGIN_Y : 0)
  }));
};

const renderMindmap = () => {
  const tree = buildMindmapTree(rootStories());
  const defaultNodes = computeLayout(tree);
  const nodes = state.autoLayout
    ? defaultNodes
    : defaultNodes.map((node) => {
        const override = state.customPositions.get(node.id);
        if (!override) return node;
        return { ...node, x: override.x, y: override.y };
      });
  updateAutoLayoutControls();
  mindmapEl.innerHTML = '';
  if (nodes.length === 0) {
    mindmapEl.setAttribute('viewBox', '-200 -200 400 400');
    return;
  }

  const padding = state.autoLayout ? 200 : 120;
  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x + NODE_WIDTH));
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
        line.setAttribute('x1', (parent.x + NODE_WIDTH).toFixed(2));
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

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', NODE_WIDTH.toString());
    rect.setAttribute('height', NODE_HEIGHT.toString());
    rect.setAttribute('x', '0');
    rect.setAttribute('y', (-NODE_HEIGHT / 2).toString());
    rect.setAttribute('rx', '14');
    rect.setAttribute('ry', '14');
    group.appendChild(rect);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.textContent = node.story.title;
    text.setAttribute('pointer-events', 'none');
    text.setAttribute('x', '16');
    text.setAttribute('y', '0');
    text.setAttribute('text-anchor', 'start');
    text.setAttribute('dominant-baseline', 'middle');
    group.appendChild(text);

    if (storyChildren(node.id).length > 0) {
      const toggle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      toggle.classList.add('mindmap-toggle');
      const toggleCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      toggleCircle.setAttribute('cx', (NODE_WIDTH - 16).toString());
      toggleCircle.setAttribute('cy', (-NODE_HEIGHT / 2 + 16).toString());
      toggleCircle.setAttribute('r', '12');
      toggle.appendChild(toggleCircle);

      const toggleLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      toggleLabel.textContent = state.expanded.has(node.id) ? '−' : '+';
      toggleLabel.setAttribute('x', (NODE_WIDTH - 16).toString());
      toggleLabel.setAttribute('y', (-NODE_HEIGHT / 2 + 16).toString());
      toggleLabel.setAttribute('text-anchor', 'middle');
      toggleLabel.setAttribute('dominant-baseline', 'middle');
      toggle.appendChild(toggleLabel);

      toggle.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });

      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const currentlyExpanded = state.expanded.has(node.id);
        if (event.shiftKey) {
          toggleSubtree(node.id, !currentlyExpanded);
        } else {
          toggleExpanded(node.id, !currentlyExpanded);
        }
      });

      group.appendChild(toggle);
    }

    group.addEventListener('click', () => handleStorySelection(node.id));
    rect.addEventListener('click', (event) => {
      event.stopPropagation();
      handleStorySelection(node.id);
    });

    group.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const isReparent = event.altKey || event.ctrlKey || event.metaKey;
      if (!isReparent && state.autoLayout) {
        state.autoLayout = false;
        state.customPositions = new Map(
          nodes.map((placement) => [placement.id, { x: placement.x, y: placement.y }])
        );
        saveAutoLayout();
        savePositions();
        updateAutoLayoutControls();
      }
      const point = clientToSvgPoint(event);
      mindmapEl.setPointerCapture(event.pointerId);
      state.drag = {
        storyId: node.id,
        origin: point,
        start: { x: node.x, y: node.y },
        dropTarget: null,
        group,
        mode: isReparent ? 'reparent' : 'position',
        current: null,
        moved: false
      };
    });

    group.addEventListener('pointerenter', () => {
      if (state.drag && state.drag.mode === 'reparent' && state.drag.storyId !== node.id) {
        state.drag.dropTarget = node.id;
      }
    });

    group.addEventListener('pointerleave', () => {
      if (state.drag && state.drag.mode === 'reparent' && state.drag.dropTarget === node.id) {
        state.drag.dropTarget = null;
      }
    });

    nodesGroup.appendChild(group);
  });

  mindmapEl.appendChild(nodesGroup);

  if (!pointerListenerBound) {
    mindmapEl.addEventListener('pointermove', (event) => {
      if (!state.drag || state.drag.mode !== 'position') return;
      const point = clientToSvgPoint(event);
      if (!point) return;
      const dx = point.x - state.drag.origin.x;
      const dy = point.y - state.drag.origin.y;
      const x = Math.max(0, state.drag.start.x + dx);
      const y = state.drag.start.y + dy;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        state.drag.moved = true;
      }
      state.drag.current = { x, y };
      if (state.drag.group) {
        state.drag.group.setAttribute('transform', `translate(${x.toFixed(2)}, ${y.toFixed(2)})`);
      }
    });

    mindmapEl.addEventListener('pointerup', async (event) => {
      if (!state.drag) return;
      try {
        mindmapEl.releasePointerCapture(event.pointerId);
      } catch (error) {
        // ignore when capture was not set
      }
      const { storyId, dropTarget, mode, current, moved } = state.drag;
      state.drag = null;
      if (mode === 'reparent') {
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
      } else if (!moved) {
        handleStorySelection(storyId);
      } else if (current) {
        state.customPositions.set(storyId, current);
        savePositions();
        renderMindmap();
      }
    });

    mindmapEl.addEventListener('pointercancel', () => {
      if (state.drag?.mode === 'position') {
        renderMindmap();
      }
      state.drag = null;
    });
    pointerListenerBound = true;
  }
};

const clientToSvgPoint = (event) => {
  const point = mindmapEl.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  const ctm = mindmapEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const transformed = point.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
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
      alert(formatInvestError(error, 'Failed to save story'));
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
        given: formEl.elements.given.value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        when: formEl.elements.when.value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        then: formEl.elements.then.value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        status: formEl.elements.status.value
      };
      try {
        await fetchJSON(`/api/tests/${test.id}`, { method: 'PATCH', body: JSON.stringify(body) });
        await loadState();
        renderDetail();
        renderOutline();
        renderMindmap();
      } catch (error) {
        alert(formatTestabilityError(error, 'Failed to save test'));
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
    <h3>Child Stories</h3>
    <button type="button" class="open-child-modal">Add Child Story</button>
  `;
  const openChildModalButton = childSection.querySelector('.open-child-modal');
  openChildModalButton.addEventListener('click', () => {
    const form = document.createElement('form');
    form.className = 'modal-form';
    form.innerHTML = `
      <label>Title<input name="title" required maxlength="160" /></label>
      <label>As a<input name="asA" required /></label>
      <label>I want<textarea name="iWant" required></textarea></label>
      <label>So that<textarea name="soThat" required></textarea></label>
      <div class="modal-actions">
        <button type="button" class="modal-cancel">Cancel</button>
        <button type="submit">Create Child Story</button>
      </div>
    `;

    const close = openModal({ title: 'Add Child Story', content: form });

    const cancelButton = form.querySelector('.modal-cancel');
    cancelButton.addEventListener('click', () => close());

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const basePayload = {
        mrId: story.mrId,
        parentId: story.id,
        title: form.elements.title.value,
        asA: form.elements.asA.value,
        iWant: form.elements.iWant.value,
        soThat: form.elements.soThat.value
      };

      const refreshAfterCreate = async () => {
        form.reset();
        state.expanded.add(story.id);
        saveExpanded();
        await loadState();
        renderOutline();
        renderMindmap();
        renderDetail();
        close();
      };

      try {
        await fetchJSON('/api/stories', { method: 'POST', body: JSON.stringify(basePayload) });
        await refreshAfterCreate();
      } catch (error) {
        if (error.code === 'story.invest' && (error.allowOverride || error.details?.allowOverride)) {
          const message = formatInvestError(error, 'Unable to create child story');
          const proceed = confirm(`${message}\n\nCreate the story anyway?`);
          if (!proceed) return;
          try {
            await fetchJSON('/api/stories', {
              method: 'POST',
              body: JSON.stringify({ ...basePayload, acceptWarnings: true })
            });
            await refreshAfterCreate();
          } catch (retryError) {
            alert(formatInvestError(retryError, 'Unable to create child story'));
          }
          return;
        }
        alert(formatInvestError(error, 'Unable to create child story'));
      }
    });
  });

  const testSection = document.createElement('section');
  testSection.className = 'creation-section';
  testSection.innerHTML = `
    <h3>Acceptance Tests</h3>
    <button type="button" class="open-test-modal">Add Acceptance Test</button>
  `;
  const openTestModalButton = testSection.querySelector('.open-test-modal');
  openTestModalButton.addEventListener('click', () => {
    const form = document.createElement('form');
    form.className = 'modal-form';
    form.innerHTML = `
      <label>Given<textarea name="given" required></textarea></label>
      <label>When<textarea name="when" required></textarea></label>
      <label>Then<textarea name="then" required></textarea></label>
      <div class="modal-actions">
        <button type="button" class="modal-cancel">Cancel</button>
        <button type="submit">Create Acceptance Test</button>
      </div>
    `;

    const close = openModal({ title: 'Add Acceptance Test', content: form });

    const cancelButton = form.querySelector('.modal-cancel');
    cancelButton.addEventListener('click', () => close());

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const basePayload = {
        storyId: story.id,
        given: form.elements.given.value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        when: form.elements.when.value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        then: form.elements.then.value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      };
      const refreshAfterCreate = async () => {
        form.reset();
        await loadState();
        renderDetail();
        renderOutline();
        renderMindmap();
        close();
      };

      try {
        await fetchJSON('/api/tests', { method: 'POST', body: JSON.stringify(basePayload) });
        await refreshAfterCreate();
      } catch (error) {
        if (error.code === 'test.measurable' && (error.allowOverride || error.details?.allowOverride)) {
          const message = formatTestabilityError(error, 'Unable to create acceptance test');
          const proceed = confirm(`${message}\n\nCreate the acceptance test anyway?`);
          if (!proceed) return;
          try {
            await fetchJSON('/api/tests', {
              method: 'POST',
              body: JSON.stringify({ ...basePayload, acceptWarnings: true })
            });
            await refreshAfterCreate();
          } catch (retryError) {
            alert(formatTestabilityError(retryError, 'Unable to create acceptance test'));
          }
          return;
        }
        alert(formatTestabilityError(error, 'Unable to create acceptance test'));
      }
    });
  });

  detailEl.append(childSection, testSection);
};

const initializeEvents = () => {
  Object.entries(panelToggles).forEach(([key, input]) => {
    if (!input) return;
    input.addEventListener('change', () => {
      state.panelVisibility[key] = input.checked;
      savePanelVisibility();
      applyPanelVisibility();
      switch (key) {
        case 'outline':
          renderOutline();
          break;
        case 'mindmap':
          renderMindmap();
          break;
        case 'detail':
          renderDetail();
          break;
        case 'github':
          renderGithubStatus();
          break;
        default:
          break;
      }
    });
  });

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

  if (headerControls.autoArrange) {
    headerControls.autoArrange.addEventListener('click', () => {
      state.autoLayout = true;
      if (state.activeMrId) {
        clearPositions(state.activeMrId);
      }
      state.customPositions.clear();
      saveAutoLayout();
      renderMindmap();
    });
  }
};

const bootstrap = async () => {
  loadExpanded();
  loadPanelVisibility();
  applyPanelVisibility();
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
