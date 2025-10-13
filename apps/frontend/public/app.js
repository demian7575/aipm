const outlineTreeEl = document.getElementById('outline-tree');
const mindmapCanvas = document.getElementById('mindmap-canvas');
const detailsPanel = document.getElementById('details-panel');
const detailsContent = document.getElementById('details-content');
const detailsPlaceholder = document.getElementById('details-placeholder');
const refreshBtn = document.getElementById('refresh-btn');
const expandAllBtn = document.getElementById('expand-all');
const collapseAllBtn = document.getElementById('collapse-all');
const autoLayoutToggle = document.getElementById('auto-layout-toggle');
const layoutStatus = document.getElementById('layout-status');
const workspaceEl = document.getElementById('workspace');
const toggleOutline = document.getElementById('toggle-outline');
const toggleMindmap = document.getElementById('toggle-mindmap');
const toggleDetails = document.getElementById('toggle-details');
const mindmapPanel = document.getElementById('mindmap-panel');
const outlinePanel = document.getElementById('outline-panel');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalFooter = document.getElementById('modal-footer');
const modalCloseBtn = document.getElementById('modal-close');
const toastEl = document.getElementById('toast');

const STORAGE_KEYS = {
  expanded: 'aiPm.expanded',
  selection: 'aiPm.selection',
  layout: 'aiPm.layout',
  panels: 'aiPm.panels',
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 92;
const HORIZONTAL_STEP = 240;
const VERTICAL_STEP = 150;
const X_OFFSET = 80;
const Y_OFFSET = 80;

function parseStoryPointInput(raw) {
  if (raw == null) {
    return { value: null, error: null };
  }
  const trimmed = String(raw).trim();
  if (trimmed === '') {
    return { value: null, error: null };
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return { value: null, error: 'Story point must be a number.' };
  }
  if (!Number.isInteger(numeric)) {
    return { value: null, error: 'Story point must be a whole number.' };
  }
  if (numeric < 0) {
    return { value: null, error: 'Story point cannot be negative.' };
  }
  return { value: numeric, error: null };
}

const state = {
  stories: [],
  expanded: new Set(),
  selectedStoryId: null,
  manualPositions: {},
  autoLayout: true,
  panelVisibility: {
    outline: true,
    mindmap: true,
    details: true,
  },
};

const storyIndex = new Map();
const parentById = new Map();
let toastTimeout = null;

function loadPreferences() {
  try {
    const expandedRaw = localStorage.getItem(STORAGE_KEYS.expanded);
    if (expandedRaw) {
      const ids = JSON.parse(expandedRaw);
      state.expanded = new Set(ids.map(Number));
    }
  } catch (error) {
    console.error('Failed to load expansion preferences', error);
  }

  try {
    const layoutRaw = localStorage.getItem(STORAGE_KEYS.layout);
    if (layoutRaw) {
      const data = JSON.parse(layoutRaw);
      state.autoLayout = data.autoLayout ?? true;
      state.manualPositions = data.positions ?? {};
    }
  } catch (error) {
    console.error('Failed to load layout preferences', error);
  }

  try {
    const panelsRaw = localStorage.getItem(STORAGE_KEYS.panels);
    if (panelsRaw) {
      const panels = JSON.parse(panelsRaw);
      state.panelVisibility = {
        outline: panels.outline ?? true,
        mindmap: panels.mindmap ?? true,
        details: panels.details ?? true,
      };
    }
  } catch (error) {
    console.error('Failed to load panel preferences', error);
  }

  try {
    const selectionRaw = localStorage.getItem(STORAGE_KEYS.selection);
    if (selectionRaw) {
      state.selectedStoryId = Number(selectionRaw);
    }
  } catch (error) {
    console.error('Failed to load selection', error);
  }

  toggleOutline.checked = state.panelVisibility.outline;
  toggleMindmap.checked = state.panelVisibility.mindmap;
  toggleDetails.checked = state.panelVisibility.details;
}

function persistExpanded() {
  const ids = Array.from(state.expanded.values());
  localStorage.setItem(STORAGE_KEYS.expanded, JSON.stringify(ids));
}

function persistSelection() {
  if (state.selectedStoryId != null) {
    localStorage.setItem(STORAGE_KEYS.selection, String(state.selectedStoryId));
  } else {
    localStorage.removeItem(STORAGE_KEYS.selection);
  }
}

function persistLayout() {
  localStorage.setItem(
    STORAGE_KEYS.layout,
    JSON.stringify({ autoLayout: state.autoLayout, positions: state.manualPositions })
  );
}

function persistPanels() {
  localStorage.setItem(STORAGE_KEYS.panels, JSON.stringify(state.panelVisibility));
}

function rebuildStoryIndex() {
  storyIndex.clear();
  parentById.clear();
  const manual = state.manualPositions;

  function walk(nodes, parentId = null) {
    nodes.forEach((story) => {
      storyIndex.set(story.id, story);
      if (parentId != null) {
        parentById.set(story.id, parentId);
      }
      if (story.children && story.children.length > 0) {
        walk(story.children, story.id);
      }
    });
  }

  walk(state.stories);

  Object.keys(manual).forEach((key) => {
    if (!storyIndex.has(Number(key))) {
      delete manual[key];
    }
  });
}

function ensureRootExpansion() {
  state.stories.forEach((story) => {
    state.expanded.add(story.id);
  });
  persistExpanded();
}

function flattenStories(nodes) {
  const result = [];
  function walk(items) {
    items.forEach((story) => {
      result.push(story);
      if (story.children && story.children.length > 0) {
        walk(story.children);
      }
    });
  }
  walk(nodes);
  return result;
}

async function loadStories(preserveSelection = true) {
  const previousSelection = preserveSelection ? state.selectedStoryId : null;
  try {
    const response = await fetch('/api/stories');
    if (!response.ok) {
      throw new Error('Failed to fetch stories');
    }
    const data = await response.json();
    state.stories = Array.isArray(data) ? data : [];
    rebuildStoryIndex();
    if (state.stories.length && state.expanded.size === 0) {
      ensureRootExpansion();
    }
    if (previousSelection && storyIndex.has(previousSelection)) {
      state.selectedStoryId = previousSelection;
    } else if (!storyIndex.has(state.selectedStoryId)) {
      state.selectedStoryId = state.stories[0]?.id ?? null;
    }
    if (state.selectedStoryId != null) {
      expandAncestors(state.selectedStoryId);
    }
    renderAll();
  } catch (error) {
    console.error(error);
    renderAll();
    showToast(error.message || 'Unable to load stories', 'error');
  }
}

function renderAll() {
  updateWorkspaceColumns();
  renderOutline();
  renderMindmap();
  renderDetails();
}

function updateWorkspaceColumns() {
  const columns = [];
  outlinePanel.classList.toggle('hidden', !state.panelVisibility.outline);
  mindmapPanel.classList.toggle('hidden', !state.panelVisibility.mindmap);
  detailsPanel.classList.toggle('hidden', !state.panelVisibility.details);

  if (state.panelVisibility.outline) {
    columns.push('320px');
  }
  if (state.panelVisibility.mindmap) {
    columns.push('minmax(0, 1fr)');
  }
  if (state.panelVisibility.details) {
    columns.push('380px');
  }
  workspaceEl.style.gridTemplateColumns = columns.join(' ');
}

function renderOutline() {
  outlineTreeEl.innerHTML = '';
  const list = document.createDocumentFragment();

  function renderNode(story, depth) {
    const row = document.createElement('div');
    row.className = 'outline-item';
    row.style.paddingLeft = `${depth * 1.25}rem`;
    if (story.id === state.selectedStoryId) {
      row.classList.add('selected');
    }
    if (!story.investSatisfied) {
      row.classList.add('warning');
    }

    const caret = document.createElement('div');
    caret.className = 'caret-button';
    caret.setAttribute('role', 'button');
    caret.setAttribute('aria-label', state.expanded.has(story.id) ? 'Collapse story' : 'Expand story');
    caret.textContent = story.children && story.children.length > 0 ? (state.expanded.has(story.id) ? '−' : '+') : '';
    caret.style.visibility = story.children && story.children.length > 0 ? 'visible' : 'hidden';
    caret.addEventListener('click', (event) => {
      event.stopPropagation();
      toggleStoryExpansion(story.id);
    });
    row.appendChild(caret);

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = `${story.title}${story.storyPoint != null ? ` (SP ${story.storyPoint})` : ''}`;
    row.appendChild(title);

    row.addEventListener('click', () => handleStorySelection(story));
    list.appendChild(row);

    if (story.children && story.children.length > 0 && state.expanded.has(story.id)) {
      story.children.forEach((child) => renderNode(child, depth + 1));
    }
  }

  state.stories.forEach((story) => renderNode(story, 0));
  outlineTreeEl.appendChild(list);
}

function computeLayout(nodes, depth = 0, line = 0) {
  let nextLine = line;
  let minLine = Number.POSITIVE_INFINITY;
  let maxLine = Number.NEGATIVE_INFINITY;
  const positioned = [];

  nodes.forEach((story) => {
    const expanded = state.expanded.has(story.id);
    let childLayout = null;
    if (expanded && story.children && story.children.length > 0) {
      childLayout = computeLayout(story.children, depth + 1, nextLine);
      nextLine = childLayout.nextLine;
      positioned.push(...childLayout.nodes);
      minLine = Math.min(minLine, childLayout.minLine);
      maxLine = Math.max(maxLine, childLayout.maxLine);
    }

    let centerLine;
    if (childLayout && childLayout.nodes.length > 0) {
      centerLine = (childLayout.minLine + childLayout.maxLine) / 2;
    } else {
      centerLine = nextLine;
      nextLine += 1;
    }

    const node = {
      id: story.id,
      story,
      x: X_OFFSET + depth * HORIZONTAL_STEP,
      y: Y_OFFSET + centerLine * VERTICAL_STEP - NODE_HEIGHT / 2,
    };
    positioned.push(node);
    minLine = Math.min(minLine, centerLine);
    maxLine = Math.max(maxLine, centerLine);
  });

  if (minLine === Number.POSITIVE_INFINITY) {
    minLine = line;
    maxLine = line;
  }

  return { nodes: positioned, nextLine, minLine, maxLine };
}

function renderMindmap() {
  mindmapCanvas.innerHTML = '';
  if (!state.panelVisibility.mindmap) {
    return;
  }
  if (state.stories.length === 0) {
    layoutStatus.textContent = 'No stories to display yet.';
    return;
  }

  const layout = computeLayout(state.stories);
  const nodes = [];
  const nodeMap = new Map();
  layout.nodes.forEach((node) => {
    const manual = state.manualPositions[node.id];
    const x = state.autoLayout || !manual ? node.x : manual.x;
    const y = state.autoLayout || !manual ? node.y : manual.y;
    const positioned = { ...node, x, y };
    nodes.push(positioned);
    nodeMap.set(node.id, positioned);
  });

  const edges = [];
  nodes.forEach((node) => {
    const story = node.story;
    if (!story.children || story.children.length === 0) return;
    if (!state.expanded.has(story.id)) return;
    story.children.forEach((child) => {
      if (nodeMap.has(child.id)) {
        edges.push({ from: node, to: nodeMap.get(child.id) });
      }
    });
  });

  if (nodes.length === 0) {
    layoutStatus.textContent = 'Toggle outline items to expand the map.';
    return;
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x + NODE_WIDTH));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y + NODE_HEIGHT));
  const margin = 120;
  mindmapCanvas.setAttribute(
    'viewBox',
    `${minX - margin} ${minY - margin} ${maxX - minX + margin * 2} ${maxY - minY + margin * 2}`
  );

  const svgNS = 'http://www.w3.org/2000/svg';

  edges.forEach((edge) => {
    const path = document.createElementNS(svgNS, 'path');
    path.classList.add('mindmap-edge');
    const startX = edge.from.x + NODE_WIDTH;
    const startY = edge.from.y + NODE_HEIGHT / 2;
    const endX = edge.to.x;
    const endY = edge.to.y + NODE_HEIGHT / 2;
    const midX = startX + (endX - startX) / 2;
    path.setAttribute('d', `M ${startX} ${startY} C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}`);
    mindmapCanvas.appendChild(path);
  });

  nodes.forEach((node) => {
    const group = document.createElementNS(svgNS, 'g');
    group.classList.add('mindmap-node');
    group.setAttribute('data-story-id', String(node.id));
    if (node.story.id === state.selectedStoryId) {
      group.classList.add('selected');
    }
    if (!node.story.investSatisfied) {
      group.classList.add('warning');
    }

    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', String(node.x));
    rect.setAttribute('y', String(node.y));
    rect.setAttribute('width', String(NODE_WIDTH));
    rect.setAttribute('height', String(NODE_HEIGHT));
    group.appendChild(rect);

    const title = document.createElementNS(svgNS, 'text');
    title.classList.add('story-title');
    title.setAttribute('x', String(node.x + 12));
    title.setAttribute('y', String(node.y + 26));
    title.textContent = node.story.title;
    group.appendChild(title);

    const storyPoint = node.story.storyPoint != null ? `SP ${node.story.storyPoint}` : 'Unestimated';
    const meta = document.createElementNS(svgNS, 'text');
    meta.classList.add('story-meta');
    meta.setAttribute('x', String(node.x + 12));
    meta.setAttribute('y', String(node.y + 46));
    meta.textContent = `${storyPoint} • ${node.story.assigneeEmail || 'Unassigned'}`;
    group.appendChild(meta);

    const persona = document.createElementNS(svgNS, 'text');
    persona.classList.add('story-meta');
    persona.setAttribute('x', String(node.x + 12));
    persona.setAttribute('y', String(node.y + 66));
    persona.textContent = node.story.asA ? `As ${node.story.asA}` : 'Persona not defined';
    group.appendChild(persona);

    if (node.story.children && node.story.children.length > 0) {
      const toggleBg = document.createElementNS(svgNS, 'circle');
      toggleBg.classList.add('toggle-bg');
      const toggleX = node.x + NODE_WIDTH - 16;
      const toggleY = node.y + 16;
      toggleBg.setAttribute('cx', String(toggleX));
      toggleBg.setAttribute('cy', String(toggleY));
      toggleBg.setAttribute('r', '12');
      toggleBg.addEventListener('mousedown', (event) => event.stopPropagation());
      toggleBg.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleStoryExpansion(node.story.id);
      });
      group.appendChild(toggleBg);

      const symbol = document.createElementNS(svgNS, 'text');
      symbol.classList.add('toggle-label');
      symbol.setAttribute('x', String(toggleX - 4));
      symbol.setAttribute('y', String(toggleY + 4));
      symbol.textContent = state.expanded.has(node.story.id) ? '−' : '+';
      group.appendChild(symbol);
    }

    setupNodeInteraction(group, node);
    mindmapCanvas.appendChild(group);
  });

  if (state.autoLayout) {
    layoutStatus.textContent = 'Auto layout enabled — nodes expand to the right.';
    autoLayoutToggle.textContent = 'Disable Auto Layout';
  } else {
    layoutStatus.textContent = 'Manual layout enabled — drag nodes to reposition.';
    autoLayoutToggle.textContent = 'Enable Auto Layout';
  }
}

