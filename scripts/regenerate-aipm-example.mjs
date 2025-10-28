#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createRng(seed = 8731) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const rng = createRng(24071983);

function sampleInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

const maxDepth = sampleInt(1, 7);

const COMPONENT_EXPERTISE = {
  WorkModel: 'Product Strategy',
  Document_Intelligence: 'Knowledge Management',
  Review_Governance: 'Governance',
  Orchestration_Engagement: 'Automation',
  Run_Verify: 'Quality Assurance',
  Traceabilty_Insight: 'Analytics',
};

const COMPONENTS = Object.keys(COMPONENT_EXPERTISE);

const EMPLOYEES = [
  { email: 'dan.strat@aipm.example', expertise: 'Product Strategy' },
  { email: 'maya.ops@aipm.example', expertise: 'Automation' },
  { email: 'vera.know@aipm.example', expertise: 'Knowledge Management' },
  { email: 'noah.gov@aipm.example', expertise: 'Governance' },
  { email: 'indra.qa@aipm.example', expertise: 'Quality Assurance' },
  { email: 'li.quants@aipm.example', expertise: 'Analytics' },
  { email: 'peter.sec@aipm.example', expertise: 'Security' },
  { email: 'zara.dev@aipm.example', expertise: 'Automation' },
  { email: 'omar.ops@aipm.example', expertise: 'Automation' },
  { email: 'tess.ux@aipm.example', expertise: 'Design' },
  { email: 'leo.data@aipm.example', expertise: 'Analytics' },
  { email: 'gina.enable@aipm.example', expertise: 'Knowledge Management' },
  { email: 'anika.change@aipm.example', expertise: 'Change Management' },
  { email: 'marco.support@aipm.example', expertise: 'Support Engineering' },
  { email: 'irene.ml@aipm.example', expertise: 'Product Strategy' },
];

const employeeUsage = new Map(EMPLOYEES.map((member) => [member.email, 0]));

const TASK_THEMES = [
  'Design telemetry wiring',
  'Instrument dataset validation',
  'Publish rollout briefing',
  'Automate mitigation runbook',
  'Execute shadow experiment',
  'Document observable signals',
];

const STATUS_OPTIONS = ['Ready', 'In Progress', 'Blocked', 'Done'];
const TASK_STATUS_OPTIONS = ['Not Started', 'In Progress', 'Blocked', 'Done'];

const EPICS = [
  {
    code: 'ALIGN',
    title: 'Strategic Alignment OS',
    persona: 'Portfolio executive',
    want: 'synthesize initiatives against OKRs continuously',
    soThat: 'AI steering choices stay anchored to outcomes',
    description:
      'Establishes an adaptive portfolio layer that prioritises workstreams using autonomous scoring and narrative intelligence.',
    componentBias: ['WorkModel', 'Review_Governance'],
  },
  {
    code: 'COORD',
    title: 'Autonomous Delivery Coordination',
    persona: 'Delivery director',
    want: 'see swarm teams orchestrated without manual triage',
    soThat: 'critical launches progress even when inputs spike',
    description:
      'Coordinates release trains, risk mitigation, and staffing flows with AI copilots that keep execution responsive.',
    componentBias: ['Orchestration_Engagement', 'Run_Verify'],
  },
  {
    code: 'INSIGHT',
    title: 'Insight Co-Pilot Analytics',
    persona: 'Insights lead',
    want: 'trace commitments to quantifiable impacts in real time',
    soThat: 'stakeholders trust AI derived recommendations',
    description:
      'Provides evidence-driven dashboards, signal harmonisation, and retrospectives to prove AI PM effectiveness.',
    componentBias: ['Traceabilty_Insight', 'Document_Intelligence'],
  },
];

