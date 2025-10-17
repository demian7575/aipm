#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm } from 'node:fs/promises';
import { openDatabase, resetDatabaseFactory } from '../apps/backend/app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OUTPUT = path.join(__dirname, '..', 'docs', 'examples', 'app-50-stories.sqlite');

function createTimestampGenerator() {
  let counter = Date.now();
  return () => {
    const stamp = new Date(counter).toISOString();
    counter += 1000;
    return stamp;
  };
}

const ASSIGNEES = [
  'pm@example.com',
  'lead@example.com',
  'qa@example.com',
  'ux@example.com',
  'dev@example.com',
];

const ROOT_THEMES = [
  {
    code: 'AUTH',
    name: 'Authentication overhaul',
    persona: 'Security architect',
    iWant: 'establish consistent login flows',
    soThat: 'customer accounts remain protected',
    description: 'Focuses on modernizing sign-in, MFA, and recovery experiences.',
  },
  {
    code: 'BILL',
    name: 'Billing transparency',
    persona: 'Finance manager',
    iWant: 'review invoices without friction',
    soThat: 'we reconcile subscription revenue accurately',
    description: 'Targets pricing clarity, invoicing accuracy, and refund automation.',
  },
  {
    code: 'NOTIFY',
    name: 'Notification control',
    persona: 'Operations lead',
    iWant: 'manage alerts across channels',
    soThat: 'teams respond to events quickly',
    description: 'Improves user preferences, channel routing, and escalation rules.',
  },
  {
    code: 'REPORT',
    name: 'Reporting insights',
    persona: 'Product analyst',
    iWant: 'explore usage metrics easily',
    soThat: 'stakeholders make informed roadmap calls',
    description: 'Delivers dashboard enhancements, drill-downs, and export options.',
  },
  {
    code: 'SETTINGS',
    name: 'Workspace administration',
    persona: 'Org admin',
    iWant: 'configure policies centrally',
    soThat: 'compliance requirements stay enforced',
    description: 'Centralizes policy controls, member management, and audit trails.',
  },
];

const CHILD_FOCI = [
  {
    key: 'experience',
    name: 'Experience polish',
    persona: 'Active customer',
    iWant: 'complete tasks without confusion',
    soThat: 'I stay productive every day',
    description: 'Refines the user-facing flow and improves accessibility.',
  },
  {
    key: 'integration',
    name: 'API enablement',
    persona: 'Integration engineer',
    iWant: 'access stable endpoints',
    soThat: 'partners can launch features faster',
    description: 'Extends and hardens service-to-service APIs.',
  },
  {
    key: 'observability',
    name: 'Observability coverage',
    persona: 'Compliance officer',
    iWant: 'trace actions in detail',
    soThat: 'audits close without blockers',
    description: 'Adds logging, alerting, and retention guardrails.',
  },
];

const GRANDCHILD_SCENARIOS = [
  {
    key: 'happy-path',
    name: 'Happy path automation',
    persona: 'QA analyst',
    iWant: 'verify the primary journey',
    soThat: 'releases ship with confidence',
    description: 'Covers baseline success metrics and SLAs.',
  },
  {
    key: 'edge-coverage',
    name: 'Edge case hardening',
    persona: 'Support specialist',
    iWant: 'resolve unusual issues quickly',
    soThat: 'customers stay unblocked',
    description: 'Ensures retries, fallbacks, and error handling work well.',
  },
];

function buildTitle(rootIndex, focusIndex, scenarioIndex, depth, theme, focus, scenario) {
  const numbering = [rootIndex + 1];
  if (depth >= 1) numbering.push(focusIndex + 1);
  if (depth === 2) numbering.push(scenarioIndex + 1);
  const prefix = depth === 0
    ? `US${numbering[0]}`
    : depth === 1
    ? `US${numbering[0]}-${numbering[1]}`
    : `US${numbering[0]}-${numbering[1]}.${numbering[2]}`;
  const label = depth === 0 ? theme.name : depth === 1 ? focus.name : scenario.name;
  return `${prefix}: ${label}`;
}