function setupNodeInteraction(group, node) {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;

  function onMouseMove(event) {
    dragging = true;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    state.manualPositions[node.id] = { x: originX + dx, y: originY + dy };
    state.autoLayout = false;
    renderMindmap();
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (!dragging) {
      handleStorySelection(node.story);
    } else {
      persistLayout();
    }
  }

  group.addEventListener('mousedown', (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = false;
    startX = event.clientX;
    startY = event.clientY;
    const manual = state.manualPositions[node.id];
    originX = state.autoLayout || !manual ? node.x : manual.x;
    originY = state.autoLayout || !manual ? node.y : manual.y;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
  });
}

function renderDetails() {
  if (!state.panelVisibility.details) {
    return;
  }
  const story = state.selectedStoryId != null ? storyIndex.get(state.selectedStoryId) : null;
  detailsContent.innerHTML = '';
  if (!story) {
    detailsPlaceholder.classList.remove('hidden');
    return;
  }

  detailsPlaceholder.classList.add('hidden');

  const form = document.createElement('form');
  form.className = 'story-form';
  form.innerHTML = `
    <div>
      <label>Title</label>
      <input name="title" value="${escapeHtml(story.title)}" required />
    </div>
    <div>
      <label>Story Point</label>
      <input name="storyPoint" type="number" min="0" step="1" placeholder="Estimate" value="${
        story.storyPoint != null ? story.storyPoint : ''
      }" />
    </div>
    <div>
      <label>Assignee Email</label>
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <input name="assigneeEmail" type="email" value="${escapeHtml(story.assigneeEmail || '')}" placeholder="name@example.com" />
        <button type="button" class="secondary" id="assignee-email-btn" ${
          story.assigneeEmail ? '' : 'disabled'
        }>Email</button>
      </div>
    </div>
    <div>
      <label>Status</label>
      <input name="status" value="${escapeHtml(story.status || 'Draft')}" disabled />
    </div>
    <div class="full">
      <label>Description</label>
      <textarea name="description">${escapeHtml(story.description || '')}</textarea>
    </div>
    <div class="full">
      <table class="story-brief">
        <tbody>
          <tr>
            <th scope="row">As a</th>
            <td><textarea name="asA">${escapeHtml(story.asA || '')}</textarea></td>
          </tr>
          <tr>
            <th scope="row">I want</th>
            <td><textarea name="iWant">${escapeHtml(story.iWant || '')}</textarea></td>
          </tr>
          <tr>
            <th scope="row">So that</th>
            <td><textarea name="soThat">${escapeHtml(story.soThat || '')}</textarea></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="full" style="display:flex; gap:0.5rem;">
      <button type="submit">Save Story</button>
      <button type="button" class="secondary" id="reference-button">Reference Documents</button>
    </div>
  `;

  const investHealth = story.investHealth || {
    satisfied: !story.investWarnings || story.investWarnings.length === 0,
    issues: story.investWarnings || [],
  };

  const storyBriefBody = form.querySelector('.story-brief tbody');
  if (storyBriefBody) {
    const summaryRow = document.createElement('tr');
    summaryRow.className = 'story-meta-row';
    const summaryHeader = document.createElement('th');
    summaryHeader.scope = 'row';
    summaryHeader.textContent = 'Summary';
    const summaryCell = document.createElement('td');
    const metaGrid = document.createElement('div');
    metaGrid.className = 'story-meta-grid';

    const healthItem = document.createElement('div');
    healthItem.className = 'story-meta-item';
    const healthLabel = document.createElement('span');
    healthLabel.className = 'story-meta-label';
    healthLabel.textContent = 'Health (INVEST)';
    const healthValue = document.createElement('span');
    healthValue.className = `health-pill ${investHealth.satisfied ? 'pass' : 'fail'}`;
    healthValue.textContent = investHealth.satisfied ? 'Pass' : 'Needs review';
    healthItem.appendChild(healthLabel);
    healthItem.appendChild(healthValue);

    if (investHealth.issues && investHealth.issues.length) {
      const issueList = document.createElement('ul');
      issueList.className = 'health-issue-list';
      investHealth.issues.forEach((issue) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'link-button health-issue-button';
        const criterionLabel = formatCriterionLabel(issue.criterion);
        button.textContent = `${criterionLabel ? `${criterionLabel} – ` : ''}${issue.message}`;
        button.addEventListener('click', () => openHealthIssueModal('INVEST Issue', issue));
        item.appendChild(button);
        issueList.appendChild(item);
      });
      healthItem.appendChild(issueList);
    } else {
      const ok = document.createElement('p');
      ok.className = 'health-ok';
      ok.textContent = 'All INVEST checks passed.';
      healthItem.appendChild(ok);
    }

    const statusItem = document.createElement('div');
    statusItem.className = 'story-meta-item';
    const statusLabel = document.createElement('span');
    statusLabel.className = 'story-meta-label';
    statusLabel.textContent = 'Status';
    const statusValue = document.createElement('span');
    statusValue.className = 'story-meta-value';
    statusValue.textContent = story.status || 'Draft';
    statusItem.appendChild(statusLabel);
    statusItem.appendChild(statusValue);

    const pointsItem = document.createElement('div');
    pointsItem.className = 'story-meta-item';
    const pointsLabel = document.createElement('span');
    pointsLabel.className = 'story-meta-label';
    pointsLabel.textContent = 'Story Point';
    const pointsValue = document.createElement('span');
    pointsValue.className = 'story-meta-value';
    pointsValue.textContent = story.storyPoint != null ? String(story.storyPoint) : '—';
    pointsItem.appendChild(pointsLabel);
    pointsItem.appendChild(pointsValue);

    metaGrid.appendChild(healthItem);
    metaGrid.appendChild(statusItem);
    metaGrid.appendChild(pointsItem);

    summaryCell.appendChild(metaGrid);
    summaryRow.appendChild(summaryHeader);
    summaryRow.appendChild(summaryCell);
    storyBriefBody.appendChild(summaryRow);
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const storyPointResult = parseStoryPointInput(formData.get('storyPoint'));
    if (storyPointResult.error) {
      showToast(storyPointResult.error, 'error');
      return;
    }
    const payload = {
      title: formData.get('title').trim(),
      storyPoint: storyPointResult.value,
      assigneeEmail: formData.get('assigneeEmail').trim(),
      description: formData.get('description').trim(),
      asA: formData.get('asA').trim(),
      iWant: formData.get('iWant').trim(),
      soThat: formData.get('soThat').trim(),
    };

    try {
      await updateStory(story.id, payload);
      await loadStories();
      showToast('Story saved', 'success');
    } catch (error) {
      if (error && error.code === 'INVEST_WARNINGS') {
        const proceed = window.confirm(
          `${error.message}\n\n${formatInvestWarnings(error.warnings)}\n\nSave anyway?`
        );
        if (proceed) {
          await updateStory(story.id, { ...payload, acceptWarnings: true });
          await loadStories();
          showToast('Story saved with warnings', 'success');
        }
      } else {
        showToast(error.message || 'Failed to save story', 'error');
      }
    }
  });

  detailsContent.appendChild(form);

  const emailBtn = form.querySelector('#assignee-email-btn');
  emailBtn?.addEventListener('click', () => {
    const email = form.elements.assigneeEmail.value.trim();
    if (email) {
      window.open(`mailto:${email}`);
    }
  });

  const referenceBtn = form.querySelector('#reference-button');
  referenceBtn?.addEventListener('click', () => openReferenceModal(story.id));

  const acceptanceSection = document.createElement('section');
  const acceptanceHeading = document.createElement('div');
  acceptanceHeading.className = 'section-heading';
  const acceptanceTitle = document.createElement('h3');
  acceptanceTitle.textContent = 'Acceptance Tests';
  const addTestBtn = document.createElement('button');
  addTestBtn.type = 'button';
  addTestBtn.className = 'secondary';
  addTestBtn.id = 'add-test-btn';
  addTestBtn.textContent = 'Create Acceptance Test';
  acceptanceHeading.appendChild(acceptanceTitle);
  acceptanceHeading.appendChild(addTestBtn);
  acceptanceSection.appendChild(acceptanceHeading);

  const acceptanceList = document.createElement('div');
  acceptanceList.className = 'record-list';
  if (story.acceptanceTests && story.acceptanceTests.length) {
    story.acceptanceTests.forEach((test) => {
      const table = document.createElement('table');
      table.className = 'vertical-table';
      table.dataset.testId = test.id;
      const tbody = document.createElement('tbody');
      table.appendChild(tbody);

      const rows = [
        { label: 'Given', value: formatMultilineText(test.given) },
        { label: 'When', value: formatMultilineText(test.when) },
        { label: 'Then', value: formatMultilineText(test.then) },
      ];

      rows.forEach((row) => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row';
        th.textContent = row.label;
        const td = document.createElement('td');
        td.innerHTML = row.value;
        tr.appendChild(th);
        tr.appendChild(td);
        tbody.appendChild(tr);
      });

      const gwtRow = document.createElement('tr');
      const gwtTh = document.createElement('th');
      gwtTh.scope = 'row';
      gwtTh.textContent = 'Health (GWT)';
      const gwtTd = document.createElement('td');
      const gwtHealth = test.gwtHealth || { satisfied: true, issues: [] };
      const gwtPill = document.createElement('span');
      gwtPill.className = `health-pill ${gwtHealth.satisfied ? 'pass' : 'fail'}`;
      gwtPill.textContent = gwtHealth.satisfied ? 'Pass' : 'Needs review';
      gwtTd.appendChild(gwtPill);

      if (gwtHealth.issues && gwtHealth.issues.length) {
        const issueList = document.createElement('ul');
        issueList.className = 'health-issue-list';
        gwtHealth.issues.forEach((issue) => {
          const item = document.createElement('li');
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'link-button health-issue-button';
          const criterionLabel = formatCriterionLabel(issue.criterion);
          button.textContent = `${criterionLabel ? `${criterionLabel} – ` : ''}${issue.message}`;
          button.addEventListener('click', () =>
            openHealthIssueModal('Acceptance Test Issue', issue)
          );
          item.appendChild(button);
          issueList.appendChild(item);
        });
        gwtTd.appendChild(issueList);
      } else {
        const ok = document.createElement('p');
        ok.className = 'health-ok';
        ok.textContent = 'All Given/When/Then checks passed.';
        gwtTd.appendChild(ok);
      }

      gwtRow.appendChild(gwtTh);
      gwtRow.appendChild(gwtTd);
      tbody.appendChild(gwtRow);

      const statusRow = document.createElement('tr');
      const statusTh = document.createElement('th');
      statusTh.scope = 'row';
      statusTh.textContent = 'Status';
      const statusTd = document.createElement('td');
      statusTd.textContent = test.status;
      statusRow.appendChild(statusTh);
      statusRow.appendChild(statusTd);
      tbody.appendChild(statusRow);

      const actionsRow = document.createElement('tr');
      const actionsTh = document.createElement('th');
      actionsTh.scope = 'row';
      actionsTh.textContent = 'Actions';
      const actionsTd = document.createElement('td');
      actionsTd.className = 'actions';
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'danger';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', async () => {
        if (!window.confirm('Delete this acceptance test?')) return;
        try {
          await sendJson(`/api/tests/${test.id}`, { method: 'DELETE' });
          await loadStories();
          showToast('Acceptance test deleted', 'success');
        } catch (error) {
          showToast(error.message || 'Failed to delete acceptance test', 'error');
        }
      });
      actionsTd.appendChild(deleteButton);
      actionsRow.appendChild(actionsTh);
      actionsRow.appendChild(actionsTd);
      tbody.appendChild(actionsRow);

      acceptanceList.appendChild(table);
    });
  } else {
    acceptanceList.innerHTML = '<p class="empty-state">No acceptance tests yet.</p>';
  }

  acceptanceSection.appendChild(acceptanceList);
  detailsContent.appendChild(acceptanceSection);

  addTestBtn.addEventListener('click', () => openAcceptanceTestModal(story.id));

  const childrenSection = document.createElement('section');
  childrenSection.innerHTML = `
    <div class="section-heading">
      <h3>Child Stories</h3>
      <button type="button" class="secondary" id="add-child-btn">Create Child Story</button>
    </div>
  `;
  const childList = document.createElement('div');
  childList.className = 'record-list';
  if (story.children && story.children.length) {
    childList.innerHTML = story.children
      .map(
        (child) => `
          <table class="vertical-table" data-story-id="${child.id}">
            <tbody>
              <tr>
                <th scope="row">Title</th>
                <td>${escapeHtml(child.title)}</td>
              </tr>
              <tr>
                <th scope="row">Story Point</th>
                <td>${child.storyPoint != null ? child.storyPoint : '—'}</td>
              </tr>
              <tr>
                <th scope="row">Status</th>
                <td>${escapeHtml(child.status || 'Draft')}</td>
              </tr>
              <tr>
                <th scope="row">Actions</th>
                <td class="actions">
                  <button type="button" class="secondary" data-action="select-story" data-story-id="${child.id}">Select</button>
                  <button type="button" class="danger" data-action="delete-story" data-story-id="${child.id}">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        `
      )
      .join('');
  } else {
    childList.innerHTML = '<p class="empty-state">No child stories yet.</p>';
  }
  childrenSection.appendChild(childList);
  detailsContent.appendChild(childrenSection);

  childrenSection
    .querySelector('#add-child-btn')
    .addEventListener('click', () => openChildStoryModal(story.id));

  childList.querySelectorAll('[data-action="select-story"]').forEach((button) => {
    button.addEventListener('click', () => {
      const storyId = Number(button.getAttribute('data-story-id'));
      const target = storyIndex.get(storyId);
      if (target) {
        handleStorySelection(target);
      }
    });
  });

  childList.querySelectorAll('[data-action="delete-story"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const storyId = Number(button.getAttribute('data-story-id'));
      if (!Number.isFinite(storyId)) return;
      if (!window.confirm('Delete this story and all nested items?')) return;
      try {
        await sendJson(`/api/stories/${storyId}`, { method: 'DELETE' });
        if (state.selectedStoryId === storyId) {
          state.selectedStoryId = story.id;
        }
        await loadStories();
        showToast('Story deleted', 'success');
      } catch (error) {
        showToast(error.message || 'Failed to delete story', 'error');
      }
    });
  });
}