const DEPTH_LIBRARY = {
  1: [
    {
      label: 'Intake Prioritisation Canvas',
      persona: 'Intake manager',
      want: 'rank backlogged requests with transparent scoring',
      soThat: 'leaders understand why AIPM pivots attention',
      description:
        'Creates shared scoring criteria, telemetry hooks, and review cadences that enable confident intake decisions.',
      bias: ['WorkModel', 'Document_Intelligence'],
    },
    {
      label: 'Delivery Capacity Signals',
      persona: 'Program controller',
      want: 'forecast when squads will saturate',
      soThat: 'automation can reroute work before bottlenecks hit',
      description:
        'Models throughput envelopes using streaming utilisation data and prompts staffing interventions automatically.',
      bias: ['Orchestration_Engagement', 'Run_Verify'],
    },
    {
      label: 'Outcome Evidence Registry',
      persona: 'Change steward',
      want: 'link experiments to success metrics',
      soThat: 'executives see confidence intervals improve weekly',
      description:
        'Captures before/after measurements, attaches observational logs, and enforces reviewable change notes.',
      bias: ['Traceabilty_Insight', 'Review_Governance'],
    },
    {
      label: 'Human-in-the-loop Oversight',
      persona: 'Governance officer',
      want: 'schedule guardrail reviews with AI suggestions',
      soThat: 'regulators see compliant and explainable workflows',
      description:
        'Designs oversight sessions, surfaces drift dashboards, and documents mitigations with rich evidence packages.',
      bias: ['Review_Governance', 'Document_Intelligence'],
    },
  ],
  2: [
    {
      label: 'Signal Harmonisation Engine',
      persona: 'Telemetry analyst',
      want: 'cleanse noisy signals into trusted indicators',
      soThat: 'automations trigger only on verifiable patterns',
      description:
        'Standardises event schemas, deduplicates anomalies, and aligns metadata contracts across ingestion paths.',
      bias: ['Traceabilty_Insight', 'WorkModel'],
    },
    {
      label: 'Constraint-aware Sequencer',
      persona: 'Release captain',
      want: 'stage deliverables around risk windows',
      soThat: 'high-risk launches earn extra reviews automatically',
      description:
        'Blends compliance windows with dependency heatmaps to recommend safe landing zones for increments.',
      bias: ['Orchestration_Engagement', 'Review_Governance'],
    },
    {
      label: 'Experiment Confidence Monitor',
      persona: 'Experiment owner',
      want: 'know if trials achieve the promised uplift',
      soThat: 'scale decisions rely on statistically valid evidence',
      description:
        'Aggregates cohorts, calculates lift, and alerts when parameters drift beyond tolerances.',
      bias: ['Run_Verify', 'Traceabilty_Insight'],
    },
    {
      label: 'Knowledge Gap Radar',
      persona: 'Enablement coach',
      want: 'close documentation gaps before rollout',
      soThat: 'adoption teams keep customers successful',
      description:
        'Maps tutorial coverage, sentiment, and incident themes to highlight readiness blockers for enablement.',
      bias: ['Document_Intelligence', 'WorkModel'],
    },
  ],
  3: [
    {
      label: 'Golden Signal Backfill',
      persona: 'SRE partner',
      want: 'replay events to validate alert baselines',
      soThat: 'auto-remediations stay tuned to new traffic',
      description:
        'Backfills historical volumes, benchmarks response curves, and calibrates guardrails to updated norms.',
      bias: ['Run_Verify', 'Traceabilty_Insight'],
    },
    {
      label: 'Playbook Drift Checker',
      persona: 'Incident lead',
      want: 'audit remediation steps stay current',
      soThat: 'swarm teams avoid repeating stale fixes',
      description:
        'Compares recorded incident actions with living playbooks and flags deviations for author review.',
      bias: ['Review_Governance', 'Document_Intelligence'],
    },
    {
      label: 'Cross-team Forecast Sync',
      persona: 'Staff portfolio planner',
      want: 'merge multiple squad projections',
      soThat: 'investments remain harmonised across bet types',
      description:
        'Aligns velocity projections, scenario planning, and shared risk budgets for connected squads.',
      bias: ['WorkModel', 'Orchestration_Engagement'],
    },
  ],
};

function pickLibraryEntry(depth) {
  const options = DEPTH_LIBRARY[depth] || DEPTH_LIBRARY[3];
  const index = Math.floor(rng() * options.length);
  return options[index];
}

