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
  const result = spawnSync('sqlite3', args, { input, encoding: 'utf8' });
  if (result.status !== 0) {
    const error = new Error(result.stderr || 'Failed to execute sqlite3 command');
    error.details = { args, input };
    throw error;
  }
  return result.stdout;
};

export const execStatements = (statements) => {
  const joined = Array.isArray(statements) ? statements.join('\n') : statements;
  if (!joined.trim()) return;
  runSqlite([dbPath], `${joined}\n`);
};

export const queryRows = (statement) => {
  const output = runSqlite(['-json', dbPath, statement]);
  if (!output.trim()) return [];
  return JSON.parse(output);
};

const initialize = () => {
  execStatements([
    'PRAGMA journal_mode=WAL;',
    'PRAGMA foreign_keys=ON;',
    `CREATE TABLE IF NOT EXISTS merge_requests (
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
    );`,
    `CREATE TABLE IF NOT EXISTS stories (
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
    );`,
    `CREATE TABLE IF NOT EXISTS tests (
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
    );`
  ]);
};

initialize();
