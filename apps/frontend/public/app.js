// Cache refresh: 1734828699
// Simplified architecture - removed Worker, using API server internal queue only

function getApiBaseUrl() {
  if (!window.CONFIG?.API_BASE_URL) {
    console.error('❌ FATAL: window.CONFIG.API_BASE_URL is required');
    throw new Error('API_BASE_URL not configured');
  }
  const baseUrl = window.CONFIG.API_BASE_URL.replace(/\/$/, '');
  console.log('getApiBaseUrl - returning:', baseUrl);
  return baseUrl;
}

const DEFAULT_REPO_API_URL = 'https://api.github.com';

function resolveApiUrl(path) {
  const API_BASE_URL = getApiBaseUrl();
  
  if (!path) {
    return API_BASE_URL;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  // Simply concatenate base URL with the path
  return `${API_BASE_URL}${normalizedPath}`;
}

const outlineTreeEl = document.getElementById('outline-tree');
const mindmapCanvas = document.getElementById('mindmap-canvas');
const detailsPanel = document.getElementById('details-panel');
const detailsContent = document.getElementById('details-content');
const detailsPlaceholder = document.getElementById('details-placeholder');
const expandAllBtn = document.getElementById('expand-all');
const collapseAllBtn = document.getElementById('collapse-all');

const openKiroTerminalBtn = document.getElementById('open-kiro-terminal-btn');
const generateDocBtn = document.getElementById('generate-doc-btn');
const openHeatmapBtn = document.getElementById('open-heatmap-btn');
const referenceBtn = document.getElementById('reference-btn');
const dependencyToggleBtn = document.getElementById('dependency-toggle-btn');
const autoLayoutToggle = document.getElementById('auto-layout-toggle');
const layoutStatus = document.getElementById('layout-status');
const workspaceEl = document.getElementById('workspace');
const toggleOutline = document.getElementById('toggle-outline');
const toggleMindmap = document.getElementById('toggle-mindmap');
const toggleDetails = document.getElementById('toggle-details');
const mindmapPanel = document.getElementById('mindmap-panel');
const mindmapWrapper = document.querySelector('.mindmap-wrapper');
const mindmapZoomOutBtn = document.getElementById('mindmap-zoom-out');
const mindmapZoomInBtn = document.getElementById('mindmap-zoom-in');
const mindmapZoomDisplay = document.getElementById('mindmap-zoom-display');
const outlinePanel = document.getElementById('outline-panel');
const hideCompletedBtn = document.getElementById('hide-completed-btn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalFooter = document.getElementById('modal-footer');
const modalCloseBtn = document.getElementById('modal-close');
const toastEl = document.getElementById('toast');
const runtimeDataLink = document.getElementById('runtime-data-link');

const STORAGE_KEYS = {
  expanded: 'aiPm.expanded',
  selection: 'aiPm.selection',
  layout: 'aiPm.layout',
  mindmap: 'aiPm.mindmap',
  panels: 'aiPm.panels',
  codewhispererDelegations: 'aiPm.codewhispererDelegations',
  version: 'aiPm.version',
  stories: 'aiPm.stories',
  lastBackup: 'aiPm.lastBackup',
  hideCompleted: 'aiPm.hideCompleted',
};

const AIPM_VERSION = '1.0.0'; // Update this when making breaking changes

const NODE_WIDTH = 240;
const NODE_MIN_HEIGHT = 120;
const NODE_MAX_HEIGHT = 520;
const NODE_VERTICAL_GAP = 32;
const MINDMAP_ZOOM_MIN = 0.5;
const MINDMAP_ZOOM_MAX = 2;
const MINDMAP_ZOOM_STEP = 0.1;
const MINDMAP_PAN_THRESHOLD = 5;
const HORIZONTAL_STEP = 240;
const AUTO_LAYOUT_HORIZONTAL_GAP = 80;
const X_OFFSET = 80;
const Y_OFFSET = 80;
const MINDMAP_STAGE_MIN_WIDTH = 1600;
const MINDMAP_STAGE_MIN_HEIGHT = 1200;
const MINDMAP_STAGE_PADDING_X = 480;
const MINDMAP_STAGE_PADDING_Y = 360;
const HTML_NS = 'http://www.w3.org/1999/xhtml';
const CODEWHISPERER_AUTHOR_PATTERN = /codewhisperer|amazon.*ai/i;

const mindmapMeasureRoot = document.createElement('div');
mindmapMeasureRoot.className = 'mindmap-measure-root';
mindmapMeasureRoot.setAttribute('aria-hidden', 'true');
(document.body || document.documentElement).appendChild(mindmapMeasureRoot);

const STORY_STATUS_GUIDE = [
  {
    value: 'Draft',
    description: 'Story is being authored or refined; requirements may still change.',
  },
  {
    value: 'Ready',
    description: 'Story meets INVEST and has verifiable acceptance tests, making it ready for planning.',
  },
  {
    value: 'In Progress',
    description: 'Story is actively being implemented; tasks are underway with ongoing validation.',
  },
  {
    value: 'Blocked',
    description: 'Story progress is impeded by external dependencies or unresolved issues.',
  },
  {
    value: 'Approved',
    description: 'Story has been reviewed and accepted; teams can proceed to execution.',
  },
  {
    value: 'Done',
    description: 'Story delivered; all child stories are Done and acceptance tests have passed.',
  },
];

const COMPONENT_OPTIONS = [
  'WorkModel',
  'Document_Intelligence',
  'Review_Governance',
  'Orchestration_Engagement',
  'Run_Verify',
  'Traceabilty_Insight',
];

const UNSPECIFIED_COMPONENT = 'Unspecified';

const TASK_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Blocked', 'Done'];

const STATUS_CLASS_MAP = {
  Draft: 'status-draft',
  Ready: 'status-ready',
  'In Progress': 'status-in-progress',
  Blocked: 'status-blocked',
  Approved: 'status-approved',
  Done: 'status-done',
};

const EPIC_STORY_POINT_THRESHOLD = 20;
const SMALL_STORY_POINT_WARNING_MESSAGE = 'Story point suggests the slice may be too large.';
const EPIC_CLASSIFICATION = {
  key: 'epic',
  label: 'EPIC',
  color: '#92400e',
  textColor: '#ffffff',
};

let modalTeardown = null;

const HEATMAP_ACTIVITIES = [
  { key: 'design', label: 'Design' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'implementation', label: 'Implementation' },
  { key: 'test_automation', label: 'Test Automation' },
  { key: 'verification', label: 'Verification' },
];

const HEATMAP_ACTIVITY_KEYWORDS = [
  { key: 'design', patterns: [/design/i, /discovery/i, /prototype/i, /architecture/i] },
  { key: 'documentation', patterns: [/document/i, /spec/i, /manual/i, /guide/i, /writeup/i] },
  {
    key: 'implementation',
    patterns: [/build/i, /implement/i, /develop/i, /code/i, /integrat/i, /refactor/i],
  },
  {
    key: 'test_automation',
    patterns: [/automate/i, /automation/i, /pipeline/i, /script/i, /ci\/?cd/i, /regression/i],
  },
  {
    key: 'verification',
    patterns: [/verify/i, /verification/i, /review/i, /audit/i, /approve/i, /validate/i],
  },
];

const HEATMAP_COMPONENTS = [
  { key: 'system_srs', label: 'System (S/S)' },
  { key: 'WorkModel', label: 'WorkModel (WM)' },
  { key: 'Document_Intelligence', label: 'DocumentIntelligence (DI)' },
  { key: 'Review_Governance', label: 'Review & Governance (RG)' },
  { key: 'Orchestration_Engagement', label: 'Orchestration & Engagement (OE)' },
  { key: 'Run_Verify', label: 'Run & Verify (RV)' },
  { key: 'Traceabilty_Insight', label: 'Traceability & Insight (TI)' },
];

const HEATMAP_COMPONENT_LOOKUP = new Map(
  HEATMAP_COMPONENTS.map((entry) => [entry.key.toLowerCase(), entry.key])
);

HEATMAP_COMPONENTS.forEach((entry) => {
  if (!HEATMAP_COMPONENT_LOOKUP.has(entry.key.toLowerCase())) {
    HEATMAP_COMPONENT_LOOKUP.set(entry.key.toLowerCase(), entry.key);
  }
});

const COMPONENT_SYNONYMS = new Map(
  [
    ['system', 'system_srs'],
    ['system (srs)', 'system_srs'],
    ['srs', 'system_srs'],
    ['unspecified', 'system_srs'],
    ['work model', 'WorkModel'],
    ['work_model', 'WorkModel'],
    ['workmodel', 'WorkModel'],
    ['document intelligence', 'Document_Intelligence'],
    ['document-intelligence', 'Document_Intelligence'],
    ['documentintelligence', 'Document_Intelligence'],
    ['review governance', 'Review_Governance'],
    ['review & governance', 'Review_Governance'],
    ['review-governance', 'Review_Governance'],
    ['orchestration engagement', 'Orchestration_Engagement'],
    ['orchestration & engagement', 'Orchestration_Engagement'],
    ['run verify', 'Run_Verify'],
    ['run & verify', 'Run_Verify'],
    ['traceability_insight', 'Traceabilty_Insight'],
    ['traceability insight', 'Traceabilty_Insight'],
    ['traceability & insight', 'Traceabilty_Insight'],
    ['traceability and insight', 'Traceabilty_Insight'],
    ['traceabilty_insight', 'Traceabilty_Insight'],
  ].map(([key, value]) => [key.toLowerCase(), value])
);

const COMPONENT_LOOKUP = new Map();
COMPONENT_OPTIONS.forEach((component) => {
  COMPONENT_LOOKUP.set(component.toLowerCase(), component);
});
for (const [alias, canonical] of COMPONENT_SYNONYMS.entries()) {
  if (!COMPONENT_LOOKUP.has(alias)) {
    COMPONENT_LOOKUP.set(alias, canonical);
  }
}

function getVisibleMindmapStories(stories) {
  const filterDoneStories = (entries) => {
    return entries
      .filter((story) => story && (!state.hideCompleted || story.status !== 'Done'))
      .map((story) => ({
        ...story,
        children: story.children ? filterDoneStories(story.children) : [],
      }));
  };

  return filterDoneStories(Array.isArray(stories) ? stories : []);
}

function seedManualPositionsFromAutoLayout() {
  const visibleStories = getVisibleMindmapStories(state.stories);
  if (visibleStories.length === 0) {
    state.manualPositions = {};
    return false;
  }

  const metrics = collectMindmapNodeMetrics(visibleStories);
  const layout = computeLayout(visibleStories, 0, Y_OFFSET, AUTO_LAYOUT_HORIZONTAL_GAP, metrics);
  const nextPositions = {};
  layout.nodes.forEach((node) => {
    nextPositions[node.id] = { x: node.x, y: node.y };
  });

  state.manualPositions = nextPositions;
  return Object.keys(nextPositions).length > 0;
}

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

function parseEstimationHoursInput(raw) {
  if (raw == null) {
    return { value: null, error: null };
  }
  const trimmed = String(raw).trim();
  if (trimmed === '') {
    return { value: null, error: null };
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return { value: null, error: 'Estimation hours must be a number.' };
  }
  if (numeric < 0) {
    return { value: null, error: 'Estimation hours cannot be negative.' };
  }
  const rounded = Math.round(numeric * 100) / 100;
  return { value: rounded, error: null };
}

function normalizeTaskRecord(task) {
  if (!task || typeof task !== 'object') {
    return null;
  }
  const normalized = { ...task };
  const sources = [task.estimationHours, task.estimation_hours, task.estimation];
  for (const source of sources) {
    if (source != null && source !== '') {
      const numeric = Number(source);
      if (Number.isFinite(numeric) && numeric >= 0) {
        normalized.estimationHours = numeric;
        break;
      }
    }
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'estimationHours')) {
    normalized.estimationHours = null;
  }
  return normalized;
}

function normalizeStoryTree(story) {
  if (!story || typeof story !== 'object') {
    return null;
  }
  const normalized = { ...story };
  if (normalized.storyPoint == null && story.story_point != null) {
    normalized.storyPoint = story.story_point;
  }
  if (Array.isArray(story.tasks)) {
    normalized.tasks = story.tasks
      .map((task) => normalizeTaskRecord(task))
      .filter((task) => task != null);
  } else {
    normalized.tasks = [];
  }
  if (Array.isArray(story.children)) {
    normalized.children = story.children
      .map((child) => normalizeStoryTree(child))
      .filter((child) => child != null);
  } else {
    normalized.children = [];
  }
  return normalized;
}

function normalizeStoryCollection(stories) {
  if (!Array.isArray(stories)) {
    return [];
  }
  return stories
    .map((story) => normalizeStoryTree(story))
    .filter((story) => story != null);
}

const state = {
  stories: [],
  expanded: new Set(),
  selectedStoryId: null,
  manualPositions: {},
  autoLayout: true,
  showDependencies: false,
  hideCompleted: false,
  mindmapZoom: 1,
  panelVisibility: {
    outline: true,
    mindmap: true,
    details: true,
  },
  codewhispererDelegations: new Map(),
};

const storyIndex = new Map();
const parentById = new Map();
let toastTimeout = null;
let mindmapBounds = { width: 0, height: 0, fitWidth: 0, fitHeight: 0 };
let mindmapHasCentered = false;
const mindmapPanState = {
  pointerId: null,
  startX: 0,
  startY: 0,
  scrollLeft: 0,
  scrollTop: 0,
  dragging: false,
};

function updateMindmapZoomControls() {
  if (mindmapZoomDisplay) {
    mindmapZoomDisplay.textContent = `${Math.round(state.mindmapZoom * 100)}%`;
  }
  if (mindmapZoomInBtn) {
    mindmapZoomInBtn.disabled = state.mindmapZoom >= MINDMAP_ZOOM_MAX - 0.0001;
  }
  if (mindmapZoomOutBtn) {
    mindmapZoomOutBtn.disabled = state.mindmapZoom <= MINDMAP_ZOOM_MIN + 0.0001;
  }
}

function applyMindmapZoom() {
  if (!mindmapCanvas) {
    return;
  }
  const baseWidth = mindmapBounds.width;
  const baseHeight = mindmapBounds.height;
  if (baseWidth > 0 && baseHeight > 0) {
    const fitWidth = mindmapBounds.fitWidth > 0 ? mindmapBounds.fitWidth : baseWidth;
    const fitHeight = mindmapBounds.fitHeight > 0 ? mindmapBounds.fitHeight : baseHeight;
    const scaledWidth = fitWidth * state.mindmapZoom;
    const scaledHeight = fitHeight * state.mindmapZoom;
    mindmapCanvas.style.width = `${scaledWidth}px`;
    mindmapCanvas.style.height = `${scaledHeight}px`;
  } else {
    mindmapCanvas.style.removeProperty('width');
    mindmapCanvas.style.removeProperty('height');
  }
}

function clampMindmapZoom(value) {
  if (Number.isNaN(value)) {
    return state.mindmapZoom;
  }
  return Math.min(MINDMAP_ZOOM_MAX, Math.max(MINDMAP_ZOOM_MIN, value));
}

function setMindmapZoom(nextZoom) {
  const clamped = clampMindmapZoom(nextZoom);
  if (Math.abs(clamped - state.mindmapZoom) < 0.0001) {
    updateMindmapZoomControls();
    return;
  }
  state.mindmapZoom = clamped;
  updateMindmapZoomControls();
  applyMindmapZoom();
}

function setMindmapPanningActive(active) {
  if (mindmapWrapper) {
    mindmapWrapper.classList.toggle('is-panning', !!active);
  }
  const root = document.body || document.documentElement;
  if (root) {
    if (active) {
      root.classList.add('is-mindmap-panning');
    } else {
      root.classList.remove('is-mindmap-panning');
    }
  }
}

function resetMindmapPanState() {
  mindmapPanState.pointerId = null;
  mindmapPanState.startX = 0;
  mindmapPanState.startY = 0;
  mindmapPanState.scrollLeft = 0;
  mindmapPanState.scrollTop = 0;
  mindmapPanState.dragging = false;
}

function suppressMindmapClick() {
  if (!mindmapWrapper) {
    return;
  }
  const handleClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    mindmapWrapper.removeEventListener('click', handleClick, true);
  };
  mindmapWrapper.addEventListener('click', handleClick, true);
}

function handleMindmapPointerDown(event) {
  if (!mindmapWrapper || mindmapPanState.pointerId !== null) {
    return;
  }
  if (event.button !== 0 && event.pointerType !== 'touch') {
    return;
  }
  const target = event.target;
  if (target) {
    const tagName = target.tagName;
    if (
      tagName === 'INPUT' ||
      tagName === 'BUTTON' ||
      tagName === 'A' ||
      tagName === 'SELECT' ||
      tagName === 'TEXTAREA'
    ) {
      return;
    }
    if (typeof target.closest === 'function' && target.closest('[data-prevent-mindmap-pan="true"]')) {
      return;
    }
  }
  mindmapPanState.pointerId = event.pointerId;
  mindmapPanState.startX = event.clientX;
  mindmapPanState.startY = event.clientY;
  mindmapPanState.scrollLeft = mindmapWrapper.scrollLeft;
  mindmapPanState.scrollTop = mindmapWrapper.scrollTop;
  mindmapPanState.dragging = false;
  mindmapWrapper.setPointerCapture?.(event.pointerId);
}

function handleMindmapPointerMove(event) {
  if (!mindmapWrapper || mindmapPanState.pointerId !== event.pointerId) {
    return;
  }
  const deltaX = event.clientX - mindmapPanState.startX;
  const deltaY = event.clientY - mindmapPanState.startY;
  if (!mindmapPanState.dragging) {
    if (
      Math.abs(deltaX) > MINDMAP_PAN_THRESHOLD ||
      Math.abs(deltaY) > MINDMAP_PAN_THRESHOLD
    ) {
      mindmapPanState.dragging = true;
      setMindmapPanningActive(true);
    } else {
      return;
    }
  }
  mindmapWrapper.scrollLeft = mindmapPanState.scrollLeft - deltaX;
  mindmapWrapper.scrollTop = mindmapPanState.scrollTop - deltaY;
  event.preventDefault();
}

function handleMindmapPointerEnd(event) {
  if (!mindmapWrapper || mindmapPanState.pointerId !== event.pointerId) {
    return;
  }
  const wasDragging = mindmapPanState.dragging;
  if (mindmapPanState.pointerId != null) {
    if (mindmapWrapper.hasPointerCapture?.(mindmapPanState.pointerId)) {
      mindmapWrapper.releasePointerCapture?.(mindmapPanState.pointerId);
    }
  }
  setMindmapPanningActive(false);
  resetMindmapPanState();
  if (wasDragging) {
    event.preventDefault();
    suppressMindmapClick();
  }
}

function syncDependencyOverlayControls() {
  const pressed = state.showDependencies;
  if (dependencyToggleBtn) {
    dependencyToggleBtn.classList.toggle('is-active', pressed);
    dependencyToggleBtn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    dependencyToggleBtn.setAttribute(
      'title',
      pressed ? 'Hide dependency connections on the mindmap' : 'Show dependency connections on the mindmap'
    );
  }
  document.querySelectorAll('[data-role="dependency-overlay-toggle"]').forEach((button) => {
    button.classList.toggle('is-active', pressed);
    button.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    const label = pressed ? 'Hide Mindmap Overlay' : 'Show Mindmap Overlay';
    if (button.textContent !== label) {
      button.textContent = label;
    }
    button.setAttribute('title', label);
  });
}

function syncHideCompletedControls() {
  if (hideCompletedBtn) {
    hideCompletedBtn.classList.toggle('is-active', state.hideCompleted);
    hideCompletedBtn.setAttribute('aria-pressed', state.hideCompleted ? 'true' : 'false');
    hideCompletedBtn.setAttribute(
      'title',
      state.hideCompleted ? 'Show completed stories' : 'Hide completed stories'
    );
  }
}

function setDependencyOverlayVisible(visible) {
  const next = Boolean(visible);
  if (state.showDependencies === next) {
    syncDependencyOverlayControls();
    return;
  }
  state.showDependencies = next;
  syncDependencyOverlayControls();
  renderMindmap();
}

function toggleDependencyOverlay() {
  setDependencyOverlayVisible(!state.showDependencies);
}

if (referenceBtn) {
  referenceBtn.addEventListener('click', () => {
    if (state.selectedStoryId == null) {
      showToast('Select a user story to manage reference documents.', 'warning');
      return;
    }
    openReferenceModal(state.selectedStoryId);
  });
}

if (dependencyToggleBtn) {
  dependencyToggleBtn.addEventListener('click', () => {
    toggleDependencyOverlay();
  });
}

if (hideCompletedBtn) {
  hideCompletedBtn.addEventListener('click', () => {
    state.hideCompleted = !state.hideCompleted;
    syncHideCompletedControls();
    persistHideCompleted();
    renderOutline();
    renderMindmap();
  });
}

if (mindmapZoomInBtn) {
  mindmapZoomInBtn.addEventListener('click', () => {
    setMindmapZoom(state.mindmapZoom + MINDMAP_ZOOM_STEP);
  });
}

if (mindmapZoomOutBtn) {
  mindmapZoomOutBtn.addEventListener('click', () => {
    setMindmapZoom(state.mindmapZoom - MINDMAP_ZOOM_STEP);
  });
}

if (mindmapWrapper) {
  mindmapWrapper.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      setMindmapZoom(state.mindmapZoom + direction * MINDMAP_ZOOM_STEP);
    },
    { passive: false }
  );
  mindmapWrapper.addEventListener('pointerdown', handleMindmapPointerDown);
  mindmapWrapper.addEventListener('pointermove', handleMindmapPointerMove, { passive: false });
  mindmapWrapper.addEventListener('pointerup', handleMindmapPointerEnd);
  mindmapWrapper.addEventListener('pointercancel', handleMindmapPointerEnd);
  mindmapWrapper.addEventListener('lostpointercapture', handleMindmapPointerEnd);
}

updateMindmapZoomControls();

function getStatusClass(status) {
  const normalized = typeof status === 'string' ? status.trim() : '';
  return STATUS_CLASS_MAP[normalized] || STATUS_CLASS_MAP.Draft;
}