function pickComponents(bias = []) {
  const selections = new Set();
  const desired = 2;
  bias.forEach((item) => {
    if (COMPONENTS.includes(item)) {
      selections.add(item);
    }
  });
  while (selections.size < desired) {
    const next = COMPONENTS[Math.floor(rng() * COMPONENTS.length)];
    selections.add(next);
  }
  return Array.from(selections);
}

const TOTAL_STORIES = 50;
const TARGET_TASKS = 200;

let storyIdCounter = 1;
let testIdCounter = 1;
let taskIdCounter = 1;
let timestampCounter = Date.parse('2024-07-15T09:00:00Z');

function nextTimestamp() {
  const stamp = new Date(timestampCounter).toISOString();
  timestampCounter += 60 * 1000;
  return stamp;
}

const userStories = [];
const acceptanceTests = [];
const storyDependencies = [];
const tasks = [];

const internalStories = [];
const epicStories = new Map();

function registerAssignment(employee) {
  const current = employeeUsage.get(employee.email) ?? 0;
  employeeUsage.set(employee.email, current + 1);
}

function pickSpecificEmployee(employee) {
  registerAssignment(employee);
  return employee;
}

function pickEmployeeForComponent(component, allowCrossDiscipline = false) {
  const targetExpertise = COMPONENT_EXPERTISE[component];
  const matching = EMPLOYEES.filter((member) => member.expertise === targetExpertise);
  const cross = EMPLOYEES.filter((member) => member.expertise !== targetExpertise);
  let pool = matching;
  if (allowCrossDiscipline || matching.length === 0) {
    pool = matching.concat(cross);
  }
  if (pool.length === 0) {
    pool = EMPLOYEES;
  }
  const minimalUsage = Math.min(...pool.map((member) => employeeUsage.get(member.email) ?? 0));
  const lightest = pool.filter((member) => (employeeUsage.get(member.email) ?? 0) === minimalUsage);
  const choice = lightest[Math.floor(rng() * lightest.length)];
  registerAssignment(choice);
  return choice;
}

function createStory({ epic, parent, depth, childIndex }) {
  const path = parent ? [...parent.path, childIndex + 1] : [epic.index + 1];
  const libraryEntry = depth === 0 ? null : pickLibraryEntry(depth);
  const title =
    depth === 0
      ? `EPIC: ${epic.title}`
      : `${epic.code}-${path.join('.')}: ${libraryEntry.label}`;
  const persona = depth === 0 ? epic.persona : libraryEntry.persona;
  const want = depth === 0 ? epic.want : libraryEntry.want;
  const soThat = depth === 0 ? epic.soThat : libraryEntry.soThat;
  const descriptionParts = [epic.description];
  if (depth > 0) {
    descriptionParts.push(libraryEntry.description);
  }
  const description = descriptionParts.join(' ');
  const bias = depth === 0 ? epic.componentBias : libraryEntry.bias;
  const components = pickComponents(bias);
  const owner = pickEmployeeForComponent(components[0]);
  const createdAt = nextTimestamp();
  const storyPoint = depth === 0 ? 13 : sampleInt(3, 8);
  let status = depth === 0 ? 'Ready' : STATUS_OPTIONS[Math.floor(rng() * STATUS_OPTIONS.length)];
  const record = {
    id: storyIdCounter++,
    mr_id: 1,
    parent_id: parent ? parent.id : null,
    title,
    description,
    as_a: persona,
    i_want: want,
    so_that: soThat,
    components: JSON.stringify(components),
    story_point: storyPoint,
    assignee_email: owner.email,
    status,
    created_at: createdAt,
    updated_at: createdAt,
    dependencies: [],
    blocked_by: [],
  };
  userStories.push(record);

  const internal = {
    ...record,
    componentsList: components,
    depth,
    path,
    epic,
    owner,
    dependents: [],
    record,
  };
  internalStories.push(internal);
  epicStories.set(epic.code, [...(epicStories.get(epic.code) ?? []), internal]);

  if (parent) {
    record.dependencies.push(parent.id);
    storyDependencies.push({
      story_id: record.id,
      depends_on_story_id: parent.id,
      relationship: 'depends',
    });
    parent.dependents.push(internal);
  }

  return internal;
}