function toggleStoryExpansion(storyId) {
  if (state.expanded.has(storyId)) {
    state.expanded.delete(storyId);
  } else {
    state.expanded.add(storyId);
  }
  persistExpanded();
  renderOutline();
  renderMindmap();
}

function expandAncestors(storyId) {
  let current = parentById.get(storyId);
  while (current != null) {
    state.expanded.add(current);
    current = parentById.get(current);
  }
  persistExpanded();
}

function handleStorySelection(story) {
  state.selectedStoryId = story.id;
  expandAncestors(story.id);
  persistSelection();
  renderOutline();
  renderMindmap();
  renderDetails();
}

function setPanelVisibility(panel, visible) {
  state.panelVisibility[panel] = visible;
  persistPanels();
  renderAll();
}

function setAllExpanded(expand) {
  if (expand) {
    state.expanded = new Set(flattenStories(state.stories).map((story) => story.id));
  } else {
    state.expanded = new Set(state.stories.map((story) => story.id));
  }
  persistExpanded();
  renderOutline();
  renderMindmap();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMultilineText(value) {
  const lines = Array.isArray(value) ? value : [value ?? ''];
  const escaped = escapeHtml(lines.join('\n'));
  return escaped.replace(/\n/g, '<br />');
}

function formatCriterionLabel(value) {
  if (value == null) {
    return '';
  }
  const text = String(value);
  if (/[A-Z]/.test(text)) {
    return text;
  }
  if (!text.length) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function showToast(message, type = 'info') {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastEl.style.background =
    type === 'error' ? '#b91c1c' : type === 'success' ? '#16a34a' : '#0f172a';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

function closeModal() {
  modal.close();
}

function openModal({ title, content, actions, cancelLabel = 'Cancel' }) {
  modalTitle.textContent = title;
  modalBody.innerHTML = '';
  modalBody.appendChild(content);
  modalFooter.innerHTML = '';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = cancelLabel;
  cancelBtn.className = 'secondary';
  cancelBtn.addEventListener('click', closeModal);
  modalFooter.appendChild(cancelBtn);

  if (actions && actions.length > 0) {
    actions.forEach((action) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      if (action.variant) {
        button.classList.add(action.variant);
      }
      button.addEventListener('click', async () => {
        const result = await action.onClick();
        if (result !== false) {
          closeModal();
        }
      });
      modalFooter.appendChild(button);
    });
  }

  modal.showModal();
}

function openHealthIssueModal(title, issue) {
  const container = document.createElement('div');
  container.className = 'health-modal';

  const message = document.createElement('p');
  message.innerHTML = `<strong>Issue:</strong> ${escapeHtml(issue.message || '')}`;
  container.appendChild(message);

  if (issue.details) {
    const details = document.createElement('p');
    details.innerHTML = `<strong>Why it matters:</strong> ${escapeHtml(issue.details)}`;
    container.appendChild(details);
  }

  const suggestionHeading = document.createElement('h4');
  suggestionHeading.textContent = 'Suggested Update';
  container.appendChild(suggestionHeading);

  const suggestionBody = document.createElement('p');
  suggestionBody.textContent = issue.suggestion || 'Refine the content to satisfy this criterion.';
  container.appendChild(suggestionBody);

  openModal({ title, content: container, cancelLabel: 'Close' });
}

function openChildStoryModal(parentId) {
  const container = document.createElement('div');
  container.innerHTML = `
    <label>Title<input id="child-title" /></label>
    <label>Story Point<input id="child-point" type="number" min="0" step="1" placeholder="Estimate" /></label>
    <label>Assignee Email<input id="child-assignee" type="email" placeholder="name@example.com" /></label>
    <label>Description<textarea id="child-description"></textarea></label>
    <table class="story-brief">
      <tbody>
        <tr>
          <th scope="row">As a</th>
          <td><textarea id="child-asa"></textarea></td>
        </tr>
        <tr>
          <th scope="row">I want</th>
          <td><textarea id="child-iwant"></textarea></td>
        </tr>
        <tr>
          <th scope="row">So that</th>
          <td><textarea id="child-sothat"></textarea></td>
        </tr>
      </tbody>
    </table>
  `;

  openModal({
    title: 'Create Child Story',
    content: container,
    actions: [
      {
        label: 'Create Story',
        onClick: async () => {
          const title = container.querySelector('#child-title').value.trim();
          if (!title) {
            showToast('Title is required', 'error');
            return false;
          }
          const storyPointResult = parseStoryPointInput(
            container.querySelector('#child-point').value
          );
          if (storyPointResult.error) {
            showToast(storyPointResult.error, 'error');
            return false;
          }
          const payload = {
            title,
            parentId,
            storyPoint: storyPointResult.value,
            assigneeEmail: container.querySelector('#child-assignee').value.trim(),
            description: container.querySelector('#child-description').value.trim(),
            asA: container.querySelector('#child-asa').value.trim(),
            iWant: container.querySelector('#child-iwant').value.trim(),
            soThat: container.querySelector('#child-sothat').value.trim(),
          };
          try {
            const created = await createStory(payload);
            if (created === null) {
              return false;
            }
            await loadStories();
            showToast('Child story created', 'success');
          } catch (error) {
            showToast(error.message || 'Failed to create story', 'error');
            return false;
          }
        },
      },
    ],
  });
}

function openAcceptanceTestModal(storyId) {
  const container = document.createElement('div');
  container.innerHTML = `
    <label>Given<textarea id="test-given" placeholder="One step per line"></textarea></label>
    <label>When<textarea id="test-when" placeholder="One step per line"></textarea></label>
    <label>Then<textarea id="test-then" placeholder="One measurable step per line"></textarea></label>
    <label>Status
      <select id="test-status">
        <option value="Draft">Draft</option>
        <option value="Ready">Ready</option>
        <option value="Pass">Pass</option>
        <option value="Fail">Fail</option>
        <option value="Blocked">Blocked</option>
      </select>
    </label>
  `;

  openModal({
    title: 'Create Acceptance Test',
    content: container,
    actions: [
      {
        label: 'Create Test',
        onClick: async () => {
          const given = splitLines(container.querySelector('#test-given').value);
          const when = splitLines(container.querySelector('#test-when').value);
          const then = splitLines(container.querySelector('#test-then').value);
          const status = container.querySelector('#test-status').value;
          if (!given.length || !when.length || !then.length) {
            showToast('Please provide Given, When, and Then steps.', 'error');
            return false;
          }
          try {
            const created = await createAcceptanceTest(storyId, { given, when, then, status });
            if (created === null) {
              return false;
            }
            await loadStories();
            showToast('Acceptance test created', 'success');
          } catch (error) {
            showToast(error.message || 'Failed to create acceptance test', 'error');
            return false;
          }
        },
      },
    ],
  });
}

function openReferenceModal(storyId) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '1rem';

  const listEl = document.createElement('div');
  container.appendChild(listEl);

  const form = document.createElement('form');
  form.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:0.75rem;">
      <label>Name<input id="doc-name" placeholder="Security checklist" /></label>
      <label>URL<input id="doc-url" type="url" placeholder="https://example.com/doc or uploaded link" /></label>
      <label class="file-picker">Upload File<input id="doc-file" type="file" /></label>
      <p class="form-hint">Selecting a file uploads it immediately and fills the URL field.</p>
      <button type="submit">Add Document</button>
    </div>
  `;
  container.appendChild(form);

  async function refreshModalContent() {
    await loadStories();
    const updatedStory = storyIndex.get(storyId);
    if (!updatedStory) return;
    renderReferenceList(updatedStory);
  }

  function renderReferenceList(story) {
    if (!story.referenceDocuments || story.referenceDocuments.length === 0) {
      listEl.innerHTML = '<p>No reference documents yet.</p>';
      return;
    }
    const table = document.createElement('table');
    table.className = 'table-list';
    table.innerHTML = `
      <thead>
        <tr><th>Name</th><th>URL</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${story.referenceDocuments
          .map(
            (doc) => `
              <tr>
                <td>${escapeHtml(doc.name)}</td>
                <td><a class="reference-link" href="${escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer">Open</a></td>
                <td class="actions">
                  <button type="button" class="danger" data-doc-id="${doc.id}">Delete</button>
                </td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    `;
    listEl.innerHTML = '';
    listEl.appendChild(table);
    table.querySelectorAll('.reference-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const href = link.getAttribute('href');
        if (href) {
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      });
    });
    table.querySelectorAll('button[data-doc-id]').forEach((button) => {
      button.addEventListener('click', async () => {
        const docId = Number(button.getAttribute('data-doc-id'));
        if (!window.confirm('Delete this reference document?')) return;
        try {
          await sendJson(`/api/reference-documents/${docId}`, { method: 'DELETE' });
          await refreshModalContent();
          showToast('Reference document removed', 'success');
        } catch (error) {
          showToast(error.message || 'Failed to delete reference document', 'error');
        }
      });
    });
  }

  const nameInput = form.querySelector('#doc-name');
  const urlInput = form.querySelector('#doc-url');
  const fileInput = form.querySelector('#doc-file');
  let uploading = false;
  let uploadedUrl = null;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    uploading = true;
    try {
      showToast('Uploading document…');
      const result = await uploadReferenceFile(file);
      uploadedUrl = result.url;
      urlInput.value = result.url;
      if (!nameInput.value) {
        nameInput.value = result.originalName || file.name;
      }
      showToast('File uploaded. Click "Add Document" to save it.', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to upload file', 'error');
      fileInput.value = '';
    } finally {
      uploading = false;
    }
  });

  form.addEventListener(
    'submit',
    async (event) => {
      event.preventDefault();
      if (uploading) {
        showToast('Please wait for the upload to finish.', 'error');
        return;
      }
      const name = nameInput.value.trim();
      let url = urlInput.value.trim();
      if (!name) {
        showToast('Name is required.', 'error');
        return;
      }
      if (!url) {
        url = uploadedUrl || '';
      }
      if (!url) {
        showToast('Provide a URL or upload a file.', 'error');
        return;
      }
      try {
        await sendJson(`/api/stories/${storyId}/reference-documents`, {
          method: 'POST',
          body: { name, url },
        });
        form.reset();
        uploadedUrl = null;
        await refreshModalContent();
        showToast('Reference document added', 'success');
      } catch (error) {
        showToast(error.message || 'Failed to add reference document', 'error');
      }
    },
    { capture: false }
  );

  const story = storyIndex.get(storyId);
  if (story) {
    renderReferenceList(story);
  }

  openModal({ title: 'Reference Document List', content: container });
}