function getNumericStoryPoint(story) {
  const raw = story?.storyPoint;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : Number.NaN;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return Number.NaN;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

function isEpicStory(story) {
  const numericPoint = getNumericStoryPoint(story);
  const hasHierarchy = Array.isArray(story?.children) && story.children.length > 0;
  const isRoot = story?.parentId == null;
  if (isRoot && hasHierarchy) {
    return true;
  }
  return Number.isFinite(numericPoint) && numericPoint > EPIC_STORY_POINT_THRESHOLD;
}

function getEpicClassification(story) {
  if (!isEpicStory(story)) {
    return null;
  }
  const numericPoint = getNumericStoryPoint(story);
  return {
    ...EPIC_CLASSIFICATION,
    points: Number.isFinite(numericPoint) ? numericPoint : null,
  };
}

function formatStoryPointSummary(value) {
  if (!Number.isFinite(value)) {
    return '';
  }
  return `${value} pt${value === 1 ? '' : 's'}`;
}

function formatEstimationHours(value) {
  if (value == null || value === '') {
    return '—';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '—';
  }
  const display = Number.isInteger(numeric) ? numeric.toString() : numeric.toFixed(1);
  return `${display} h`;
}

function filterEpicSizingWarnings(story, issues) {
  const list = Array.isArray(issues) ? issues : [];
  if (!isEpicStory(story)) {
    return list.slice();
  }
  return list.filter((issue) => {
    if (!issue || issue.source !== 'heuristic') {
      return true;
    }
    const message = typeof issue.message === 'string' ? issue.message.trim() : '';
    if (message !== SMALL_STORY_POINT_WARNING_MESSAGE) {
      return true;
    }
    const criterion = typeof issue.criterion === 'string' ? issue.criterion.trim().toLowerCase() : '';
    return criterion !== 'small';
  });
}

function normalizeDependencyRelationship(value) {
  if (typeof value !== 'string') {
    return 'depends';
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length ? normalized : 'depends';
}

function normalizeDependencyEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries
    .filter((entry) => entry && entry.storyId != null)
    .map((entry) => ({
      ...entry,
      storyId: Number(entry.storyId),
      title: entry.title || '',
      status: entry.status || 'Draft',
      relationship: normalizeDependencyRelationship(entry.relationship),
    }));
}

function toSentenceCase(value) {
  if (!value) {
    return '';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function describeDependencyRelationship(entry, context) {
  const relationship = normalizeDependencyRelationship(entry.relationship);
  if (context === 'blocked-by') {
    return 'Blocking this story';
  }
  if (context === 'downstream') {
    if (relationship === 'blocks') {
      return 'Blocked by this story';
    }
    if (relationship === 'depends') {
      return 'Depends on this story';
    }
    return toSentenceCase(relationship);
  }
  if (context === 'upstream') {
    if (relationship === 'blocks') {
      return 'Blocking this story';
    }
    if (relationship === 'depends') {
      return 'Required dependency';
    }
    return toSentenceCase(relationship);
  }
  return toSentenceCase(relationship);
}

function createTableRow(label, value) {
  const row = document.createElement('tr');
  const th = document.createElement('th');
  th.scope = 'row';
  th.textContent = label;
  const td = document.createElement('td');
  if (value instanceof Node) {
    td.appendChild(value);
  } else {
    td.textContent = value;
  }
  row.appendChild(th);
  row.appendChild(td);
  return row;
}

function createDependencyTable(entry, context) {
  const relationship = normalizeDependencyRelationship(entry.relationship);
  const table = document.createElement('table');
  table.className = 'vertical-table dependency-table';
  if (relationship === 'blocks') {
    table.classList.add('is-blocker');
  }
  table.dataset.storyId = String(entry.storyId);
  table.setAttribute('role', 'button');
  table.setAttribute('tabindex', '0');
  const accessibleTitle = entry.title ? ` – ${entry.title}` : '';
  table.setAttribute('aria-label', `View story #${entry.storyId}${accessibleTitle}`);

  const tbody = document.createElement('tbody');
  tbody.appendChild(createTableRow('Story', `#${entry.storyId} ${entry.title || 'Untitled story'}`));

  const status = entry.status || 'Draft';
  const statusBadge = document.createElement('span');
  statusBadge.className = `status-badge ${getStatusClass(status)}`;
  statusBadge.textContent = status;
  tbody.appendChild(createTableRow('Status', statusBadge));

  const relationshipBadge = document.createElement('span');
  relationshipBadge.className = 'dependency-relationship';
  if (relationship === 'blocks') {
    relationshipBadge.classList.add('is-blocker');
  }
  relationshipBadge.textContent = describeDependencyRelationship(entry, context);
  tbody.appendChild(createTableRow('Relationship', relationshipBadge));

  table.appendChild(tbody);
  return table;
}

function formatDependencyOptionLabel(story) {
  const title = story.title && story.title.trim().length ? story.title : `Story ${story.id}`;
  const status = story.status || 'Draft';
  return `#${story.id} ${title} (${status})`;
}

function collectDependencyOptions(story, context) {
  const excluded = new Set([story.id]);
  if (context === 'blocked-by' && Array.isArray(story.blockedBy)) {
    story.blockedBy.forEach((entry) => excluded.add(entry.storyId));
  }
  if (context === 'upstream' && Array.isArray(story.dependencies)) {
    story.dependencies.forEach((entry) => excluded.add(entry.storyId));
  }
  const options = [];
  storyIndex.forEach((candidate) => {
    if (!candidate || excluded.has(candidate.id)) {
      return;
    }
    options.push({
      id: candidate.id,
      label: formatDependencyOptionLabel(candidate),
    });
  });
  options.sort((a, b) => a.label.localeCompare(b.label));
  return options;
}

function openDependencyPicker(story, context) {
  if (!story) {
    return;
  }
  const options = collectDependencyOptions(story, context);
  const container = document.createElement('div');
  container.className = 'dependency-picker';

  if (options.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'form-hint';
    empty.textContent = 'No other user stories are available to link.';
    container.appendChild(empty);
  } else {
    const hint = document.createElement('p');
    hint.className = 'form-hint';
    hint.textContent =
      context === 'blocked-by'
        ? 'Select the story that is blocking this work.'
        : 'Select the upstream story this work depends on.';
    container.appendChild(hint);

    const label = document.createElement('label');
    label.textContent = 'User story';
    const select = document.createElement('select');
    select.required = true;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select a user story…';
    select.appendChild(placeholder);
    options.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = String(option.id);
      opt.textContent = option.label;
      select.appendChild(opt);
    });
    label.appendChild(select);
    container.appendChild(label);

    setTimeout(() => {
      select.focus();
    }, 0);

    const successMessage =
      context === 'blocked-by' ? 'Blocking story added' : 'Dependency added';
    openModal({
      title: context === 'blocked-by' ? 'Add Blocking Story' : 'Add Dependency',
      content: container,
      actions: [
        {
          label: 'Add',
          onClick: async () => {
            const value = Number(select.value);
            if (!Number.isFinite(value) || value === 0) {
              showToast('Select a user story to link.', 'error');
              select.focus();
              return false;
            }
            try {
              await createDependencyLink(story.id, value, context === 'blocked-by' ? 'blocks' : 'depends');
              state.selectedStoryId = story.id;
              persistSelection();
              await loadStories();
              showToast(successMessage, 'success');
              return true;
            } catch (error) {
              showToast(error.message || 'Failed to add dependency', 'error');
              return false;
            }
          },
        },
      ],
    });
    return;
  }

  openModal({
    title: context === 'blocked-by' ? 'Add Blocking Story' : 'Add Dependency',
    content: container,
    cancelLabel: 'Close',
  });
}

function storyHasAcceptanceWarnings(story) {
  if (!story || !Array.isArray(story.acceptanceTests)) {
    return false;
  }
  return story.acceptanceTests.some((test) => {
    if (!test || !test.gwtHealth) return false;
    if (typeof test.gwtHealth.satisfied === 'boolean') {
      return !test.gwtHealth.satisfied;
    }
    return Array.isArray(test.gwtHealth.issues) && test.gwtHealth.issues.length > 0;
  });
}

function computeHealthSeverity(story) {
  if (!story) {
    return 'ok';
  }
  const invest = story.investHealth;
  const investIssues = invest
    ? invest.satisfied === false && Array.isArray(invest.issues)
      ? invest.issues.length
      : invest.satisfied === false
      ? 1
      : 0
    : story.investSatisfied === false
    ? 1
    : 0;
  if (investIssues > 0) {
    return 'critical';
  }
  if (storyHasAcceptanceWarnings(story)) {
    return 'warning';
  }
  return 'ok';
}

function persistAllData() {
  // Persist stories data locally
  try {
    localStorage.setItem(STORAGE_KEYS.stories, JSON.stringify(state.stories));
    localStorage.setItem(STORAGE_KEYS.lastBackup, new Date().toISOString());
  } catch (error) {
    console.error('Failed to persist stories data', error);
  }
  
  // Persist other data
  persistLayout();
  persistMindmap();
  persistExpanded();
  persistSelection();
  persistPanels();
  persistCodeWhispererDelegations();
}

function loadStoriesFromLocal() {
  try {
    const storiesData = localStorage.getItem(STORAGE_KEYS.stories);
    console.log('Local storage stories data:', storiesData ? 'found' : 'not found');
    if (storiesData) {
      const stories = JSON.parse(storiesData);
      if (Array.isArray(stories) && stories.length > 0) {
        console.log('Loading', stories.length, 'stories from local storage');
        state.stories = stories;
        rebuildStoryIndex();
        return true;
      }
    }
  } catch (error) {
    console.error('Failed to load stories from local storage', error);
    // Clear corrupted localStorage data
    localStorage.removeItem(STORAGE_KEYS.stories);
  }
  console.log('No valid local stories data found');
  return false;
}

function autoBackupData() {
  try {
    const lastBackup = localStorage.getItem(STORAGE_KEYS.lastBackup);
    const now = new Date();
    const shouldBackup = !lastBackup || 
      (now - new Date(lastBackup)) > (24 * 60 * 60 * 1000); // 24 hours
    
    if (shouldBackup && state.stories.length > 0) {
      persistAllData();
      console.log('Auto-backup completed');
    }
  } catch (error) {
    console.error('Auto-backup failed', error);
  }
}

function migrateMindmapData(fromVersion) {
  try {
    // Preserve existing mindmap positions and settings across upgrades
    const layoutData = localStorage.getItem(STORAGE_KEYS.layout);
    const mindmapData = localStorage.getItem(STORAGE_KEYS.mindmap);
    
    if (layoutData || mindmapData) {
      console.log('Preserving mindmap data across version upgrade');
      
      // Create backup of current data
      const backup = {
        layout: layoutData,
        mindmap: mindmapData,
        timestamp: new Date().toISOString(),
        fromVersion: fromVersion || 'unknown'
      };
      
      localStorage.setItem('aiPm.mindmap.backup', JSON.stringify(backup));
      
      // Data is already in the correct format, no migration needed
      // Just ensure it's preserved
    }
  } catch (error) {
    console.error('Failed to migrate mindmap data', error);
  }
}

function loadPreferences() {
  // Check version and migrate if needed
  try {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.version);
    if (storedVersion !== AIPM_VERSION) {
      console.log(`AIPM version updated from ${storedVersion || 'unknown'} to ${AIPM_VERSION}`);
      // Preserve mindmap data across versions
      migrateMindmapData(storedVersion);
      localStorage.setItem(STORAGE_KEYS.version, AIPM_VERSION);
    }
  } catch (error) {
    console.error('Failed to check version', error);
  }

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
    const mindmapRaw = localStorage.getItem(STORAGE_KEYS.mindmap);
    if (mindmapRaw) {
      const data = JSON.parse(mindmapRaw);
      state.mindmapZoom = data.zoom ?? 1;
      state.showDependencies = data.showDependencies ?? false;
      // Preserve any other mindmap-specific settings
      if (data.centerPosition) {
        state.mindmapCenterPosition = data.centerPosition;
      }
    }
  } catch (error) {
    console.error('Failed to load mindmap preferences', error);
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
    const hideCompletedRaw = localStorage.getItem(STORAGE_KEYS.hideCompleted);
    if (hideCompletedRaw) {
      state.hideCompleted = JSON.parse(hideCompletedRaw);
    }
  } catch (error) {
    console.error('Failed to load hide completed preference', error);
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

function persistMindmap() {
  const mindmapData = {
    zoom: state.mindmapZoom,
    showDependencies: state.showDependencies,
  };
  
  // Save center position if available
  if (state.mindmapCenterPosition) {
    mindmapData.centerPosition = state.mindmapCenterPosition;
  }
  
  localStorage.setItem(STORAGE_KEYS.mindmap, JSON.stringify(mindmapData));
}

function persistPanels() {
  localStorage.setItem(STORAGE_KEYS.panels, JSON.stringify(state.panelVisibility));
}

function persistHideCompleted() {
  localStorage.setItem(STORAGE_KEYS.hideCompleted, JSON.stringify(state.hideCompleted));
}

function codewhispererEntryShape(entry, storyId) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const normalized = { ...entry };
  normalized.assignee = typeof normalized.assignee === 'string' ? normalized.assignee : '';
  normalized.createdAt = normalized.createdAt || new Date().toISOString();
  normalized.updatedAt = normalized.updatedAt || null;
  normalized.storyId = normalized.storyId ?? storyId;
  if (!normalized.localId) {
    normalized.localId = `codewhisperer-${normalized.storyId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }
  normalized.createTrackingCard = normalized.createTrackingCard !== false;
  normalized.latestStatus = normalized.latestStatus ?? null;
  normalized.lastCheckedAt = normalized.lastCheckedAt ?? null;
  normalized.lastError = normalized.lastError ?? null;
  if (normalized.htmlUrl == null && typeof normalized.threadUrl === 'string') {
    normalized.htmlUrl = normalized.threadUrl;
  }
  if (typeof normalized.taskUrl === 'string' && !normalized.taskUrl) {
    normalized.taskUrl = null;
  }
  if (normalized.taskUrl == null && typeof normalized.htmlUrl === 'string') {
    const baseUrl = normalized.htmlUrl.split('#')[0];
    normalized.taskUrl = baseUrl || normalized.htmlUrl;
  }
  if (normalized.threadUrl == null && typeof normalized.htmlUrl === 'string') {
    normalized.threadUrl = normalized.htmlUrl;
  }
  if (typeof normalized.confirmationCode === 'string') {
    const trimmed = normalized.confirmationCode.trim();
    normalized.confirmationCode = trimmed.length >= 6 ? trimmed : null;
  } else {
    normalized.confirmationCode = null;
  }
  if (normalized.targetNumber != null && normalized.targetNumber !== '') {
    const parsed = Number(normalized.targetNumber);
    normalized.targetNumber = Number.isFinite(parsed) ? parsed : null;
  } else if (normalized.target === 'new-issue') {
    normalized.targetNumber = normalized.targetNumber ?? null;
  }
  return normalized;
}

// Add function to clear dangling CodeWhisperer delegations
function clearDanglingCodeWhispererDelegations() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.codewhispererDelegations);
    if (!stored) {
      console.log('No CodeWhisperer delegations found');
      showToast('No CodeWhisperer delegations to clean', 'info');
      return;
    }
    
    const parsed = JSON.parse(stored);
    let removedCount = 0;
    let totalCount = 0;
    
    // Get current story IDs safely
    const currentStoryIds = new Set();
    if (state.stories && state.stories.size > 0) {
      state.stories.forEach(story => {
        if (story && story.id) {
          currentStoryIds.add(story.id);
        }
      });
    }
    
    // Clean up delegations for non-existent stories
    const cleanedData = {};
    Object.keys(parsed).forEach(storyIdStr => {
      const storyId = Number(storyIdStr);
      const delegations = parsed[storyIdStr];
      
      if (Array.isArray(delegations)) {
        totalCount += delegations.length;
        
        if (currentStoryIds.has(storyId)) {
          // Keep delegations for existing stories
          cleanedData[storyIdStr] = delegations;
        } else {
          // Count removed delegations
          removedCount += delegations.length;
        }
      }
    });
    
    // Save cleaned data
    localStorage.setItem(STORAGE_KEYS.codewhispererDelegations, JSON.stringify(cleanedData));
    
    // Reload delegations
    state.codewhispererDelegations = new Map();
    loadCodeWhispererDelegationsFromStorage();
    
    // Refresh all CodeWhisperer sections safely
    try {
      document.querySelectorAll('[data-role="codewhisperer-section"]').forEach(section => {
        const storyId = Number(section.dataset.storyId);
        if (Number.isFinite(storyId)) {
          refreshCodeWhispererSection(storyId);
        }
      });
    } catch (refreshError) {
      console.warn('Some sections could not be refreshed:', refreshError);
    }
    
    console.log(`Cleaned up ${removedCount} dangling delegations out of ${totalCount} total`);
    
    if (removedCount > 0) {
      showToast(`Removed ${removedCount} dangling CodeWhisperer delegations`, 'success');
    } else {
      showToast('No dangling delegations found to remove', 'info');
    }
    
  } catch (error) {
    console.error('Failed to clear dangling delegations:', error);
    // Clear all if corrupted
    try {
      localStorage.removeItem(STORAGE_KEYS.codewhispererDelegations);
      state.codewhispererDelegations = new Map();
      showToast('Cleared all CodeWhisperer delegations due to data corruption', 'warning');
    } catch (clearError) {
      console.error('Failed to clear corrupted data:', clearError);
      showToast('Error clearing delegations - please refresh the page', 'error');
    }
  }
}

// Expose function globally for easy access
window.clearDanglingCodeWhispererDelegations = clearDanglingCodeWhispererDelegations;

// Add this function to clear old CodeWhisperer data
function clearOldCodeWhispererData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.codewhispererDelegations);
    state.codewhispererDelegations = new Map();
    console.log('Cleared old CodeWhisperer delegation data');
    
    // Refresh all CodeWhisperer sections
    document.querySelectorAll('[data-role="codewhisperer-section"]').forEach(section => {
      const storyId = Number(section.dataset.storyId);
      if (Number.isFinite(storyId)) {
        refreshCodeWhispererSection(storyId);
      }
    });
  } catch (error) {
    console.error('Failed to clear CodeWhisperer data:', error);
  }
}

// Expose function globally for debugging
window.clearOldCodeWhispererData = clearOldCodeWhispererData;

function ensureCodeWhispererEntryShape(entry, storyId) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }

  return {
    assignee: typeof entry.assignee === 'string' ? entry.assignee : '',
    localId: entry.localId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    storyId: storyId || entry.storyId,
    taskTitle: entry.taskTitle || 'Unknown Task',
    createdAt: entry.createdAt || null,
    updatedAt: entry.updatedAt || null,
    repo: entry.repo || '',
    branchName: entry.branchName || '',
    target: entry.target || 'new-issue',
    targetNumber: entry.targetNumber,
    number: entry.number,
    type: entry.type,
    prUrl: entry.prUrl,
    htmlUrl: entry.htmlUrl,
    taskUrl: entry.taskUrl,
    threadUrl: entry.threadUrl,
    confirmationCode: entry.confirmationCode,
    createTrackingCard: entry.createTrackingCard !== false,
    latestStatus: entry.latestStatus,
    lastCheckedAt: entry.lastCheckedAt,
    lastError: entry.lastError
  };
}

function loadCodeWhispererDelegationsFromStorage() {
  state.codewhispererDelegations = new Map();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.codewhispererDelegations);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return;
    }
    
    let hasChanges = false;
    Object.entries(parsed).forEach(([key, list]) => {
      const storyId = Number(key);
      if (!Number.isFinite(storyId) || !Array.isArray(list)) {
        return;
      }
      
      // Clean up invalid entries
      const validEntries = list
        .map((entry) => ensureCodeWhispererEntryShape(entry, storyId))
        .filter((entry) => {
          if (!entry || !entry.taskTitle || entry.taskTitle === 'Unknown Task') {
            hasChanges = true;
            return false;
          }
          return true;
        });
        
      if (validEntries.length > 0) {
        state.codewhispererDelegations.set(storyId, validEntries);
      } else if (list.length > 0) {
        hasChanges = true; // Removed invalid entries
      }
    });
    
    // Save cleaned data if we removed invalid entries
    if (hasChanges) {
      persistCodeWhispererDelegations();
    }
  } catch (error) {
    console.error('Failed to load CodeWhisperer delegations', error);
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEYS.codewhispererDelegations);
  }
}

async function persistCodeWhispererDelegations() {
  // PRs are now stored in the backend via API, not localStorage
  // This function is kept for compatibility but does nothing
}

function getCodeWhispererDelegations(storyId) {
  const key = Number(storyId);
  if (!Number.isFinite(key)) {
    return [];
  }
  // Get PRs from the story object
  const story = storyIndex.get(key);
  return (story?.prs || []).map((entry) => ensureCodeWhispererEntryShape(entry, key)).filter(Boolean);
}

async function setCodeWhispererDelegations(storyId, entries) {
  const key = Number(storyId);
  if (!Number.isFinite(key)) {
    return false;
  }
  const normalizedEntries = (entries || [])
    .map((entry) =>
      ensureCodeWhispererEntryShape(
        {
          ...entry,
          assignee: typeof entry.assignee === 'string' ? entry.assignee.trim() : '',
        },
        key
      )
    )
    .filter(Boolean);

  // Update story's PRs via API
  try {
    const response = await fetch(resolveApiUrl(`/api/stories/${key}/prs`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prs: normalizedEntries })
    });
    if (response.ok) {
      const prs = await response.json();
      const story = storyIndex.get(key);
      if (story) {
        story.prs = prs.map((entry) => ensureCodeWhispererEntryShape(entry, key)).filter(Boolean);
      }
      return true;
    }
    console.error('Failed to persist PRs', response.status, response.statusText);
  } catch (error) {
    console.error('Failed to persist PRs', error);
  }
  return false;
}

async function addCodeWhispererDelegationEntry(storyId, entry) {
  const key = Number(storyId);
  try {
    const response = await fetch(resolveApiUrl(`/api/stories/${key}/prs`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (response.ok) {
      const prs = await response.json();
      const story = storyIndex.get(key);
      if (story) {
        story.prs = prs;
      }
      if (state.selectedStoryId === storyId) {
        refreshCodeWhispererSection(storyId);
      }
    }
  } catch (error) {
    console.error('Failed to add PR', error);
  }
}

async function removeCodeWhispererDelegation(storyId, localId) {
  const current = getCodeWhispererDelegations(storyId);
  if (!current.length) {
    return;
  }
  const entry = current.find((e) => e.localId === localId);
  if (!entry || !entry.number) {
    return;
  }
  
  try {
    const response = await fetch(resolveApiUrl(`/api/stories/${storyId}/prs/${entry.number}`), {
      method: 'DELETE'
    });
    if (response.ok) {
      const prs = await response.json();
      const story = storyIndex.get(Number(storyId));
      if (story) {
        story.prs = prs;
      }
      if (state.selectedStoryId === storyId) {
        refreshCodeWhispererSection(storyId);
      }
      showToast('PR tracking removed', 'info');
    }
  } catch (error) {
    console.error('Failed to remove PR', error);
  }
}

function refreshCodeWhispererSection(storyId) {
  const section = detailsContent.querySelector(
    `.codewhisperer-section[data-story-id="${storyId}"]`
  );
  if (!section) {
    return;
  }
  const list = section.querySelector('.codewhisperer-task-list');
  const story = storyIndex.get(storyId);
  if (!list || !story) {
    return;
  }
  renderCodeWhispererSectionList(list, story);
}

async function requestCodeWhispererStatus(entry) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/codewhisperer-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: entry.repo,
        number: entry.number,
        type: entry.type
      })
    });
    
    if (!response.ok) {
      entry.lastError = `Status check failed: ${response.status}`;
      return false;
    }
    
    const data = await response.json();
    entry.latestStatus = data.status;
    entry.lastCheckedAt = new Date().toISOString();
    entry.lastError = null;
    persistCodeWhispererDelegations();
    return true;
  } catch (error) {
    entry.lastError = `Status check error: ${error.message}`;
    entry.lastCheckedAt = new Date().toISOString();
    persistCodeWhispererDelegations();
    return false;
  }
}

async function checkPRUpToDate(prEntry) {
  try {
    const prNumber = prEntry?.number || prEntry?.targetNumber;
    const repoPath = prEntry?.repo || 'demian7575/aipm';
    const [owner, repo] = repoPath.split('/');
    
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`);
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }
    
    const prData = await response.json();
    const mergeable = prData.mergeable;
    const mergeableState = prData.mergeable_state;
    
    // Check if PR is behind main
    const upToDate = mergeableState === 'clean' || mergeableState === 'unstable';
    
    return { upToDate, mergeable, mergeableState };
  } catch (error) {
    console.error('Error checking PR status:', error);
    throw error;
  }
}

async function mergePR(prEntry) {
  try {
    const repoPath = prEntry?.repo || 'demian7575/aipm';
    const [owner, repo] = repoPath.split('/');
    
    const payload = {
      prNumber: prEntry?.number || prEntry?.targetNumber,
      owner,
      repo
    };
    
    console.log('🔀 Merging PR:', payload);
    
    const response = await fetch(resolveApiUrl('/api/merge-pr'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Merge API error:', response.status, errorText);
      throw new Error(`Merge API returned ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ Merge result:', result);
    return result;
  } catch (error) {
    console.error('❌ Merge error:', error);
    return { success: false, message: error.message };
  }
}

async function rebaseCodeWhispererPR(entry) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/codewhisperer-rebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo: entry.repo,
        number: entry.number,
        branchName: entry.branchName
      })
    });
    
    if (!response.ok) {
      entry.lastError = `Rebase failed: ${response.status}`;
      return false;
    }
    
    const data = await response.json();
    entry.lastError = null;
    entry.lastCheckedAt = new Date().toISOString();
    persistCodeWhispererDelegations();
    return true;
  } catch (error) {
    entry.lastError = `Rebase error: ${error.message}`;
    entry.lastCheckedAt = new Date().toISOString();
    persistCodeWhispererDelegations();
    return false;
  }
}

function formatCodeWhispererTargetLabel(entry) {
  if (!entry) {
    return '';
  }
  
  // Show PR information when available
  if (entry.type === 'pull_request' || entry.prUrl || entry.html_url || entry.url) {
    const number = entry.number || Number(entry.targetNumber);
    return Number.isFinite(number) ? `PR #${number}` : 'PR';
  }
  
  // Fallback to generic label
  return 'Development Task';
}

function formatRelativeTime(isoString) {
  if (!isoString) {
    return '';
  }
  const timestamp = new Date(isoString).getTime();
  if (!Number.isFinite(timestamp)) {
    return '';
  }
  const diff = Date.now() - timestamp;
  if (diff < 0) {
    return 'just now';
  }
  const seconds = Math.round(diff / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  const weeks = Math.round(days / 7);
  if (weeks < 5) {
    return `${weeks}w ago`;
  }
  return new Date(isoString).toLocaleDateString();
}

function renderCodeWhispererSectionList(container, story) {
  container.innerHTML = '';
  const entries = getCodeWhispererDelegations(story.id);
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No development tasks created yet.';
    container.appendChild(empty);
    return;
  }

  // Fetch PR URLs for tasks that don't have them yet (only once per entry)
  // Queue polling removed - no longer needed

  entries.forEach((entry) => {
    const card = document.createElement('article');
    card.className = 'codewhisperer-task-card';
    card.dataset.localId = entry.localId;

    const header = document.createElement('header');
    header.className = 'codewhisperer-task-card-header';

    const title = document.createElement('h4');
    title.textContent = entry.taskTitle || 'Development task';
    header.appendChild(title);

    const badge = document.createElement('span');
    badge.className = 'codewhisperer-target-badge';
    badge.textContent = formatCodeWhispererTargetLabel(entry);
    header.appendChild(badge);

    card.appendChild(header);

    if (entry.objective) {
      const objective = document.createElement('p');
      objective.className = 'codewhisperer-objective';
      objective.textContent = entry.objective;
      card.appendChild(objective);
    }

    if (entry.confirmationCode) {
      const confirmation = document.createElement('p');
      confirmation.className = 'codewhisperer-confirmation';
      confirmation.innerHTML = `<span>Confirmation:</span> <code>${escapeHtml(
        entry.confirmationCode
      )}</code>`;
      card.appendChild(confirmation);
    }

    // Restore GitHub PR link functionality
    if (entry.prUrl || entry.htmlUrl || entry.html_url || entry.url) {
      const prLink = document.createElement('p');
      prLink.className = 'codewhisperer-pr-link';
      const url = entry.prUrl || entry.htmlUrl || entry.html_url || entry.url;
      const prNumber = entry.number ? `#${entry.number}` : '';
      prLink.innerHTML = `<span>Pull Request:</span> <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">PR ${prNumber}</a>`;
      card.appendChild(prLink);
    }

    // Assignee with editable text box and Update button
    const assigneeRow = document.createElement('div');
    assigneeRow.className = 'codewhisperer-assignee-row';
    assigneeRow.style.display = 'flex';
    assigneeRow.style.alignItems = 'center';
    assigneeRow.style.gap = '8px';
    assigneeRow.style.marginBottom = '8px';
    
    const assigneeLabel = document.createElement('span');
    assigneeLabel.textContent = 'Assignee:';
    assigneeLabel.style.fontWeight = 'bold';
    assigneeRow.appendChild(assigneeLabel);
    
    const assigneeInput = document.createElement('input');
    assigneeInput.type = 'text';
    assigneeInput.value = entry.assignee || '';
    assigneeInput.placeholder = '(not assigned)';
    assigneeInput.style.flex = '1';
    assigneeInput.style.padding = '4px 8px';
    assigneeInput.style.border = '1px solid #ccc';
    assigneeInput.style.borderRadius = '4px';
    assigneeRow.appendChild(assigneeInput);
    
    const updateAssigneeBtn = document.createElement('button');
    updateAssigneeBtn.type = 'button';
    updateAssigneeBtn.className = 'button secondary';
    updateAssigneeBtn.textContent = 'Update';
    updateAssigneeBtn.style.padding = '4px 12px';
    updateAssigneeBtn.style.fontSize = '12px';
    updateAssigneeBtn.addEventListener('click', async () => {
      const newAssignee = assigneeInput.value.trim();
      const updatedEntries = getCodeWhispererDelegations(story.id).map((item) =>
        item.localId === entry.localId
          ? { ...item, assignee: newAssignee, updatedAt: new Date().toISOString() }
          : item
      );

      const saved = await setCodeWhispererDelegations(story.id, updatedEntries);

      if (saved) {
        showToast('Assignee updated', 'success');
        renderCodeWhispererSectionList(container, story);

        // Show notification if assignee is "Kiro"
        if (newAssignee.toLowerCase() === 'kiro') {
          showToast('✨ Kiro assigned! This task is ready for AI code generation.', 'success');
        }
      } else {
        showToast('Failed to update assignee. Please try again.', 'error');
      }
    });
    assigneeRow.appendChild(updateAssigneeBtn);
    
    card.appendChild(assigneeRow);

    const status = document.createElement('p');
    status.className = 'codewhisperer-status-line';

    // Simplified status display without git-specific information
    if (entry.lastError) {
      status.classList.add('is-error');
      status.textContent = entry.lastError;
    } else {
      status.textContent = 'Task ready for development';
    }
    card.appendChild(status);

    const actions = document.createElement('div');
    actions.className = 'codewhisperer-task-actions';

    // Add Generate Code button for each task
    const generateCodeBtn = document.createElement('button');
    generateCodeBtn.type = 'button';
    generateCodeBtn.className = 'button secondary';
    generateCodeBtn.textContent = 'Generate Code';
    generateCodeBtn.addEventListener('click', async () => {
      console.log('🔘 Generate Code button clicked for story:', story?.id);
      console.log('🔘 Entry data passed to button:', entry);
      
      // Generate code directly without modal
      generateCodeBtn.disabled = true;
      generateCodeBtn.textContent = 'Generating...';
      
      try {
        // Robust PR number extraction with validation
        console.log('🔍 Entry data for PR extraction:', entry);
        
        let prNumber = null;
        if (entry) {
          // Try multiple fields in order of preference
          prNumber = entry.number || entry.targetNumber || entry.prNumber;
          
          // Validate PR number is a valid integer
          if (prNumber && !isNaN(parseInt(prNumber))) {
            prNumber = parseInt(prNumber);
          } else {
            prNumber = null;
          }
        }
        
        console.log('🔍 Final PR number:', prNumber);
        
        if (!entry || !prNumber || prNumber <= 0) {
          console.error('❌ Invalid PR data. Entry:', entry, 'PR Number:', prNumber);
          showToast('No valid PR found to update. Create a PR first.', 'error');
          return;
        }
        
        // Validate branch name exists
        if (!entry.branchName) {
          console.error('❌ No branch name found in entry:', entry);
          showToast('PR missing branch information. Cannot generate code.', 'error');
          return;
        }
        
        // Create code-focused prompt from story details
        const storyTitle = story?.title || 'Untitled Story';
        const storyDesc = story?.description || '';
        const asA = story?.asA || '';
        const iWant = story?.iWant || '';
        const soThat = story?.soThat || '';
        
        // Extract values dynamically from frontend data
        const taskTitle = storyTitle;
        const objective = iWant || storyDesc || 'Implement the requested feature';
        const constraints = 'Follow AIPM patterns and maintain existing functionality';
        const prNum = parseInt(prNumber);
        const branchName = entry.branchName;
        const language = 'javascript';
        
        // Create template-based prompt with one-line parameters
        const prompt = `Read and follow the template file: ./templates/code-generation.md

taskTitle: "${taskTitle}", objective: "${objective}", constraints: "${constraints}", prNumber: ${prNum}, branchName: "${branchName}", language: "${language}"

Execute the template instructions exactly as written.`;
        
        console.log('🚀 Starting template-based code generation...');
        console.log('📤 Template values:', { taskTitle, objective, constraints, prNum, branchName, language });
        
        const response = await fetch(resolveApiUrl('/api/generate-code-branch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId: story?.id,
            prNumber: parseInt(prNumber),
            prompt: prompt,
            originalBranch: entry.branchName
          })
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok:', response.ok);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Generation result:', result);
          
          if (result.success) {
            showToast(`Code generation started for PR #${result.prNumber}`, 'success');
          } else {
            showToast('Code generation failed', 'error');
          }
        } else {
          const errorText = await response.text();
          console.error('❌ HTTP error:', response.status, errorText);
          showToast(`Code generation failed: ${response.status}`, 'error');
        }
      } catch (error) {
        console.error('❌ Exception during generation:', error);
        showToast('Error during code generation', 'error');
      } finally {
        generateCodeBtn.disabled = false;
        generateCodeBtn.textContent = 'Generate Code';
      }
    });
    actions.appendChild(generateCodeBtn);

    // Git-related conversation and update links removed for streamlined interface

    if (entry.createTrackingCard !== false) {
      // Git-related actions removed for streamlined interface
      
      const runInStagingBtn = document.createElement('button');
      runInStagingBtn.type = 'button';
      runInStagingBtn.className = 'button secondary run-in-staging-btn';
      runInStagingBtn.textContent = 'Test in Dev';
      runInStagingBtn.addEventListener('click', async () => {
        runInStagingBtn.disabled = true;
        runInStagingBtn.textContent = 'Triggering Deployment...';
        
        try {
          // Debug logging
          console.log('Entry type check:', {
            hasNumber: !!entry.number,
            hasStoryId: !!entry.storyId,
            hasPrs: !!entry.prs,
            entryKeys: Object.keys(entry)
          });
          
          let prNumber = null;
          
          // Check if entry is a PR object (has number and storyId)
          if (entry.number && entry.storyId) {
            prNumber = entry.number;
            console.log('Entry is a PR object, using PR number:', prNumber);
          }
          // Check if entry is a story object (has prs array)
          else if (entry.prs && Array.isArray(entry.prs) && entry.prs.length > 0) {
            prNumber = entry.prs[0].number || entry.prs[0].targetNumber;
            console.log('Entry is a story object, found PR number:', prNumber, 'from PR:', entry.prs[0]);
          }
          
          if (!prNumber) {
            console.log('PR detection failed. Entry:', entry);
            showToast('No PR found for this item. Please create a PR first.', 'error');
            return;
          }
          
          console.log('Triggering deployment for PR #' + prNumber);
          
          // Use backend API endpoint instead of direct GitHub API call
          const response = await fetch(resolveApiUrl('/api/trigger-deployment'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              pr_number: prNumber
            })
          });
          
          if (response.ok) {
            showToast(`Deployment workflow triggered for PR #${prNumber}. Check GitHub Actions for progress.`, 'success');
          } else {
            const error = await response.text();
            console.log('GitHub API error:', error);
            showToast(`Failed to trigger deployment: ${error}`, 'error');
          }
        } catch (error) {
          console.error('Deployment trigger error:', error);
          showToast('Deployment trigger error: ' + error.message, 'error');
        }
        
        runInStagingBtn.disabled = false;
        runInStagingBtn.textContent = 'Test in Dev';
      });
      actions.appendChild(runInStagingBtn);

      const mergeBtn = document.createElement('button');
      mergeBtn.type = 'button';
      mergeBtn.className = 'button primary merge-pr-btn';
      mergeBtn.textContent = 'Merge PR';
      mergeBtn.addEventListener('click', async () => {
        mergeBtn.disabled = true;
        mergeBtn.textContent = 'Checking...';
        
        // Check if PR is up-to-date with main
        try {
          const checkResult = await checkPRUpToDate(entry);
          if (!checkResult.upToDate) {
            mergeBtn.disabled = false;
            mergeBtn.textContent = 'Merge PR';
            alert('The code base is outdated. Click \'Test in Dev\' again to rebase to origin/main before main.');
            return;
          }
        } catch (error) {
          console.warn('Failed to check PR status:', error);
          // Continue with merge if check fails
        }
        
        if (!confirm(`Merge PR #${entry.number || entry.targetNumber} into main?`)) {
          mergeBtn.disabled = false;
          mergeBtn.textContent = 'Merge PR';
          return;
        }
        
        mergeBtn.textContent = 'Merging...';
        
        try {
          const result = await mergePR(entry);
          if (result && result.success) {
            showToast('PR merged and deleted from GitHub', 'success');
            // Refresh the card to show updated status
            const story = state.stories.find(s => s.id === entry.storyId);
            if (story) {
              const section = document.querySelector(`[data-story-id="${entry.storyId}"] .codewhisperer-section`);
              if (section) {
                const list = section.querySelector('.codewhisperer-task-list');
                if (list) renderCodeWhispererSectionList(list, story);
              }
            }
          } else {
            showToast('Merge failed: ' + (result?.message || 'Unknown error'), 'error');
            mergeBtn.disabled = false;
            mergeBtn.textContent = 'Merge PR';
          }
        } catch (error) {
          showToast('Merge error: ' + error.message, 'error');
          mergeBtn.disabled = false;
          mergeBtn.textContent = 'Merge PR';
        }
      });
      actions.appendChild(mergeBtn);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'link-button codewhisperer-remove';
      removeBtn.textContent = 'Stop tracking';
      removeBtn.addEventListener('click', () => {
        removeCodeWhispererDelegation(entry.storyId, entry.localId);
      });
      actions.appendChild(removeBtn);
    }

    if (actions.children.length) {
      card.appendChild(actions);
    }

    container.appendChild(card);
  });
}

