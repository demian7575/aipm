import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dataDir = resolve(__dirname, '../data');
export const dbPath = resolve(dataDir, 'app.sqlite');

const preferCli = process.env.AI_PM_FORCE_SQLITE_CLI === '1';

const ensureDataDirectory = () => {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
};

ensureDataDirectory();

let database;
let usingDatabaseSync = false;

let DatabaseSyncModule = null;
if (!preferCli) {
  try {
    DatabaseSyncModule = await import('node:sqlite');
  } catch (error) {
    DatabaseSyncModule = null;
  }
}

if (DatabaseSyncModule?.DatabaseSync && !preferCli) {
  try {
    database = new DatabaseSyncModule.DatabaseSync(dbPath);
    usingDatabaseSync = true;
  } catch (cause) {
    const error = new Error('Failed to open SQLite database');
    error.cause = cause;
    throw error;
  }

  process.on('exit', () => {
    try {
      database.close();
    } catch (error) {
      // ignore shutdown errors
    }
  });
}

let cliAvailableChecked = false;
const ensureCliAvailable = () => {
  if (cliAvailableChecked || usingDatabaseSync) return;
  const result = spawnSync('sqlite3', ['-version'], { encoding: 'utf-8' });
  if (result.error || result.status !== 0) {
    const message =
      result.error?.message ?? result.stderr?.toString()?.trim() ?? 'sqlite3 CLI is required but could not be executed.';
    const error = new Error(
      `${message} Install sqlite3 or upgrade to Node.js 22 to use the built-in SQLite driver.`
    );
    error.details = { command: 'sqlite3 -version', stderr: result.stderr?.toString() ?? '' };
    throw error;
  }
  cliAvailableChecked = true;
};

if (!usingDatabaseSync) {
  ensureCliAvailable();
}

let cliJsonSupported = null;
const detectCliJsonSupport = () => {
  if (usingDatabaseSync) return false;
  if (cliJsonSupported !== null) return cliJsonSupported;
  ensureCliAvailable();
  const result = spawnSync('sqlite3', ['-json', ':memory:', 'SELECT 1;'], { encoding: 'utf-8' });
  cliJsonSupported = result.status === 0;
  return cliJsonSupported;
};

const runSqliteCli = (sql, args = []) => {
  ensureCliAvailable();
  const result = spawnSync('sqlite3', [dbPath, ...args], { input: sql, encoding: 'utf-8' });
  if (result.status !== 0) {
    const message = result.stderr?.toString()?.trim() || 'Failed to execute sqlite3 command';
    const error = new Error(message);
    error.details = { args: [dbPath, ...args], sql, stderr: result.stderr?.toString() ?? '' };
    throw error;
  }
  return result.stdout ?? '';
};

const parseCsvRow = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
};

const querySqliteCli = (sql) => {
  if (detectCliJsonSupport()) {
    const output = runSqliteCli(sql, ['-json']).trim();
    if (!output) return [];
    try {
      return JSON.parse(output);
    } catch (cause) {
      const error = new Error('Unable to parse sqlite3 JSON output');
      error.cause = cause;
      error.details = { output };
      throw error;
    }
  }
  const output = runSqliteCli(sql, ['-header', '-csv']).trim();
  if (!output) return [];
  const lines = output.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = parseCsvRow(lines.shift());
  return lines.map((line) => {
    const values = parseCsvRow(line);
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] ?? '';
    });
    return record;
  });
};

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
  if (usingDatabaseSync) {
    database.exec(payload);
  } else {
    runSqliteCli(payload);
  }
};

export const queryRows = (statement) => {
  const normalized = ensureStatementTerminated(statement);
  if (!normalized) return [];
  if (usingDatabaseSync) {
    const prepared = database.prepare(normalized);
    return prepared.all();
  }
  return querySqliteCli(normalized);
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
  execStatements(['PRAGMA journal_mode=WAL;', 'PRAGMA foreign_keys=ON;']);
  ensureTableSchema('merge_requests', mergeRequestsCreate, mergeRequestColumns);
  ensureTableSchema('stories', storiesCreate, storiesColumns);
  ensureTableSchema('tests', testsCreate, testsColumns);
};

initialize();
