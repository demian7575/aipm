import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dataDir = resolve(__dirname, '../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const dbPath = resolve(dataDir, 'app.sqlite');

const runSqlite = (args, input = '') => {
  const result = spawnSync('sqlite3', args, {
    input,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    const error = new Error(result.stderr || 'Failed to execute sqlite3 command');
    error.details = { args, input };
    throw error;
  }
  return result.stdout;
};

const detectJsonSupport = () => {
  if (process.env.SQLITE_JSON_DISABLED === '1') {
    return false;
  }
  try {
    const probe = spawnSync('sqlite3', ['-json', ':memory:'], {
      input: 'SELECT 1;\n',
      encoding: 'utf8'
    });
    return probe.status === 0;
  } catch (error) {
    return false;
  }
};

const supportsJsonOutput = detectJsonSupport();

const ensureStatementTerminated = (sql) => {
  const trimmed = sql.trim();
  if (!trimmed) return '';
  return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
};

const parseTabularRows = (output) => {
  const lines = output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (lines.length <= 1) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    const record = {};
    headers.forEach((header, index) => {
      const value = values[index] ?? '';
      if (value === 'NULL') {
        record[header] = null;
      } else if (/^-?\d+$/.test(value)) {
        record[header] = Number(value);
      } else if (/^-?\d*\.\d+$/.test(value)) {
        record[header] = Number(value);
      } else {
        record[header] = value;
      }
    });
    return record;
  });
};

export const execStatements = (statements) => {
  const joined = Array.isArray(statements) ? statements.join('\n') : statements;
  if (!joined.trim()) return;
  runSqlite([dbPath], `${joined}\n`);
};

export const queryRows = (statement) => {
  const normalized = ensureStatementTerminated(statement);
  if (!normalized) {
    return [];
  }
  if (supportsJsonOutput) {
    const output = runSqlite(['-json', dbPath, normalized]);
    if (!output.trim()) return [];
    return JSON.parse(output);
  }
  const raw = runSqlite(
    [dbPath],
    `.mode tabs\n.headers on\n.nullvalue NULL\n${normalized}\n`
  );
  return parseTabularRows(raw);
};

const mergeRequestColumns = [
  'id',
  'title',
  'summary',
  'status',
  'branch',
  'drift',
  'lastSyncAt',
  'storyIds',
  'createdAt',
  'updatedAt',
  'version'
];

const storiesColumns = [
  'id',
  'mrId',
  'parentId',
  'order',
  'depth',
  'title',
  'asA',
  'iWant',
  'soThat',
  'invest',
  'childrenIds',
  'testIds',
  'status',
  'createdAt',
  'updatedAt',
  'version'
];

const testsColumns = [
  'id',
  'storyId',
  'given',
  'when',
  'then',
  'ambiguityFlags',
  'status',
  'createdAt',
  'updatedAt',
  'version'
];

const mergeRequestsCreate = `CREATE TABLE IF NOT EXISTS merge_requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      branch TEXT NOT NULL,
      drift INTEGER NOT NULL,
      lastSyncAt TEXT NOT NULL,
      storyIds TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      version INTEGER NOT NULL
    );`;

const storiesCreate = `CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      mrId TEXT NOT NULL,
      parentId TEXT,
      "order" INTEGER NOT NULL,
      depth INTEGER NOT NULL,
      title TEXT NOT NULL,
      asA TEXT NOT NULL,
      iWant TEXT NOT NULL,
      soThat TEXT NOT NULL,
      invest TEXT NOT NULL,
      childrenIds TEXT NOT NULL,
      testIds TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      version INTEGER NOT NULL,
      FOREIGN KEY(mrId) REFERENCES merge_requests(id) ON DELETE CASCADE,
      FOREIGN KEY(parentId) REFERENCES stories(id) ON DELETE CASCADE
    );`;

const testsCreate = `CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      storyId TEXT NOT NULL,
      "given" TEXT NOT NULL,
      "when" TEXT NOT NULL,
      "then" TEXT NOT NULL,
      ambiguityFlags TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      version INTEGER NOT NULL,
      FOREIGN KEY(storyId) REFERENCES stories(id) ON DELETE CASCADE
    );`;

const ensureTableSchema = (name, createStatement, expectedColumns) => {
  let info = [];
  try {
    info = queryRows(`PRAGMA table_info(${name})`);
  } catch (error) {
    info = [];
  }
  if (info.length === 0) {
    execStatements([createStatement]);
    return;
  }
  const names = new Set(info.map((column) => column.name));
  const hasAll = expectedColumns.every((column) => names.has(column));
  const sameSize = names.size === expectedColumns.length;
  if (!hasAll || !sameSize) {
    execStatements([`DROP TABLE IF EXISTS ${name};`, createStatement]);
  }
};

const initialize = () => {
  execStatements(['PRAGMA journal_mode=WAL;', 'PRAGMA foreign_keys=ON;']);
  ensureTableSchema('merge_requests', mergeRequestsCreate, mergeRequestColumns);
  ensureTableSchema('stories', storiesCreate, storiesColumns);
  ensureTableSchema('tests', testsCreate, testsColumns);
};

initialize();