function buildCodeWhispererSection(story) {
  const section = document.createElement('section');
  section.className = 'codewhisperer-section';
  section.dataset.role = 'codewhisperer-section';
  section.dataset.storyId = story?.id != null ? String(story.id) : '';

  const heading = document.createElement('div');
  heading.className = 'section-heading';
  const title = document.createElement('h3');
  title.textContent = 'Development Tasks';
  heading.appendChild(title);

  // Create PR button
  const createPRBtn = document.createElement('button');
  createPRBtn.type = 'button';
  createPRBtn.className = 'secondary';
  createPRBtn.textContent = 'Create PR';
  createPRBtn.addEventListener('click', async () => {
    // Create PR directly without modal
    createPRBtn.disabled = true;
    createPRBtn.textContent = 'Creating...';
    
    try {
      console.log('🚀 Creating PR for story:', story);
      const defaults = createDefaultCodeWhispererForm(story);
      console.log('📋 Default values:', defaults);
      
      const payload = {
        storyId: story.id,
        branchName: defaults.branchName,
        prTitle: defaults.prTitle,
        prBody: defaults.objective,
        story: story
      };
      
      console.log('📤 Sending payload:', payload);
      
      const response = await fetch(resolveApiUrl('/api/create-pr'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ PR creation result:', result);
        showToast(result.message || 'Pull request created', 'success');
        
        // Immediately add PR entry to story data for instant availability
        if (result.success && result.prEntry) {
          console.log('📝 Adding PR entry to story:', result.prEntry);
          const currentStory = storyIndex.get(story.id);
          console.log('📊 Current story before adding PR:', currentStory);
          if (currentStory) {
            if (!currentStory.prs) {
              currentStory.prs = [];
            }
            currentStory.prs.push(result.prEntry);
            console.log('📊 Story PRs after adding:', currentStory.prs);
            
            // Force immediate refresh of Development Tasks section
            const devTasksSection = document.querySelector(`[data-role="codewhisperer-section"][data-story-id="${story.id}"]`);
            console.log('🔍 Found dev tasks section:', devTasksSection);
            if (devTasksSection) {
              const taskList = devTasksSection.querySelector('.codewhisperer-task-list');
              console.log('🔍 Found task list:', taskList);
              if (taskList) {
                console.log('🔄 Refreshing task list with story:', currentStory);
                renderCodeWhispererSectionList(taskList, currentStory);
                console.log('✅ Task list refreshed');
              }
            }
          } else {
            console.error('❌ Story not found in storyIndex:', story.id);
            console.log('Available story IDs:', Array.from(storyIndex.keys()));
          }
        }
        
        // Refresh the story to show the new PR
        if (result.success) {
          console.log('🔄 Loading stories...');
          await loadStories();
          if (state.selectedStoryId === story.id) {
            renderDetails();
          }
        }
      } else {
        const error = await response.json();
        console.error('❌ PR creation failed:', error);
        showToast(error.error || 'Failed to create pull request', 'error');
      }
    } catch (error) {
      console.error('❌ Create PR exception:', error);
      showToast('Error creating pull request', 'error');
    } finally {
      createPRBtn.disabled = false;
      createPRBtn.textContent = 'Create PR';
    }
  });
  heading.appendChild(createPRBtn);

  section.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'codewhisperer-task-list';
  section.appendChild(list);
  renderCodeWhispererSectionList(list, story);
  return section;
}

function canDelegateToCodeWhisperer(story) {
  const reasons = [];
  
  if (!story) {
    return { allowed: false, reasons: ['No story selected'] };
  }
  
  // Check INVEST validation
  const investIssues = story.investIssues || [];
  if (investIssues.length > 0) {
    reasons.push(`INVEST issues: ${investIssues.join(', ')}`);
  }
  
  // Check acceptance tests
  const acceptanceTests = story.acceptanceTests || [];
  if (acceptanceTests.length === 0) {
    reasons.push('No acceptance tests defined');
  } else {
    const draftTests = acceptanceTests.filter(test => test.status === 'Draft');
    const incompleteTests = acceptanceTests.filter(test => 
      !test.given?.length || !test.when?.length || !test.then?.length
    );
    
    if (draftTests.length > 0) {
      reasons.push(`${draftTests.length} acceptance test(s) still in Draft status`);
    }
    
    if (incompleteTests.length > 0) {
      reasons.push(`${incompleteTests.length} acceptance test(s) missing Given/When/Then steps`);
    }
  }
  
  // Check story completeness
  if (!story.title?.trim()) {
    reasons.push('Story title is required');
  }
  
  if (!story.description?.trim()) {
    reasons.push('Story description is required');
  }
  
  if (!story.asA?.trim() || !story.iWant?.trim() || !story.soThat?.trim()) {
    reasons.push('Complete user story format required (As a... I want... So that...)');
  }
  
  return {
    allowed: reasons.length === 0,
    reasons: reasons
  };
}

async function codewhispererStatus(entry) {
  if (!entry || entry.createTrackingCard === false) {
    return false;
  }
  if (!entry.owner || !entry.repo) {
    entry.lastError = 'Owner and repository are required to check CodeWhisperer status.';
    entry.lastCheckedAt = new Date().toISOString();
    persistCodeWhispererDelegations();
    return false;
  }
  const number = Number(entry.targetNumber);
  if (!Number.isFinite(number) || number <= 0) {
    entry.lastError = 'A valid issue or pull request number is required to check CodeWhisperer status.';
    entry.lastCheckedAt = new Date().toISOString();
    persistCodeWhispererDelegations();
    return false;
  }

  const params = new URLSearchParams({
    owner: entry.owner,
    repo: entry.repo,
    number: String(number),
    targetType: entry.target === 'pr' ? 'pr' : 'issue',
  });

  try {
    const data = await sendJson(`/api/personal-delegate/status?${params.toString()}`);
    entry.lastCheckedAt = data?.fetchedAt ?? new Date().toISOString();
    entry.lastError = null;

    if (data?.latestComment) {
      entry.latestStatus = {
        id: data.latestComment.id ?? null,
        author: data.latestComment.author ?? '',
        body: data.latestComment.body ?? '',
        createdAt: data.latestComment.created_at ?? entry.lastCheckedAt,
        htmlUrl: data.latestComment.html_url ?? null,
        snippet:
          data.latestComment.snippet ?? summarizeCommentBody(data.latestComment.body),
        links: Array.isArray(data.latestComment.links) ? data.latestComment.links : [],
      };
      if (data.latestComment.html_url) {
        entry.threadUrl = data.latestComment.html_url;
        if (!entry.taskUrl) {
          const base = data.latestComment.html_url.split('#')[0];
          entry.taskUrl = base || data.latestComment.html_url;
        }
      }
    } else {
      entry.latestStatus = null;
    }

    persistCodeWhispererDelegations();
    return true;
  } catch (error) {
    console.error('CodeWhisperer status request failed', error);
    const message =
      (typeof error?.message === 'string' && error.message) ||
      (typeof error?.error === 'string' && error.error) ||
      'Unable to update CodeWhisperer status.';
    entry.lastError = message;
    entry.lastCheckedAt = new Date().toISOString();
    persistCodeWhispererDelegations();
    return false;
  }
}

function initializeCodeWhispererDelegations() {
  loadCodeWhispererDelegationsFromStorage();
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

function applyStoryUpdate(updatedStory, options = {}) {
  const normalized = normalizeStoryTree(updatedStory);
  if (!normalized) {
    return false;
  }

  let found = false;

  function updateNodes(nodes) {
    let mutated = false;
    const next = nodes.map((node) => {
      if (!node) {
        return node;
      }
      if (node.id === normalized.id) {
        found = true;
        mutated = true;
        const hasNewChildren = Array.isArray(normalized.children) && normalized.children.length > 0;
        const children = hasNewChildren ? normalized.children : node.children || [];
        return { ...node, ...normalized, children };
      }
      if (node.children && node.children.length > 0) {
        const updatedChildren = updateNodes(node.children);
        if (updatedChildren !== node.children) {
          mutated = true;
          return { ...node, children: updatedChildren };
        }
      }
      return node;
    });
    return mutated ? next : nodes;
  }

  const nextStories = updateNodes(state.stories);
  if (!found) {
    return false;
  }

  state.stories = nextStories;
  state.selectedStoryId = normalized.id;
  rebuildStoryIndex();

  if (options.reRender) {
    renderAll();
  }

  return true;
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

async function handleStorySaveSuccess(result, message) {
  const storyId = result && typeof result === 'object' && result.id != null ? result.id : state.selectedStoryId;
  if (storyId == null) {
    await loadStories();
    persistSelection();
    showToast(message, 'success');
    return;
  }

  try {
    const refreshed = await recheckStoryHealth(storyId);
    const testsNeedingAttention = collectTestsNeedingAttention(refreshed);
    state.selectedStoryId = storyId;
    persistSelection();
    await loadStories();
    persistSelection();
    showToast(message, 'success');
    if (testsNeedingAttention.length > 0) {
      const names = testsNeedingAttention
        .map((test) => {
          if (test.title && test.title.trim().length > 0) {
            return test.title.trim();
          }
          return `Test ${test.id}`;
        })
        .join(', ');
      showToast(
        `Review acceptance test${testsNeedingAttention.length > 1 ? 's' : ''}: ${names}.`,
        'warning'
      );
    }
  } catch (error) {
    console.error('Failed to refresh story health', error);
    await loadStories();
    persistSelection();
    showToast('Story saved but health check could not refresh automatically.', 'warning');
  }
}

async function recheckStoryHealth(storyId, options = {}) {
  const includeAiInvest = options?.includeAiInvest === true;
  const requestInit = { method: 'POST' };
  if (includeAiInvest) {
    requestInit.headers = { 'Content-Type': 'application/json' };
    requestInit.body = JSON.stringify({ includeAiInvest: true });
  }
  const response = await fetch(resolveApiUrl(`/api/stories/${storyId}/health-check`), requestInit);
  if (!response.ok) {
    const message = await safeReadError(response);
    const error = new Error(message || 'Failed to refresh story health');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function safeReadError(response) {
  try {
    const payload = await response.json();
    if (payload && typeof payload.message === 'string') {
      return payload.message;
    }
  } catch (error) {
    console.error('Failed to parse error payload', error);
  }
  return response.statusText;
}

function collectTestsNeedingAttention(story) {
  if (!story || !Array.isArray(story.acceptanceTests)) {
    return [];
  }
  return story.acceptanceTests.filter((test) => {
    const measurabilityIssues = Array.isArray(test.measurabilityWarnings)
      ? test.measurabilityWarnings.length > 0
      : false;
    const gwtIssues = test.gwtHealth && Array.isArray(test.gwtHealth.issues)
      ? test.gwtHealth.issues.length > 0
      : false;
    const statusText = typeof test.status === 'string' ? test.status.trim().toLowerCase() : '';
    const needsReviewStatus =
      statusText === 'draft' || statusText === 'need review with update' || statusText.startsWith('need review');
    return measurabilityIssues || gwtIssues || needsReviewStatus;
  });
}

async function loadStories(preserveSelection = true) {
  console.log('loadStories called, preserveSelection:', preserveSelection);
  const previousSelection = preserveSelection ? state.selectedStoryId : null;
  
  // Try to load from local storage first
  const loadedFromLocal = loadStoriesFromLocal();
  console.log('Loaded from local:', loadedFromLocal);
  
  // Always try to load from API to get latest data
  try {
    const url = resolveApiUrl('/api/stories');
    console.log('Fetching from API:', url);
    const response = await fetch(url, { cache: 'no-store' });
    console.log('API response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stories: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('API response data:', data);
    
    const apiStories = normalizeStoryCollection(Array.isArray(data) ? data : []);
    console.log('Normalized stories:', apiStories);
    
    // Use API data if we have it, or fall back to local data
    if (apiStories.length > 0) {
      state.stories = apiStories;
      rebuildStoryIndex();
      console.log('Stories loaded from API, count:', apiStories.length);
      // Auto-backup after successful API load
      autoBackupData();
    } else if (!loadedFromLocal) {
      // No API data and no local data - create root story
      console.log('No stories found in API or local storage - creating root story');
      await createRootStory();
    }
  } catch (error) {
    console.error('API load failed:', error);
    if (!loadedFromLocal) {
      // If both local and API fail, show error
      showToast('Failed to load stories. Check your connection.', 'error');
      state.stories = [];
      rebuildStoryIndex();
    } else {
      // We have local data, just show a warning
      showToast('Using offline data. Check your connection.', 'warning');
    }
  }
  
  console.log('Final stories count:', state.stories.length);
  
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
  mindmapHasCentered = false;
  console.log('Calling renderAll...');
  renderAll();
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
    columns.push('720px');
  }
  workspaceEl.style.gridTemplateColumns = columns.join(' ');
}

function getVisibleStories() {
  if (!state.hideCompleted) return state.stories;
  return state.stories.filter(story => story.status !== 'Done');
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
    const statusClass = getStatusClass(story.status);
    if (statusClass) {
      row.classList.add(statusClass);
    }
    const severity = computeHealthSeverity(story);
    if (severity === 'critical') {
      row.classList.add('health-critical');
    } else if (severity === 'warning') {
      row.classList.add('health-warning');
    }
    if (getEpicClassification(story)) {
      row.classList.add('classification-epic');
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
      const visibleChildren = state.hideCompleted ? story.children.filter(child => child.status !== 'Done') : story.children;
      visibleChildren.forEach((child) => renderNode(child, depth + 1));
    }
  }

  const visibleStories = getVisibleStories();
  visibleStories.forEach((story) => renderNode(story, 0));
  outlineTreeEl.appendChild(list);
}

function normalizeMindmapText(value) {
  if (value == null) {
    return '';
  }
  const text = String(value).replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const result = [];
  let blankRun = 0;
  lines.forEach((line) => {
    const trimmedRight = line.replace(/\s+$/g, '');
    const isBlank = trimmedRight.trim().length === 0;
    if (result.length === 0 && isBlank) {
      return;
    }
    if (isBlank) {
      blankRun += 1;
      if (blankRun > 1) {
        return;
      }
      result.push('');
      return;
    }
    blankRun = 0;
    result.push(trimmedRight);
  });
  while (result.length > 0 && result[result.length - 1].trim().length === 0) {
    result.pop();
  }
  return result.join('\n');
}

function createMindmapElement(tag, namespace = false) {
  return namespace ? document.createElementNS(HTML_NS, tag) : document.createElement(tag);
}

function buildMindmapMetaLines(story) {
  const metaLines = [];

  const epicClassification = getEpicClassification(story);
  if (epicClassification) {
    const parts = [epicClassification.label];
    if (Number.isFinite(epicClassification.points)) {
      const summary = formatStoryPointSummary(epicClassification.points);
      if (summary) {
        parts.push(summary);
      }
    }
    metaLines.push({
      value: parts.join(' · '),
      classNames: ['story-meta', 'story-classification', 'is-epic'],
    });
  }

  return metaLines
    .map((line) => {
      const cleaned = normalizeMindmapText(line.value);
      return {
        value: cleaned,
        classNames: line.classNames,
      };
    })
    .filter((line) => line.value && line.value.trim().length > 0);
}

function buildMindmapComponentSummary(story) {
  if (!Array.isArray(story.components)) {
    return '';
  }
  const summary = story.components
    .map((component) => formatComponentLabel(component) || component)
    .filter((value, index, array) => value && array.indexOf(value) === index)
    .join(', ');
  if (!summary) {
    return '';
  }
  return `Components: ${normalizeMindmapText(summary)}`;
}

function createMindmapNodeBody(story, options = {}) {
  const { namespace = false } = options;
  const body = createMindmapElement('div', namespace);
  body.className = 'mindmap-node-body';

  const scroller = createMindmapElement('div', namespace);
  scroller.className = 'mindmap-node-scroll';
  body.appendChild(scroller);

  const content = createMindmapElement('div', namespace);
  content.className = 'mindmap-node-content';
  scroller.appendChild(content);

  const rawTitle = story.title != null ? String(story.title) : '';
  const cleanedTitle = normalizeMindmapText(rawTitle);
  const title = cleanedTitle.trim().length > 0 ? cleanedTitle : 'Untitled Story';
  const titleEl = createMindmapElement('div', namespace);
  titleEl.className = 'story-title';
  titleEl.textContent = title;
  const header = createMindmapElement('div', namespace);
  header.className = 'mindmap-node-header';
  header.appendChild(titleEl);

  content.appendChild(header);

  const metaLines = buildMindmapMetaLines(story);
  metaLines.forEach((line) => {
    const metaEl = createMindmapElement('div', namespace);
    metaEl.className = line.classNames.join(' ');
    metaEl.textContent = line.value;
    content.appendChild(metaEl);
  });

  const componentSummary = buildMindmapComponentSummary(story);
  if (componentSummary) {
    const componentEl = createMindmapElement('div', namespace);
    componentEl.className = 'story-meta story-components';
    componentEl.textContent = componentSummary;
    content.appendChild(componentEl);
  }

  return body;
}

function measureMindmapNode(story) {
  const measurement = createMindmapNodeBody(story);
  measurement.style.width = `${NODE_WIDTH}px`;
  measurement.classList.add('mindmap-node-body--measure');
  mindmapMeasureRoot.appendChild(measurement);
  const scroller = measurement.querySelector('.mindmap-node-scroll');
  const bodyHeight = Math.ceil(measurement.getBoundingClientRect().height);
  const scrollerStyles = scroller ? getComputedStyle(scroller) : null;
  const scrollHeight = scroller
    ? Math.ceil(
        scroller.scrollHeight +
          parseFloat(scrollerStyles?.marginTop || '0') +
          parseFloat(scrollerStyles?.marginBottom || '0')
      )
    : bodyHeight;
  mindmapMeasureRoot.removeChild(measurement);
  const naturalHeight = Math.max(bodyHeight, scrollHeight);
  const cappedHeight = Math.min(Math.max(NODE_MIN_HEIGHT, naturalHeight), NODE_MAX_HEIGHT);
  const overflow = naturalHeight > NODE_MAX_HEIGHT;
  return { height: cappedHeight, overflow };
}

function collectMindmapNodeMetrics(stories) {
  const metrics = new Map();
  flattenStories(stories).forEach((story) => {
    if (!story || story.id == null) {
      return;
    }
    metrics.set(story.id, measureMindmapNode(story));
  });
  return metrics;
}

function computeLayout(nodes, depth = 0, startY = Y_OFFSET, horizontalGap = 0, metrics = new Map()) {
  let cursorY = startY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const positioned = [];

  nodes.forEach((story) => {
    const measurement = metrics.get(story.id) || { height: NODE_MIN_HEIGHT, overflow: false };
    const expanded = state.expanded.has(story.id);
    let childLayout = null;
    if (expanded && story.children && story.children.length > 0) {
      childLayout = computeLayout(story.children, depth + 1, cursorY, horizontalGap, metrics);
    }

    let nodeY = cursorY;
    if (childLayout && childLayout.nodes.length > 0) {
      const childCenter = (childLayout.minY + childLayout.maxY) / 2;
      nodeY = Math.max(cursorY, childCenter - measurement.height / 2);
    }

    const node = {
      id: story.id,
      story,
      height: measurement.height,
      contentOverflow: measurement.overflow,
      x: X_OFFSET + depth * (HORIZONTAL_STEP + horizontalGap),
      y: nodeY,
      centerY: nodeY + measurement.height / 2,
    };
    positioned.push(node);

    if (childLayout) {
      positioned.push(...childLayout.nodes);
      minY = Math.min(minY, childLayout.minY);
      maxY = Math.max(maxY, childLayout.maxY);
      cursorY = Math.max(nodeY + measurement.height + NODE_VERTICAL_GAP, childLayout.nextY);
    } else {
      cursorY = nodeY + measurement.height + NODE_VERTICAL_GAP;
    }

    minY = Math.min(minY, nodeY);
    maxY = Math.max(maxY, nodeY + measurement.height);
  });

  if (minY === Number.POSITIVE_INFINITY) {
    minY = startY;
    maxY = startY;
  }

  return { nodes: positioned, nextY: cursorY, minY, maxY };
}

function projectPointToRect(centerX, centerY, width, height, dx, dy) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  if (dx === 0 && dy === 0) {
    return { x: centerX, y: centerY };
  }
  if (dx === 0) {
    return { x: centerX, y: centerY + Math.sign(dy) * halfHeight };
  }
  if (dy === 0) {
    return { x: centerX + Math.sign(dx) * halfWidth, y: centerY };
  }
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const slope = absDy / absDx;
  const rectSlope = halfHeight / halfWidth;
  if (slope > rectSlope) {
    const scale = halfHeight / absDy;
    return {
      x: centerX + dx * scale,
      y: centerY + Math.sign(dy) * halfHeight,
    };
  }
  const scale = halfWidth / absDx;
  return {
    x: centerX + Math.sign(dx) * halfWidth,
    y: centerY + dy * scale,
  };
}

function computeDependencyEndpoints(fromNode, toNode) {
  const fromCenterX = fromNode.x + NODE_WIDTH / 2;
  const fromCenterY = fromNode.y + fromNode.height / 2;
  const toCenterX = toNode.x + NODE_WIDTH / 2;
  const toCenterY = toNode.y + toNode.height / 2;
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  const start = projectPointToRect(fromCenterX, fromCenterY, NODE_WIDTH, fromNode.height, dx, dy);
  const end = projectPointToRect(toCenterX, toCenterY, NODE_WIDTH, toNode.height, -dx, -dy);
  return { start, end };
}

function renderMindmap() {
  const scrollSnapshot = mindmapWrapper
    ? { left: mindmapWrapper.scrollLeft, top: mindmapWrapper.scrollTop }
    : null;
  mindmapCanvas.innerHTML = '';
  syncDependencyOverlayControls();
  mindmapCanvas.classList.remove('has-dependencies');
  if (!state.panelVisibility.mindmap) {
    mindmapBounds = { width: 0, height: 0, fitWidth: 0, fitHeight: 0 };
    applyMindmapZoom();
    mindmapHasCentered = false;
    return;
  }
  if (state.stories.length === 0) {
    layoutStatus.textContent = 'No stories to display yet.';
    mindmapBounds = { width: 0, height: 0, fitWidth: 0, fitHeight: 0 };
    applyMindmapZoom();
    mindmapHasCentered = false;
    return;
  }

  const visibleStories = getVisibleMindmapStories(state.stories);

  if (visibleStories.length === 0) {
    layoutStatus.textContent = 'All stories are done.';
    mindmapBounds = { width: 0, height: 0, fitWidth: 0, fitHeight: 0 };
    applyMindmapZoom();
    mindmapHasCentered = false;
    return;
  }

  const horizontalGap = state.autoLayout ? AUTO_LAYOUT_HORIZONTAL_GAP : 0;
  const metrics = collectMindmapNodeMetrics(visibleStories);
  const layout = computeLayout(visibleStories, 0, Y_OFFSET, horizontalGap, metrics);

  // When manual layout is enabled, seed missing manual positions from the
  // latest computed layout so nodes stay stable across redraws instead of
  // drifting to newly calculated coordinates.
  if (!state.autoLayout) {
    let manualPositionsUpdated = false;
    layout.nodes.forEach((node) => {
      if (!state.manualPositions[node.id]) {
        state.manualPositions[node.id] = { x: node.x, y: node.y };
        manualPositionsUpdated = true;
      }
    });
    if (manualPositionsUpdated) {
      persistLayout();
    }
  }
  const nodes = [];
  const nodeMap = new Map();
  layout.nodes.forEach((node) => {
    const manual = state.manualPositions[node.id];
    const x = state.autoLayout || !manual ? node.x : manual.x;
    const y = state.autoLayout || !manual ? node.y : manual.y;
    const centerY = state.autoLayout || !manual ? node.centerY : y + node.height / 2;
    const positioned = { ...node, x, y, centerY };
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

  const dependencyEdges = [];
  if (state.showDependencies) {
    nodes.forEach((node) => {
      const deps = Array.isArray(node.story.dependencies) ? node.story.dependencies : [];
      deps.forEach((entry) => {
        if (!entry || entry.storyId == null) return;
        const target = nodeMap.get(entry.storyId);
        if (!target) return;
        const relationship = normalizeDependencyRelationship(entry.relationship);
        dependencyEdges.push({ from: node, to: target, relationship, info: entry });
      });
    });
  }

  if (nodes.length === 0) {
    layoutStatus.textContent = 'Toggle outline items to expand the map.';
    mindmapBounds = { width: 0, height: 0, fitWidth: 0, fitHeight: 0 };
    applyMindmapZoom();
    mindmapHasCentered = false;
    return;
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x + NODE_WIDTH));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y + node.height));
  const margin = 120;
  const baseWidth = maxX - minX;
  const baseHeight = maxY - minY;
  const wrapper = mindmapCanvas.parentElement;
  const wrapperWidth = wrapper ? wrapper.clientWidth : 0;
  const wrapperHeight = wrapper ? wrapper.clientHeight : 0;
  const desiredPaddingX = Math.max(margin, MINDMAP_STAGE_PADDING_X);
  const desiredPaddingY = Math.max(margin, MINDMAP_STAGE_PADDING_Y);
  const paddedWidth = baseWidth + desiredPaddingX * 2;
  const paddedHeight = baseHeight + desiredPaddingY * 2;
  const stageWidth = Math.max(paddedWidth, MINDMAP_STAGE_MIN_WIDTH, wrapperWidth + desiredPaddingX * 2);
  const stageHeight = Math.max(paddedHeight, MINDMAP_STAGE_MIN_HEIGHT, wrapperHeight + desiredPaddingY * 2);
  const stageMarginX = (stageWidth - baseWidth) / 2;
  const stageMarginY = (stageHeight - baseHeight) / 2;
  const viewMinX = minX - stageMarginX;
  const viewMinY = minY - stageMarginY;
  mindmapCanvas.setAttribute('viewBox', `${viewMinX} ${viewMinY} ${stageWidth} ${stageHeight}`);
  mindmapCanvas.setAttribute('width', String(stageWidth));
  mindmapCanvas.setAttribute('height', String(stageHeight));
  mindmapBounds = {
    width: stageWidth,
    height: stageHeight,
    fitWidth: stageWidth,
    fitHeight: stageHeight,
  };
  applyMindmapZoom();
  if (mindmapWrapper) {
    if (!mindmapHasCentered && (!scrollSnapshot || (scrollSnapshot.left === 0 && scrollSnapshot.top === 0))) {
      const centerLeft = Math.max(0, (mindmapWrapper.scrollWidth - mindmapWrapper.clientWidth) / 2);
      const centerTop = Math.max(0, (mindmapWrapper.scrollHeight - mindmapWrapper.clientHeight) / 2);
      mindmapWrapper.scrollLeft = centerLeft;
      mindmapWrapper.scrollTop = centerTop;
      mindmapHasCentered = true;
    } else if (scrollSnapshot) {
      const maxScrollLeft = Math.max(0, mindmapWrapper.scrollWidth - mindmapWrapper.clientWidth);
      const maxScrollTop = Math.max(0, mindmapWrapper.scrollHeight - mindmapWrapper.clientHeight);
      mindmapWrapper.scrollLeft = Math.min(Math.max(scrollSnapshot.left, 0), maxScrollLeft);
      mindmapWrapper.scrollTop = Math.min(Math.max(scrollSnapshot.top, 0), maxScrollTop);
    }
  }

  const svgNS = 'http://www.w3.org/2000/svg';

  const treeEdgeGroup = document.createElementNS(svgNS, 'g');
  treeEdgeGroup.classList.add('mindmap-tree-edges');
  edges.forEach((edge) => {
    const path = document.createElementNS(svgNS, 'path');
    path.classList.add('mindmap-edge');
    const startX = edge.from.x + NODE_WIDTH;
    const startY = edge.from.centerY;
    const endX = edge.to.x;
    const endY = edge.to.centerY;
    const midX = startX + (endX - startX) / 2;
    path.setAttribute('d', `M ${startX} ${startY} C ${midX} ${startY} ${midX} ${endY} ${endX} ${endY}`);
    treeEdgeGroup.appendChild(path);
  });
  mindmapCanvas.appendChild(treeEdgeGroup);

  function createDependencyMarker(id, color) {
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', id);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '10');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '8');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');
    const markerPath = document.createElementNS(svgNS, 'path');
    markerPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    markerPath.setAttribute('fill', color);
    marker.appendChild(markerPath);
    return marker;
  }

  if (state.showDependencies && dependencyEdges.length > 0) {
    mindmapCanvas.classList.add('has-dependencies');
    const defs = document.createElementNS(svgNS, 'defs');
    defs.appendChild(createDependencyMarker('dependency-arrow', 'rgba(71, 85, 105, 0.75)'));
    defs.appendChild(createDependencyMarker('dependency-arrow-blocker', '#dc2626'));
    mindmapCanvas.appendChild(defs);
  }

  if (state.showDependencies && dependencyEdges.length > 0) {
    const dependencyGroup = document.createElementNS(svgNS, 'g');
    dependencyGroup.classList.add('mindmap-dependencies');
    dependencyEdges.forEach((edge) => {
      const { start, end } = computeDependencyEndpoints(edge.from, edge.to);
      const path = document.createElementNS(svgNS, 'path');
      path.classList.add('mindmap-dependency-edge');
      if (edge.relationship === 'blocks') {
        path.classList.add('is-blocker');
      }
      path.setAttribute('d', `M ${start.x} ${start.y} L ${end.x} ${end.y}`);
      const markerId = edge.relationship === 'blocks' ? 'dependency-arrow-blocker' : 'dependency-arrow';
      path.setAttribute('marker-end', `url(#${markerId})`);
      const dependentTitle = edge.from.story && edge.from.story.title
        ? edge.from.story.title
        : `Story ${edge.from.story.id}`;
      const dependencyTitle = edge.info && edge.info.title ? edge.info.title : `Story ${edge.info.storyId}`;
      const dependentLabel = `#${edge.from.story.id} ${dependentTitle}`;
      const dependencyLabel = `#${edge.info.storyId} ${dependencyTitle}`;
      const verb = edge.relationship === 'blocks' ? 'is blocked by' : 'depends on';
      const title = document.createElementNS(svgNS, 'title');
      title.textContent = `${dependentLabel} ${verb} ${dependencyLabel}`;
      path.appendChild(title);
      dependencyGroup.appendChild(path);
      if (edge.relationship === 'blocks') {
        const label = document.createElementNS(svgNS, 'text');
        label.classList.add('mindmap-dependency-label');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('dominant-baseline', 'central');
        label.setAttribute('pointer-events', 'none');
        const labelX = start.x + (end.x - start.x) * 0.65;
        const labelY = start.y + (end.y - start.y) * 0.65;
        label.setAttribute('x', String(labelX));
        label.setAttribute('y', String(labelY));
        label.textContent = 'blocks';
        dependencyGroup.appendChild(label);
      }
    });
    mindmapCanvas.appendChild(dependencyGroup);
  }

  nodes.forEach((node) => {
    const group = document.createElementNS(svgNS, 'g');
    group.classList.add('mindmap-node');
    group.setAttribute('data-story-id', String(node.id));
    if (getEpicClassification(node.story)) {
      group.classList.add('classification-epic');
    }
    if (node.story.id === state.selectedStoryId) {
      group.classList.add('selected');
    }
    const nodeStatusClass = getStatusClass(node.story.status);
    if (nodeStatusClass) {
      group.classList.add(nodeStatusClass);
    }
    const nodeHealthSeverity = computeHealthSeverity(node.story);
    if (nodeHealthSeverity === 'critical') {
      group.classList.add('health-critical');
    } else if (nodeHealthSeverity === 'warning') {
      group.classList.add('health-warning');
    }

    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('x', String(node.x));
    rect.setAttribute('y', String(node.y));
    rect.setAttribute('width', String(NODE_WIDTH));
    rect.setAttribute('height', String(node.height));
    group.appendChild(rect);

    const foreignObject = document.createElementNS(svgNS, 'foreignObject');
    foreignObject.setAttribute('x', String(node.x));
    foreignObject.setAttribute('y', String(node.y));
    foreignObject.setAttribute('width', String(NODE_WIDTH));
    foreignObject.setAttribute('height', String(node.height));
    const body = createMindmapNodeBody(node.story, { namespace: true });
    if (node.contentOverflow) {
      body.classList.add('has-scroll');
    }
    foreignObject.appendChild(body);
    group.appendChild(foreignObject);

    if (node.story.children && node.story.children.length > 0) {
      const toggleBg = document.createElementNS(svgNS, 'circle');
      toggleBg.classList.add('toggle-bg');
      const toggleX = node.x + NODE_WIDTH - 16;
      const toggleY = node.y + 16;
      toggleBg.setAttribute('cx', String(toggleX));
      toggleBg.setAttribute('cy', String(toggleY));
      toggleBg.setAttribute('r', '12');
      toggleBg.setAttribute('data-prevent-mindmap-pan', 'true');
      toggleBg.addEventListener('pointerdown', (event) => event.stopPropagation());
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
      symbol.setAttribute('data-prevent-mindmap-pan', 'true');
      symbol.addEventListener('pointerdown', (event) => event.stopPropagation());
      symbol.addEventListener('mousedown', (event) => event.stopPropagation());
      symbol.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleStoryExpansion(node.story.id);
      });
      group.appendChild(symbol);
    }

    if (state.showDependencies) {
      const deps = Array.isArray(node.story.dependencies) ? node.story.dependencies : [];
      const blockingDeps = deps.filter((dep) =>
        dep && typeof dep.relationship === 'string' && dep.relationship.toLowerCase() === 'blocks'
      );
      let tooltipText = '';
      if (blockingDeps.length > 0) {
        const lines = blockingDeps.map((dep) => {
          const title = dep && dep.title ? dep.title : `Story ${dep.storyId}`;
          return `• #${dep.storyId} ${title}`;
        });
        tooltipText = `Blocking stories:\n${lines.join('\n')}`;
      } else if (deps.length > 0) {
        const lines = deps.map((dep) => {
          const title = dep && dep.title ? dep.title : `Story ${dep.storyId}`;
          return `• #${dep.storyId} ${title}`;
        });
        tooltipText = `Dependencies:\n${lines.join('\n')}`;
      } else {
        tooltipText = 'No dependencies.';
      }
      if (tooltipText) {
        const titleEl = document.createElementNS(svgNS, 'title');
        titleEl.textContent = tooltipText;
        group.appendChild(titleEl);
      }
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
    if (!dragging && state.autoLayout) {
      seedManualPositionsFromAutoLayout();
    }
    dragging = true;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    
    // Only switch to manual mode if user actually moved the story
    if ((Math.abs(dx) > 5 || Math.abs(dy) > 5) && state.autoLayout) {
      state.autoLayout = false;
      syncAutoLayoutControls();
    }
    
    state.manualPositions[node.id] = { x: originX + dx, y: originY + dy };
    renderMindmap();
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    if (!dragging) {
      handleStorySelection(node.story);
    } else {
      persistLayout();
      persistMindmap();
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

function formatComponentLabel(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComponentSelection(selection) {
  const selectedSet = new Set();
  if (Array.isArray(selection)) {
    selection.forEach((value) => {
      if (typeof value !== 'string') return;
      const canonical = COMPONENT_LOOKUP.get(value.trim().toLowerCase());
      if (canonical) {
        selectedSet.add(canonical);
      }
    });
  }
  return COMPONENT_OPTIONS.filter((component) => selectedSet.has(component));
}

async function openComponentPicker(initialSelection = [], options = {}) {
  const { title = 'Select Components' } = options;
  const selected = new Set(normalizeComponentSelection(initialSelection));
  const container = document.createElement('div');
  container.className = 'component-picker';

  const hint = document.createElement('p');
  hint.className = 'component-picker-hint';
  hint.textContent = 'Choose all components impacted by this story.';
  container.appendChild(hint);

  const grid = document.createElement('div');
  grid.className = 'component-picker-grid';
  COMPONENT_OPTIONS.forEach((component) => {
    const option = document.createElement('label');
    option.className = 'component-picker-option';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = component;
    checkbox.checked = selected.has(component);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selected.add(component);
      } else {
        selected.delete(component);
      }
    });
    const name = document.createElement('span');
    name.textContent = formatComponentLabel(component) || component;
    option.appendChild(checkbox);
    option.appendChild(name);
    grid.appendChild(option);
  });
  container.appendChild(grid);

  return await new Promise((resolve) => {
    let settled = false;

    const closeWith = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    openModal({
      title,
      content: container,
      actions: [
        {
          label: 'Clear Selection',
          variant: 'secondary',
          onClick: () => {
            selected.clear();
            grid.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
              checkbox.checked = false;
            });
            return false;
          },
        },
        {
          label: 'Apply',
          onClick: () => {
            closeWith(COMPONENT_OPTIONS.filter((component) => selected.has(component)));
            return true;
          },
        },
      ],
      onClose: () => closeWith(null),
    });
  });
}