async function createStory(payload) {
  try {
    return await sendJson('/api/stories', { method: 'POST', body: payload });
  } catch (error) {
    if (error && error.code === 'INVEST_WARNINGS') {
      const proceed = window.confirm(
        `${error.message}\n\n${formatInvestWarnings(error.warnings)}\n\nCreate anyway?`
      );
      if (proceed) {
        return await sendJson('/api/stories', {
          method: 'POST',
          body: { ...payload, acceptWarnings: true },
        });
      }
      return null;
    }
    throw error;
  }
}

async function updateStory(storyId, payload) {
  try {
    return await sendJson(`/api/stories/${storyId}`, { method: 'PATCH', body: payload });
  } catch (error) {
    if (error && error.code === 'INVEST_WARNINGS') {
      throw error;
    }
    throw error;
  }
}

async function createAcceptanceTest(storyId, payload) {
  try {
    return await sendJson(`/api/stories/${storyId}/tests`, {
      method: 'POST',
      body: payload,
    });
  } catch (error) {
    if (error && error.code === 'MEASURABILITY_WARNINGS') {
      const proceed = window.confirm(
        `${error.message}\n\n${formatMeasurabilityWarnings(error.warnings, error.suggestions)}\n\nCreate anyway?`
      );
      if (proceed) {
        return await sendJson(`/api/stories/${storyId}/tests`, {
          method: 'POST',
          body: { ...payload, acceptWarnings: true },
        });
      }
      return null;
    }
    throw error;
  }
}

