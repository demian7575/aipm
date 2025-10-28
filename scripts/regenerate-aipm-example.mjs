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

const rngBaseSeed = 24071983;
let rng = createRng(rngBaseSeed);

function sampleInt(min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffleInPlace(list) {
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    const temp = list[index];
    list[index] = list[swapIndex];
    list[swapIndex] = temp;
  }
  return list;
}

let sampledMaxDepth = 0;

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
const HOURS_PER_STORY_POINT = 8;
const STORY_POINT_BUCKETS = [0, 1, 2, 3, 5, 8, 13, 21];

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

const TOTAL_STORIES = 40;
const MAX_CHILDREN_PER_NODE = 2;
const MIN_TASKS_PER_STORY = 1;
const MAX_TASKS_PER_STORY = 4;

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
  const storyPoint = 1;
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
    estimatedHours: 0,
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

function bucketizeStoryPoint(value) {
  const normalized = Math.max(0, Math.ceil(value));
  const bucket = STORY_POINT_BUCKETS.find((entry) => normalized <= entry);
  if (bucket != null) {
    return bucket;
  }
  return normalized;
}

function calculateEffortAndStoryPoints() {
  const childrenMap = new Map();
  internalStories.forEach((story) => {
    if (story.parent_id !== null) {
      const list = childrenMap.get(story.parent_id) ?? [];
      list.push(story);
      childrenMap.set(story.parent_id, list);
    }
  });

  const ordered = [...internalStories].sort((a, b) => b.depth - a.depth);
  ordered.forEach((story) => {
    const children = childrenMap.get(story.id) ?? [];
    if (children.length === 0) {
      const minimum = Math.max(4, 6 + Math.min(story.depth, 4) * 2);
      const maximum = Math.max(minimum + 1, 24 + story.depth * 3);
      story.estimatedHours = sampleInt(minimum, maximum);
    } else {
      const childHours = children.reduce((total, child) => total + (child.estimatedHours ?? 0), 0);
      const coordination = Math.max(children.length * 2, Math.round(childHours * (0.1 + story.depth * 0.02)));
      const buffer = sampleInt(3, 6 + story.depth * 2);
      let totalHours = childHours + coordination + buffer;
      if (totalHours <= childHours) {
        totalHours = childHours + Math.max(4, story.depth + 2);
      }
      story.estimatedHours = totalHours;
    }

    let normalized = Math.ceil((story.estimatedHours ?? 0) / HOURS_PER_STORY_POINT);
    if (!Number.isFinite(normalized) || normalized < 0) {
      normalized = 0;
    }
    let storyPoint = bucketizeStoryPoint(normalized);

    if (children.length === 0) {
      if (storyPoint === 0 && story.estimatedHours > 0) {
        storyPoint = 1;
      }
    } else {
      const childStoryPointSum = children.reduce((total, child) => total + (child.story_point ?? 0), 0);
      const requiredStoryPoints = childStoryPointSum + 1;
      if (storyPoint < requiredStoryPoints) {
        storyPoint = bucketizeStoryPoint(requiredStoryPoints);
      }
    }

    const minimumPointHours = storyPoint > 0 ? storyPoint * HOURS_PER_STORY_POINT : 0;
    if (!Number.isFinite(story.estimatedHours) || story.estimatedHours < minimumPointHours) {
      story.estimatedHours = minimumPointHours;
    }

    story.story_point = storyPoint;
    story.record.story_point = storyPoint;
  });

  const epicStoriesList = internalStories.filter((story) => story.depth === 0);
  const nonEpicOrdered = ordered.filter((story) => story.depth !== 0);

  const enforceHierarchy = () => {
    const descending = [...internalStories].sort((a, b) => b.depth - a.depth);
    descending.forEach((story) => {
      const children = childrenMap.get(story.id) ?? [];
      if (children.length === 0) {
        const minimumHours = (story.story_point ?? 0) * HOURS_PER_STORY_POINT;
        if (!Number.isFinite(story.estimatedHours) || story.estimatedHours < minimumHours) {
          story.estimatedHours = minimumHours;
        }
        return;
      }

      const childPointSum = children.reduce((total, child) => total + (child.story_point ?? 0), 0);
      const requiredPoints = bucketizeStoryPoint(childPointSum + 1);
      if ((story.story_point ?? 0) <= childPointSum) {
        story.story_point = requiredPoints;
        story.record.story_point = requiredPoints;
      }

      const childHours = children.reduce((total, child) => total + (child.estimatedHours ?? 0), 0);
      const requiredHours = Math.max(
        (story.story_point ?? 0) * HOURS_PER_STORY_POINT,
        childHours + Math.max(6, Math.round(childHours * 0.08))
      );
      if (!Number.isFinite(story.estimatedHours) || story.estimatedHours < requiredHours) {
        story.estimatedHours = requiredHours;
      }
    });
  };

  const computeTotals = () => {
    const total = internalStories.reduce((sum, story) => sum + (story.story_point ?? 0), 0);
    const epic = epicStoriesList.reduce((sum, story) => sum + (story.story_point ?? 0), 0);
    return { total, epic, nonEpic: total - epic };
  };

  const increaseStory = (story) => {
    const previous = story.story_point ?? 0;
    let nextPoint = bucketizeStoryPoint(previous + 1);
    if (nextPoint <= previous) {
      return 0;
    }
    const children = childrenMap.get(story.id) ?? [];
    if (children.length > 0) {
      const childSum = children.reduce((total, child) => total + (child.story_point ?? 0), 0);
      if (nextPoint <= childSum) {
        nextPoint = bucketizeStoryPoint(childSum + 1);
      }
    }
    const addedPoints = nextPoint - previous;
    const minimumHours = nextPoint * HOURS_PER_STORY_POINT;
    if (!Number.isFinite(story.estimatedHours) || story.estimatedHours < minimumHours) {
      story.estimatedHours = minimumHours;
    }
    story.story_point = nextPoint;
    story.record.story_point = nextPoint;
    return addedPoints;
  };

  const growNonEpicPoints = (needed) => {
    if (needed <= 0) {
      return;
    }
    let remaining = needed;
    let guard = 0;
    const guardLimit = 5000;
    while (remaining > 0 && guard < guardLimit) {
      guard += 1;
      let added = 0;
      for (const story of nonEpicOrdered) {
        if (remaining <= 0) {
          break;
        }
        const increment = increaseStory(story);
        if (increment > 0) {
          remaining -= increment;
          added += increment;
        }
      }
      if (added === 0) {
        break;
      }
    }
  };

  epicStoriesList.forEach((epic) => {
    const children = childrenMap.get(epic.id) ?? [];
    const childStoryPointSum = children.reduce((total, child) => total + (child.story_point ?? 0), 0);
    const minimalEpicPoints = bucketizeStoryPoint(childStoryPointSum + 1);
    if (epic.story_point !== minimalEpicPoints) {
      epic.story_point = minimalEpicPoints;
      epic.record.story_point = minimalEpicPoints;
    }
    const childHours = children.reduce((total, child) => total + (child.estimatedHours ?? 0), 0);
    const requiredEpicHours = Math.max(
      epic.story_point * HOURS_PER_STORY_POINT,
      childHours + Math.max(6, Math.round(childHours * 0.08))
    );
    if (!Number.isFinite(epic.estimatedHours) || epic.estimatedHours < requiredEpicHours) {
      epic.estimatedHours = requiredEpicHours;
    }
  });

  enforceHierarchy();

  const maxStoryPoint = internalStories.reduce((max, story) => Math.max(max, story.story_point ?? 0), 0);
  const scaleDivisor = maxStoryPoint > 16 ? Math.ceil(maxStoryPoint / 16) : 1;
  if (scaleDivisor > 1) {
    internalStories.forEach((story) => {
      const base = story.story_point ?? 0;
      let scaled = Math.round(base / scaleDivisor);
      if (base > 0 && scaled === 0) {
        scaled = 1;
      }
      story.story_point = scaled;
      story.record.story_point = scaled;
      const minimumHours = scaled * HOURS_PER_STORY_POINT;
      if (!Number.isFinite(story.estimatedHours) || story.estimatedHours < minimumHours) {
        story.estimatedHours = minimumHours;
      }
    });
    enforceHierarchy();
  }

  let { total, epic, nonEpic } = computeTotals();
  let guard = 0;
  const guardLimit = 8;
  while (total > 0 && epic / total > 0.25 && guard < guardLimit) {
    guard += 1;
    const requiredNonEpic = Math.ceil((epic / 0.25) - epic);
    const deficit = requiredNonEpic - nonEpic;
    if (deficit <= 0) {
      break;
    }
    growNonEpicPoints(deficit);
    enforceHierarchy();
    ({ total, epic, nonEpic } = computeTotals());
  }

  enforceHierarchy();

  internalStories.forEach((story) => {
    const alignedHours = (story.story_point ?? 0) * HOURS_PER_STORY_POINT;
    story.estimatedHours = alignedHours;
  });
}