function computeHeatmapData() {
  const flatStories = flattenStories(state.stories);
  if (flatStories.length === 0) {
    return { assignees: [], datasets: new Map(), columns: HEATMAP_COMPONENTS };
  }

  const datasets = new Map();
  const assignees = new Set();

  const ensureDataset = (key) => {
    if (!datasets.has(key)) {
      const matrix = new Map();
      HEATMAP_ACTIVITIES.forEach((activity) => {
        matrix.set(activity.key, new Map());
      });
      datasets.set(key, { matrix, total: 0 });
    }
    return datasets.get(key);
  };

  flatStories.forEach((story) => {
    const assignee = story.assigneeEmail && story.assigneeEmail.trim()
      ? story.assigneeEmail.trim()
      : 'Unassigned';
    assignees.add(assignee);

    const components = normalizeStoryComponentsForHeatmap(story.components);
    const activities = detectStoryActivitiesForHeatmap(story);
    const numericPoint = Number(story.storyPoint);
    const totalShare = Number.isFinite(numericPoint) && numericPoint > 0 ? numericPoint : 1;

    if (totalShare <= 0 || components.length === 0 || activities.length === 0) {
      return;
    }

    const perActivityShare = totalShare / activities.length;
    const perCellShare = perActivityShare / components.length;

    const allDataset = ensureDataset('__ALL__');
    const assigneeDataset = ensureDataset(assignee);

    activities.forEach((activityKey) => {
      const allRow = allDataset.matrix.get(activityKey);
      const assigneeRow = assigneeDataset.matrix.get(activityKey);
      components.forEach((componentKey) => {
        allRow.set(componentKey, (allRow.get(componentKey) ?? 0) + perCellShare);
        assigneeRow.set(componentKey, (assigneeRow.get(componentKey) ?? 0) + perCellShare);
      });
    });

    allDataset.total += totalShare;
    assigneeDataset.total += totalShare;
  });

  const datasetsWithRows = new Map();
  datasets.forEach((dataset, key) => {
    const { matrix, total } = dataset;
    let maxPercent = 0;
    const rows = HEATMAP_ACTIVITIES.map((activity) => {
      const row = matrix.get(activity.key) ?? new Map();
      const cells = HEATMAP_COMPONENTS.map((component) => {
        const value = row.get(component.key) ?? 0;
        const percent = total > 0 ? (value / total) * 100 : 0;
        if (percent > maxPercent) {
          maxPercent = percent;
        }
        return { component: component.key, value, percent };
      });
      return { activity: activity.label, key: activity.key, cells };
    });

    datasetsWithRows.set(key, { rows, total, maxPercent });
  });

  const sortedAssignees = Array.from(assignees).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  const options = [];
  if (datasetsWithRows.has('__ALL__')) {
    options.push({ key: '__ALL__', label: 'All assignees' });
  }
  sortedAssignees.forEach((label) => options.push({ key: label, label }));

  return { assignees: options, datasets: datasetsWithRows, columns: HEATMAP_COMPONENTS };
}

function buildDeployToDevModalContent(prEntry = null) {
  const container = document.createElement('div');
  container.className = 'deploy-dev-modal';
  
  const prId = prEntry?.number || prEntry?.targetNumber || 'unknown';
  
  const prInfo = prEntry ? `
    <div class="pr-info">
      <h4>PR Information</h4>
      <p><strong>PR ID:</strong> ${prId}</p>
      <p><strong>Title:</strong> ${escapeHtml(prEntry.taskTitle || 'Development task')}</p>
      ${prEntry.prUrl ? `<p><strong>PR:</strong> <a href="${escapeHtml(prEntry.prUrl)}" target="_blank">${formatCodeWhispererTargetLabel(prEntry)}</a></p>` : ''}
      <p><strong>Target Branch:</strong> main</p>
    </div>
  ` : '';
  
  container.innerHTML = `
    ${prInfo}
    <div class="deploy-options">
      <h3>Deploy to Development Environment</h3>
      <p>This will deploy the PR branch to the development environment for testing.</p>
      
      <div class="workflow-steps">
        <div class="step">1. Deploy PR branch to development environment</div>
        <div class="step">2. Test changes in dev</div>
        <div class="step">3. After approval, merge PR to main</div>
        <div class="step">4. Deploy to production</div>
      </div>
      
      <div class="deploy-actions">
        <button id="deploy-to-dev-btn" class="primary">Deploy Now</button>
        <button id="check-deploy-status" class="secondary">Check Status</button>
      </div>
      
      <div id="deploy-output" class="deploy-output" style="display:none;">
        <h4>Deployment Output:</h4>
        <pre id="deploy-log"></pre>
      </div>
    </div>
  `;
  
  const deployBtn = container.querySelector('#deploy-to-dev-btn');
  const statusBtn = container.querySelector('#check-deploy-status');
  const output = container.querySelector('#deploy-output');
  const log = container.querySelector('#deploy-log');
  
  deployBtn.addEventListener('click', async () => {
    deployBtn.disabled = true;
    deployBtn.textContent = 'Deploying...';
    
    output.style.display = 'block';
    log.textContent = `🚀 Deploying PR to development environment...\n`;
    log.textContent += `📝 PR: ${prEntry?.taskTitle || 'Development task'}\n\n`;
    
    try {
      log.textContent += `⚙️  Triggering deployment...\n`;
      
      // Call deployment API
      const result = await bedrockImplementation(prEntry);
      
      if (!result || !result.success) {
        throw new Error(result?.message || 'Deployment failed');
      }
      
      log.textContent += `✅ Deployment triggered successfully!\n\n`;
      log.textContent += `🌐 Dev URL: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com\n`;
      
      deployBtn.textContent = 'Deploy Now';
      deployBtn.disabled = false;
    } catch (error) {
      log.textContent += `\n❌ Error: ${error.message}\n`;
      deployBtn.textContent = 'Deploy Now';
      deployBtn.disabled = false;
    }
  });
  
  statusBtn.addEventListener('click', () => {
    output.style.display = 'block';
    log.textContent = `Checking deployment status for PR ${prId}...\n`;
    log.textContent += `Development environment: http://aipm-dev-frontend-hosting.s3-website-us-east-1.amazonaws.com/\n`;
    log.textContent += `Status: Ready for testing\n`;
  });
  
  return { element: container, onClose: () => {} };
}

function getEc2TerminalBaseUrl() {
  return window.CONFIG?.EC2_TERMINAL_URL || 'ws://44.220.45.57:8080';
}

function toHttpTerminalUrl(baseUrl) {
  if (!baseUrl) return '';
  if (baseUrl.startsWith('ws://')) return `http://${baseUrl.slice(5)}`;
  if (baseUrl.startsWith('wss://')) return `https://${baseUrl.slice(6)}`;
  return baseUrl;
}

function buildStandaloneTerminalUrl(story = null) {
  const params = new URLSearchParams();

  const branch = story?.branchName || story?.branch;
  if (branch) params.set('branch', branch);
  if (story?.id) params.set('storyId', story.id);
  if (story?.title) params.set('storyTitle', story.title);

  const terminalUrl = new URL('terminal/simple.html', window.location.href);
  terminalUrl.search = params.toString();
  return terminalUrl.toString();
}