function buildDescription(theme, focus, scenario) {
  const parts = [theme.description];
  if (focus) parts.push(focus.description);
  if (scenario) parts.push(scenario.description);
  parts.push('Sample dataset entry generated for performance and demo testing.');
  return parts.filter(Boolean).join(' ');
}

function selectAssignee(index) {
  return ASSIGNEES[index % ASSIGNEES.length];
}

function buildAcceptanceTest(story, depth, theme, focus, scenario, timestamp) {
  const subject = [theme.code];
  if (focus) subject.push(focus.key.toUpperCase());
  if (scenario) subject.push(scenario.key.toUpperCase());
  const code = subject.join('-');
  const responseTarget = 900 + depth * 250 + story.storyPoint * 30;
  const eventTarget = 3 + depth + (story.storyPoint % 4);
  return {
    given: [
      `Given the ${story.title} scope is prioritised for ${theme.name.toLowerCase()} (${code})`,
    ],
    when: [
      `When the team completes the ${scenario ? scenario.name.toLowerCase() : 'core'} implementation and deploys it`,
    ],
    then: [
      `Then telemetry shows response within ${responseTarget} ms and at least ${eventTarget} events recorded in 60 s`,
    ],
    status: depth === 0 ? 'Ready' : 'Draft',
    createdAt: timestamp(),
  };
}