function enforceStoryHierarchyStatuses() {
  const childrenMap = new Map();
  internalStories.forEach((story) => {
    if (story.parent_id !== null) {
      const list = childrenMap.get(story.parent_id) ?? [];
      list.push(story);
      childrenMap.set(story.parent_id, list);
    }
  });

  const ordered = [...internalStories].sort((a, b) => b.depth - a.depth);
  ordered.forEach((story) => {
    const children = childrenMap.get(story.id) ?? [];
    if (children.length === 0) {
      if (story.status !== 'Done' && story.status !== 'Blocked') {
        if (rng() < 0.6) {
          story.status = 'Done';
        } else if (story.status === 'Ready' && rng() < 0.5) {
          story.status = 'In Progress';
        }
      }
    } else {
      const allChildrenDone = children.every((child) => child.status === 'Done');
      if (allChildrenDone) {
        if (story.status !== 'Blocked') {
          story.status = 'Done';
        }
      } else if (story.status === 'Done') {
        story.status = 'In Progress';
      }
    }

    story.record.status = story.status;
  });
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
  if (story.depth === 0) {
    return;
  }

  const componentCycle = story.componentsList;
  const underrepresented = EMPLOYEES.filter((member) => (employeeUsage.get(member.email) ?? 0) === 0);
  let forcedIndex = 0;
  const taskCount = sampleInt(MIN_TASKS_PER_STORY, MAX_TASKS_PER_STORY);
  const totalHours = Math.max(0, Math.round(story.estimatedHours ?? 0));
  const baseAllocations = Array.from({ length: taskCount }, () => 0);
  if (totalHours > 0) {
    const base = Math.floor(totalHours / taskCount);
    baseAllocations.fill(base);
    let remainder = totalHours - base * taskCount;
    const indices = shuffleInPlace([...baseAllocations.keys()]);
    for (let idx = 0; idx < remainder; idx += 1) {
      baseAllocations[indices[idx % taskCount]] += 1;
    }
    let adjustments = Math.min(Math.floor(totalHours * 0.1), taskCount * 2);
    while (adjustments > 0) {
      const donors = baseAllocations
        .map((value, index) => ({ value, index }))
        .filter((entry) => entry.value > 1);
      if (donors.length === 0) {
        break;
      }
      const donor = donors[Math.floor(rng() * donors.length)].index;
      let receiver = donor;
      const guardLimit = 10;
      let guard = 0;
      while (receiver === donor && guard < guardLimit) {
        guard += 1;
        receiver = Math.floor(rng() * taskCount);
      }
      if (receiver === donor) {
        break;
      }
      baseAllocations[donor] -= 1;
      baseAllocations[receiver] += 1;
      adjustments -= 1;
    }
  }
  for (let idx = 0; idx < taskCount; idx += 1) {
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
    const estimationHours = baseAllocations[idx] ?? 0;
    tasks.push({
      id: taskIdCounter++,
      story_id: story.id,
      title: `${story.title} :: ${TASK_THEMES[idx % TASK_THEMES.length]}`,
      description,
      status,
      assignee_email: assignee.email,
      estimation_hours: estimationHours,
      created_at: createdAt,
      updated_at: createdAt,
    });
  }
}