async function uploadReferenceFile(file) {
  const params = new URLSearchParams({ filename: file.name || 'document' });
  const response = await fetch(`/api/uploads?${params}`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });
  if (!response.ok) {
    let message = 'Failed to upload file';
    try {
      const body = await response.json();
      if (body && body.message) {
        message = body.message;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }
  return await response.json();
}

function formatInvestWarnings(warnings) {
  return warnings
    .map((warning) => {
      const suggestion = warning.suggestion ? `\n   - Suggestion: ${warning.suggestion}` : '';
      return `• ${warning.message}${suggestion}`;
    })
    .join('\n');
}

function formatMeasurabilityWarnings(warnings, suggestions) {
  const items = warnings.map((warning) => {
    const tip = warning.suggestion ? `\n   - Suggestion: ${warning.suggestion}` : '';
    return `• ${warning.message}${tip}`;
  });
  if (items.length === 0 && suggestions && suggestions.length) {
    suggestions.forEach((suggestion) => items.push(`• ${suggestion}`));
  }
  return items.join('\n');
}

async function sendJson(url, options = {}) {
  const { method = 'GET', body } = options;
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const error = data && typeof data === 'object' ? data : { message: data || response.statusText };
    error.status = response.status;
    throw error;
  }
  return data;
}

function splitLines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function initialize() {
  loadPreferences();
  updateWorkspaceColumns();
  renderOutline();
  renderMindmap();
  renderDetails();

  refreshBtn.addEventListener('click', () => loadStories());
  expandAllBtn.addEventListener('click', () => setAllExpanded(true));
  collapseAllBtn.addEventListener('click', () => setAllExpanded(false));

  toggleOutline.addEventListener('change', (event) => setPanelVisibility('outline', event.target.checked));
  toggleMindmap.addEventListener('change', (event) => setPanelVisibility('mindmap', event.target.checked));
  toggleDetails.addEventListener('change', (event) => setPanelVisibility('details', event.target.checked));

  autoLayoutToggle.addEventListener('click', () => {
    state.autoLayout = !state.autoLayout;
    if (state.autoLayout) {
      state.manualPositions = {};
    }
    persistLayout();
    renderMindmap();
  });

  modalCloseBtn.addEventListener('click', closeModal);
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeModal();
  });

  loadStories();
}

initialize();