function buildKiroContextSummary(story) {
  if (!story) return '';

  const parts = [];
  parts.push(`Story: ${story.title || 'Untitled story'}`);

  if (story.description) {
    parts.push(`Description:\n${story.description}`);
  }

  const tests = Array.isArray(story.acceptanceTests) ? story.acceptanceTests : [];
  if (tests.length) {
    const formatted = tests
      .map((test, index) => {
        const title = test.title || `Acceptance Test ${index + 1}`;
        const status = test.status || 'Draft';
        const given = test.given || '';
        const when = test.when || '';
        const then = test.then || '';
        return [`• ${title} (${status})`, given && `  Given ${given}`, when && `  When ${when}`, then && `  Then ${then}`]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');
    parts.push(`Acceptance Tests:\n${formatted}`);
  }

  const components = Array.isArray(story.components) ? story.components : [];
  if (components.length) {
    parts.push(`Components: ${components.map(formatComponentLabel).join(', ')}`);
  }

  return parts.filter(Boolean).join('\n\n');
}

async function prepareKiroTerminalContext(prEntry = {}) {
  const context = { summary: '', branchStatus: '' };

  if (prEntry.storyId && storyIndex.has(prEntry.storyId)) {
    context.summary = buildKiroContextSummary(storyIndex.get(prEntry.storyId));
  }

  const baseUrl = getEc2TerminalBaseUrl();
  const httpBase = toHttpTerminalUrl(baseUrl);

  if (prEntry?.branchName && httpBase) {
    try {
      const response = await fetch(`${httpBase}/checkout-branch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: prEntry.branchName })
      });

      const result = await response.json();

      if (result.success) {
        context.branchStatus = `✓ Branch ${prEntry.branchName} ready`;
      } else {
        context.branchStatus = `⚠️  Branch checkout warning: ${result.message}`;
      }
    } catch (error) {
      context.branchStatus = `⚠️  Could not pre-checkout branch: ${error.message}`;
    }
  }

  return context;
}

async function buildKiroTerminalModalContent(prEntry = null, kiroContext = {}) {
  const container = document.createElement('div');
  container.className = 'run-staging-modal';
  
  console.log('🔍 PR Entry:', prEntry);
  
  const prId = prEntry?.number || prEntry?.targetNumber || 'unknown';
  const branchName = prEntry?.branchName || 'main';
  
  const prInfo = prEntry ? `
    <div class="pr-info">
      <h4>PR Information</h4>
      <p><strong>PR ID:</strong> ${prId}</p>
      <p><strong>Title:</strong> ${escapeHtml(prEntry.taskTitle || 'Development task')}</p>
      ${prEntry.prUrl ? `<p><strong>PR:</strong> <a href="${escapeHtml(prEntry.prUrl)}" target="_blank">${formatCodeWhispererTargetLabel(prEntry)}</a></p>` : ''}
      <p><strong>Branch:</strong> ${escapeHtml(branchName)}</p>
    </div>
  ` : '';
  
  const contextSummary = kiroContext?.summary
    ? `<div class="kiro-context"><h4>Loaded context</h4><pre>${escapeHtml(kiroContext.summary)}</pre></div>`
    : '';

  container.innerHTML = `
    ${prInfo}
    <div class="staging-options">
      <h3>Refine PR with Kiro</h3>
      ${contextSummary}
      <div id="terminal-container" style="width: 100%; height: 60vh; background: #000; padding: 10px 10px 50px 10px; box-sizing: border-box; overflow: auto;"></div>
    </div>
  `;
  
  const terminalContainer = container.querySelector('#terminal-container');
  
  let terminal = null;
  let socket = null;
  
  // Auto-start terminal immediately
  if (!window.Terminal) {
    terminalContainer.textContent = 'Terminal library not loaded. Please refresh the page.';
    return { element: container, onClose: () => {} };
  }
  
  // Create xterm terminal
  terminal = new window.Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    theme: {
      background: '#000000',
      foreground: '#ffffff'
    }
  });
  
  terminal.open(terminalContainer);
  
  // Manual resize function
  const resizeTerminal = () => {
    const width = terminalContainer.clientWidth;
    const height = terminalContainer.clientHeight;
    const cols = Math.floor(width / 9); // Approximate char width
    const rows = Math.floor(height / 17); // Approximate line height
    if (cols > 0 && rows > 0) {
      terminal.resize(cols, rows);
    }
  };
  
    resizeTerminal(); // Initial size
    terminal.writeln('🔌 Connecting to Kiro CLI terminal...');
    terminal.writeln('');

    // Connect to EC2 WebSocket server
    const EC2_TERMINAL_URL = getEc2TerminalBaseUrl();

    if (kiroContext?.branchStatus) {
      terminal.writeln(kiroContext.branchStatus);
      terminal.writeln('');
    }

    const wsUrl = `${EC2_TERMINAL_URL}/terminal?branch=${encodeURIComponent(prEntry?.branch || 'main')}`;

    const decodeSocketData = async (data) => {
      if (typeof data === 'string') return data;

      try {
        if (data instanceof Blob) {
          return await data.text();
        }

        if (data instanceof ArrayBuffer) {
          return new TextDecoder().decode(data);
        }
      } catch (error) {
        console.warn('Failed to decode terminal data', error);
      }

      return '';
    };

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      terminal.writeln('✓ Connected to Kiro CLI');
      if (prEntry?.taskTitle) {
        terminal.writeln(`📋 PR: ${prEntry.taskTitle}`);
      }
      terminal.writeln('');
      terminal.writeln('💬 Start chatting with Kiro to refine your code!');
      terminal.writeln('');
    };

    socket.onmessage = async (event) => {
      const text = await decodeSocketData(event.data);
      terminal.write(text);
    };

    socket.onerror = (error) => {
      terminal.writeln('\r\n❌ Connection error');
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      terminal.writeln('\r\n🔌 Disconnected');
    };

    // Send terminal input to EC2
    terminal.onData((data) => {
      console.log('Terminal input:', data, 'Socket state:', socket?.readyState);
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log('Sending raw data to WebSocket:', data);
        socket.send(data);
      } else {
        console.warn('Socket not ready, state:', socket?.readyState);
      }
    });

    // Auto-resize terminal when modal is resized
    const resizeObserver = new ResizeObserver(() => {
      if (terminal && terminalContainer) {
        const width = terminalContainer.clientWidth;
        const height = terminalContainer.clientHeight;
        const cols = Math.floor(width / 9);
        const rows = Math.floor(height / 17);
        if (cols > 0 && rows > 0) {
          terminal.resize(cols, rows);
        }
      }
    });
    resizeObserver.observe(terminalContainer);

    return {
      element: container,
      onClose: () => {
        resizeObserver.disconnect();
        if (socket) socket.close();
        if (terminal) terminal.dispose();
      }
    };
}

async function bedrockImplementation(prEntry) {
  // Call AIPM backend to trigger GitHub Action deployment
  try {
    const payload = {
      prNumber: prEntry?.number || prEntry?.targetNumber,
      branchName: prEntry?.branchName
    };
    
    console.log('📤 Deploying PR to staging:', payload);
    
    const response = await fetch(resolveApiUrl('/api/deploy-pr'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Deploy API error:', response.status, errorText);
      throw new Error(`Deploy API returned ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📥 Response from /api/deploy-pr:', result);
    
    if (result.success) {
      console.log('✅ Deployment triggered:', result.stagingUrl);
      return {
        success: true,
        workflowUrl: result.workflowUrl,
        deploymentUrl: result.stagingUrl,
        message: result.message
      };
    } else {
      console.log('⚠️ Deployment failed:', result.error);
      return { success: false, message: result.error || 'Deployment failed' };
    }
  } catch (error) {
    console.error('❌ Deployment error:', error);
    return { success: false, message: error.message };
  }
}

function buildHeatmapModalContent() {
  const container = document.createElement('div');
  container.className = 'heatmap-modal';

  const data = computeHeatmapData();
  if (!data.assignees.length) {
    const placeholder = document.createElement('p');
    placeholder.className = 'placeholder';
    placeholder.textContent =
      'Assign user stories with assignees, components, and story points to see workload distribution.';
    container.appendChild(placeholder);
    return {
      element: container,
      onClose: () => {
        modal.style.width = '';
        modal.style.maxWidth = '';
        modalBody.style.width = '';
      },
    };
  }

  const controls = document.createElement('div');
  controls.className = 'heatmap-controls';

  const label = document.createElement('label');
  label.textContent = 'Assignee:';
  label.setAttribute('for', 'heatmap-assignee');
  controls.appendChild(label);

  const select = document.createElement('select');
  select.id = 'heatmap-assignee';
  select.className = 'heatmap-select';
  data.assignees.forEach((entry, index) => {
    const option = document.createElement('option');
    option.value = entry.key;
    option.textContent = entry.label;
    if (index === 0) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  controls.appendChild(select);
  container.appendChild(controls);

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'heatmap-table-wrapper';
  container.appendChild(tableWrapper);

  const note = document.createElement('p');
  note.className = 'heatmap-note';
  note.textContent =
    'Percentages show how the selected assignee’s workload is distributed across components and activities.';
  container.appendChild(note);

  const syncWidthToTable = () => {
    requestAnimationFrame(() => {
      const table = tableWrapper.querySelector('table');
      const tableWidth = table ? Math.ceil(table.getBoundingClientRect().width) : 0;
      const controlsWidth = Math.ceil(controls.getBoundingClientRect().width);
      const noteWidth = Math.ceil(note.getBoundingClientRect().width);
      const desired = Math.max(tableWidth, controlsWidth, noteWidth);

      if (!desired) {
        container.style.width = '';
        tableWrapper.style.maxWidth = '';
        modalBody.style.width = '';
        modal.style.width = '';
        modal.style.maxWidth = '';
        return;
      }

      const bodyStyles = window.getComputedStyle(modalBody);
      const paddingLeft = parseFloat(bodyStyles.paddingLeft || '0');
      const paddingRight = parseFloat(bodyStyles.paddingRight || '0');
      const horizontalPadding = (Number.isFinite(paddingLeft) ? paddingLeft : 0) +
        (Number.isFinite(paddingRight) ? paddingRight : 0);
      const maxDialogWidth = Math.floor(window.innerWidth * 0.98);
      const maxContentWidth = Math.max(maxDialogWidth - horizontalPadding, 0);
      const contentWidth = Math.min(desired, maxContentWidth || desired);

      container.style.width = `${contentWidth}px`;
      tableWrapper.style.maxWidth = `${contentWidth}px`;
      modalBody.style.width = `${contentWidth}px`;
      const dialogWidth = Math.min(contentWidth + horizontalPadding, maxDialogWidth);
      modal.style.width = `${dialogWidth}px`;
      modal.style.maxWidth = `${maxDialogWidth}px`;
    });
  };

  const renderTable = (assigneeKey) => {
    tableWrapper.innerHTML = '';
    const dataset = data.datasets.get(assigneeKey);
    if (!dataset || dataset.total <= 0) {
      const placeholder = document.createElement('p');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'No workload recorded for this assignee yet.';
      tableWrapper.appendChild(placeholder);
      container.style.width = '';
      tableWrapper.style.maxWidth = '';
      modalBody.style.width = '';
      modal.style.width = '';
      modal.style.maxWidth = '';
      return;
    }

    const table = document.createElement('table');
    table.className = 'heatmap-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const activityHeader = document.createElement('th');
    activityHeader.textContent = 'Activity -> Area >';
    headerRow.appendChild(activityHeader);

    data.columns.forEach((column) => {
      const th = document.createElement('th');
      th.textContent = column.label;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    const formatPercent = (value) => {
      if (value <= 0) {
        return null;
      }
      return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
    };

    const formatPoints = (value) => {
      if (!Number.isFinite(value)) {
        return '0';
      }
      return Number.isInteger(value) ? String(value) : value.toFixed(1);
    };

    dataset.rows.forEach((row) => {
      const tr = document.createElement('tr');
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.textContent = row.activity;
      tr.appendChild(heading);

      row.cells.forEach((cellData) => {
        const cell = document.createElement('td');
        cell.className = 'heatmap-cell';
        const percentLabel = formatPercent(cellData.percent);
        if (percentLabel) {
          const ratio = dataset.maxPercent > 0 ? cellData.percent / dataset.maxPercent : 0;
          const alpha = 0.15 + ratio * 0.65;
          cell.style.backgroundColor = `rgba(37, 99, 235, ${alpha.toFixed(3)})`;
          cell.style.color = ratio > 0.55 ? '#fff' : '#1f2937';
          cell.textContent = percentLabel;
          cell.title = `${row.activity} · ${lookupHeatmapComponentLabel(cellData.component)}: ${percentLabel} (${formatPoints(
            cellData.value
          )} story points)`;
        } else {
          cell.classList.add('empty');
          cell.textContent = '0%';
          cell.title = `${row.activity} · ${lookupHeatmapComponentLabel(
            cellData.component
          )}: 0% (0 story points)`;
        }
        tr.appendChild(cell);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    syncWidthToTable();
  };

  select.addEventListener('change', (event) => {
    renderTable(event.target.value);
  });

  window.addEventListener('resize', syncWidthToTable);
  renderTable(select.value);

  return {
    element: container,
    onClose: () => {
      window.removeEventListener('resize', syncWidthToTable);
      container.style.width = '';
      tableWrapper.style.maxWidth = '';
      modalBody.style.width = '';
      modal.style.width = '';
      modal.style.maxWidth = '';
    },
  };
}

function lookupHeatmapComponentLabel(key) {
  const match = HEATMAP_COMPONENTS.find((entry) => entry.key === key);
  return match ? match.label : key.replace(/_/g, ' ');
}

function normalizeStoryComponentsForHeatmap(components) {
  const result = [];
  const source = Array.isArray(components) ? components : [];
  source.forEach((entry) => {
    if (typeof entry !== 'string') {
      return;
    }
    const trimmed = entry.trim();
    if (!trimmed) {
      return;
    }
    const lower = trimmed.toLowerCase();
    const synonym = COMPONENT_SYNONYMS.get(lower);
    if (synonym) {
      result.push(synonym);
      return;
    }
    const canonical = HEATMAP_COMPONENT_LOOKUP.get(lower);
    if (canonical) {
      result.push(canonical);
    }
  });

  const unique = Array.from(new Set(result));

  if (unique.length === 0) {
    return ['system_srs'];
  }

  return unique;
}

function detectStoryActivitiesForHeatmap(story) {
  const detected = new Set();
  const tasks = Array.isArray(story?.tasks) ? story.tasks : [];
  tasks.forEach((task) => {
    const text = `${task?.title ?? ''} ${task?.description ?? ''}`.toLowerCase();
    if (!text.trim()) {
      return;
    }
    HEATMAP_ACTIVITY_KEYWORDS.forEach((mapping) => {
      if (mapping.patterns.some((pattern) => pattern.test(text))) {
        detected.add(mapping.key);
      }
    });
  });

  const storyText = `${story?.title ?? ''} ${story?.summary ?? ''} ${story?.asA ?? ''} ${
    story?.iWant ?? ''
  } ${story?.soThat ?? ''}`
    .toLowerCase()
    .trim();

  if (storyText) {
    HEATMAP_ACTIVITY_KEYWORDS.forEach((mapping) => {
      if (mapping.patterns.some((pattern) => pattern.test(storyText))) {
        detected.add(mapping.key);
      }
    });
  }

  if (detected.size === 0) {
    const status = typeof story?.status === 'string' ? story.status.toLowerCase() : '';
    if (status === 'draft') {
      detected.add('design');
    } else if (status === 'approved') {
      detected.add('verification');
    }
  }

  if (
    detected.size === 0 &&
    Array.isArray(story?.acceptanceTests) &&
    story.acceptanceTests.length > 0
  ) {
    detected.add('test_automation');
  }

  if (detected.size === 0) {
    detected.add('implementation');
  }

  return Array.from(detected);
}

let renderDetailsTimeout = null;

function renderDetails() {
  // Debounce rapid calls
  if (renderDetailsTimeout) {
    clearTimeout(renderDetailsTimeout);
  }
  renderDetailsTimeout = setTimeout(() => {
    renderDetailsTimeout = null;
    _renderDetailsImmediate();
  }, 10);
}

function _renderDetailsImmediate() {
  console.log('🎯 _renderDetailsImmediate called');
  if (!state.panelVisibility.details) {
    console.log('❌ Details panel not visible');
    return;
  }
  const story = state.selectedStoryId != null ? storyIndex.get(state.selectedStoryId) : null;
  console.log('📖 Selected story:', story?.id, story?.title);
  console.log('📊 Story data:', {
    acceptanceTests: story?.acceptanceTests?.length || 0,
    prs: story?.prs?.length || 0
  });
  detailsContent.innerHTML = '';
  if (!story) {
    detailsPlaceholder.classList.remove('hidden');
    console.log('❌ No story selected');
    return;
  }

  console.log('✅ Story found, rendering details...');
  detailsPlaceholder.classList.add('hidden');

  const form = document.createElement('form');
  form.className = 'story-form';
  const storySeverity = computeHealthSeverity(story);
  if (storySeverity === 'critical') {
    form.classList.add('health-critical');
  } else if (storySeverity === 'warning') {
    form.classList.add('health-warning');
  }
  form.innerHTML = `
    <div class="form-toolbar">
      <button type="button" class="secondary" id="edit-story-btn">Edit Story</button>
      <button type="button" class="primary" id="mark-done-btn">Done</button>
      <button type="button" class="danger" id="delete-story-btn">Delete</button>
    </div>
    <div class="full field-row">
      <label>Title</label>
      <div class="story-text">${escapeHtml(story.title)}</div>
    </div>
    <div class="full field-row">
      <label>Assignee Email</label>
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <span class="story-text">${escapeHtml(story.assigneeEmail || 'Not assigned')}</span>
        <button type="button" class="secondary" id="assignee-email-btn" ${
          story.assigneeEmail ? '' : 'disabled'
        }>Email</button>
      </div>
    </div>
    <div class="full">
      <label>Description</label>
      <div class="story-text">${escapeHtml(story.description || '')}</div>
    </div>
    <div class="full">
      <table class="story-brief">
        <tbody>
          <tr>
            <th scope="row">As a</th>
            <td class="story-text">${escapeHtml(story.asA || '')}</td>
          </tr>
          <tr>
            <th scope="row">I want</th>
            <td class="story-text">${escapeHtml(story.iWant || '')}</td>
          </tr>
          <tr>
            <th scope="row">So that</th>
            <td class="story-text">${escapeHtml(story.soThat || '')}</td>
          </tr>
          <tr>
            <th scope="row">Components</th>
            <td>
              <p class="components-display">${escapeHtml(
                formatComponentsSummary(story.components)
              )}</p>
              <div class="components-actions">
                <button type="button" class="secondary components-edit-btn" id="components-edit-btn">
                  Choose components
                </button>
                <p class="components-hint">Select all components impacted by this story.</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  const rawInvestHealth = story.investHealth || {
    satisfied: !story.investWarnings || story.investWarnings.length === 0,
    issues: story.investWarnings || [],
  };
  const investHealthIssues = filterEpicSizingWarnings(story, rawInvestHealth.issues);
  const investHealth = {
    satisfied: investHealthIssues.length === 0,
    issues: investHealthIssues,
  };
  const analysisInfo = story.investAnalysis || null;
  const fallbackWarnings = filterEpicSizingWarnings(
    story,
    Array.isArray(analysisInfo?.fallbackWarnings) ? analysisInfo.fallbackWarnings : []
  );
  let statusSelect = null;
  let statusValueEl = null;
  let statusDescriptionEl = null;
  let statusValue = story.status || 'Draft';
  let statusReference = STORY_STATUS_GUIDE.slice();

  const storyBriefBody = form.querySelector('.story-brief tbody');
  const componentsDisplay = form.querySelector('.components-display');
  const componentsHint = form.querySelector('.components-hint');
  const componentsEditButton = form.querySelector('#components-edit-btn');
  let selectedComponents = normalizeComponentSelection(story.components);

  const refreshComponentsDisplay = () => {
    if (!componentsDisplay) return;
    const summary = formatComponentsSummary(selectedComponents);
    componentsDisplay.textContent = summary;
    if (summary === 'Not specified') {
      componentsDisplay.classList.add('empty');
    } else {
      componentsDisplay.classList.remove('empty');
    }
  };

  refreshComponentsDisplay();

  componentsEditButton?.addEventListener('click', async () => {
    const picked = await openComponentPicker(selectedComponents, { title: 'Select Components' });
    if (Array.isArray(picked)) {
      selectedComponents = picked;
      refreshComponentsDisplay();
    }
  });
  if (storyBriefBody) {
    const summaryRow = document.createElement('tr');
    summaryRow.className = 'story-meta-row';
    const summaryHeader = document.createElement('th');
    summaryHeader.scope = 'row';
    summaryHeader.textContent = 'Summary';
    const summaryCell = document.createElement('td');
    const metaGrid = document.createElement('div');
    metaGrid.className = 'story-meta-grid';

    const epicClassification = getEpicClassification(story);
    if (epicClassification) {
      const typeItem = document.createElement('div');
      typeItem.className = 'story-meta-item';
      const typeLabel = document.createElement('span');
      typeLabel.className = 'story-meta-label';
      typeLabel.textContent = 'Story Type';
      typeItem.appendChild(typeLabel);

      const typeValue = document.createElement('span');
      typeValue.className = 'story-meta-value';
      const badge = document.createElement('span');
      badge.className = 'story-classification-badge';
      badge.textContent = epicClassification.label;
      badge.classList.add(`is-${epicClassification.key}`);
      badge.style.backgroundColor = epicClassification.color;
      badge.style.color = epicClassification.textColor;
      typeValue.appendChild(badge);

      if (Number.isFinite(epicClassification.points)) {
        const summary = formatStoryPointSummary(epicClassification.points);
        if (summary) {
          const detail = document.createElement('span');
          detail.className = 'story-classification-detail';
          detail.textContent = `· ${summary}`;
          typeValue.appendChild(detail);
        }
      }

      typeItem.appendChild(typeValue);
      metaGrid.appendChild(typeItem);
    }

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
        const originLabel = describeIssueOrigin(issue.source);
        const parts = [];
        if (originLabel) parts.push(originLabel);
        if (criterionLabel) parts.push(criterionLabel);
        button.textContent = `${parts.length ? `${parts.join(' · ')} – ` : ''}${issue.message}`;
        button.addEventListener('click', () => openHealthIssueModal('INVEST Issue', issue, analysisInfo));
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

    if (analysisInfo) {
      const analysisNote = document.createElement('p');
      analysisNote.className = 'health-analysis-note';
      if (analysisInfo.source === 'openai') {
        const model = analysisInfo.aiModel ? ` (model ${analysisInfo.aiModel})` : '';
        const heuristicsTail = fallbackWarnings.length
          ? ' Additional heuristic suggestions are listed below.'
          : '';
        if (analysisInfo.aiSummary) {
          const suffix = heuristicsTail ? `${heuristicsTail}` : '';
          analysisNote.textContent = `ChatGPT${model} summary: ${analysisInfo.aiSummary}${suffix}`;
        } else {
          analysisNote.textContent = `ChatGPT${model} reviewed this story.${heuristicsTail}`;
        }
      } else if (analysisInfo.source === 'fallback') {
        const detail = analysisInfo.error ? ` (${analysisInfo.error})` : '';
        analysisNote.textContent = `ChatGPT analysis unavailable${detail}; showing local heuristics.`;
      } else {
        analysisNote.textContent = 'Using local INVEST heuristics.';
      }
      healthItem.appendChild(analysisNote);
    }

    const healthActions = document.createElement('div');
    healthActions.className = 'health-actions';
    healthActions.style.marginTop = '0.75rem';
    const aiButton = document.createElement('button');
    aiButton.type = 'button';
    aiButton.className = 'secondary';
    const aiButtonLabel =
      analysisInfo && analysisInfo.source === 'openai'
        ? 'Re-run AI INVEST check'
        : 'Run AI INVEST check';
    aiButton.textContent = aiButtonLabel;
    aiButton.addEventListener('click', async () => {
      if (aiButton.disabled) {
        return;
      }
      const originalLabel = aiButton.textContent;
      aiButton.disabled = true;
      aiButton.textContent = 'Running…';
      let applied = false;
      try {
        const refreshed = await recheckStoryHealth(story.id, { includeAiInvest: true });
        applied = applyStoryUpdate(refreshed);
        if (!applied) {
          throw new Error('Story could not be refreshed.');
        }
        persistSelection();
        showToast('AI INVEST check completed.', 'success');
      } catch (error) {
        console.error('Failed to run AI INVEST check', error);
        const message =
          error && typeof error.message === 'string'
            ? error.message
            : 'Failed to run AI INVEST check.';
        showToast(message, 'error');
      } finally {
        aiButton.disabled = false;
        aiButton.textContent = originalLabel;
        if (applied) {
          renderAll();
        }
      }
    });
    healthActions.appendChild(aiButton);
    healthItem.appendChild(healthActions);

    if (analysisInfo && analysisInfo.source === 'openai' && fallbackWarnings.length) {
      const aiMessages = new Set(
        (investHealth.issues || []).map((issue) => (issue && issue.message ? issue.message : ''))
      );
      const heuristicItems = fallbackWarnings.filter(
        (issue) => issue && issue.message && !aiMessages.has(issue.message)
      );

      const heuristicsHeading = document.createElement('h4');
      heuristicsHeading.className = 'health-subheading';
      heuristicsHeading.textContent = 'Additional rule-check suggestions';
      healthItem.appendChild(heuristicsHeading);

      const heuristicsList = document.createElement('ul');
      heuristicsList.className = 'health-issue-list heuristic-list';

      if (!heuristicItems.length) {
        const empty = document.createElement('li');
        empty.textContent = 'No extra suggestions beyond ChatGPT feedback.';
        heuristicsList.appendChild(empty);
      } else {
        heuristicItems.forEach((issue) => {
          const item = document.createElement('li');
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'link-button health-issue-button';
          const criterionLabel = formatCriterionLabel(issue.criterion);
          const originLabel = describeIssueOrigin(issue.source);
          const parts = [];
          if (originLabel) parts.push(originLabel);
          if (criterionLabel) parts.push(criterionLabel);
          const prefix = parts.length ? `${parts.join(' · ')} – ` : '';
          button.textContent = `${prefix}${issue.message}`;
          button.addEventListener('click', () =>
            openHealthIssueModal('Heuristic Suggestion', issue, analysisInfo)
          );
          item.appendChild(button);
          heuristicsList.appendChild(item);
        });
      }

      healthItem.appendChild(heuristicsList);
    }

    metaGrid.appendChild(healthItem);

    summaryCell.appendChild(metaGrid);
    summaryRow.appendChild(summaryHeader);
    summaryRow.appendChild(summaryCell);
    storyBriefBody.appendChild(summaryRow);
  }

  if (storyBriefBody) {
    const statusRow = document.createElement('tr');
    statusRow.className = 'story-status-row';
    const statusHeader = document.createElement('th');
    statusHeader.scope = 'row';
    statusHeader.textContent = 'Status';
    const statusCell = document.createElement('td');
    if (!statusReference.some((item) => item.value === statusValue)) {
      statusReference.push({
        value: statusValue,
        description: 'Workspace-specific status. Confirm expectations with your team.',
      });
    }
    const currentStatusEntry = statusReference.find((item) => item.value === statusValue);
    statusValueEl = document.createElement('span');
    statusValueEl.className = `status-value status-badge ${getStatusClass(statusValue)}`;
    statusValueEl.textContent = statusValue;
    statusCell.appendChild(statusValueEl);

    if (currentStatusEntry && currentStatusEntry.description) {
      statusDescriptionEl = document.createElement('p');
      statusDescriptionEl.className = 'status-description';
      statusDescriptionEl.textContent = currentStatusEntry.description;
      statusCell.appendChild(statusDescriptionEl);
    }

    statusSelect = document.createElement('select');
    statusSelect.name = 'status';
    statusSelect.className = 'status-select';
    const statusOptions = Array.from(
      new Set([
        ...STORY_STATUS_GUIDE.map((item) => item.value),
        ...Object.keys(STATUS_CLASS_MAP),
      ])
    );
    statusOptions.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option;
      opt.textContent = option;
      if (option === statusValue) {
        opt.selected = true;
      }
      statusSelect.appendChild(opt);
    });
    statusSelect.hidden = true;
    statusCell.appendChild(statusSelect);

    statusSelect.addEventListener('change', () => {
      const selected = statusSelect.value;
      statusValueEl.textContent = selected;
      statusValueEl.className = `status-value status-badge ${getStatusClass(selected)}`;
      const entry = statusReference.find((item) => item.value === selected);
      if (entry && statusDescriptionEl) {
        statusDescriptionEl.textContent = entry.description;
      }
    });

    statusRow.appendChild(statusHeader);
    statusRow.appendChild(statusCell);
    storyBriefBody.appendChild(statusRow);

    const pointRow = document.createElement('tr');
    pointRow.className = 'story-point-row';
    const pointHeader = document.createElement('th');
    pointHeader.scope = 'row';
    pointHeader.textContent = 'Story Point';
    const pointCell = document.createElement('td');
    const pointDisplay = document.createElement('span');
    pointDisplay.className = 'story-text';
    pointDisplay.textContent = story.storyPoint != null ? story.storyPoint : 'Not estimated';
    pointCell.appendChild(pointDisplay);
    pointRow.appendChild(pointHeader);
    pointRow.appendChild(pointCell);
    storyBriefBody.appendChild(pointRow);
  }

  detailsContent.appendChild(form);

  const editButton = form.querySelector('#edit-story-btn');
  const deleteButton = form.querySelector('#delete-story-btn');
  const editableFields = Array.from(
    form.querySelectorAll('input[name], textarea[name], select[name]')
  );

  function setEditing(enabled) {
    editableFields.forEach((field) => {
      field.disabled = !enabled;
    });
    if (statusSelect) {
      statusSelect.hidden = !enabled;
    }
    if (statusValueEl) {
      statusValueEl.style.display = enabled ? 'none' : 'inline-flex';
    }
    if (editButton) {
      editButton.textContent = enabled ? 'Cancel Edit' : 'Edit Story';
    }
    if (componentsHint) {
      componentsHint.style.display = enabled ? 'block' : 'none';
    }
    if (componentsDisplay) {
      componentsDisplay.classList.toggle('editable', enabled);
    }
    if (componentsEditButton) {
      componentsEditButton.style.display = enabled ? 'inline-flex' : 'none';
      componentsEditButton.disabled = !enabled;
    }
    if (!enabled) {
      form.reset();
      selectedComponents = normalizeComponentSelection(story.components);
      refreshComponentsDisplay();
      if (statusSelect) {
        statusSelect.value = statusValue;
      }
      if (statusValueEl) {
        statusValueEl.textContent = statusValue;
        statusValueEl.className = `status-value status-badge ${getStatusClass(statusValue)}`;
      }
      if (statusDescriptionEl) {
        const entry = statusReference.find((item) => item.value === statusValue);
        if (entry && entry.description) {
          statusDescriptionEl.textContent = entry.description;
        }
      }
    }
  }

  setEditing(false);

  editButton?.addEventListener('click', async () => {
    // Open edit modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px;">
        <h2>Edit Story</h2>
        <form id="edit-story-form">
          <div class="form-group">
            <label>Title:</label>
            <textarea name="title" rows="1" style="resize: none; overflow: hidden;" required>${escapeHtml(story.title || '')}</textarea>
          </div>
          <div class="form-group">
            <label>As a:</label>
            <input type="text" name="asA" value="${escapeHtml(story.asA || '')}">
          </div>
          <div class="form-group">
            <label>I want:</label>
            <textarea name="iWant" rows="2">${escapeHtml(story.iWant || '')}</textarea>
          </div>
          <div class="form-group">
            <label>So that:</label>
            <textarea name="soThat" rows="2">${escapeHtml(story.soThat || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Description:</label>
            <textarea name="description" rows="4">${escapeHtml(story.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Story Points:</label>
            <input type="number" name="storyPoints" value="${story.storyPoints || 0}" min="0">
          </div>
          <div class="form-group">
            <label>Assignee Email:</label>
            <input type="email" name="assigneeEmail" value="${escapeHtml(story.assigneeEmail || '')}">
          </div>
          <div class="form-group">
            <label>Status:</label>
            <select name="status">
              ${STORY_STATUS_GUIDE.map(s => `<option value="${s.value}" ${story.status === s.value ? 'selected' : ''}>${s.value}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Components:</label>
            <div id="modal-components-display" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 40px; cursor: pointer; background: #f8f9fa;">
              ${story.components && story.components.length > 0 ? story.components.join(', ') : 'Click to select'}
            </div>
          </div>
          <div class="modal-actions">
            <button type="submit" class="btn-primary">Save Changes</button>
            <button type="button" class="btn-secondary" id="cancel-edit">Cancel</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    let modalComponents = Array.isArray(story.components) ? [...story.components] : [];
    const componentsDisplay = modal.querySelector('#modal-components-display');
    
    const updateComponentsDisplay = () => {
      componentsDisplay.textContent = modalComponents.length > 0 ? modalComponents.join(', ') : 'Click to select';
    };
    
    componentsDisplay.addEventListener('click', async () => {
      const picked = await openComponentPicker(modalComponents, { title: 'Select Components' });
      if (Array.isArray(picked)) {
        modalComponents = picked;
        updateComponentsDisplay();
      }
    });
    
    const form = modal.querySelector('#edit-story-form');
    
    // Auto-resize title textarea
    const titleTextarea = form.querySelector('textarea[name="title"]');
    const autoResizeTitle = () => {
      titleTextarea.style.height = 'auto';
      titleTextarea.style.height = titleTextarea.scrollHeight + 'px';
    };
    titleTextarea.addEventListener('input', autoResizeTitle);
    setTimeout(autoResizeTitle, 10); // Initial resize
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const updates = {
        title: formData.get('title'),
        asA: formData.get('asA'),
        iWant: formData.get('iWant'),
        soThat: formData.get('soThat'),
        description: formData.get('description'),
        storyPoints: parseInt(formData.get('storyPoints')) || 0,
        assigneeEmail: formData.get('assigneeEmail'),
        status: formData.get('status'),
        components: modalComponents
      };
      
      try {
        const url = `${getApiBaseUrl()}/api/stories/${story.id}`;
        console.log('Updating story:', story.id, 'URL:', url);
        
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        
        if (response.ok) {
          modal.remove();
          await loadStories();
        } else {
          const errorText = await response.text();
          console.error('Update failed:', response.status, errorText);
          alert(`Failed to update story: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.error('Error updating story:', error);
        alert(`Error updating story: ${error.message}`);
      }
    });
    
    modal.querySelector('#cancel-edit').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  });

  deleteButton?.addEventListener('click', (event) => {
    event.preventDefault();
    void confirmAndDeleteStory(story.id);
  });

  const markDoneBtn = form.querySelector('#mark-done-btn');
  markDoneBtn?.addEventListener('click', async (event) => {
    event.preventDefault();
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/stories/${story.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: story.title,
          status: 'Done',
          acceptWarnings: true,
          bypassDoneValidation: true
        })
      });
      if (response.ok) {
        await loadStories();
        showToast('Story marked as Done', 'success');
      } else {
        const errorText = await response.text();
        if (response.status === 404) {
          showToast('Story not found. Refreshing story list...', 'warning');
          await loadStories();
        } else {
          showToast(`Failed to mark story as Done: ${errorText}`, 'error');
        }
      }
    } catch (error) {
      showToast(`Error: ${error.message}`, 'error');
    }
  });

  const emailBtn = form.querySelector('#assignee-email-btn');
  emailBtn?.addEventListener('click', () => {
    const email = form.elements.assigneeEmail.value.trim();
    if (email) {
      window.open(`mailto:${email}`);
    }
  });

  const codewhispererSection = buildCodeWhispererSection(story);
  console.log('🔧 Development Tasks section created:', !!codewhispererSection);
  detailsContent.appendChild(codewhispererSection);
  console.log('✅ Development Tasks section appended');

  const dependencySection = document.createElement('section');
  dependencySection.className = 'dependencies-section';
  const dependencyHeading = document.createElement('div');
  dependencyHeading.className = 'section-heading';
  const dependencyTitle = document.createElement('h3');
  dependencyTitle.textContent = 'Dependencies';
  dependencyHeading.appendChild(dependencyTitle);
  const dependencyOverlayBtn = document.createElement('button');
  dependencyOverlayBtn.type = 'button';
  dependencyOverlayBtn.className = 'secondary dependency-overlay-toggle';
  dependencyOverlayBtn.dataset.role = 'dependency-overlay-toggle';
  dependencyOverlayBtn.textContent = state.showDependencies ? 'Hide Mindmap Overlay' : 'Show Mindmap Overlay';
  dependencyOverlayBtn.classList.toggle('is-active', state.showDependencies);
  dependencyOverlayBtn.setAttribute('aria-pressed', state.showDependencies ? 'true' : 'false');
  dependencyHeading.appendChild(dependencyOverlayBtn);
  dependencySection.appendChild(dependencyHeading);

  const dependencyGroupsContainer = document.createElement('div');
  dependencyGroupsContainer.className = 'dependency-groups';
  dependencySection.appendChild(dependencyGroupsContainer);

  const normalizedDependencies = normalizeDependencyEntries(story.dependencies);
  const blockedByEntries = normalizedDependencies.filter((entry) => entry.relationship === 'blocks');
  const supportingDependencies = normalizedDependencies.filter((entry) => entry.relationship !== 'blocks');
  const dependentEntries = normalizeDependencyEntries(story.dependents);

  const dependencyGroups = [
    {
      key: 'blocked-by',
      title: 'Blocked by',
      items: blockedByEntries,
      empty: 'This story is not blocked by other stories.',
      context: 'blocked-by',
      allowAdd: true,
    },
    {
      key: 'upstream',
      title: 'Dependencies',
      items: supportingDependencies,
      empty: 'No upstream dependencies recorded.',
      context: 'upstream',
      allowAdd: true,
    },
    {
      key: 'downstream',
      title: 'Dependents',
      items: dependentEntries,
      empty: 'No stories depend on this one yet.',
      context: 'downstream',
    },
  ];

  dependencyGroups.forEach((group) => {
    const groupEl = document.createElement('article');
    groupEl.className = 'dependency-group';
    const groupHeader = document.createElement('div');
    groupHeader.className = 'dependency-group-header';
    const groupHeading = document.createElement('h4');
    groupHeading.textContent = group.title;
    groupHeader.appendChild(groupHeading);

    if (group.allowAdd) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'secondary dependency-add-btn';
      addBtn.textContent = group.context === 'blocked-by' ? 'Add blocker' : 'Add dependency';
      addBtn.addEventListener('click', () => {
        openDependencyPicker(story, group.context);
      });
      groupHeader.appendChild(addBtn);
    }

    groupEl.appendChild(groupHeader);

    if (!group.items.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = group.empty;
      groupEl.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'record-list dependency-list';
      group.items.forEach((entry) => {
        const table = createDependencyTable(entry, group.context);
        list.appendChild(table);
      });
      groupEl.appendChild(list);
    }

    dependencyGroupsContainer.appendChild(groupEl);
  });

  dependencyOverlayBtn.addEventListener('click', () => {
    toggleDependencyOverlay();
  });

  const activateDependencyTarget = (table) => {
    const targetId = Number(table.dataset.storyId);
    if (!Number.isFinite(targetId)) {
      return;
    }
    const targetStory = storyIndex.get(targetId);
    if (targetStory) {
      handleStorySelection(targetStory);
    }
  };

  dependencySection.querySelectorAll('.dependency-table').forEach((table) => {
    table.addEventListener('click', (event) => {
      event.preventDefault();
      activateDependencyTarget(table);
    });
    table.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateDependencyTarget(table);
      }
    });
  });

  syncDependencyOverlayControls();

  detailsContent.appendChild(dependencySection);

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
      if (test.gwtHealth && test.gwtHealth.satisfied === false) {
        table.classList.add('health-warning');
      }
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
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'secondary';
      editButton.textContent = 'Edit Acceptance Test';
      editButton.addEventListener('click', () => openAcceptanceTestModal(story.id, { test }));
      actionsTd.appendChild(editButton);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'danger';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', async () => {
        if (!window.confirm('Delete this acceptance test?')) return;
        try {
          await sendJson(resolveApiUrl(`/api/tests/${test.id}`), { method: 'DELETE' });
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
  console.log('🧪 Acceptance Tests section created:', !!acceptanceSection);
  detailsContent.appendChild(acceptanceSection);
  console.log('✅ Acceptance Tests section appended');

  addTestBtn.addEventListener('click', () => openAcceptanceTestModal(story.id));

  const tasksSection = document.createElement('section');
  tasksSection.innerHTML = `
    <div class="section-heading">
      <h3>Tasks</h3>
      <button type="button" class="secondary" id="create-task-btn">Create Task</button>
    </div>
  `;
  const taskList = document.createElement('div');
  taskList.className = 'record-list';
  if (Array.isArray(story.tasks) && story.tasks.length) {
    taskList.innerHTML = story.tasks
      .map(
        (task) => `
          <table class="vertical-table task-table" data-task-id="${task.id}">
            <tbody>
              <tr>
                <th scope="row">Title</th>
                <td>${escapeHtml(task.title || '')}</td>
              </tr>
              <tr>
                <th scope="row">Assignee</th>
                <td>${task.assigneeEmail ? escapeHtml(task.assigneeEmail) : '—'}</td>
              </tr>
              <tr>
                <th scope="row">Description</th>
                <td>${task.description ? formatMultilineText(task.description) : '—'}</td>
              </tr>
              <tr>
                <th scope="row">Status</th>
                <td>${escapeHtml(task.status || TASK_STATUS_OPTIONS[0])}</td>
              </tr>
              <tr>
                <th scope="row">Estimation (hrs)</th>
                <td>${formatEstimationHours(task.estimationHours ?? task.estimation_hours ?? task.estimation)}</td>
              </tr>
              <tr>
                <th scope="row">Actions</th>
                <td class="actions">
                  <button type="button" class="secondary" data-action="edit-task" data-task-id="${task.id}">Edit</button>
                  <button type="button" class="danger" data-action="delete-task" data-task-id="${task.id}">Delete</button>
                </td>
              </tr>
            </tbody>
          </table>
        `
      )
      .join('');
  } else {
    taskList.innerHTML = '<p class="empty-state">No tasks yet.</p>';
  }
  tasksSection.appendChild(taskList);
  detailsContent.appendChild(tasksSection);

  tasksSection
    .querySelector('#create-task-btn')
    ?.addEventListener('click', () => openTaskModal(story.id));

  taskList.querySelectorAll('.task-table').forEach((table) => {
    table.addEventListener('click', (event) => {
      if (event.target.closest('[data-action]')) {
        return;
      }
      const taskId = Number(table.getAttribute('data-task-id'));
      const target = Array.isArray(story.tasks)
        ? story.tasks.find((item) => item.id === taskId)
        : null;
      if (target) {
        openTaskModal(story.id, target);
      }
    });
  });

  taskList.querySelectorAll('[data-action="edit-task"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const taskId = Number(button.getAttribute('data-task-id'));
      if (!Number.isFinite(taskId)) {
        return;
      }
      const target = Array.isArray(story.tasks)
        ? story.tasks.find((item) => item.id === taskId)
        : null;
      if (target) {
        openTaskModal(story.id, target);
      }
    });
  });

  taskList.querySelectorAll('[data-action="delete-task"]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const taskId = Number(button.getAttribute('data-task-id'));
      if (!Number.isFinite(taskId)) {
        return;
      }
      if (!window.confirm('Delete this task?')) {
        return;
      }
      try {
        await deleteTask(taskId);
        await loadStories();
        showToast('Task deleted', 'success');
      } catch (error) {
        showToast(error.message || 'Failed to delete task', 'error');
      }
    });
  });

  const childrenSection = document.createElement('section');
  childrenSection.innerHTML = `
    <div class="section-heading">
      <h3>Child Stories</h3>
      <button type="button" class="secondary" id="add-child-btn">Create Child Story</button>
    </div>
  `;
  const childList = document.createElement('ul');
  childList.className = 'child-story-list';
  if (story.children && story.children.length) {
    story.children.forEach((child) => {
      const li = document.createElement('li');
      li.className = 'child-story-item';
      
      const titleLink = document.createElement('a');
      titleLink.href = '#';
      titleLink.className = 'child-story-title';
      if (child.status === 'Done') {
        titleLink.classList.add('done-story');
      }
      titleLink.textContent = child.title;
      titleLink.setAttribute('data-story-id', child.id);
      
      li.appendChild(titleLink);
      childList.appendChild(li);
    });
  } else {
    const emptyState = document.createElement('p');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No child stories yet.';
    childList.appendChild(emptyState);
  }
  childrenSection.appendChild(childList);
  detailsContent.appendChild(childrenSection);

  childrenSection
    .querySelector('#add-child-btn')
    .addEventListener('click', () => openChildStoryModal(story.id));

  childList.querySelectorAll('.child-story-title').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const storyId = Number(link.getAttribute('data-story-id'));
      const target = storyIndex.get(storyId);
      if (target) {
        handleStorySelection(target);
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

function describeIssueOrigin(source) {
  if (source === 'ai') {
    return 'ChatGPT';
  }
  if (source === 'heuristic') {
    return 'Rule check';
  }
  return '';
}

function showToast(message, type = 'info') {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastEl.style.background =
    type === 'error'
      ? '#b91c1c'
      : type === 'success'
      ? '#16a34a'
      : type === 'warning'
      ? '#b45309'
      : '#0f172a';
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

function closeModal() {
  modal.style.display = 'none';
  delete modal.dataset.size;
  modal.style.width = '';
  modal.style.maxWidth = '';
  modalBody.style.width = '';
  if (typeof modalTeardown === 'function') {
    try {
      modalTeardown();
    } catch (error) {
      console.error('Modal teardown failed', error);
    }
    modalTeardown = null;
  }
}

function openModal({
  title,
  content,
  actions,
  cancelLabel = 'Cancel',
  size = 'default',
  onClose = null,
}) {
  if (modal.style.display !== 'none' || typeof modalTeardown === 'function') {
    closeModal();
  }
  modalTitle.textContent = title;
  modalBody.innerHTML = '';
  modalBody.appendChild(content);
  modalFooter.innerHTML = '';

  if (size && size !== 'default') {
    modal.dataset.size = size;
  } else {
    delete modal.dataset.size;
  }

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
        console.log('Modal button clicked:', action.label);
        const result = await action.onClick();
        console.log('onClick result:', result);
        if (result !== false) {
          closeModal();
        }
      });
      modalFooter.appendChild(button);
    });
  }

  modalTeardown = () => {
    if (typeof onClose === 'function') {
      try {
        onClose();
      } catch (error) {
        console.error('Modal onClose handler failed', error);
      }
    }
    modalTeardown = null;
  };

  modal.style.display = 'flex';
}

// Automatic PR creation function
async function createAutomaticPR(story) {
  if (!story) return;
  
  const branchName = `feature/story-${story.id}-${kebabCase(story.title || 'implementation')}`;
  const prTitle = `Implement: ${story.title || `Story ${story.id}`}`;
  
  const prBody = `
## Story Implementation

**Story ID:** ${story.id}
**Title:** ${story.title || 'Untitled'}

### User Story
- **As a:** ${story.asA || 'user'}
- **I want:** ${story.iWant || 'to implement this feature'}
- **So that:** ${story.soThat || 'I can achieve my goal'}

### Acceptance Criteria
${story.acceptanceTests?.map(test => 
  `- **${test.title}**\n  - Given: ${test.given?.join(', ') || 'N/A'}\n  - When: ${test.when?.join(', ') || 'N/A'}\n  - Then: ${test.then?.join(', ') || 'N/A'}`
).join('\n') || 'No acceptance tests defined'}

### Components
${story.components ? JSON.parse(story.components).join(', ') : 'None specified'}

---
*Auto-generated from AIPM Story #${story.id}*
`;

  try {
    showToast('Creating PR...', 'info');
    
    const response = await sendJson('/api/create-pr', {
      method: 'POST',
      body: {
        storyId: story.id,
        branchName,
        prTitle,
        prBody: prBody.trim(),
        story
      }
    });
    
    if (response.success) {
      showToast(`PR created successfully: #${response.prNumber}`, 'success');
      if (response.prUrl) {
        window.open(response.prUrl, '_blank');
      }
    } else {
      showToast(`Failed to create PR: ${response.error}`, 'error');
    }
  } catch (error) {
    console.error('Error creating PR:', error);
    showToast('Failed to create PR', 'error');
  }
}

function kebabCase(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function createDefaultCodeWhispererForm(story) {
  // Generate branch name from title, limited to 200 chars (GitHub limit is 255 bytes)
  let branchName = '';
  if (story?.title) {
    branchName = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    // Add timestamp to make branch name unique
    const timestamp = Date.now();
    const maxTitleLength = 180; // Leave room for timestamp
    if (branchName.length > maxTitleLength) {
      branchName = branchName.substring(0, maxTitleLength).replace(/-+$/, '');
    }
    branchName = `${branchName}-${timestamp}`;
  }
  
  // Build comprehensive objective with full story details
  let objective = '';
  if (story?.title) {
    objective += `Title: ${story.title}\n\n`;
  }
  if (story?.asA) {
    objective += `As a: ${story.asA}\n`;
  }
  if (story?.iWant) {
    objective += `I want: ${story.iWant}\n`;
  }
  if (story?.soThat) {
    objective += `So that: ${story.soThat}\n`;
  }
  if (story?.description && story.description !== story.iWant) {
    objective += `\nDescription: ${story.description}\n`;
  }
  if (story?.components && story.components.length > 0) {
    objective += `\nComponents: ${story.components.join(', ')}\n`;
  }
  if (story?.storyPoint) {
    objective += `\nStory Points: ${story.storyPoint}\n`;
  }
  
  // Add acceptance tests as context
  if (story?.acceptanceTests && story.acceptanceTests.length > 0) {
    objective += `\nAcceptance Tests:\n`;
    story.acceptanceTests.forEach((test, index) => {
      if (test?.title) {
        objective += `${index + 1}. ${test.title}\n`;
        if (test.given && test.given.length > 0) {
          objective += `   Given: ${test.given.join(', ')}\n`;
        }
        if (test.when && test.when.length > 0) {
          objective += `   When: ${test.when.join(', ')}\n`;
        }
        if (test.then && test.then.length > 0) {
          objective += `   Then: ${test.then.join(', ')}\n`;
        }
      }
    });
  }
  
  // Fallback if no detailed info available
  if (!objective.trim()) {
    objective = story?.description || story?.iWant || story?.title || '';
  }
  
  return {
    repositoryApiUrl: 'https://api.github.com',
    owner: 'demian7575',
    repo: 'aipm',
    branchName,
    assignee: story?.assigneeEmail || '',
    taskTitle: story?.title || '',
    objective: objective.trim(),
    prTitle: story?.title || '',
    constraints: '',
    acceptanceCriteria: '',
    createTrackingCard: true
  };
}

function validateCodeWhispererInput(values) {
  const errors = {};
  
  if (!values.owner?.trim()) errors.owner = 'Owner is required';
  if (!values.repo?.trim()) errors.repo = 'Repository is required';
  if (!values.branchName?.trim()) errors.branchName = 'Branch name is required';
  if (!values.taskTitle?.trim()) errors.taskTitle = 'Task title is required';
  if (!values.objective?.trim()) errors.objective = 'Objective is required';
  if (!values.prTitle?.trim()) errors.prTitle = 'PR title is required';
  // constraints and acceptanceCriteria are optional
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

// Kiro API is managed by backend - no frontend health check needed

function openCreatePRWithCodeModal(story) {
  const defaults = createDefaultCodeWhispererForm(story);
  const form = document.createElement('form');
  form.className = 'modal-form codewhisperer-form';
  form.noValidate = true;
  form.innerHTML = `
    <div class="form-error-banner" data-role="codewhisperer-error" hidden></div>
    <div class="field">
      <label for="codewhisperer-repo-url">Repository API URL</label>
      <input id="codewhisperer-repo-url" name="repositoryApiUrl" type="url" placeholder="${escapeHtml(
        DEFAULT_REPO_API_URL
      )}" required />
      <p class="field-error" data-error-for="repositoryApiUrl" hidden></p>
    </div>
    <div class="field">
      <label for="codewhisperer-owner">Owner</label>
      <input id="codewhisperer-owner" name="owner" required />
      <p class="field-error" data-error-for="owner" hidden></p>
    </div>
    <div class="field">
      <label for="codewhisperer-repo">Repository</label>
      <input id="codewhisperer-repo" name="repo" required />
      <p class="field-error" data-error-for="repo" hidden></p>
    </div>
    <div class="field">
      <label for="codewhisperer-branch">Branch name</label>
      <input id="codewhisperer-branch" name="branchName" required />
      <p class="field-error" data-error-for="branchName" hidden></p>
    </div>
    <div class="field">
      <label for="codewhisperer-assignee">Assignee</label>
      <input id="codewhisperer-assignee" name="assignee" type="text" placeholder="Add an assignee (optional)" />
      <p class="field-error" data-error-for="assignee" hidden></p>
    </div>
    <div class="field">
      <label for="codewhisperer-task-title">Task title</label>
      <textarea id="codewhisperer-task-title" name="taskTitle" rows="1" style="resize: vertical; overflow: hidden;" required></textarea>
      <p class="field-error" data-error-for="taskTitle" hidden></p>
    </div>
    <div class="field full">
      <label for="codewhisperer-objective">Objective</label>
      <textarea id="codewhisperer-objective" name="objective" rows="2" style="resize: vertical; overflow: hidden;" required></textarea>
      <p class="field-error" data-error-for="objective" hidden></p>
    </div>
    <div class="field">
      <label for="codewhisperer-pr-title">PR title</label>
      <textarea id="codewhisperer-pr-title" name="prTitle" rows="1" style="resize: vertical; overflow: hidden;" required></textarea>
      <p class="field-error" data-error-for="prTitle" hidden></p>
    </div>
    <div class="field">
      <label for="codewhisperer-constraints">Constraints</label>
      <textarea id="codewhisperer-constraints" name="constraints" rows="3" required></textarea>
      <p class="field-error" data-error-for="constraints" hidden></p>
    </div>
    <div class="field full">
      <label for="codewhisperer-acceptance">Acceptance criteria</label>
      <textarea
        id="codewhisperer-acceptance"
        name="acceptanceCriteria"
        rows="4"
        placeholder="List each criterion on a new line"
        required
      ></textarea>
      <p class="field-error" data-error-for="acceptanceCriteria" hidden></p>
    </div>
    <div class="field full codewhisperer-checkbox">
      <label>
        <input type="checkbox" name="createTrackingCard" checked />
        <span>Create tracking card</span>
      </label>
    </div>
  `;

  const errorBanner = form.querySelector('[data-role="codewhisperer-error"]');
  const fieldErrors = new Map(
    Array.from(form.querySelectorAll('[data-error-for]')).map((el) => [el.dataset.errorFor, el])
  );
  const touchedFields = new Set();

  const repoInput = form.elements.repositoryApiUrl;
  const ownerInput = form.elements.owner;
  const repoNameInput = form.elements.repo;
  const branchInput = form.elements.branchName;
  const assigneeInput = form.elements.assignee;
  const taskTitleInput = form.elements.taskTitle;
  const objectiveInput = form.elements.objective;
  const prTitleInput = form.elements.prTitle;
  const constraintsInput = form.elements.constraints;
  const acceptanceInput = form.elements.acceptanceCriteria;
  const createCardInput = form.elements.createTrackingCard;

  const acceptancePrefill = defaults.acceptanceCriteria?.trim()
    ? defaults.acceptanceCriteria
    : Array.isArray(story?.acceptanceTests) && story.acceptanceTests.length > 0
    ? story.acceptanceTests
        .map((test) => (test && test.title ? String(test.title).trim() : ''))
        .filter((value) => value.length > 0)
        .join('\n')
    : story?.iWant 
    ? `The feature works as described\nThe implementation matches the requirement: ${story.iWant}\nThe changes are properly tested`
    : 'The feature works as described\nThe user interface is intuitive\nThe changes are properly tested';

  repoInput.value = defaults.repositoryApiUrl || DEFAULT_REPO_API_URL;
  ownerInput.value = defaults.owner || '';
  repoNameInput.value = defaults.repo || '';
  branchInput.value = defaults.branchName || '';
  assigneeInput.value = defaults.assignee || '';
  taskTitleInput.value = defaults.taskTitle || '';
  objectiveInput.value = defaults.objective || '';
  prTitleInput.value = defaults.prTitle || '';
  constraintsInput.value = defaults.constraints || '';
  acceptanceInput.value = acceptancePrefill;
  createCardInput.checked = defaults.createTrackingCard !== false;

  // Auto-resize textareas
  const autoResize = (textarea) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };
  
  [taskTitleInput, objectiveInput, prTitleInput].forEach(textarea => {
    if (textarea && textarea.tagName === 'TEXTAREA') {
      autoResize(textarea);
      textarea.addEventListener('input', () => autoResize(textarea));
    }
  });

  let submitButton = null;
  let submitting = false;
  let latestValidation = { valid: false, errors: {} };

  function showBanner(message) {
    if (!errorBanner) return;
    if (message) {
      errorBanner.textContent = message;
      errorBanner.hidden = false;
    } else {
      errorBanner.textContent = '';
      errorBanner.hidden = true;
    }
  }

  function applyErrors(errors = {}, { force = false } = {}) {
    fieldErrors.forEach((el, name) => {
      const message = (errors && errors[name]) || '';
      if (force || touchedFields.has(name)) {
        if (message) {
          el.textContent = message;
          el.hidden = false;
        } else {
          el.textContent = '';
          el.hidden = true;
        }
      } else {
        el.textContent = '';
        el.hidden = true;
      }
    });
  }

  function readValues() {
    return {
      repositoryApiUrl: repoInput.value.trim() || DEFAULT_REPO_API_URL,
      owner: ownerInput.value.trim(),
      repo: repoNameInput.value.trim(),
      branchName: branchInput.value.trim(),
      assignee: assigneeInput.value.trim(),
      taskTitle: taskTitleInput.value.trim(),
      objective: objectiveInput.value.trim(),
      prTitle: prTitleInput.value.trim(),
      constraints: constraintsInput.value.trim(),
      acceptanceCriteria: acceptanceInput.value,
      target: 'pr',
      targetNumber: '',
      createTrackingCard: Boolean(createCardInput.checked),
    };
  }

  function updateTargetNumberVisibility(target) {
    // Function removed - no longer needed since target is always 'pr'
  }

  function createLocalDelegationEntry(story, values, result) {
  if (!result) {
    return null;
  }
  
  return {
    localId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    storyId: story?.id || null,
    taskTitle: values.taskTitle || 'Unknown Task',
    assignee: values.assignee || '',
    repo: `${values.owner}/${values.repo}`,
    branchName: result.branchName || values.branchName,
    target: values.target,
    targetNumber: values.targetNumber,
    number: result.number,
    type: result.type,
    taskId: result.taskId,
    prUrl: result.html_url,
    htmlUrl: result.html_url,
    taskUrl: result.taskHtmlUrl || result.html_url,
    threadUrl: result.threadHtmlUrl || result.html_url,
    confirmationCode: result.confirmationCode,
    taskId: result.taskId, // Store taskId for polling
    createTrackingCard: values.createTrackingCard !== false,
    createdAt: new Date().toISOString()
  };
}

// Poll queue status for PR URL


function buildAcceptanceTestFallback(story, acceptanceCriteriaText) {
  if (!story) {
    return null;
  }
  
  const criteria = acceptanceCriteriaText ? 
    acceptanceCriteriaText.split('\n').map(line => line.trim()).filter(line => line.length > 0) :
    [];
  
  return {
    title: `Acceptance Test for ${story.title || 'Story'}`,
    status: 'Draft',
    given: ['User has access to the system'],
    when: ['User performs the required action'],
    then: criteria.length > 0 ? criteria : ['System behaves as expected']
  };
}

function buildAcceptanceTestIdea(acceptanceCriteriaText) {
  if (!acceptanceCriteriaText || typeof acceptanceCriteriaText !== 'string') {
    return '';
  }
  
  const lines = acceptanceCriteriaText.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 0) {
    return '';
  }
  
  return `Generate acceptance test based on criteria: ${lines.join(', ')}`;
}

async function generateAcceptanceTestForDelegation(acceptanceCriteriaText) {
    if (!story || story.id == null) {
      return false;
    }
    const idea = buildAcceptanceTestIdea(acceptanceCriteriaText);
    const attempts = [];
    let draft = null;

    try {
      draft = await fetchAcceptanceTestDraft(story.id, idea ? { idea } : undefined);
    } catch (error) {
      console.error('CodeWhisperer delegation acceptance test draft failed', error);
    }

    if (draft) {
      const given = Array.isArray(draft.given)
        ? draft.given.map((step) => String(step || '').trim()).filter((step) => step.length > 0)
        : [];
      const when = Array.isArray(draft.when)
        ? draft.when.map((step) => String(step || '').trim()).filter((step) => step.length > 0)
        : [];
      const then = Array.isArray(draft.then)
        ? draft.then.map((step) => String(step || '').trim()).filter((step) => step.length > 0)
        : [];
      if (given.length && when.length && then.length) {
        attempts.push({
          title: typeof draft.title === 'string' ? draft.title : undefined,
          given,
          when,
          then,
          status: draft.status || 'Draft',
        });
      }
    }

    const fallbackDraft = buildAcceptanceTestFallback(story, acceptanceCriteriaText);
    if (fallbackDraft) {
      const normalizedFallback = {
        title: fallbackDraft.title || undefined,
        status: fallbackDraft.status || 'Draft',
        given: Array.isArray(fallbackDraft.given)
          ? fallbackDraft.given.map((step) => String(step || '').trim()).filter((step) => step.length > 0)
          : [],
        when: Array.isArray(fallbackDraft.when)
          ? fallbackDraft.when.map((step) => String(step || '').trim()).filter((step) => step.length > 0)
          : [],
        then: Array.isArray(fallbackDraft.then)
          ? fallbackDraft.then.map((step) => String(step || '').trim()).filter((step) => step.length > 0)
          : [],
      };
      if (
        normalizedFallback.given.length &&
        normalizedFallback.when.length &&
        normalizedFallback.then.length &&
        !attempts.some(
          (attempt) =>
            attempt &&
            JSON.stringify(attempt.given) === JSON.stringify(normalizedFallback.given) &&
            JSON.stringify(attempt.when) === JSON.stringify(normalizedFallback.when) &&
            JSON.stringify(attempt.then) === JSON.stringify(normalizedFallback.then)
        )
      ) {
        attempts.push(normalizedFallback);
      }
    }

    let lastError = null;
    for (const attempt of attempts) {
      try {
        await sendJson(resolveApiUrl(`/api/stories/${story.id}/tests`), {
          method: 'POST',
          body: {
            title: attempt.title,
            given: attempt.given,
            when: attempt.when,
            then: attempt.then,
            status: attempt.status || 'Draft',
            acceptWarnings: true,
          },
        });
        await loadStories();
        return true;
      } catch (error) {
        lastError = error;
        console.error('CodeWhisperer delegation acceptance test creation attempt failed', error);
      }
    }

    if (lastError) {
      console.error('CodeWhisperer delegation acceptance test generation failed', lastError);
    }
    return false;
  }

  function setSubmitButtonState(validation) {
    if (!submitButton) {
      return;
    }
    const stateValidation = validation ?? latestValidation;
    submitButton.disabled = submitting || !stateValidation.valid;
    submitButton.textContent = submitting ? 'Creating…' : 'Create Task';
  }

  function evaluate({ forceErrors = false } = {}) {
    const values = readValues();
    console.log('validateCodeWhispererInput function:', typeof validateCodeWhispererInput);
    
    // Fallback validation if import failed
    let validation;
    if (typeof validateCodeWhispererInput === 'function') {
      validation = validateCodeWhispererInput(values);
    } else {
      validation = { valid: true, errors: {} };
    }
    
    latestValidation = validation;
    applyErrors(validation?.errors || {}, { force: forceErrors });
    setSubmitButtonState(validation);
    return { values, validation };
  }

  const handleChange = (event) => {
    if (event?.target?.name) {
      touchedFields.add(event.target.name);
    }
    const { values } = evaluate();
    showBanner('');
  };

  form.addEventListener('input', handleChange);
  form.addEventListener('change', handleChange);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void handleSubmit();
  });

  const handleSubmit = async () => {
    if (submitting) {
      return false;
    }
    const { values, validation } = evaluate({ forceErrors: true });
    if (!validation.valid) {
      showBanner('Please resolve the highlighted fields.');
      return false;
    }

    showBanner('');
    submitting = true;
    setSubmitButtonState(validation);

    try {
      const acceptanceCriteriaText = values.acceptanceCriteria;
      const acceptanceCriteriaList = splitLines(acceptanceCriteriaText);
      const payload = {
        storyId: story?.id ?? null,
        storyTitle: story?.title ?? '',
        repositoryApiUrl: values.repositoryApiUrl,
        owner: values.owner,
        repo: values.repo,
        target: values.target,
        branchName: values.branchName,
        taskTitle: values.taskTitle,
        objective: values.objective,
        prTitle: values.prTitle,
        constraints: values.constraints,
        acceptanceCriteria: acceptanceCriteriaList,
      };

      const result = await sendJson('/api/personal-delegate', {
        method: 'POST',
        body: payload,
      });

      let acceptanceTestCreated = false;
      if (story?.id != null) {
        acceptanceTestCreated = await generateAcceptanceTestForDelegation(acceptanceCriteriaText);
      }

      if (values.createTrackingCard) {
        const entry = createLocalDelegationEntry(story, values, result);
        if (entry) {
          addCodeWhispererDelegationEntry(story.id, entry);
        }
      }

      const confirmationCode =
        typeof result?.confirmationCode === 'string' && result.confirmationCode.length >= 6
          ? result.confirmationCode
          : null;

      const toastBase = acceptanceTestCreated
        ? 'CodeWhisperer task created and acceptance test drafted.'
        : 'CodeWhisperer task created';

      const toastMessage = confirmationCode
        ? `${toastBase} Confirmation: ${confirmationCode}.`
        : toastBase;
      showToast(toastMessage, 'success');
      return true;
    } catch (error) {
      console.error('CodeWhisperer task creation failed', error);
      const message =
        (error && error.message) || 'Failed to create CodeWhisperer task. Please try again.';
      showBanner(message);
      return false;
    } finally {
      submitting = false;
      setSubmitButtonState();
    }
  };

  openModal({
    title: 'Create Pull Request',
    content: form,
    cancelLabel: 'Cancel',
    size: 'content',
    actions: [
      {
        label: 'Create Task',
        onClick: handleSubmit,
      },
    ],
  });

  submitButton = Array.from(modalFooter.querySelectorAll('button')).find((button) =>
    button.textContent && button.textContent.trim().toLowerCase() === 'create task'
  );

  // Delay initial validation to ensure form is fully rendered
  setTimeout(() => {
    const initialValues = readValues();
    
    console.log('Initial form values:', initialValues);
    
    if (typeof validateCodeWhispererInput === 'function') {
      latestValidation = validateCodeWhispererInput(initialValues);
      console.log('Validation result:', latestValidation);
      if (!latestValidation.valid) {
        console.log('Validation errors:', latestValidation.errors);
      }
    } else {
      latestValidation = { valid: true, errors: {} };
    }
    
    applyErrors(latestValidation?.errors || {}, { force: false });
    setSubmitButtonState(latestValidation);
  }, 10);
}

function openHealthIssueModal(title, issue, context = null) {
  const container = document.createElement('div');
  container.className = 'health-modal';

  const message = document.createElement('p');
  message.innerHTML = `<strong>Issue:</strong> ${escapeHtml(issue.message || '')}`;
  container.appendChild(message);

  const origin = describeIssueOrigin(issue.source);
  if (origin) {
    const sourceEl = document.createElement('p');
    sourceEl.className = 'issue-origin';
    sourceEl.textContent = `Source: ${origin}`;
    container.appendChild(sourceEl);
  }

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

  if (context) {
    const contextNote = document.createElement('p');
    contextNote.className = 'issue-context';
    if (context.source === 'openai') {
      const model = context.aiModel ? ` (model ${context.aiModel})` : '';
      if (issue.source === 'heuristic') {
        contextNote.textContent = `ChatGPT${model} approved the story; local rules suggested this follow-up.`;
      } else {
        const summary = context.aiSummary ? context.aiSummary : 'ChatGPT reviewed this story.';
        contextNote.textContent = `ChatGPT${model}: ${summary}`;
      }
    } else if (context.source === 'fallback') {
      const detail = context.error ? ` (${context.error})` : '';
      contextNote.textContent = `ChatGPT analysis unavailable${detail}; showing local guidance.`;
    } else {
      contextNote.textContent = 'Using local INVEST heuristics for guidance.';
    }
    container.appendChild(contextNote);
  }

  openModal({ title, content: container, cancelLabel: 'Close' });
}

function openDocumentPanel() {
  const container = document.createElement('div');
  container.className = 'document-panel';

  const intro = document.createElement('p');
  intro.className = 'document-intro';
  intro.textContent =
    'Generate consolidated documents using the common templates for tests and requirements.';
  container.appendChild(intro);

  const actions = document.createElement('div');
  actions.className = 'document-actions';
  container.appendChild(actions);

  const resultWrapper = document.createElement('section');
  resultWrapper.className = 'document-result hidden';

  const resultHeader = document.createElement('div');
  resultHeader.className = 'document-result-header';
  const resultTitle = document.createElement('h3');
  resultTitle.textContent = 'Generated Document';
  resultHeader.appendChild(resultTitle);

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'secondary';
  copyBtn.textContent = 'Copy to clipboard';
  copyBtn.disabled = true;
  resultHeader.appendChild(copyBtn);

  resultWrapper.appendChild(resultHeader);

  const resultMeta = document.createElement('p');
  resultMeta.className = 'document-meta';
  resultWrapper.appendChild(resultMeta);

  const resultOutput = document.createElement('pre');
  resultOutput.className = 'document-output';
  resultWrapper.appendChild(resultOutput);

  container.appendChild(resultWrapper);

  const buttons = [
    {
      label: 'Common Test Document template',
      type: 'common-test-document',
      description:
        'Apply the Common Test Document template to consolidate Given/When/Then scenarios by component.',
      title: 'Common Test Document',
    },
    {
      label: 'Common Requirement Specification template',
      type: 'common-requirement-specification',
      description:
        'Use the Common Requirement Specification template to summarize story goals, scope, and readiness.',
      title: 'Common Requirement Specification',
    },
  ];

  function setButtonsDisabled(disabled) {
    const hasStories = state.stories.length > 0;
    buttons.forEach((entry) => {
      if (entry.button) {
        entry.button.disabled = disabled || !hasStories;
      }
    });
  }

  function parseFilename(headerValue, fallback) {
    if (!headerValue) {
      return fallback;
    }
    const starMatch = headerValue.match(/filename\*=UTF-8''([^;]+)/i);
    if (starMatch && starMatch[1]) {
      try {
        return decodeURIComponent(starMatch[1].trim());
      } catch {
        return starMatch[1].trim();
      }
    }
    const match = headerValue.match(/filename="?([^";]+)"?/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return fallback;
  }

  function slugifyTitle(title) {
    return (title || 'document')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '') || 'document';
  }

  function triggerDownload(markdown, filename, mimeType) {
    const blob = new Blob([markdown], { type: mimeType || 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  async function handleGenerate(entry) {
    if (!state.stories.length) {
      showToast('Add user stories before generating documents.', 'error');
      return;
    }
    setButtonsDisabled(true);
    resultWrapper.classList.remove('hidden');
    resultTitle.textContent = entry.title;
    resultMeta.textContent = 'Generating document…';
    resultOutput.textContent = '';
    copyBtn.disabled = true;
    try {
      const response = await fetch(resolveApiUrl('/api/documents/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: entry.type }),
      });
      const text = await response.text();
      if (!response.ok) {
        let message = 'Failed to generate document';
        if (text) {
          try {
            const data = JSON.parse(text);
            if (data && typeof data === 'object' && data.message) {
              message = data.message;
            } else {
              message = text;
            }
          } catch {
            message = text;
          }
        }
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }

      const encodedTitle = response.headers.get('X-Document-Title');
      const resolvedTitle = encodedTitle ? decodeURIComponent(encodedTitle) : entry.title;
      resultTitle.textContent = resolvedTitle || entry.title;

      const source = response.headers.get('X-Document-Source') || 'unknown';
      const generatedHeader = response.headers.get('X-Generated-At');
      const generatedDate = generatedHeader ? new Date(generatedHeader) : new Date();
      const sourceLabel =
        source === 'openai'
          ? 'Generated via ChatGPT'
          : source === 'fallback'
          ? 'Generated via fallback formatter'
          : 'Generated via baseline formatter';
      resultMeta.textContent = `${sourceLabel} • ${generatedDate.toLocaleString()}`;

      resultOutput.textContent = text;
      copyBtn.disabled = !text;

      const defaultName = `${slugifyTitle(resolvedTitle || entry.title)}.md`;
      const filename = parseFilename(response.headers.get('Content-Disposition'), defaultName);
      triggerDownload(text, filename, response.headers.get('Content-Type') || 'text/markdown');

      if (source === 'openai') {
        showToast('Document generated with ChatGPT and downloaded.', 'success');
      } else {
        showToast('Document generated with fallback formatter and downloaded.', 'warning');
      }
    } catch (error) {
      console.error('Document generation failed', error);
      resultMeta.textContent = error.message || 'Failed to generate document';
      resultOutput.textContent = '';
      copyBtn.disabled = true;
      showToast(error.message || 'Failed to generate document', 'error');
    } finally {
      setButtonsDisabled(false);
    }
  }

  buttons.forEach((entry) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'document-action';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = entry.label;
    button.disabled = state.stories.length === 0;
    button.addEventListener('click', () => handleGenerate(entry));
    entry.button = button;
    wrapper.appendChild(button);
    if (entry.description) {
      const desc = document.createElement('p');
      desc.textContent = entry.description;
      wrapper.appendChild(desc);
    }
    actions.appendChild(wrapper);
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(resultOutput.textContent);
      showToast('Document copied to clipboard', 'success');
    } catch (error) {
      console.error('Clipboard copy failed', error);
      showToast('Unable to copy document', 'error');
    }
  });

  openModal({ title: 'Generate Document', content: container, cancelLabel: 'Close' });
}

function openChildStoryModal(parentId) {
  const container = document.createElement('div');
  container.className = 'modal-form child-story-form';
  container.innerHTML = `
    <div class="child-story-generator">
      <label>Idea<textarea id="child-idea" placeholder="Describe the user story idea"></textarea></label>
      <div class="child-story-generator-actions">
        <button type="button" class="secondary" id="child-generate-btn">Generate</button>
        <p class="form-hint">Use your idea to draft the story details automatically.</p>
      </div>
    </div>
    <label>Title<textarea id="child-title" rows="1" style="resize: none; overflow: hidden;"></textarea></label>
    <label>Story Point<input id="child-point" type="number" min="0" step="1" placeholder="Estimate" /></label>
    <label>Assignee Email<input id="child-assignee" type="email" placeholder="name@example.com" /></label>
    <label>Description<textarea id="child-description"></textarea></label>
    <table class="story-brief">
      <tbody>
        <tr>
          <th scope="row">As a</th>
          <td><textarea id="child-asa-display" rows="1" style="resize: vertical; min-height: 2em;"></textarea></td>
        </tr>
        <tr>
          <th scope="row">I want</th>
          <td><textarea id="child-iwant-display" rows="2" style="resize: vertical; min-height: 3em;"></textarea></td>
        </tr>
        <tr>
          <th scope="row">So that</th>
          <td><textarea id="child-sothat-display" rows="2" style="resize: vertical; min-height: 3em;"></textarea></td>
        </tr>
        <tr>
          <th scope="row">Components</th>
          <td>
            <textarea id="child-components-display" rows="1" style="resize: vertical; min-height: 2em;" placeholder="Enter components (comma-separated)"></textarea>
            <p class="components-hint">Enter component names separated by commas, or use the button below.</p>
            <button type="button" class="secondary components-edit-btn" id="child-components-btn">Choose from list</button>
          </td>
        </tr>
      </tbody>
    </table>
    
    <div class="acceptance-tests-section" id="child-acceptance-tests">
      <h4>Acceptance Tests</h4>
      <div class="acceptance-tests-list" id="child-acceptance-tests-list">
        <div class="acceptance-test-item">
          <label>Test Title<input type="text" id="child-test-title-1" placeholder="Enter test title"></label>
          <label>Given<textarea id="child-test-given-1" rows="2" placeholder="Given condition"></textarea></label>
          <label>When<textarea id="child-test-when-1" rows="2" placeholder="When action"></textarea></label>
          <label>Then<textarea id="child-test-then-1" rows="2" placeholder="Then expected result"></textarea></label>
        </div>
      </div>
      <button type="button" class="secondary" id="child-add-test-btn">Add Another Test</button>
    </div>
  `;

  let childComponents = [];
  const childComponentsDisplay = container.querySelector('#child-components-display');
  const childComponentsButton = container.querySelector('#child-components-btn');
  const ideaInput = container.querySelector('#child-idea');
  const generateBtn = container.querySelector('#child-generate-btn');
  const titleInput = container.querySelector('#child-title');
  const addTestBtn = container.querySelector('#child-add-test-btn');
  
  let testCounter = 1;

  // Add test functionality
  const addNewTest = () => {
    testCounter++;
    const testsList = container.querySelector('#child-acceptance-tests-list');
    const newTest = document.createElement('div');
    newTest.className = 'acceptance-test-item';
    newTest.innerHTML = `
      <label>Test Title<input type="text" id="child-test-title-${testCounter}" placeholder="Enter test title"></label>
      <label>Given<textarea id="child-test-given-${testCounter}" rows="2" placeholder="Given condition"></textarea></label>
      <label>When<textarea id="child-test-when-${testCounter}" rows="2" placeholder="When action"></textarea></label>
      <label>Then<textarea id="child-test-then-${testCounter}" rows="2" placeholder="Then expected result"></textarea></label>
      <button type="button" class="danger remove-test-btn">Remove Test</button>
    `;
    testsList.appendChild(newTest);
    
    // Add remove functionality
    newTest.querySelector('.remove-test-btn').addEventListener('click', () => {
      newTest.remove();
    });
  };

  if (addTestBtn) {
    addTestBtn.addEventListener('click', addNewTest);
  }

  // Auto-resize title textarea
  const autoResizeTitle = () => {
    if (titleInput) {
      titleInput.style.height = 'auto';
      titleInput.style.height = titleInput.scrollHeight + 'px';
    }
  };
  if (titleInput) {
    titleInput.addEventListener('input', autoResizeTitle);
  }

  const refreshChildComponents = () => {
    if (!childComponentsDisplay) return;
    childComponentsDisplay.value = childComponents.join(', ');
    childComponentsDisplay.style.height = 'auto';
    childComponentsDisplay.style.height = childComponentsDisplay.scrollHeight + 'px';
  };

  refreshChildComponents();

  // Sync textarea changes back to array
  childComponentsDisplay?.addEventListener('input', () => {
    const text = childComponentsDisplay.value.trim();
    childComponents = text ? text.split(',').map(c => c.trim()).filter(Boolean) : [];
  });

  childComponentsButton?.addEventListener('click', async () => {
    const picked = await openComponentPicker(childComponents, { title: 'Select Components' });
    if (Array.isArray(picked)) {
      childComponents = picked;
      refreshChildComponents();
    }
  });

  generateBtn?.addEventListener('click', async () => {
    const idea = ideaInput?.value.trim();
    if (!idea) {
      showToast('Describe your idea before generating a draft', 'error');
      ideaInput?.focus();
      return;
    }

    const restore = { text: generateBtn.textContent, disabled: generateBtn.disabled };
    generateBtn.textContent = 'Generating…';
    generateBtn.disabled = true;
    
    try {
      // Generate draft data only (no database save)
      const apiBaseUrl = window.CONFIG.apiEndpoint;
      
      // Generate draft data only (no database save)
      fetch(`${apiBaseUrl}/api/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          templateId: 'user-story-generation',
          feature_description: idea,
          parentId: String(parentId)
        })
      }).then(async response => {
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.draft) {
            // Use the actual generated story data and populate the form
            const draftData = result.draft;
            
            // Populate form fields
            const titleInput = container.querySelector('#child-title');
            const pointInput = container.querySelector('#child-point');
            const descriptionInput = container.querySelector('#child-description');
            const asADisplay = container.querySelector('#child-asa-display');
            const iWantDisplay = container.querySelector('#child-iwant-display');
            const soThatDisplay = container.querySelector('#child-sothat-display');

            if (titleInput) titleInput.value = draftData.title || '';
            if (pointInput) pointInput.value = draftData.storyPoint || '';
            if (descriptionInput) descriptionInput.value = draftData.description || '';
            if (asADisplay) asADisplay.value = draftData.asA || '';
            if (iWantDisplay) iWantDisplay.value = draftData.iWant || '';
            if (soThatDisplay) soThatDisplay.value = draftData.soThat || '';
            
            // Update components
            if (Array.isArray(draftData.components)) {
              childComponents = normalizeComponentSelection(draftData.components);
              refreshChildComponents();
            }
            
            // Display acceptance tests in manual input fields
            if (draftData.acceptanceTests && draftData.acceptanceTests.length > 0) {
              const testsList = container.querySelector('#child-acceptance-tests-list');
              
              // Clear existing tests except the first one
              const existingTests = testsList.querySelectorAll('.acceptance-test-item');
              for (let i = 1; i < existingTests.length; i++) {
                existingTests[i].remove();
              }
              
              // Populate tests
              draftData.acceptanceTests.forEach((test, index) => {
                if (index === 0) {
                  // Populate first test
                  const titleField = container.querySelector('#child-test-title-1');
                  const givenField = container.querySelector('#child-test-given-1');
                  const whenField = container.querySelector('#child-test-when-1');
                  const thenField = container.querySelector('#child-test-then-1');
                  
                  if (titleField) titleField.value = test.title || '';
                  if (givenField) givenField.value = test.given || '';
                  if (whenField) whenField.value = test.when || '';
                  if (thenField) thenField.value = test.then || '';
                } else {
                  // Add additional tests
                  addNewTest();
                  const titleField = container.querySelector(`#child-test-title-${testCounter}`);
                  const givenField = container.querySelector(`#child-test-given-${testCounter}`);
                  const whenField = container.querySelector(`#child-test-when-${testCounter}`);
                  const thenField = container.querySelector(`#child-test-then-${testCounter}`);
                  
                  if (titleField) titleField.value = test.title || '';
                  if (givenField) givenField.value = test.given || '';
                  if (whenField) whenField.value = test.when || '';
                  if (thenField) thenField.value = test.then || '';
                }
              });
              
              showToast(`✨ Story draft generated with ${draftData.acceptanceTests.length} acceptance test(s)! Review and click Create Story to save.`, 'success');
            } else {
              showToast('✨ Story draft generated! Review and click Create Story to save.', 'success');
            }
          }
        } else {
          throw new Error('Draft generation failed');
        }
      }).catch(error => {
        console.error('Draft generation failed:', error);
        showToast('Draft generation failed. Please fill manually.', 'error');
      }).finally(() => {
        generateBtn.textContent = restore.text;
        generateBtn.disabled = restore.disabled;
      });
      
    } catch (error) {
      console.error('Failed to start story generation:', error);
      showToast('Failed to start story generation', 'error');
      generateBtn.textContent = restore.text;
      generateBtn.disabled = restore.disabled;
    }
  });

  openModal({
    title: 'Create Child Story',
    content: container,
    actions: [
      {
        label: 'Create Story',
        onClick: async () => {
          const rawTitle = container.querySelector('#child-title').value;
          const title = normalizeMindmapText(rawTitle).trim();
          if (!title) {
            showToast('Title is required', 'error');
            return false;
          }
          
          // Collect acceptance tests from manual input fields
          const acceptanceTests = [];
          const testItems = container.querySelectorAll('.acceptance-test-item');
          testItems.forEach((item, index) => {
            const titleField = item.querySelector(`input[id*="test-title"]`);
            const givenField = item.querySelector(`textarea[id*="test-given"]`);
            const whenField = item.querySelector(`textarea[id*="test-when"]`);
            const thenField = item.querySelector(`textarea[id*="test-then"]`);
            
            const testTitle = titleField?.value.trim();
            const given = givenField?.value.trim();
            const when = whenField?.value.trim();
            const then = thenField?.value.trim();
            
            if (testTitle && given && when && then) {
              acceptanceTests.push({
                title: testTitle,
                given,
                when,
                then,
                status: 'Draft'
              });
            }
          });

          if (acceptanceTests.length === 0) {
            showToast('At least one complete acceptance test is required', 'error');
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
            asA: container.querySelector('#child-asa-display').value.trim(),
            iWant: container.querySelector('#child-iwant-display').value.trim(),
            soThat: container.querySelector('#child-sothat-display').value.trim(),
            components: childComponents
          };
          try {
            const response = await fetch(resolveApiUrl('/api/stories'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
              throw new Error(`Failed to create child story: ${response.statusText}`);
            }
            
            // Story created successfully, now create acceptance tests
            const storyId = result.id;
            const testCreationPromises = acceptanceTests.map(test => 
              fetch(resolveApiUrl(`/api/stories/${storyId}/tests`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: test.title,
                  given: [test.given],
                  when: [test.when], 
                  then: [test.then],
                  status: test.status,
                  acceptWarnings: true
                })
              })
            );
            
            // Wait for all acceptance tests to be created
            await Promise.all(testCreationPromises);
            
            showToast('Child story created successfully with acceptance tests!', 'success');
            await loadStories(); // Refresh stories list
            return true; // Close modal
          } catch (error) {
            showToast(error.message || 'Failed to create story', 'error');
            return false;
          }
        },
      },
    ],
  });
}

function openAcceptanceTestModal(storyId, options = {}) {
  const { test = null } = options;
  const container = document.createElement('div');
  container.className = 'modal-form acceptance-test-form';
  container.innerHTML = `
    <div class="ai-draft-controls" ${test ? 'hidden' : ''}>
      <p class="ai-draft-status">${test ? '' : 'Generating draft with AI…'}</p>
      <button type="button" class="secondary small" id="ai-draft-refresh">Regenerate Draft</button>
    </div>
    <div class="idea-section" id="test-idea-section" ${test ? 'hidden' : ''}>
      <label>Idea<textarea id="test-idea" placeholder="Describe the scenario or behaviour to cover"></textarea></label>
      <div class="idea-actions">
        <button type="button" class="secondary small" id="test-idea-generate">Generate</button>
        <p class="form-hint">Use your idea to draft Given/When/Then steps instantly.</p>
      </div>
    </div>
    <label>Given<textarea id="test-given" placeholder="One step per line"></textarea></label>
    <label>When<textarea id="test-when" placeholder="One step per line"></textarea></label>
    <label>Then<textarea id="test-then" placeholder="One observable or measurable step per line"></textarea></label>
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

  const draftControls = container.querySelector('.ai-draft-controls');
  const draftStatus = container.querySelector('.ai-draft-status');
  const regenerateBtn = container.querySelector('#ai-draft-refresh');
  const ideaField = container.querySelector('#test-idea');
  const ideaSection = container.querySelector('#test-idea-section');
  const ideaGenerateBtn = container.querySelector('#test-idea-generate');
  const givenField = container.querySelector('#test-given');
  const whenField = container.querySelector('#test-when');
  const thenField = container.querySelector('#test-then');
  const statusField = container.querySelector('#test-status');

  async function loadDraft({ idea = '' } = {}) {
    if (!draftControls) return;
    draftControls.hidden = false;
    if (draftStatus) {
      draftStatus.textContent = idea ? 'Generating draft from your idea…' : 'Generating draft with AI…';
    }
    const activeIdea = typeof idea === 'string' ? idea.trim() : '';
    if (regenerateBtn) {
      regenerateBtn.disabled = true;
    }
    if (ideaGenerateBtn) {
      ideaGenerateBtn.disabled = true;
    }
    statusField.value = 'Draft';
    try {
      const draft = await fetchAcceptanceTestDraft(storyId, activeIdea ? { idea: activeIdea } : undefined);
      if (!draft) {
        if (draftStatus) {
          draftStatus.textContent = 'Unable to generate draft. Fill in the steps manually.';
        }
        return;
      }
      const given = Array.isArray(draft.given) ? draft.given.join('\n') : '';
      const when = Array.isArray(draft.when) ? draft.when.join('\n') : '';
      const then = Array.isArray(draft.then) ? draft.then.join('\n') : '';
      givenField.value = given;
      whenField.value = when;
      thenField.value = then;
      statusField.value = draft.status || 'Draft';
      if (draftStatus) {
        if (draft.source === 'ai' && draft.summary) {
          draftStatus.textContent = draft.summary;
        } else if (draft.source === 'ai') {
          draftStatus.textContent = 'Draft generated by ChatGPT.';
        } else {
          draftStatus.textContent = 'Using default draft template. Adjust the steps before saving.';
        }
      }
    } catch (error) {
      if (draftStatus) {
        draftStatus.textContent = error.message || 'Failed to generate draft. Fill in the steps manually.';
      }
      showToast(error.message || 'Unable to generate acceptance test draft', 'error');
    } finally {
      if (regenerateBtn) {
        regenerateBtn.disabled = false;
      }
      if (ideaGenerateBtn) {
        ideaGenerateBtn.disabled = false;
      }
    }
  }

  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', (event) => {
      event.preventDefault();
      loadDraft();
    });
  }

  if (ideaGenerateBtn && ideaField) {
    ideaGenerateBtn.addEventListener('click', (event) => {
      event.preventDefault();
      const ideaText = ideaField.value.trim();
      if (!ideaText) {
        showToast('Enter an idea to generate a draft.', 'error');
        ideaField.focus();
        return;
      }
      loadDraft({ idea: ideaText });
    });
  }

  if (test) {
    givenField.value = Array.isArray(test.given) ? test.given.join('\n') : '';
    whenField.value = Array.isArray(test.when) ? test.when.join('\n') : '';
    thenField.value = Array.isArray(test.then) ? test.then.join('\n') : '';
    if (typeof test.status === 'string') {
      statusField.value = test.status;
    }
    if (draftControls) {
      draftControls.hidden = true;
    }
    if (ideaSection) {
      ideaSection.hidden = true;
    }
  }

  openModal({
    title: test ? 'Edit Acceptance Test' : 'Create Acceptance Test',
    content: container,
    actions: [
      {
        label: test ? 'Save Changes' : 'Create Test',
        onClick: async () => {
          console.log('Create Test clicked');
          const given = splitLines(givenField.value);
          const when = splitLines(whenField.value);
          const then = splitLines(thenField.value);
          const status = statusField.value;
          console.log('Parsed fields:', { given, when, then, status });
          if (!given.length || !when.length || !then.length) {
            console.log('Validation failed: empty fields');
            showToast('Please provide Given, When, and Then steps.', 'error');
            return false;
          }
          try {
            if (test) {
              console.log('Updating test:', test.id);
              const updated = await updateAcceptanceTest(test.id, { given, when, then, status });
              console.log('Update result:', updated);
              if (updated === null) {
                console.log('Update returned null, keeping modal open');
                return false;
              }
              await loadStories();
              showToast('Acceptance test updated', 'success');
            } else {
              console.log('Creating test for story:', storyId);
              const created = await createAcceptanceTest(storyId, { given, when, then, status });
              console.log('Create result:', created);
              if (created === null) {
                console.log('Create returned null, keeping modal open');
                return false;
              }
              console.log('Loading stories...');
              await loadStories();
              console.log('Showing success toast');
              showToast('Acceptance test created', 'success');
            }
            console.log('onClick completed successfully');
          } catch (error) {
            console.error('onClick error:', error);
            showToast(error.message || 'Failed to save acceptance test', 'error');
            return false;
          }
        },
      },
    ],
  });

  // Don't auto-generate draft - let user click Generate button
}

function openTaskModal(storyId, task = null) {
  const isEdit = Boolean(task);
  const container = document.createElement('div');
  container.className = 'modal-form task-form';
  container.innerHTML = `
    <label>Title<textarea id="task-title" rows="1" style="resize: none; overflow: hidden;"></textarea></label>
    <label>Assignee<input id="task-assignee" type="email" placeholder="owner@example.com" /></label>
    <label>Status
      <select id="task-status"></select>
    </label>
    <label>Estimation (hours)<input id="task-estimation" type="number" min="0" step="0.5" placeholder="e.g. 4" /></label>
    <label>Description<textarea id="task-description" placeholder="Details about the work"></textarea></label>
  `;

  const titleInput = container.querySelector('#task-title');
  const assigneeInput = container.querySelector('#task-assignee');
  const statusSelect = container.querySelector('#task-status');
  const estimationInput = container.querySelector('#task-estimation');
  const descriptionInput = container.querySelector('#task-description');

  // Auto-resize title textarea
  const autoResize = () => {
    titleInput.style.height = 'auto';
    titleInput.style.height = titleInput.scrollHeight + 'px';
  };
  titleInput.addEventListener('input', autoResize);

  TASK_STATUS_OPTIONS.forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    statusSelect.appendChild(option);
  });

  if (task) {
    titleInput.value = task.title || '';
    descriptionInput.value = task.description || '';
    assigneeInput.value = task.assigneeEmail || '';
    setTimeout(autoResize, 0); // Resize after value is set
    const estimationSources = [task.estimationHours, task.estimation_hours, task.estimation];
    for (const source of estimationSources) {
      if (source != null && source !== '') {
        const numeric = Number(source);
        if (Number.isFinite(numeric) && numeric >= 0) {
          estimationInput.value = numeric;
          break;
        }
      }
    }
    if (task.status && TASK_STATUS_OPTIONS.includes(task.status)) {
      statusSelect.value = task.status;
    }
  } else {
    statusSelect.value = TASK_STATUS_OPTIONS[0];
    const parentStory = state.stories.find((item) => item.id === storyId);
    if (parentStory?.assigneeEmail) {
      assigneeInput.value = parentStory.assigneeEmail;
    }
  }

  openModal({
    title: isEdit ? 'Edit Task' : 'Create Task',
    content: container,
    actions: [
      {
        label: isEdit ? 'Save Task' : 'Create Task',
        onClick: async () => {
          const title = titleInput.value.trim();
          if (!title) {
            showToast('Task title is required', 'error');
            return false;
          }
          const assigneeEmail = assigneeInput.value.trim();
          if (!assigneeEmail) {
            showToast('Task assignee is required', 'error');
            assigneeInput.focus();
            return false;
          }
          const estimationResult = parseEstimationHoursInput(estimationInput.value);
          if (estimationResult.error) {
            showToast(estimationResult.error, 'error');
            estimationInput.focus();
            return false;
          }
          const payload = {
            title,
            status: statusSelect.value,
            description: descriptionInput.value.trim(),
            assigneeEmail,
            estimationHours: estimationResult.value,
          };
          try {
            if (isEdit) {
              await updateTask(task.id, payload);
              showToast('Task updated', 'success');
            } else {
              await createTask(storyId, payload);
              showToast('Task created', 'success');
            }
            await loadStories();
            return true;
          } catch (error) {
            showToast(error.message || (isEdit ? 'Failed to update task' : 'Failed to create task'), 'error');
            return false;
          }
        },
      },
    ],
  });
  
  // Trigger resize after modal is rendered
  setTimeout(autoResize, 10);
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
          await sendJson(resolveApiUrl(`/api/reference-documents/${docId}`), { method: 'DELETE' });
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
        await sendJson(resolveApiUrl(`/api/stories/${storyId}/reference-documents`), {
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

async function createRootStory() {
  const rootStory = {
    title: 'Project Root',
    description: 'Welcome to AIPM! This is your root story. Create child stories to build your project hierarchy.',
    status: 'Ready',
    storyPoints: 0,
    parentId: null,
    assignee: '',
    component: 'System'
  };
  
  try {
    const created = await sendJson(resolveApiUrl('/api/stories'), { 
      method: 'POST', 
      body: { ...rootStory, acceptWarnings: true }
    });
    state.stories = [created];
    rebuildStoryIndex();
    renderAll();
    showToast('Root story created', 'success');
  } catch (error) {
    console.error('Failed to create root story:', error);
    state.stories = [];
    rebuildStoryIndex();
  }
}

async function createStory(payload) {
  try {
    const result = await sendJson(resolveApiUrl('/api/stories'), { method: 'POST', body: payload });
    // Auto-backup after successful story creation
    setTimeout(() => autoBackupData(), 1000);
    return result;
  } catch (error) {
    if (error && error.code === 'INVEST_WARNINGS') {
      const proceed = window.confirm(
        `${error.message}\n\n${formatInvestWarnings(error.warnings)}\n\nCreate anyway?`
      );
      if (proceed) {
        return await sendJson(resolveApiUrl('/api/stories'), {
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
    const result = await sendJson(resolveApiUrl(`/api/stories/${storyId}`), {
      method: 'PATCH',
      body: payload,
    });
    // Auto-backup after successful story update
    setTimeout(() => autoBackupData(), 1000);
    return result;
  } catch (error) {
    if (error && error.code === 'INVEST_WARNINGS') {
      throw error;
    }
    throw error;
  }
}

async function fetchAcceptanceTestDraft(storyId, options = {}) {
  const requestOptions = { method: 'POST' };
  if (options && typeof options === 'object' && options.idea) {
    requestOptions.body = { idea: options.idea };
  }
  return await sendJson(resolveApiUrl(`/api/stories/${storyId}/tests/draft`), requestOptions);
}

async function createAcceptanceTest(storyId, payload) {
  try {
    console.log('createAcceptanceTest: sending request', { storyId, payload });
    return await sendJson(resolveApiUrl(`/api/stories/${storyId}/tests`), {
      method: 'POST',
      body: payload,
    });
  } catch (error) {
    console.log('createAcceptanceTest: caught error', error);
    if (error && error.code === 'MEASURABILITY_WARNINGS') {
      console.log('createAcceptanceTest: measurability warnings detected');
      const message = `${error.message}\n\n${formatMeasurabilityWarnings(error.warnings, error.suggestions)}\n\nCreate anyway?`;
      console.log('createAcceptanceTest: showing confirmation dialog');
      const proceed = window.confirm(message);
      if (proceed) {
        return await sendJson(resolveApiUrl(`/api/stories/${storyId}/tests`), {
          method: 'POST',
          body: { ...payload, acceptWarnings: true },
        });
      }
      console.log('createAcceptanceTest: user cancelled, returning null');
      return null;
    }
    console.log('createAcceptanceTest: non-measurability error, rethrowing');
    throw error;
  }
}

async function updateAcceptanceTest(testId, payload) {
  try {
    return await sendJson(resolveApiUrl(`/api/tests/${testId}`), {
      method: 'PATCH',
      body: payload,
    });
  } catch (error) {
    if (error && error.code === 'MEASURABILITY_WARNINGS') {
      const proceed = window.confirm(
        `${error.message}\n\n${formatMeasurabilityWarnings(error.warnings, error.suggestions)}\n\nUpdate anyway?`
      );
      if (proceed) {
        return await sendJson(resolveApiUrl(`/api/tests/${testId}`), {
          method: 'PATCH',
          body: { ...payload, acceptWarnings: true },
        });
      }
      return null;
    }
    throw error;
  }
}

async function createDependencyLink(storyId, dependsOnStoryId, relationship = 'depends') {
  return await sendJson(resolveApiUrl(`/api/stories/${storyId}/dependencies`), {
    method: 'POST',
    body: { dependsOnStoryId, relationship },
  });
}

async function deleteDependencyLink(storyId, dependsOnStoryId) {
  return await sendJson(resolveApiUrl(`/api/stories/${storyId}/dependencies/${dependsOnStoryId}`), {
    method: 'DELETE',
  });
}

async function createTask(storyId, payload) {
  return await sendJson(resolveApiUrl(`/api/stories/${storyId}/tasks`), {
    method: 'POST',
    body: payload,
  });
}

async function updateTask(taskId, payload) {
  return await sendJson(resolveApiUrl(`/api/tasks/${taskId}`), { method: 'PATCH', body: payload });
}

async function deleteTask(taskId) {
  return await sendJson(resolveApiUrl(`/api/tasks/${taskId}`), { method: 'DELETE' });
}

async function uploadReferenceFile(file) {
  const params = new URLSearchParams({ filename: file.name || 'document' });
  const response = await fetch(resolveApiUrl(`/api/uploads?${params}`), {
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
      const origin = describeIssueOrigin(warning.source);
      const prefix = origin ? `[${origin}] ` : '';
      return `• ${prefix}${warning.message}${suggestion}`;
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

function formatStatusBlockDetails(details) {
  if (!details || typeof details !== 'object') {
    return '';
  }
  const sections = [];
  if (Array.isArray(details.incompleteChildren) && details.incompleteChildren.length) {
    const children = details.incompleteChildren
      .map((child) => {
        const title = child.title && child.title.trim().length ? child.title : `Story ${child.id}`;
        const status = child.status || 'Draft';
        return `• ${title} (${status})`;
      })
      .join('\n');
    sections.push(`Incomplete child stories:\n${children}`);
  }
  if (details.missingTests) {
    sections.push('Add at least one acceptance test for this story.');
  }
  if (Array.isArray(details.failingTests) && details.failingTests.length) {
    const tests = details.failingTests
      .map((test) => {
        const title = test.title && test.title.trim().length ? test.title : `Test ${test.id}`;
        const status = test.status || 'Draft';
        return `• ${title} (${status})`;
      })
      .join('\n');
    sections.push(`Acceptance tests needing updates:\n${tests}`);
  }
  return sections.join('\n\n');
}

function formatComponentsSummary(components) {
  if (!Array.isArray(components) || components.length === 0) {
    return 'Not specified';
  }
  const labels = components
    .map((entry) => formatComponentLabel(entry))
    .filter((entry) => entry && entry.length > 0);
  return labels.length > 0 ? labels.join(', ') : 'Not specified';
}

async function confirmAndDeleteStory(storyId, options = {}) {
  if (!Number.isFinite(storyId)) {
    return false;
  }

  if (!window.confirm('Delete this story and all nested items?')) {
    return false;
  }

  const subtree = [];
  const target = storyIndex.get(storyId);
  if (target) {
    flattenStories([target]).forEach((entry) => {
      if (entry && entry.id != null) {
        subtree.push(entry.id);
      }
    });
  } else {
    subtree.push(storyId);
  }

  try {
    await sendJson(resolveApiUrl(`/api/stories/${storyId}`), { method: 'DELETE' });
    subtree.forEach((id) => state.expanded.delete(id));
    persistExpanded();

    if (subtree.includes(state.selectedStoryId)) {
      const fallback =
        options.fallbackSelectionId != null
          ? options.fallbackSelectionId
          : parentById.get(storyId) ?? null;
      state.selectedStoryId = fallback;
      persistSelection();
    }

    await loadStories();
    showToast('Story deleted', 'success');
    return true;
  } catch (error) {
    showToast(error.message || 'Failed to delete story', 'error');
    return false;
  }
}

async function sendJson(url, options = {}) {
  const { method = 'GET', body, timeout = 30000 } = options;
  const resolvedUrl = resolveApiUrl(url);
  
  // Create timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeout);
  });
  
  // Create fetch promise
  const fetchPromise = fetch(resolvedUrl, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  // Race between fetch and timeout
  const response = await Promise.race([fetchPromise, timeoutPromise]);
  
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
    console.log('sendJson: throwing error', { status: response.status, error });
    throw error;
  }
  console.log('sendJson: success', { status: response.status, data });
  return data;
}

function pollKiroResult(requestId, onComplete, maxAttempts = 60) {
  let attempts = 0;
  
  const poll = async () => {
    attempts++;
    
    try {
      const status = await sendJson(resolveApiUrl(`/api/kiro-status/${requestId}`));
      
      if (status.status === 'completed' && status.result) {
        console.log('✨ Kiro enhancement completed:', status.result);
        onComplete(status.result);
        return;
      }
      
      if (status.status === 'failed') {
        console.error('❌ Kiro enhancement failed:', status.error);
        return;
      }
      
      // Still pending or processing, poll again
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      } else {
        console.warn('⏰ Kiro polling timeout after', maxAttempts * 5, 'seconds');
      }
    } catch (error) {
      console.error('Kiro polling error:', error);
      // Don't retry on error
    }
  };
  
  // Start polling after 5 seconds (give Kiro time to start)
  setTimeout(poll, 5000);
}

function splitLines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function fetchVersion() {
  try {
    const res = await fetch(resolveApiUrl('/api/version'));
    const data = await res.json();
    const versionEl = document.getElementById('version-display');
    if (versionEl) {
      versionEl.textContent = data.pr ? `v${data.version} (PR #${data.pr})` : `v${data.version}`;
    }
  } catch (e) {
    console.error('Failed to fetch version:', e);
  }
}

function initialize() {
  console.log('AIPM initializing...');
  console.log('API Base URL:', window.__AIPM_API_BASE__);
  
  // Clear cache if environment changed
  const currentEnv = window.CONFIG?.environment || 'production';
  const cachedEnv = localStorage.getItem('aipm_environment');
  if (cachedEnv && cachedEnv !== currentEnv) {
    console.log(`Environment changed from ${cachedEnv} to ${currentEnv}, clearing cache...`);
    localStorage.clear();
  }
  localStorage.setItem('aipm_environment', currentEnv);
  
  loadPreferences();
  syncHideCompletedControls();
  initializeCodeWhispererDelegations();
  updateWorkspaceColumns();
  renderOutline();
  renderMindmap();
  renderDetails();
  fetchVersion();

  openKiroTerminalBtn?.addEventListener('click', () => {
    const terminalUrl = new URL('terminal/kiro-live.html', window.location.href);
    window.open(terminalUrl.toString(), '_blank', 'noopener');
  });



  expandAllBtn.addEventListener('click', () => setAllExpanded(true));
  collapseAllBtn.addEventListener('click', () => setAllExpanded(false));

  toggleOutline.addEventListener('change', (event) => setPanelVisibility('outline', event.target.checked));
  toggleMindmap.addEventListener('change', (event) => setPanelVisibility('mindmap', event.target.checked));
  toggleDetails.addEventListener('change', (event) => setPanelVisibility('details', event.target.checked));

  openHeatmapBtn?.addEventListener('click', () => {
    const { element, onClose } = buildHeatmapModalContent();
    openModal({
      title: 'Employee Heat Map',
      content: element,
      cancelLabel: 'Close',
      size: 'content',
      onClose,
    });
  });

  autoLayoutToggle.addEventListener('click', () => {
    if (state.autoLayout) {
      seedManualPositionsFromAutoLayout();
      state.autoLayout = false;
    } else {
      state.autoLayout = true;
      state.manualPositions = {};
    }
    persistLayout();
    persistMindmap();
    renderMindmap();
  });

  modalCloseBtn.addEventListener('click', closeModal);
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeModal();
  });

  if (runtimeDataLink) {
    runtimeDataLink.href = resolveApiUrl('/api/runtime-data');
  }

  loadStories();
  
  // Set up periodic auto-backup (every 5 minutes)
  setInterval(() => {
    if (state.stories.length > 0) {
      autoBackupData();
    }
  }, 5 * 60 * 1000);
}