function createAcceptanceTests(story) {
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
    const status = 'Pass';
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

function planTopology(maxDepth) {
  const nodes = [];
  const queue = [];

  const depthSevenQuota = maxDepth === 7 ? sampleInt(2, 3) : 0;
  let depthSevenCreated = 0;

  function registerNode({ epic, parent, depth, protectedNode = false }) {
    const node = {
      epic,
      parent,
      depth,
      children: [],
      removed: false,
      sequence: nodes.length,
      childIndex: 0,
      protectedNode,
    };
    nodes.push(node);
    if (depth < maxDepth) {
      queue.push(node);
    }
    return node;
  }

  function attachChild(parent, { protectedNode = false } = {}) {
    if (nodes.length >= TOTAL_STORIES) {
      return null;
    }
    if (parent.children.length >= MAX_CHILDREN_PER_NODE) {
      return null;
    }
    const child = registerNode({
      epic: parent.epic,
      parent,
      depth: parent.depth + 1,
      protectedNode,
    });
    child.childIndex = parent.children.length;
    parent.children.push(child);
    if (child.depth === maxDepth && child.protectedNode) {
      depthSevenCreated += 1;
    }
    return child;
  }

  EPICS.forEach((epic, index) => {
    registerNode({ epic: { ...epic, index }, parent: null, depth: 0 });
  });

  if (depthSevenQuota > 0) {
    for (let chainIndex = 0; chainIndex < depthSevenQuota; chainIndex += 1) {
      const root = nodes[chainIndex % EPICS.length];
      let current = root;
      while (current.depth < maxDepth) {
        const isTerminal = current.depth + 1 === maxDepth;
        const child = attachChild(current, { protectedNode: isTerminal });
        if (!child) {
          return null;
        }
        current = child;
      }
    }
  }

  while (queue.length > 0 && nodes.length < TOTAL_STORIES) {
    const current = queue.shift();
    if (current.depth >= maxDepth) {
      continue;
    }
    const remainingBudget = TOTAL_STORIES - nodes.length;
    if (remainingBudget <= 0) {
      break;
    }
    const availableSlots = Math.max(0, MAX_CHILDREN_PER_NODE - current.children.length);
    if (availableSlots <= 0) {
      continue;
    }
    let maxChildren = Math.min(MAX_CHILDREN_PER_NODE, remainingBudget, availableSlots);
    if (maxChildren <= 0) {
      continue;
    }
    let desired = Math.min(sampleInt(0, MAX_CHILDREN_PER_NODE), maxChildren);
    if (current.depth === maxDepth - 1 && depthSevenQuota > 0) {
      const remainingQuota = Math.max(0, depthSevenQuota - depthSevenCreated);
      maxChildren = Math.min(maxChildren, remainingQuota);
      desired = Math.min(desired, maxChildren);
    }
    if (desired <= 0) {
      continue;
    }

    for (let childIndex = 0; childIndex < desired; childIndex += 1) {
      const isTerminal = current.depth + 1 === maxDepth;
      const child = attachChild(current, {
        protectedNode: isTerminal && depthSevenQuota > 0 && depthSevenCreated < depthSevenQuota,
      });
      if (!child) {
        break;
      }
    }
  }

  if (nodes.length < TOTAL_STORIES) {
    return null;
  }

  let overflow = nodes.length - TOTAL_STORIES;
  if (overflow > 0) {
    const removable = nodes
      .filter((node) => node.parent && node.children.length === 0 && !node.protectedNode)
      .sort((a, b) => {
        if (b.depth !== a.depth) {
          return b.depth - a.depth;
        }
        return b.sequence - a.sequence;
      });
    for (const node of removable) {
      if (overflow === 0) {
        break;
      }
      node.removed = true;
      if (node.parent) {
        node.parent.children = node.parent.children.filter((child) => child !== node);
      }
      overflow -= 1;
    }
    if (overflow > 0) {
      return null;
    }
  }

  const finalNodes = nodes.filter((node) => !node.removed);
  finalNodes.forEach((node) => {
    node.children = node.children.filter((child) => !child.removed);
    node.children.forEach((child, index) => {
      child.childIndex = index;
    });
  });

  function reindexChildren(target) {
    target.children.forEach((child, index) => {
      child.childIndex = index;
    });
  }

  function reparentLeaf(leaf, newParent) {
    if (!leaf.parent) {
      return false;
    }
    const oldParent = leaf.parent;
    const oldDepth = leaf.depth;
    if (oldParent === newParent) {
      return false;
    }
    const newDepth = newParent.depth + 1;
    if (newDepth > maxDepth) {
      return false;
    }
    if (newParent.children.length >= 5) {
      return false;
    }
    oldParent.children = oldParent.children.filter((child) => child !== leaf);
    reindexChildren(oldParent);
    newParent.children.push(leaf);
    reindexChildren(newParent);
    leaf.parent = newParent;
    leaf.depth = newDepth;
    return oldDepth !== newDepth ? newDepth - oldDepth : 0;
  }

  function isAncestor(candidate, node) {
    let current = candidate;
    while (current) {
      if (current === node) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  function rebalanceAverageDepth() {
    const targetDepthSum = TOTAL_STORIES * 3;
    let currentDepthSum = finalNodes.reduce((total, node) => total + node.depth, 0);
    let depthSevenCount = finalNodes.filter((node) => node.depth === 7).length;

    const guardLimit = 2000;
    let guard = 0;

    while (currentDepthSum !== targetDepthSum && guard < guardLimit) {
      guard += 1;
      const needDeeper = currentDepthSum < targetDepthSum;
      const leaves = finalNodes.filter(
        (node) => node.children.length === 0 && node.parent && !node.protectedNode
      );
      if (leaves.length === 0) {
        break;
      }
      shuffleInPlace(leaves);

      let adjusted = false;
      if (needDeeper) {
        for (const leaf of leaves) {
          if (leaf.depth >= maxDepth) {
            continue;
          }
          const candidates = finalNodes.filter(
            (candidate) =>
              candidate !== leaf &&
              candidate.children.length < 5 &&
              candidate.depth >= leaf.depth &&
              candidate.depth < maxDepth &&
              !isAncestor(candidate, leaf)
          );
          shuffleInPlace(candidates);
          for (const candidate of candidates) {
            const prospectiveDepth = candidate.depth + 1;
            if (prospectiveDepth > maxDepth) {
              continue;
            }
            if (prospectiveDepth === 7 && depthSevenCount >= depthSevenQuota) {
              continue;
            }
            const delta = reparentLeaf(leaf, candidate);
            if (delta === false) {
              continue;
            }
            if (delta === 0) {
              continue;
            }
            const newDepth = leaf.depth;
            const oldDepth = newDepth - delta;
            if (oldDepth !== 7 && newDepth === 7) {
              depthSevenCount += 1;
            }
            if (oldDepth === 7 && newDepth !== 7) {
              depthSevenCount -= 1;
            }
            currentDepthSum += delta;
            adjusted = true;
            break;
          }
          if (adjusted) {
            break;
          }
        }
      } else {
        for (const leaf of leaves) {
          if (leaf.depth === 7) {
            continue;
          }
          if (leaf.depth <= 1) {
            continue;
          }
          const candidates = finalNodes.filter((candidate) => {
            if (candidate === leaf) {
              return false;
            }
            if (candidate.children.length >= 5) {
              return false;
            }
            if (leaf.depth === 7 && candidate.depth >= 6) {
              return false;
            }
            return candidate.depth <= leaf.depth - 2;
          });
          shuffleInPlace(candidates);
          for (const candidate of candidates) {
            if (isAncestor(leaf, candidate)) {
              continue;
            }
            const delta = reparentLeaf(leaf, candidate);
            if (delta === false) {
              continue;
            }
            if (delta === 0) {
              continue;
            }
            const newDepth = leaf.depth;
            const oldDepth = newDepth - delta;
            if (oldDepth !== 7 && newDepth === 7) {
              depthSevenCount += 1;
            }
            if (oldDepth === 7 && newDepth !== 7) {
              depthSevenCount -= 1;
            }
            currentDepthSum += delta;
            adjusted = true;
            break;
          }
          if (adjusted) {
            break;
          }
        }
      }

      if (!adjusted) {
        break;
      }
    }

    if (currentDepthSum !== targetDepthSum) {
      return false;
    }

    finalNodes.forEach((node) => {
      node.children.forEach((child, index) => {
        child.childIndex = index;
      });
    });

    return true;
  }

  if (!rebalanceAverageDepth()) {
    return null;
  }

  finalNodes.sort((a, b) => {
    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }
    return a.sequence - b.sequence;
  });

  if (maxDepth === 7) {
    const depthSevenNodes = finalNodes.filter((node) => node.depth === 7);
    if (depthSevenNodes.length < depthSevenQuota || depthSevenNodes.length > depthSevenQuota) {
      return null;
    }
  }

  const depthSum = finalNodes.reduce((total, node) => total + node.depth, 0);
  if (depthSum !== TOTAL_STORIES * 3) {
    return null;
  }

  const maxObservedDepth = finalNodes.reduce(
    (max, node) => Math.max(max, node.depth),
    0
  );

  return { nodes: finalNodes, maxObservedDepth };
}

function buildDataset(seedOffset = 0) {
  rng = createRng(rngBaseSeed + seedOffset);
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

  sampledMaxDepth = 5;
  const topology = planTopology(sampledMaxDepth);
  if (!topology) {
    return false;
  }

  const nodeToStory = new Map();
  topology.nodes.forEach((node) => {
    const parentStory = node.parent ? nodeToStory.get(node.parent) : null;
    const story = createStory({
      epic: node.epic,
      parent: parentStory,
      depth: node.depth,
      childIndex: node.childIndex,
    });
    nodeToStory.set(node, story);
  });

  calculateEffortAndStoryPoints();
  enforceStoryHierarchyStatuses();

  internalStories.forEach((story) => {
    if (story.parent_id !== null) {
      if (story.status === 'Blocked') {
        ensureBlocker(story);
      } else {
        if (story.depth <= sampledMaxDepth - 1 && rng() < 0.35) {
          addCrossDependency(story);
        }
        if (rng() < 0.15) {
          addCrossDependency(story);
        }
      }
    }
  });

  internalStories.forEach((story) => {
    createAcceptanceTests(story);
    createTasks(story);
  });

  return { maxObservedDepth: topology.maxObservedDepth };
}

let attempts = 0;
let generation;
while (!(generation = buildDataset(attempts))) {
  attempts += 1;
  if (attempts % 10 === 0) {
    console.error(`Regeneration attempt ${attempts} failed to satisfy topology constraints.`);
  }
  if (attempts > 200) {
    throw new Error('Unable to generate dataset with required counts');
  }
}

const nonEpicStoryCount = internalStories.filter((story) => story.depth !== 0).length;
const minTasks = nonEpicStoryCount * MIN_TASKS_PER_STORY;
const maxTasks = nonEpicStoryCount * MAX_TASKS_PER_STORY;
if (tasks.length < minTasks || tasks.length > maxTasks) {
  throw new Error(
    `Expected between ${minTasks} and ${maxTasks} tasks but generated ${tasks.length}`
  );
}

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
      maxDepthSampled: sampledMaxDepth,
      maxDepthObserved: generation.maxObservedDepth,
      attempts: attempts + 1,
    },
    null,
    2
  )
);