export async function generateSampleDataset(outputPath = DEFAULT_OUTPUT) {
  const resolvedOutput = path.resolve(outputPath ?? DEFAULT_OUTPUT);
  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await rm(resolvedOutput, { force: true });
  await rm(`${resolvedOutput}.json`, { force: true });

  resetDatabaseFactory();
  const db = await openDatabase(resolvedOutput);
  const timestamp = createTimestampGenerator();

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS user_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mr_id INTEGER DEFAULT 1,
      parent_id INTEGER,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      as_a TEXT DEFAULT '',
      i_want TEXT DEFAULT '',
      so_that TEXT DEFAULT '',
      story_point INTEGER,
      assignee_email TEXT DEFAULT '',
      status TEXT DEFAULT 'Draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(parent_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS acceptance_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      given TEXT NOT NULL,
      when_step TEXT NOT NULL,
      then_step TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS reference_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
    DELETE FROM acceptance_tests;
    DELETE FROM reference_documents;
    DELETE FROM user_stories;
  `);

  const insertStory = db.prepare(
    'INSERT INTO user_stories (mr_id, parent_id, title, description, as_a, i_want, so_that, story_point, assignee_email, status, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
  );
  const insertTest = db.prepare(
    'INSERT INTO acceptance_tests (story_id, given, when_step, then_step, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
  );

  let storyCount = 0;
  let acceptanceTestCount = 0;

  const stories = [];

  ROOT_THEMES.forEach((theme, rootIndex) => {
    const title = buildTitle(rootIndex, 0, 0, 0, theme, undefined, undefined);
    const storyPoint = 13;
    const storyTimestamp = timestamp();
    const { lastInsertRowid: rootId } = insertStory.run(
      null,
      title,
      buildDescription(theme),
      theme.persona,
      theme.iWant,
      theme.soThat,
      storyPoint,
      selectAssignee(storyCount),
      'Ready',
      storyTimestamp,
      storyTimestamp
    );
    storyCount += 1;
    const rootStory = {
      id: rootId,
      title,
      storyPoint,
      depth: 0,
    };
    stories.push(rootStory);

    const rootTest = buildAcceptanceTest(rootStory, 0, theme, null, null, timestamp);
    insertTest.run(
      rootId,
      JSON.stringify(rootTest.given),
      JSON.stringify(rootTest.when),
      JSON.stringify(rootTest.then),
      rootTest.status,
      rootTest.createdAt,
      rootTest.createdAt
    );
    acceptanceTestCount += 1;

    CHILD_FOCI.forEach((focus, focusIndex) => {
      const childTitle = buildTitle(rootIndex, focusIndex, 0, 1, theme, focus, undefined);
      const childStoryPoint = 8 - focusIndex;
      const childTimestamp = timestamp();
      const { lastInsertRowid: childId } = insertStory.run(
        rootId,
        childTitle,
        buildDescription(theme, focus),
        focus.persona,
        focus.iWant,
        focus.soThat,
        childStoryPoint,
        selectAssignee(storyCount),
        'Draft',
        childTimestamp,
        childTimestamp
      );
      storyCount += 1;
      const childStory = {
        id: childId,
        title: childTitle,
        storyPoint: childStoryPoint,
        depth: 1,
      };
      stories.push(childStory);

      const childTest = buildAcceptanceTest(childStory, 1, theme, focus, null, timestamp);
      insertTest.run(
        childId,
        JSON.stringify(childTest.given),
        JSON.stringify(childTest.when),
        JSON.stringify(childTest.then),
        childTest.status,
        childTest.createdAt,
        childTest.createdAt
      );
      acceptanceTestCount += 1;

      GRANDCHILD_SCENARIOS.forEach((scenario, scenarioIndex) => {
        const grandTitle = buildTitle(rootIndex, focusIndex, scenarioIndex, 2, theme, focus, scenario);
        const grandStoryPoint = 3 + scenarioIndex;
        const grandTimestamp = timestamp();
        const { lastInsertRowid: grandId } = insertStory.run(
          childId,
          grandTitle,
          buildDescription(theme, focus, scenario),
          scenario.persona,
          scenario.iWant,
          scenario.soThat,
          grandStoryPoint,
          selectAssignee(storyCount),
          'Draft',
          grandTimestamp,
          grandTimestamp
        );
        storyCount += 1;
        const grandStory = {
          id: grandId,
          title: grandTitle,
          storyPoint: grandStoryPoint,
          depth: 2,
        };
        stories.push(grandStory);

        const grandTest = buildAcceptanceTest(grandStory, 2, theme, focus, scenario, timestamp);
        insertTest.run(
          grandId,
          JSON.stringify(grandTest.given),
          JSON.stringify(grandTest.when),
          JSON.stringify(grandTest.then),
          grandTest.status,
          grandTest.createdAt,
          grandTest.createdAt
        );
        acceptanceTestCount += 1;
      });
    });
  });

  db.close?.();
  resetDatabaseFactory();

  return {
    outputPath: resolvedOutput,
    storyCount,
    acceptanceTestCount,
  };
}

function parseCliArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('-h') || args.includes('--help')) {
    return { help: true };
  }
  const positional = args.filter((arg) => arg && arg !== '--' && !arg.startsWith('-'));
  const output = positional[0];
  const verbose = args.includes('--verbose');
  return { output, verbose };
}

async function runCli() {
  const { output, verbose, help } = parseCliArgs(process.argv);
  if (help) {
    console.log('Usage: node scripts/generate-sample-dataset.mjs [output.sqlite]');
    console.log('Generates a SQLite database with 50 user stories and acceptance tests.');
    console.log(`Default output: ${DEFAULT_OUTPUT}`);
    process.exit(0);
  }
  try {
    const summary = await generateSampleDataset(output ?? DEFAULT_OUTPUT);
    if (verbose) {
      console.log(`Generated ${summary.storyCount} stories and ${summary.acceptanceTestCount} acceptance tests.`);
    }
    console.log(`Sample dataset written to ${summary.outputPath}`);
  } catch (error) {
    console.error('Failed to generate sample dataset:', error.message);
    process.exitCode = 1;
  }
}

if (path.resolve(process.argv[1] ?? '') === __filename) {
  runCli();
}