function openCreateIssueModal(story, taskEntry = null) {
  const form = document.createElement('form');
  form.className = 'modal-form';
  form.innerHTML = `
    <div class="field">
      <label for="task-title">Task Title</label>
      <input id="task-title" name="taskTitle" value="${escapeHtml(story?.title || '')}" required />
    </div>
    <div class="field">
      <label for="objective">Objective</label>
      <textarea id="objective" name="objective" rows="3" required>${escapeHtml(story?.description || '')}</textarea>
    </div>
    <div class="field">
      <label for="constraints">Constraints</label>
      <textarea id="constraints" name="constraints" rows="2"></textarea>
    </div>
    <div class="field">
      <label for="acceptance">Acceptance Criteria</label>
      <textarea id="acceptance" name="acceptanceCriteria" rows="3" required></textarea>
    </div>
    <div class="field">
      <label>
        <input type="checkbox" name="enableGatingTests" checked />
        Enable iterative fix and gating tests (max 10 iterations)
      </label>
    </div>
    <div class="field">
      <label>
        <input type="checkbox" name="deployToDev" checked />
        Deploy to development environment after tests pass
      </label>
    </div>
  `;

  let isGenerating = false;
  let submitButton = null;

  const updateProgress = (message) => {
    const progressDiv = form.querySelector('.progress-status') || document.createElement('div');
    progressDiv.className = 'progress-status';
    progressDiv.textContent = message;
    if (!form.querySelector('.progress-status')) {
      form.appendChild(progressDiv);
    }
  };

  const handleSubmit = async () => {
    if (isGenerating) return;
    isGenerating = true;
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Generating...';
    }

    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    
    try {
      updateProgress('Starting code generation with gating tests...');
      
      const response = await fetch(resolveApiUrl('/api/personal-delegate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: 'demian7575',
          repo: 'aipm',
          storyId: story.id,
          taskTitle: values.taskTitle,
          objective: values.objective,
          constraints: values.constraints,
          acceptanceCriteria: values.acceptanceCriteria,
          enableGatingTests: values.enableGatingTests === 'on',
          deployToDev: values.deployToDev === 'on',
          maxIterations: 10
        }),
      });

      if (response.ok) {
        const result = await response.json();
        updateProgress(`Code generation completed. Iterations: ${result.iterations || 0}`);
        showToast('Code generation with gating tests completed successfully', 'success');
        setTimeout(() => closeModal(), 2000);
      } else {
        const error = await response.text();
        updateProgress(`Failed: ${error}`);
        showToast('Code generation failed', 'error');
      }
    } catch (error) {
      updateProgress(`Error: ${error.message}`);
      showToast('Error during code generation', 'error');
    } finally {
      isGenerating = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Create Issue';
      }
    }
  };

  openModal({
    title: 'Create Issue with Generated Code',
    content: form,
    actions: [{ label: 'Create Issue', onClick: handleSubmit }],
  });

  setTimeout(() => {
    submitButton = document.querySelector('.modal-footer button:last-child');
  }, 100);
}