function addCrossDependency(story) {
  const pool = (epicStories.get(story.epic.code) ?? []).filter(
    (candidate) => candidate.id !== story.id && candidate.id !== story.parent_id
  );
  if (pool.length === 0) {
    return;
  }
  const candidate = pool[Math.floor(rng() * pool.length)];
  if (!story.dependencies.includes(candidate.id)) {
    story.dependencies.push(candidate.id);
    storyDependencies.push({
      story_id: story.id,
      depends_on_story_id: candidate.id,
      relationship: 'depends',
    });
  }
}

function ensureBlocker(story) {
  const pool = (epicStories.get(story.epic.code) ?? []).filter(
    (candidate) => candidate.id !== story.id && candidate.id !== story.parent_id
  );
  if (pool.length === 0) {
    story.status = 'In Progress';
    if (story.record) {
      story.record.status = story.status;
    }
    return;
  }
  const blocker = pool[Math.floor(rng() * pool.length)];
  story.blocked_by.push(blocker.id);
  storyDependencies.push({
    story_id: story.id,
    depends_on_story_id: blocker.id,
    relationship: 'blocks',
  });
}

function createTasks(story) {
  const componentCycle = story.componentsList;
  const underrepresented = EMPLOYEES.filter((member) => (employeeUsage.get(member.email) ?? 0) === 0);
  let forcedIndex = 0;
  for (let idx = 0; idx < 4; idx += 1) {
    const component = componentCycle[idx % componentCycle.length];
    const allowCross = rng() < 0.18;
    let assignee;
    if (forcedIndex < underrepresented.length) {
      assignee = pickSpecificEmployee(underrepresented[forcedIndex]);
      forcedIndex += 1;
    } else {
      assignee = pickEmployeeForComponent(component, allowCross);
    }
    const status = TASK_STATUS_OPTIONS[(story.depth + idx) % TASK_STATUS_OPTIONS.length];
    const createdAt = nextTimestamp();
    const description = `Apply ${component} expertise${
      assignee.expertise === COMPONENT_EXPERTISE[component] ? '' : ' (supporting out-of-band)'
    } for ${story.title}.`;
    tasks.push({
      id: taskIdCounter++,
      story_id: story.id,
      title: `${story.title} :: ${TASK_THEMES[idx % TASK_THEMES.length]}`,
      description,
      status,
      assignee_email: assignee.email,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }
}

function createAcceptanceTests(story, healthy) {
  const baseTelemetry = story.componentsList.join(', ');
  const cycleMetrics = [
    600 + story.story_point * 40,
    800 + story.depth * 70 + story.story_point * 25,
  ];
  for (let testIndex = 0; testIndex < 2; testIndex += 1) {
    const metric = cycleMetrics[testIndex % cycleMetrics.length];
    const events = 4 + ((story.depth + testIndex) % 5);
    const given = [
      `Given ${story.title} telemetry for ${baseTelemetry} is captured in the evidence lake`,
      `And the review cadence for ${story.epic.title.toLowerCase()} is configured at 30 minute intervals`,
    ];
    const when = [
      `When the autonomous routines execute scenario ${testIndex + 1} for ${story.title}`,
      `And observers watch deployment metrics for a ${90 + story.depth * 15}-minute window`,
    ];
    const evidencePath = `/evidence/${story.epic.code.toLowerCase()}/${story.id}/scenario-${testIndex + 1}.json`;
    const then = [
      `Then the median response stays under ${metric} ms with p95 under ${Math.round(metric * 1.2)} ms`,
      `And the validation summary at ${evidencePath} lists at least ${events} events with zero Sev-1 regressions`,
    ];
    const status = healthy ? 'Pass' : testIndex === 0 ? 'Need review with update' : 'Draft';
    const createdAt = nextTimestamp();
    acceptanceTests.push({
      id: testIdCounter++,
      story_id: story.id,
      given: JSON.stringify(given),
      when_step: JSON.stringify(when),
      then_step: JSON.stringify(then),
      status,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }
}

function buildDataset(seedOffset = 0) {
  // reset state
  userStories.length = 0;
  acceptanceTests.length = 0;
  storyDependencies.length = 0;
  tasks.length = 0;
  internalStories.length = 0;
  epicStories.clear();
  storyIdCounter = 1;
  testIdCounter = 1;
  taskIdCounter = 1;
  timestampCounter = Date.parse('2024-07-15T09:00:00Z') + seedOffset * 1000;
  employeeUsage.forEach((_, key) => {
    employeeUsage.set(key, 0);
  });

  const queue = [];
  EPICS.forEach((epic, index) => {
    const story = createStory({ epic: { ...epic, index }, parent: null, depth: 0, childIndex: index });
    queue.push(story);
  });

  let pointer = 0;
  while (pointer < queue.length && userStories.length < TOTAL_STORIES) {
    const current = queue[pointer];
    pointer += 1;
    if (current.depth >= maxDepth) {
      continue;
    }
    const remaining = TOTAL_STORIES - userStories.length;
    if (remaining <= 0) {
      break;
    }
    const maxChildren = Math.min(5, remaining);
    const desiredChildren = sampleInt(0, 5);
    const childCount = Math.min(desiredChildren, maxChildren);
    for (let childIndex = 0; childIndex < childCount; childIndex += 1) {
      if (userStories.length >= TOTAL_STORIES) {
        break;
      }
      const child = createStory({
        epic: current.epic,
        parent: current,
        depth: current.depth + 1,
        childIndex,
      });
      queue.push(child);
      if (child.depth <= maxDepth - 1 && rng() < 0.35) {
        addCrossDependency(child);
      }
      if (child.status === 'Blocked') {
        ensureBlocker(child);
      } else if (rng() < 0.15) {
        addCrossDependency(child);
      }
    }
  }

  if (userStories.length !== TOTAL_STORIES) {
    return false;
  }

  const failingTarget = Math.max(3, Math.ceil(TOTAL_STORIES * 0.06));
  const eligibleStories = internalStories
    .filter((story) => story.depth > 0)
    .sort((a, b) => a.id - b.id);
  const failingSet = new Set();
  eligibleStories.forEach((story, index) => {
    if (failingSet.size >= failingTarget) {
      return;
    }
    const remainingSlots = failingTarget - failingSet.size;
    const remainingStories = eligibleStories.length - index;
    const forceSelect = remainingStories === remainingSlots;
    if (forceSelect || rng() < 0.12) {
      failingSet.add(story.id);
    }
  });

  internalStories.forEach((story) => {
    const healthy = !failingSet.has(story.id);
    if (story.status === 'Blocked') {
      ensureBlocker(story);
    }
    createAcceptanceTests(story, healthy);
    createTasks(story);
  });

  return { failingSet };
}

let attempts = 0;
let generation;
while (!(generation = buildDataset(attempts))) {
  attempts += 1;
  if (attempts > 50) {
    throw new Error('Unable to generate dataset with required counts');
  }
}

if (tasks.length !== TARGET_TASKS) {
  throw new Error(`Expected ${TARGET_TASKS} tasks but generated ${tasks.length}`);
}

const failingStories = internalStories.filter((story) => generation.failingSet.has(story.id));

const dataset = {
  tables: {
    user_stories: userStories,
    acceptance_tests: acceptanceTests,
    story_dependencies: storyDependencies,
    tasks,
  },
};

const outputPath = path.resolve(__dirname, '..', 'docs', 'examples', 'aipm.app.sqlite.json');
await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      output: outputPath,
      stories: userStories.length,
      tasks: tasks.length,
      acceptanceTests: acceptanceTests.length,
      maxDepth,
      attempts,
      failingStories: failingStories.length,
    },
    null,
    2
  )
);
