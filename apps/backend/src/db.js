import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dataDir = resolve(__dirname, '../data');
export const dbPath = resolve(dataDir, 'app.sqlite');

const ensureDataDirectory = () => {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
};

ensureDataDirectory();

let database;
try {
  database = new DatabaseSync(dbPath);
} catch (cause) {
  const error = new Error('Failed to open SQLite database');
  error.cause = cause;
  throw error;
}

database.exec('PRAGMA journal_mode=WAL;');
database.exec('PRAGMA foreign_keys=ON;');

process.on('exit', () => {
  try {
    database.close();
  } catch (error) {
    // ignore shutdown errors
  }
});

const ensureStatementTerminated = (sql) => {
  const trimmed = sql.trim();
  if (!trimmed) return '';
  return trimmed.endsWith(';') ? trimmed : `${trimmed};`;
};

const normalizeStatements = (statements) => {
  const parts = Array.isArray(statements) ? statements : [statements];
  return parts
    .map((part) => ensureStatementTerminated(part))
    .filter((part) => part.length > 0)
    .join('\n');
};

export const execStatements = (statements) => {
  const payload = normalizeStatements(statements);
  if (!payload) return;
  database.exec(payload);
};

export const queryRows = (statement) => {
  const normalized = ensureStatementTerminated(statement);
  if (!normalized) return [];
  const prepared = database.prepare(normalized);
  return prepared.all();
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
  'storyPoint',
  'assignee',
  'referenceDocuments',
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
      storyPoint REAL,
      assignee TEXT,
      referenceDocuments TEXT NOT NULL,
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
  execStatements(['PRAGMA foreign_keys=ON;']);
  ensureTableSchema('merge_requests', mergeRequestsCreate, mergeRequestColumns);
  ensureTableSchema('stories', storiesCreate, storiesColumns);
  ensureTableSchema('tests', testsCreate, testsColumns);
};

initialize();