function openUpdatePRWithCodeModal(story, taskEntry = null) {
  console.log('🔍 Generate Code button clicked');
  console.log('📊 Story data:', story);
  console.log('📊 TaskEntry data:', taskEntry);
  console.log('📊 TaskEntry type:', typeof taskEntry);
  console.log('📊 TaskEntry keys:', taskEntry ? Object.keys(taskEntry) : 'null');
  console.log('📊 TaskEntry.number:', taskEntry?.number);
  console.log('📊 TaskEntry.targetNumber:', taskEntry?.targetNumber);
  
  // More robust validation - check for PR number in multiple places
  const prNumber = taskEntry?.number || taskEntry?.targetNumber || taskEntry?.prNumber;
  const prUrl = taskEntry?.prUrl || taskEntry?.htmlUrl || taskEntry?.taskUrl;
  
  if (!taskEntry || !prNumber) {
    console.error('❌ No PR found - taskEntry missing or no PR number found');
    console.log('Available taskEntry properties:', taskEntry ? Object.keys(taskEntry) : 'none');
    showToast('No PR found to update. Create a PR first.', 'error');
    return;
  }
  
  console.log('✅ PR validation passed - PR number:', prNumber, 'PR URL:', prUrl);

  // Create code-focused prompt from story details
  const storyTitle = story?.title || 'Untitled Story';
  const storyDesc = story?.description || '';
  const asA = story?.asA || '';
  const iWant = story?.iWant || '';
  const soThat = story?.soThat || '';
  
  // Build a code implementation prompt
  let defaultPrompt = `IMPLEMENT the following feature by modifying the existing AIPM codebase files:\n\n`;
  defaultPrompt += `**Feature**: ${storyTitle}\n\n`;
  
  if (asA && iWant && soThat) {
    defaultPrompt += `**Requirements**:\n`;
    defaultPrompt += `- User: ${asA}\n`;
    defaultPrompt += `- Wants: ${iWant}\n`;
    defaultPrompt += `- So that: ${soThat}\n\n`;
  } else if (storyDesc) {
    defaultPrompt += `**Description**: ${storyDesc}\n\n`;
  }
  
  defaultPrompt += `**CRITICAL INSTRUCTIONS**:\n`;
  defaultPrompt += `- MODIFY the actual code files in the repository\n`;
  defaultPrompt += `- DO NOT just provide suggestions - make the actual changes\n`;
  defaultPrompt += `- Update existing files in apps/frontend/public/ and apps/backend/ as needed\n`;
  defaultPrompt += `- Follow existing code patterns and architecture\n`;
  defaultPrompt += `- Make minimal but complete changes to implement the feature\n`;
  defaultPrompt += `- Ensure the implementation works correctly\n`;
  defaultPrompt += `- Save all changes to the files`;

  const form = document.createElement('form');
  form.className = 'modal-form';
  form.innerHTML = `
    <div class="field">
      <label>PR to Update</label>
      <p><strong>PR #${prNumber}</strong> - ${escapeHtml(taskEntry.taskTitle || 'Development Task')}</p>
    </div>
    <div class="field">
      <label for="prompt">Code Generation Prompt</label>
      <textarea id="prompt" name="prompt" rows="8" required placeholder="Describe what code to generate...">${escapeHtml(defaultPrompt)}</textarea>
    </div>
  `;

  let isGenerating = false;
  let submitButton = null;

  const updateProgress = (message) => {
    console.log('📝 Progress update:', message);
    const progressDiv = form.querySelector('.progress-status') || document.createElement('div');
    progressDiv.className = 'progress-status';
    progressDiv.textContent = message;
    if (!form.querySelector('.progress-status')) {
      form.appendChild(progressDiv);
    }
  };

  const handleSubmit = async () => {
    if (isGenerating) return;
    isGenerating = true;
    
    console.log('🚀 Starting fresh branch code generation...');
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Creating Branch & Generating...';
    }

    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    
    console.log('📤 Sending request with prompt:', values.prompt);
    
    try {
      updateProgress('Creating fresh branch from main...');
      
      // Use new fresh branch API
      const response = await fetch(resolveApiUrl('/api/generate-code-branch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story?.id,
          prNumber: parseInt(prNumber),
          prompt: values.prompt,
          originalBranch: taskEntry.branchName
        })
      });

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Generation result:', result);
        
        if (result.success) {
          updateProgress('Code generated and committed to fresh branch!');
          
          // Display the generated code and branch info
          const codeDisplay = document.createElement('div');
          codeDisplay.className = 'generated-code';
          codeDisplay.innerHTML = `
            <h4>✅ Code Generated Successfully!</h4>
            <p><strong>New Branch:</strong> <code>${escapeHtml(result.generationBranch)}</code></p>
            <p><strong>Commit:</strong> <code>${escapeHtml(result.commitSha?.substring(0, 7) || 'N/A')}</code></p>
            <p><strong>PR Updated:</strong> <a href="${escapeHtml(result.prUrl)}" target="_blank">View PR #${prNumber}</a></p>
            <details>
              <summary>Generated Code Preview</summary>
              <pre><code>${escapeHtml(result.generatedCode || 'Code generated successfully')}</code></pre>
            </details>
            <p><em>✨ Fresh branch created from latest main with generated code committed automatically!</em></p>
          `;
          form.appendChild(codeDisplay);
          
          showToast('Code generated on fresh branch!', 'success');
        } else {
          console.error('❌ Generation failed - success=false');
          updateProgress('Code generation failed');
          showToast('Code generation failed', 'error');
        }
      } else {
        const error = await response.text();
        console.error('❌ HTTP error:', error);
        updateProgress(`Failed: ${error}`);
        showToast('Code generation failed', 'error');
      }
    } catch (error) {
      console.error('❌ Exception during generation:', error);
      updateProgress(`Error: ${error.message}`);
      showToast('Error during code generation', 'error');
    } finally {
      isGenerating = false;
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Generate Code';
      }
      console.log('🏁 Fresh branch code generation completed');
    }
  };

  openModal({
    title: 'Generate Code for PR',
    content: form,
    actions: [{ label: 'Generate Code', onClick: handleSubmit }],
  });

  setTimeout(() => {
    submitButton = document.querySelector('.modal-footer button:last-child');
  }, 100);
}

function openCreatePRModal(story, taskEntry = null) {
  const form = document.createElement('form');
  form.className = 'modal-form';
  
  // Reuse existing auto-fill logic
  const defaults = createDefaultCodeWhispererForm(story);
  
  // Override with task entry values if available
  const repoUrl = taskEntry?.repo ? `https://github.com/${taskEntry.repo}` : `https://github.com/${defaults.owner}/${defaults.repo}`;
  const branchName = taskEntry?.branchName || defaults.branchName;
  const prTitle = taskEntry?.taskTitle || defaults.prTitle;
  const description = taskEntry?.description || defaults.objective;
  
  form.innerHTML = `
    <div class="field">
      <label for="repo-url">Repository URL</label>
      <input id="repo-url" name="repositoryUrl" type="url" value="${escapeHtml(repoUrl)}" required />
    </div>
    <div class="field">
      <label for="branch">Branch Name</label>
      <input id="branch" name="branchName" value="${escapeHtml(branchName)}" required />
    </div>
    <div class="field">
      <label for="pr-title">PR Title</label>
      <input id="pr-title" name="prTitle" value="${escapeHtml(prTitle)}" required />
    </div>
    <div class="field">
      <label for="description">Description</label>
      <textarea id="description" name="description" rows="3">${escapeHtml(description)}</textarea>
    </div>
  `;

  const handleSubmit = async () => {
    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());

    console.log('Create PR - Form values:', values);
    console.log('Create PR - Story:', story);

    try {
      const payload = {
        storyId: story.id,
        branchName: values.branchName,
        prTitle: values.prTitle,
        prBody: values.description,
        story: story
      };
      
      console.log('Create PR - Payload:', payload);
      console.log('Create PR - API URL:', resolveApiUrl('/api/create-pr'));

      const response = await fetch(resolveApiUrl('/api/create-pr'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('Create PR - Response status:', response.status);
      console.log('Create PR - Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Create PR - Success result:', result);
        showToast(result.message || 'Pull request created', 'success');
        closeModal();
        
        // Immediately add PR entry to story data for instant availability
        if (result.success && result.prEntry) {
          const currentStory = storyIndex.get(story.id);
          if (currentStory) {
            if (!currentStory.prs) {
              currentStory.prs = [];
            }
            currentStory.prs.push(result.prEntry);
            console.log('Added PR entry to story immediately:', result.prEntry);
            
            // Force immediate refresh of Development Tasks section
            const devTasksSection = document.querySelector(`[data-role="codewhisperer-section"][data-story-id="${story.id}"]`);
            if (devTasksSection) {
              const taskList = devTasksSection.querySelector('.codewhisperer-task-list');
              if (taskList) {
                renderCodeWhispererSectionList(taskList, currentStory);
              }
            }
          }
        }
        
        // Refresh the story to show the new PR
        if (result.success) {
          await loadStories();
          // Refresh the current story's details if it's selected
          if (state.selectedStoryId === story.id) {
            renderDetails();
          }
        }
      } else {
        const error = await response.json();
        console.log('Create PR - Error result:', error);
        showToast(error.error || 'Failed to create pull request', 'error');
      }
    } catch (error) {
      console.error('Create PR - Exception:', error);
      showToast('Error creating pull request', 'error');
    }
  };

  openModal({
    title: 'Create Pull Request',
    content: form,
    actions: [{ label: 'Create PR', onClick: handleSubmit }],
  });
}

initialize();

// Global function to clean up Kiro API queue (accessible from browser console)
window.cleanupKiroQueue = async function() {
  try {
    const apiBaseUrl = window.CONFIG?.API_BASE_URL || window.CONFIG?.apiEndpoint || '';
    const response = await fetch(`${apiBaseUrl}:8081/kiro/v3/queue/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Queue cleanup result:', result);
      showToast(`Queue cleanup completed. Cleared ${result.cleared.queuedItems} queued items and ${result.cleared.pendingCallbacks} pending callbacks.`, 'success');
      return result;
    } else {
      throw new Error(`Cleanup failed: ${response.status}`);
    }
  } catch (error) {
    console.error('Queue cleanup error:', error);
    showToast(`Queue cleanup failed: ${error.message}`, 'error');
    throw error;
  }
};
