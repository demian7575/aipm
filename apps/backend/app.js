import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SQLITE_COMMAND = process.env.AI_PM_SQLITE_CLI || 'sqlite3';

function escapeSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'NULL';
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (value instanceof Date) {
    return `'${value.toISOString().replace(/'/g, "''")}'`;
  }
  const text = String(value);
  return `'${text.replace(/'/g, "''")}'`;
}

function ensureStatementTerminated(sql) {
  const trimmed = sql.trim();
  if (trimmed.endsWith(';')) {
    return trimmed;
  }
  return `${trimmed};`;
}

function substituteParams(sql, params) {
  let index = 0;
  return ensureStatementTerminated(
    sql.replace(/\?/g, () => {
      const value = index < params.length ? params[index++] : null;
      return escapeSqlValue(value);
    })
  );
}

function runSqliteCli(args, input) {
  const result = spawnSync(SQLITE_COMMAND, ['-batch', ...args], {
    input,
    encoding: 'utf8',
  });

  if (result.error) {
    if (result.error.code === 'ENOENT') {
      const error = new Error(
        `SQLite CLI executable "${SQLITE_COMMAND}" not found. Install sqlite3 or use Node 20+ for the built-in driver.`
      );
      error.cause = result.error;
      throw error;
    }
    throw result.error;
  }

  if (result.status !== 0) {
    const message = result.stderr?.trim() || 'Failed to execute sqlite3 command';
    const error = new Error(message);
    error.stderr = result.stderr;
    error.stdout = result.stdout;
    error.status = result.status;
    error.args = args;
    throw error;
  }

  return result.stdout || '';
}

let cliFeatureCache;

function detectCliFeatures() {
  if (cliFeatureCache) {
    return cliFeatureCache;
  }

  let json = false;
  try {
    const output = runSqliteCli([':memory:'], '.mode json\nSELECT 1 AS value;\n');
    const trimmed = output.trim();
    if (trimmed) {
      JSON.parse(trimmed);
      json = true;
    }
  } catch (error) {
    if (error.stderr && /no such mode: json/i.test(error.stderr)) {
      json = false;
    } else if (error.message && /no such mode: json/i.test(error.message)) {
      json = false;
    } else if (error.cause && error.cause.code === 'ENOENT') {
      throw error;
    }
  }

  cliFeatureCache = { json };
  return cliFeatureCache;
}

function parseJsonOutput(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const jsonLine = lines[lines.length - 1];
  return JSON.parse(jsonLine);
}

function normalizeTabValue(value) {
  if (value === undefined) return null;
  if (value === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}

function parseTabularOutput(output) {
  const trimmed = output.trim();
  if (!trimmed) {
    return [];
  }
  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) {
    return [];
  }
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const values = line.split('\t');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = normalizeTabValue(values[index]);
    });
    return row;
  });
}

class CliStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
  }

  all(...params) {
    return this.db._all(this.sql, params);
  }

  get(...params) {
    const rows = this.db._all(this.sql, params);
    return rows[0];
  }

  run(...params) {
    return this.db._run(this.sql, params);
  }
}

class CliDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.features = detectCliFeatures();
  }

  exec(sql) {
    if (!sql) {
      return this;
    }
    const script = sql.endsWith('\n') ? sql : `${sql}\n`;
    runSqliteCli([this.filePath], script);
    return this;
  }

  prepare(sql) {
    return new CliStatement(this, sql);
  }

  close() {
    // CLI-based connections do not maintain persistent handles.
  }

  _all(sql, params) {
    const statement = substituteParams(sql, params);
    const prefix = this.features.json ? '.mode json\n' : '.headers on\n.mode tabs\n';
    const output = runSqliteCli([this.filePath], `${prefix}${statement}\n`);
    return this.features.json ? parseJsonOutput(output) : parseTabularOutput(output);
  }

  _run(sql, params) {
    const statement = substituteParams(sql, params);
    const prefix = this.features.json ? '.mode json\n' : '.headers on\n.mode tabs\n';
    const script = `${prefix}${statement}\nSELECT changes() AS changes, last_insert_rowid() AS lastInsertRowid;\n`;
    const output = runSqliteCli([this.filePath], script);
    if (this.features.json) {
      const rows = parseJsonOutput(output);
      const meta = rows[rows.length - 1] || {};
      return {
        changes: Number(meta.changes ?? 0),
        lastInsertRowid: Number(meta.lastInsertRowid ?? meta.last_insert_rowid ?? 0),
      };
    }
    const rows = parseTabularOutput(output);
    const meta = rows[rows.length - 1] || {};
    return {
      changes: Number(meta.changes ?? 0),
      lastInsertRowid: Number(meta.lastInsertRowid ?? meta.last_insert_rowid ?? 0),
    };
  }
}

let createDatabaseInstance;

const DEFAULT_COLUMNS = {
  user_stories: [
    'id',
    'mr_id',
    'parent_id',
    'title',
    'description',
    'as_a',
    'i_want',
    'so_that',
    'story_point',
    'assignee_email',
    'status',
    'created_at',
    'updated_at',
  ],
  acceptance_tests: ['id', 'story_id', 'given', 'when_step', 'then_step', 'status', 'created_at', 'updated_at'],
  reference_documents: ['id', 'story_id', 'name', 'url', 'created_at', 'updated_at'],
};

class JsonStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.trim();
    this.normalized = this.sql.replace(/\s+/g, ' ').trim();
  }

  all(...params) {
    return this.db._all(this.normalized, params);
  }

  get(...params) {
    const rows = this.all(...params);
    return rows[0];
  }

  run(...params) {
    return this.db._run(this.normalized, params);
  }
}

class JsonDatabase {
  constructor(filePath) {
    this.sqlitePath = filePath;
    this.jsonPath = filePath.endsWith('.sqlite') ? `${filePath}.json` : `${filePath}.json`;
    this.tables = {
      user_stories: [],
      acceptance_tests: [],
      reference_documents: [],
    };
    this.sequences = {
      user_stories: 0,
      acceptance_tests: 0,
      reference_documents: 0,
    };
    this.columns = JSON.parse(JSON.stringify(DEFAULT_COLUMNS));
    this._load();
  }

  _load() {
    try {
      if (existsSync(this.jsonPath)) {
        const raw = readFileSync(this.jsonPath, 'utf8');
        if (raw) {
          const data = JSON.parse(raw);
          if (data.tables) {
            this.tables.user_stories = data.tables.user_stories ?? [];
            this.tables.acceptance_tests = data.tables.acceptance_tests ?? [];
            this.tables.reference_documents = data.tables.reference_documents ?? [];
          }
          if (data.sequences) {
            this.sequences = {
              user_stories: data.sequences.user_stories ?? this._maxId(this.tables.user_stories),
              acceptance_tests:
                data.sequences.acceptance_tests ?? this._maxId(this.tables.acceptance_tests),
              reference_documents:
                data.sequences.reference_documents ?? this._maxId(this.tables.reference_documents),
            };
          } else {
            this._refreshSequences();
          }
          if (data.columns) {
            this.columns = {
              user_stories: data.columns.user_stories ?? this.columns.user_stories,
              acceptance_tests: data.columns.acceptance_tests ?? this.columns.acceptance_tests,
              reference_documents:
                data.columns.reference_documents ?? this.columns.reference_documents,
            };
          }
        }
      } else {
        this._persist();
      }
    } catch {
      this._refreshSequences();
    }
  }

  _refreshSequences() {
    this.sequences.user_stories = this._maxId(this.tables.user_stories);
    this.sequences.acceptance_tests = this._maxId(this.tables.acceptance_tests);
    this.sequences.reference_documents = this._maxId(this.tables.reference_documents);
  }

  _maxId(rows) {
    return rows.reduce((max, row) => (row.id > max ? row.id : max), 0);
  }

  _persist() {
    mkdirSync(path.dirname(this.jsonPath), { recursive: true });
    const payload = {
      tables: this.tables,
      sequences: this.sequences,
      columns: this.columns,
      driver: 'json-fallback',
    };
    writeFileSync(this.jsonPath, JSON.stringify(payload, null, 2), 'utf8');
  }

  exec(sql) {
    if (!sql) {
      return this;
    }
    const statements = sql
      .split(';')
      .map((statement) => statement.trim())
      .filter(Boolean);
    statements.forEach((statement) => {
      this._executeStatement(statement);
    });
    this._persist();
    return this;
  }

  _executeStatement(statement) {
    const normalized = statement.replace(/\s+/g, ' ').trim();
    if (!normalized) return;
    if (normalized.startsWith('PRAGMA')) {
      return;
    }
    if (normalized.startsWith('CREATE TABLE')) {
      this._ensureTableFromCreate(normalized);
      return;
    }
    if (normalized.startsWith('ALTER TABLE')) {
      this._handleAlter(normalized);
      return;
    }
    if (normalized.includes('UPDATE user_stories SET description =')) {
      this._setDefault('user_stories', 'description', '');
      return;
    }
    if (normalized.includes('UPDATE user_stories SET as_a =')) {
      this._setDefault('user_stories', 'as_a', '');
      return;
    }
    if (normalized.includes('UPDATE user_stories SET i_want =')) {
      this._setDefault('user_stories', 'i_want', '');
      return;
    }
    if (normalized.includes('UPDATE user_stories SET so_that =')) {
      this._setDefault('user_stories', 'so_that', '');
      return;
    }
    if (normalized.includes('UPDATE user_stories SET assignee_email =')) {
      this._setDefault('user_stories', 'assignee_email', '');
      return;
    }
    if (normalized.includes("UPDATE user_stories SET status = 'Draft'")) {
      this._setDefault('user_stories', 'status', 'Draft');
      return;
    }
    if (normalized.includes("UPDATE acceptance_tests SET status = 'Draft'")) {
      this._setDefault('acceptance_tests', 'status', 'Draft');
      return;
    }
    if (normalized.includes('UPDATE reference_documents SET name =')) {
      this._setDefault('reference_documents', 'name', '');
      return;
    }
    if (normalized.includes('UPDATE reference_documents SET url =')) {
      this._setDefault('reference_documents', 'url', '');
      return;
    }
    if (normalized.includes('UPDATE acceptance_tests SET title =')) {
      this._setDefault('acceptance_tests', 'title', '');
    }
  }

  _ensureTableFromCreate(statement) {
    const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (!match) return;
    const table = match[1];
    if (!this.tables[table]) {
      this.tables[table] = [];
    }
    if (!this.columns[table]) {
      const columnSectionMatch = statement.match(/\((.*)\)/);
      if (columnSectionMatch) {
        const parts = columnSectionMatch[1]
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => part.split(/\s+/)[0].replace(/"/g, ''))
          .filter((token) =>
            token &&
            !['FOREIGN', 'CONSTRAINT', 'PRIMARY', 'UNIQUE'].includes(token.toUpperCase())
          );
        this.columns[table] = parts;
      }
    }
  }

  _handleAlter(statement) {
    const match = statement.match(/ALTER TABLE (\w+) ADD COLUMN (.+)/i);
    if (!match) return;
    const [, table, definition] = match;
    const columnName = definition.split(/\s+/)[0].replace(/"/g, '');
    if (!this.columns[table]) {
      this.columns[table] = [...(DEFAULT_COLUMNS[table] ?? []), columnName];
    } else if (!this.columns[table].includes(columnName)) {
      this.columns[table].push(columnName);
    }
    const defaultMatch = definition.match(/DEFAULT\s+'([^']*)'/i);
    const numericMatch = definition.match(/DEFAULT\s+([0-9]+)/i);
    const defaultValue =
      defaultMatch?.[1] ?? (numericMatch ? Number(numericMatch[1]) : null);
    const rows = this.tables[table];
    if (Array.isArray(rows)) {
      rows.forEach((row) => {
        if (!(columnName in row) || row[columnName] == null) {
          row[columnName] = defaultValue;
        }
      });
    }
  }

  _setDefault(table, column, value) {
    const rows = this.tables[table];
    if (!Array.isArray(rows)) return;
    rows.forEach((row) => {
      if (row[column] == null) {
        row[column] = value;
      }
    });
  }

  prepare(sql) {
    return new JsonStatement(this, sql);
  }

  close() {
    this._persist();
  }

  _clone(row) {
    return row ? JSON.parse(JSON.stringify(row)) : row;
  }

  _all(sql, params) {
    if (sql === 'SELECT COUNT(*) as count FROM user_stories') {
      return [{ count: this.tables.user_stories.length }];
    }
    if (sql.startsWith('SELECT * FROM user_stories WHERE id = ?')) {
      const id = Number(params[0]);
      const row = this.tables.user_stories.find((entry) => entry.id === id);
      return row ? [this._clone(row)] : [];
    }
    if (sql.startsWith('SELECT * FROM reference_documents WHERE id = ?')) {
      const id = Number(params[0]);
      const row = this.tables.reference_documents.find((entry) => entry.id === id);
      return row ? [this._clone(row)] : [];
    }
    if (sql.startsWith('PRAGMA table_info(')) {
      const table = sql.match(/PRAGMA table_info\((\w+)\)/i)?.[1];
      const columns = this.columns[table] ?? [];
      return columns.map((name, index) => ({ cid: index, name }));
    }
    if (sql.startsWith('SELECT * FROM user_stories ORDER BY')) {
      const rows = this.tables.user_stories.map((row) => this._clone(row));
      rows.sort((a, b) => {
        const aHasParent = a.parent_id != null ? 1 : 0;
        const bHasParent = b.parent_id != null ? 1 : 0;
        if (aHasParent !== bHasParent) {
          return aHasParent - bHasParent;
        }
        const aParent = a.parent_id ?? 0;
        const bParent = b.parent_id ?? 0;
        if (aParent !== bParent) {
          return aParent - bParent;
        }
        return a.id - b.id;
      });
      return rows;
    }
    if (sql.startsWith('SELECT * FROM acceptance_tests ORDER BY')) {
      const rows = this.tables.acceptance_tests.map((row) => this._clone(row));
      rows.sort((a, b) => {
        if (a.story_id !== b.story_id) {
          return a.story_id - b.story_id;
        }
        return a.id - b.id;
      });
      return rows;
    }
    if (sql.startsWith('SELECT * FROM reference_documents ORDER BY')) {
      const rows = this.tables.reference_documents.map((row) => this._clone(row));
      rows.sort((a, b) => {
        if (a.story_id !== b.story_id) {
          return a.story_id - b.story_id;
        }
        return a.id - b.id;
      });
      return rows;
    }
    return [];
  }

  _generateId(table) {
    this.sequences[table] = (this.sequences[table] ?? 0) + 1;
    return this.sequences[table];
  }

  _run(sql, params) {
    const insertMatch = sql.match(/^INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)$/i);
    if (insertMatch) {
      const [, table, columnList, valueList] = insertMatch;
      const columns = columnList.split(',').map((column) => column.trim());
      const values = valueList.split(',').map((value) => value.trim());
      const row = {};
      let paramIndex = 0;
      columns.forEach((column, index) => {
        const key = column.replace(/"/g, '');
        const valueExpr = values[index] ?? '?';
        if (valueExpr === '?') {
          row[key] = this._coerceValue(table, key, params[paramIndex++]);
        } else if (/^NULL$/i.test(valueExpr)) {
          row[key] = null;
        } else if (/^-?\d+(?:\.\d+)?$/.test(valueExpr)) {
          row[key] = this._coerceValue(table, key, Number(valueExpr));
        } else if (/^'.*'$/.test(valueExpr)) {
          const unescaped = valueExpr.slice(1, -1).replace(/''/g, "'");
          row[key] = this._coerceValue(table, key, unescaped);
        } else {
          row[key] = this._coerceValue(table, key, valueExpr);
        }
      });
      if (!('id' in row)) {
        row.id = this._generateId(table);
      } else {
        row.id = Number(row.id);
        this.sequences[table] = Math.max(this.sequences[table] ?? 0, row.id);
      }
      this._applyInsertDefaults(table, row);
      const nowRow = this.tables[table];
      if (Array.isArray(nowRow)) {
        nowRow.push(row);
      }
      this._persist();
      return { changes: 1, lastInsertRowid: row.id };
    }

    if (sql.startsWith('UPDATE user_stories SET')) {
      return this._updateRow('user_stories', sql, params);
    }
    if (sql.startsWith('UPDATE acceptance_tests SET')) {
      return this._updateRow('acceptance_tests', sql, params);
    }
    if (sql.startsWith('UPDATE reference_documents SET')) {
      return this._updateRow('reference_documents', sql, params);
    }
    if (sql.startsWith('DELETE FROM user_stories WHERE id = ?')) {
      return this._deleteRow('user_stories', params[0]);
    }
    if (sql.startsWith('DELETE FROM acceptance_tests WHERE id = ?')) {
      return this._deleteRow('acceptance_tests', params[0]);
    }
    if (sql.startsWith('DELETE FROM reference_documents WHERE id = ?')) {
      return this._deleteRow('reference_documents', params[0]);
    }
    return { changes: 0, lastInsertRowid: 0 };
  }

  _updateRow(table, sql, params) {
    const rows = this.tables[table];
    if (!Array.isArray(rows)) {
      return { changes: 0, lastInsertRowid: 0 };
    }
    const id = Number(params[params.length - 1]);
    const row = rows.find((entry) => entry.id === id);
    if (!row) {
      return { changes: 0, lastInsertRowid: 0 };
    }
    const setMatch = sql.match(/SET (.+) WHERE/i);
    if (!setMatch) {
      return { changes: 0, lastInsertRowid: 0 };
    }
    const assignments = setMatch[1].split(',').map((part) => part.trim());
    assignments.forEach((assignment, index) => {
      const [column] = assignment.split('=');
      const key = column.replace(/"/g, '').trim();
      row[key] = this._coerceValue(table, key, params[index]);
    });
    this._persist();
    return { changes: 1, lastInsertRowid: id };
  }

  _deleteRow(table, idValue) {
    const rows = this.tables[table];
    if (!Array.isArray(rows)) {
      return { changes: 0, lastInsertRowid: 0 };
    }
    const id = Number(idValue);
    let targets = [id];
    if (table === 'user_stories') {
      const cascade = [];
      const queue = [id];
      while (queue.length > 0) {
        const current = queue.shift();
        cascade.push(current);
        rows
          .filter((row) => row.parent_id === current)
          .forEach((child) => {
            queue.push(child.id);
          });
      }
      targets = cascade;
    }
    const targetSet = new Set(targets.map(Number));
    const originalLength = rows.length;
    this.tables[table] = rows.filter((row) => !targetSet.has(row.id));
    const changes = originalLength - this.tables[table].length;
    if (table === 'user_stories' && changes > 0) {
      this.tables.acceptance_tests = this.tables.acceptance_tests.filter(
        (test) => !targetSet.has(test.story_id)
      );
      this.tables.reference_documents = this.tables.reference_documents.filter(
        (doc) => !targetSet.has(doc.story_id)
      );
    }
    if (changes > 0) {
      this._persist();
    }
    return { changes, lastInsertRowid: id };
  }

  _coerceValue(table, key, value) {
    if (value === undefined) return null;
    if (value === '') return table === 'user_stories' && key === 'story_point' ? null : value;
    if (key === 'id' || key.endsWith('_id') || key === 'mr_id') {
      return value == null ? null : Number(value);
    }
    if (key === 'story_point') {
      return value == null ? null : Number(value);
    }
    return value;
  }

  _applyInsertDefaults(table, row) {
    if (table === 'user_stories') {
      if (!('mr_id' in row)) row.mr_id = 1;
      if (!('status' in row) || row.status == null) row.status = 'Draft';
      if (!('description' in row) || row.description == null) row.description = '';
      if (!('as_a' in row) || row.as_a == null) row.as_a = '';
      if (!('i_want' in row) || row.i_want == null) row.i_want = '';
      if (!('so_that' in row) || row.so_that == null) row.so_that = '';
      if (!('assignee_email' in row) || row.assignee_email == null) row.assignee_email = '';
    } else if (table === 'acceptance_tests') {
      if (!('status' in row) || row.status == null) row.status = 'Draft';
      if (!('created_at' in row)) row.created_at = now();
      if (!('updated_at' in row)) row.updated_at = now();
    } else if (table === 'reference_documents') {
      if (!('name' in row) || row.name == null) row.name = '';
      if (!('url' in row) || row.url == null) row.url = '';
    }
  }
}

async function loadDatabaseFactory() {
  if (createDatabaseInstance) {
    return createDatabaseInstance;
  }

  if (process.env.AI_PM_FORCE_JSON_DB === '1') {
    createDatabaseInstance = (filePath) => new JsonDatabase(filePath);
    return createDatabaseInstance;
  }

  try {
    const { DatabaseSync } = await import('node:sqlite');
    createDatabaseInstance = (filePath) => new DatabaseSync(filePath);
    return createDatabaseInstance;
  } catch (nativeError) {
    try {
      detectCliFeatures();
      createDatabaseInstance = (filePath) => new CliDatabase(filePath);
      return createDatabaseInstance;
    } catch (cliError) {
      try {
        createDatabaseInstance = (filePath) => new JsonDatabase(filePath);
        return createDatabaseInstance;
      } catch (jsonError) {
        cliError.cause = jsonError;
        nativeError.cause = cliError;
        throw nativeError;
      }
    }
  }
}

export async function openDatabase(filePath) {
  const createDatabase = await loadDatabaseFactory();
  return createDatabase(filePath);
}

export function resetDatabaseFactory() {
  cliFeatureCache = undefined;
  createDatabaseInstance = undefined;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'public');
const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
export const DATABASE_PATH = path.join(DATA_DIR, 'app.sqlite');

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB

let acceptanceTestsHasTitleColumn = false;

const INVEST_DEPENDENCY_HINTS = [
  'blocked by',
  'depends on',
  'waiting on',
  'requires story',
  'requires task',
  'after story',
  'after task',
  'shared migration',
  'coupled with',
  'linked to story',
];

const INVEST_NEGOTIABLE_HINTS = [
  'pixel-perfect',
  'exact pixel',
  'must use ',
  'must leverage ',
  'locked design',
  'cannot change design',
  'exact colour',
  'exact color',
  'exact hex',
  'exact layout',
  'exact spacing',
  '24px',
  '12px',
];

const INVEST_ESTIMABLE_HINTS = [
  'tbd',
  'to be determined',
  'to be decided',
  'unknown',
  'not sure',
  'investigate',
  'research spike',
  'spike on',
  'needs discovery',
  'open question',
];

const INVEST_SCOPE_HINTS = [
  'multiple teams',
  'multi-team',
  'across all',
  'entire platform',
  'entire system',
  'all modules',
  'full rewrite',
  'large refactor',
  'company-wide',
];

const INVEST_AMBIGUOUS_HINTS = [
  'fast',
  'quickly',
  'optimal',
  'asap',
  'maybe',
  'etc',
  'sufficiently',
  'user-friendly',
  'intuitive',
  'seamless',
];

function findKeywordMatchesInText(text, patterns) {
  if (!text) return [];
  const lower = String(text).toLowerCase();
  const matches = new Set();
  patterns.forEach((pattern) => {
    if (!pattern) return;
    if (pattern instanceof RegExp) {
      const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
      const regex = new RegExp(pattern.source, flags);
      let result;
      // eslint-disable-next-line no-cond-assign
      while ((result = regex.exec(lower))) {
        if (result[1]) {
          matches.add(result[1]);
        } else if (result[0]) {
          matches.add(result[0]);
        }
      }
    } else if (lower.includes(String(pattern).toLowerCase())) {
      matches.add(String(pattern).toLowerCase());
    }
  });
  return Array.from(matches);
}

function now() {
  return new Date().toISOString();
}

function ensureArray(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (value == null) return [];
  return [String(value).trim()].filter(Boolean);
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function isLocalUpload(urlPath) {
  return typeof urlPath === 'string' && urlPath.startsWith('/uploads/');
}

function resolveUploadPath(urlPath) {
  if (!isLocalUpload(urlPath)) return null;
  const relative = urlPath.replace(/^\/uploads\//, '');
  const safeSegments = relative
    .split(/[/\\]+/)
    .filter(Boolean)
    .map((segment) => sanitizeFilename(segment));
  const resolved = path.join(UPLOAD_DIR, ...safeSegments);
  if (!resolved.startsWith(UPLOAD_DIR)) {
    return null;
  }
  return resolved;
}

function baselineInvestWarnings(story, options = {}) {
  const { acceptanceTests = null, includeTestChecks = false } = options;
  const warnings = [];
  const combinedText = [story.title, story.description, story.asA, story.iWant, story.soThat]
    .filter(Boolean)
    .join(' ');

  if (!story.asA || !story.asA.trim()) {
    warnings.push({
      criterion: 'valuable',
      message: 'Story must describe the persona in “As a”.',
      details: 'INVEST “Valuable” expects a clearly identified persona so the benefit is easy to judge.',
      suggestion: 'Add a persona, e.g., “As a security administrator”.',
    });
  }
  if (!story.iWant || !story.iWant.trim()) {
    warnings.push({
      criterion: 'negotiable',
      message: 'Add a concrete goal in “I want”.',
      details: 'INVEST “Negotiable” stories describe the desired capability without locking in a solution.',
      suggestion: 'State the outcome, e.g., “I want to review pending access requests”.',
    });
  }
  if (!story.soThat || !story.soThat.trim()) {
    warnings.push({
      criterion: 'valuable',
      message: 'Capture the benefit in “So that”.',
      details: 'Explaining the benefit keeps the story valuable and aligned with user needs.',
      suggestion: 'Describe the benefit, e.g., “So that I can approve changes quickly and safely”.',
    });
  }
  const dependencyHints = findKeywordMatchesInText(combinedText, INVEST_DEPENDENCY_HINTS);
  if (dependencyHints.length) {
    warnings.push({
      criterion: 'independent',
      message: 'Story references other work and may not be independent.',
      details:
        `I — Independent stories avoid tight coupling. Detected dependency language: ${dependencyHints
          .map((hint) => `“${hint}”`)
          .join(', ')}.`,
      suggestion:
        'Split by persona, workflow step, or scenario so each story can ship without waiting on other stories.',
    });
  } else if (story.title && story.title.trim().length < 8) {
    warnings.push({
      criterion: 'independent',
      message: 'Title is short; clarify scope in a few more words.',
      details: 'A descriptive title helps reviewers judge whether the story stands independently.',
      suggestion: 'Expand the title, e.g., “Manage MFA enrollment reminders”.',
    });
  }

  const negotiableHints = findKeywordMatchesInText(combinedText, INVEST_NEGOTIABLE_HINTS);
  if (negotiableHints.length) {
    warnings.push({
      criterion: 'negotiable',
      message: 'Story looks prescriptive instead of negotiable.',
      details:
        `N — Negotiable stories leave room for collaboration. Detected rigid language: ${negotiableHints
          .map((hint) => `“${hint.trim()}”`)
          .join(', ')}.`,
      suggestion:
        'Focus on the outcome and move specific UI or tech choices into acceptance criteria or design notes.',
    });
  }

  if (story.soThat && /tbd|n\/a|not applicable|unknown/i.test(story.soThat)) {
    warnings.push({
      criterion: 'valuable',
      message: 'Benefit is unclear in “So that”.',
      details: 'V — Valuable stories explain the user or product benefit so prioritisation stays grounded.',
      suggestion: 'Spell out the user/customer outcome or tie the enabler to a near-term capability.',
    });
  }

  const estimableHints = findKeywordMatchesInText(combinedText, INVEST_ESTIMABLE_HINTS);
  if (estimableHints.length) {
    warnings.push({
      criterion: 'estimable',
      message: 'Story includes unknowns that block estimation.',
      details:
        `E — Estimable stories avoid unclear scope. Detected uncertainty language: ${estimableHints
          .map((hint) => `“${hint.trim()}”`)
          .join(', ')}.`,
      suggestion: 'Schedule a spike, clarify acceptance criteria, or split the story until sizing is possible.',
    });
  }

  if (typeof story.storyPoint === 'number' && story.storyPoint >= 13) {
    warnings.push({
      criterion: 'small',
      message: 'Story point suggests the slice may be too large.',
      details:
        'S — Small stories fit within a sprint. Consider breaking down work estimated at 13+ points or spanning many teams.',
      suggestion: 'Slice by scenario, CRUD operation, platform, or “thin vertical” increments.',
    });
  } else {
    const scopeHints = findKeywordMatchesInText(combinedText, INVEST_SCOPE_HINTS);
    if (scopeHints.length) {
      warnings.push({
        criterion: 'small',
        message: 'Story scope sounds broad for a single sprint.',
        details:
          `S — Small stories avoid multi-team or platform-wide delivery. Detected language: ${scopeHints
            .map((hint) => `“${hint.trim()}”`)
            .join(', ')}.`,
        suggestion: 'Slice by user scenario, platform, or capability so each story fits within a sprint.',
      });
    }
  }

  const ambiguousMatches = findKeywordMatchesInText(
    [story.iWant, story.soThat].filter(Boolean).join(' '),
    INVEST_AMBIGUOUS_HINTS
  );
  if (ambiguousMatches.length) {
    warnings.push({
      criterion: 'testable',
      message: 'Story uses qualitative words that are hard to test.',
      details:
        `T — Testable stories enable objective verification. Ambiguous words found: ${ambiguousMatches
          .map((hint) => `“${hint.trim()}”`)
          .join(', ')}.`,
      suggestion: 'Pair acceptance tests with measurable outcomes (time, counts, error rates) for each Then step.',
    });
  }

  if (includeTestChecks) {
    const tests = Array.isArray(acceptanceTests)
      ? acceptanceTests
      : Array.isArray(story.acceptanceTests)
      ? story.acceptanceTests
      : [];
    if (!tests.length) {
      warnings.push({
        criterion: 'testable',
        message: 'Add at least one acceptance test to prove the story is testable.',
        details: 'INVEST “Testable” expects measurable acceptance criteria so the team can validate delivery.',
        suggestion: 'Capture a Given/When/Then scenario covering the expected behaviour.',
      });
    } else {
      const unresolved = tests.flatMap((test) => (test.gwtHealth?.issues ?? []));
      if (unresolved.length > 0) {
        warnings.push({
          criterion: 'testable',
          message: 'Resolve Given/When/Then gaps in acceptance tests.',
          details: 'Some acceptance tests have ambiguous or incomplete steps that block verification.',
          suggestion: 'Edit the failing scenarios to remove ambiguity and include measurable outcomes.',
        });
      }
    }
  }
  return warnings;
}

function readOpenAiConfig() {
  const key =
    process.env.AI_PM_OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || '';
  const trimmedKey = key.trim();
  const enabled =
    trimmedKey && process.env.AI_PM_DISABLE_OPENAI !== '1' && process.env.AI_PM_DISABLE_OPENAI !== 'true';
  return {
    enabled,
    apiKey: trimmedKey,
    endpoint: process.env.AI_PM_OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
    model: process.env.AI_PM_OPENAI_MODEL || 'gpt-4o-mini',
  };
}

function extractJsonObject(content) {
  if (!content) return null;
  const trimmed = String(content).trim();
  if (!trimmed) return null;
  const codeMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (codeMatch) {
    return codeMatch[1];
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return null;
}

function normalizeAiWarning(warning) {
  if (!warning || typeof warning !== 'object') return null;
  const criterion = warning.criterion || warning.rule || warning.dimension || '';
  const message = warning.message || warning.summary || warning.reason;
  if (!message) {
    return null;
  }
  return {
    criterion: criterion ? String(criterion) : '',
    message: String(message),
    details: warning.details ? String(warning.details) : '',
    suggestion: warning.suggestion ? String(warning.suggestion) : '',
    source: 'ai',
  };
}

function markBaselineWarnings(warnings) {
  return warnings.map((warning) => ({ ...warning, source: 'heuristic' }));
}

async function requestInvestAnalysisFromOpenAi(story, options, config) {
  if (!config.enabled) {
    return null;
  }

  const acceptanceTests = (options && Array.isArray(options.acceptanceTests) && options.acceptanceTests) || [];
  const messages = [
    {
      role: 'system',
      content:
        'You are an Agile coach who evaluates whether a user story meets INVEST. Respond ONLY with JSON containing "summary" and an array "warnings". Each warning needs "criterion", "message", "details", and "suggestion". Use empty array when the story satisfies INVEST.',
    },
    {
      role: 'user',
      content: JSON.stringify(
        {
          story: {
            title: story.title || '',
            asA: story.asA || '',
            iWant: story.iWant || '',
            soThat: story.soThat || '',
            description: story.description || '',
          },
          acceptanceTests: acceptanceTests.map((test) => ({
            given: test.given || [],
            when: test.when || [],
            then: test.then || [],
          })),
        },
        null,
        2
      ),
    },
  ];

  const body = JSON.stringify({
    model: config.model,
    response_format: { type: 'json_object' },
    messages,
  });

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(`OpenAI request failed with status ${response.status}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    const error = new Error('OpenAI response did not include JSON content');
    error.body = content;
    throw error;
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    const parseError = new Error('Failed to parse OpenAI INVEST analysis');
    parseError.cause = error;
    parseError.body = jsonText;
    throw parseError;
  }
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
  return {
    warnings: warnings.map((warning) => ({ ...warning })),
    summary: parsed.summary ? String(parsed.summary) : '',
    model: config.model,
    raw: content,
  };
}

async function analyzeInvest(story, options = {}) {
  const baseline = markBaselineWarnings(baselineInvestWarnings(story, options));
  const config = readOpenAiConfig();
  if (!config.enabled) {
    return {
      warnings: baseline,
      source: 'heuristic',
      summary: '',
      ai: null,
      fallbackWarnings: baseline,
      usedFallback: true,
    };
  }

  try {
    const aiResult = await requestInvestAnalysisFromOpenAi(story, options, config);
    if (!aiResult) {
      return {
        warnings: baseline,
        source: 'heuristic',
        summary: '',
        ai: null,
        fallbackWarnings: baseline,
        usedFallback: true,
      };
    }
    const aiWarnings = aiResult.warnings.map((warning) => normalizeAiWarning(warning)).filter(Boolean);
    return {
      warnings: aiWarnings,
      source: 'openai',
      summary: aiResult.summary || '',
      ai: {
        warnings: aiWarnings,
        summary: aiResult.summary || '',
        model: aiResult.model,
        raw: aiResult.raw,
      },
      fallbackWarnings: baseline,
      usedFallback: false,
    };
  } catch (error) {
    console.error('OpenAI INVEST analysis failed', error);
    return {
      warnings: baseline,
      source: 'fallback',
      summary: '',
      ai: { error: error.message },
      fallbackWarnings: baseline,
      usedFallback: true,
    };
  }
}

function normalizeStoryPoint(value) {
  if (value == null || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw Object.assign(new Error('Story point must be a number'), { statusCode: 400 });
  }
  if (!Number.isInteger(numeric)) {
    throw Object.assign(new Error('Story point must be an integer'), { statusCode: 400 });
  }
  if (numeric < 0) {
    throw Object.assign(new Error('Story point cannot be negative'), { statusCode: 400 });
  }
  return numeric;
}

const MEASURABLE_PATTERN = /([0-9]+\s*(ms|s|sec|seconds?|minutes?|hours?|%|percent|users?|items?|requests?|errors?))/i;

function measurabilityWarnings(thenSteps) {
  const warnings = [];
  const suggestions = [];
  thenSteps.forEach((step, index) => {
    if (!MEASURABLE_PATTERN.test(step)) {
      const suggestion =
        `Then step ${index + 1}: add a numeric goal such as “within 2s”, “<1% errors”, or “at least 5 users displayed”.`;
      warnings.push({
        index,
        message: `Then step ${index + 1} lacks a measurable outcome.`,
        details: 'Then steps should include a quantifiable or observable threshold so the result is verifiable.',
        suggestion,
      });
      suggestions.push(suggestion);
    }
  });
  return { warnings, suggestions };
}

function buildGwtHealth(given, when, then, measurability) {
  const issues = [];
  const hasContent = (steps) => steps.some((step) => step && step.trim().length > 0);

  if (!hasContent(given)) {
    issues.push({
      criterion: 'Given',
      message: 'Provide at least one Given step describing the starting context.',
      details: 'A Given step establishes preconditions so testers can reproduce the scenario.',
      suggestion: 'Example: “Given the user is signed in as an administrator”.',
    });
  }
  if (!hasContent(when)) {
    issues.push({
      criterion: 'When',
      message: 'Add a When step that explains the action under test.',
      details: 'The When step captures the behaviour being exercised in the scenario.',
      suggestion: 'Example: “When they approve the pending request”.',
    });
  }
  if (!hasContent(then)) {
    issues.push({
      criterion: 'Then',
      message: 'Add a Then step outlining the expected result.',
      details: 'Then steps describe the observable outcome that proves the story works.',
      suggestion: 'Example: “Then the request status updates within 2 seconds”.',
    });
  }

  measurability.forEach((warning) => {
    issues.push({
      criterion: `Then step ${warning.index + 1}`,
      message: warning.message,
      details: warning.details,
      suggestion: warning.suggestion,
    });
  });

  return { satisfied: issues.length === 0, issues };
}

function acceptanceTestColumnsForInsert() {
  if (acceptanceTestsHasTitleColumn) {
    return {
      columns:
        'story_id, title, given, when_step, then_step, status, created_at, updated_at', // prettier-ignore
      placeholders: '?, ?, ?, ?, ?, ?, ?, ?',
    };
  }
  return {
    columns: 'story_id, given, when_step, then_step, status, created_at, updated_at',
    placeholders: '?, ?, ?, ?, ?, ?, ?',
  };
}

function insertAcceptanceTest(db, { storyId, title = '', given, when, then, status = 'Draft', timestamp = now() }) {
  const { columns, placeholders } = acceptanceTestColumnsForInsert();
  const statement = db.prepare(`INSERT INTO acceptance_tests (${columns}) VALUES (${placeholders})`);
  const params = acceptanceTestsHasTitleColumn
    ? [
        storyId,
        title,
        JSON.stringify(given),
        JSON.stringify(when),
        JSON.stringify(then),
        status,
        timestamp,
        timestamp,
      ]
    : [
        storyId,
        JSON.stringify(given),
        JSON.stringify(when),
        JSON.stringify(then),
        status,
        timestamp,
        timestamp,
      ];
  return statement.run(...params);
}

function tableColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

function ensureColumn(db, table, name, definition) {
  const existing = tableColumns(db, table).some((column) => column.name === name);
  if (!existing) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${definition};`);
  }
}

function ensureNotNullDefaults(db) {
  db.exec(`
    UPDATE user_stories SET description = '' WHERE description IS NULL;
    UPDATE user_stories SET as_a = '' WHERE as_a IS NULL;
    UPDATE user_stories SET i_want = '' WHERE i_want IS NULL;
    UPDATE user_stories SET so_that = '' WHERE so_that IS NULL;
    UPDATE user_stories SET assignee_email = '' WHERE assignee_email IS NULL;
    UPDATE user_stories SET status = 'Draft' WHERE status IS NULL;
    UPDATE acceptance_tests SET status = 'Draft' WHERE status IS NULL;
    UPDATE reference_documents SET name = '' WHERE name IS NULL;
    UPDATE reference_documents SET url = '' WHERE url IS NULL;
  `);
}

async function removeUploadIfLocal(urlPath) {
  const filePath = resolveUploadPath(urlPath);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function ensureDatabase() {
  await Promise.all([mkdir(DATA_DIR, { recursive: true }), mkdir(UPLOAD_DIR, { recursive: true })]);
  const db = await openDatabase(DATABASE_PATH);
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
  `);

  ensureColumn(db, 'user_stories', 'mr_id', 'mr_id INTEGER DEFAULT 1');
  ensureColumn(db, 'user_stories', 'parent_id', 'parent_id INTEGER');
  ensureColumn(db, 'user_stories', 'description', "description TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'as_a', "as_a TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'i_want', "i_want TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'so_that', "so_that TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'story_point', 'story_point INTEGER');
  ensureColumn(db, 'user_stories', 'assignee_email', "assignee_email TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'status', "status TEXT DEFAULT 'Draft'");
  ensureColumn(db, 'user_stories', 'created_at', 'created_at TEXT');
  ensureColumn(db, 'user_stories', 'updated_at', 'updated_at TEXT');

  ensureColumn(db, 'acceptance_tests', 'given', "given TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, 'acceptance_tests', 'when_step', "when_step TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, 'acceptance_tests', 'then_step', "then_step TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(db, 'acceptance_tests', 'status', "status TEXT DEFAULT 'Draft'");
  ensureColumn(db, 'acceptance_tests', 'created_at', 'created_at TEXT');
  ensureColumn(db, 'acceptance_tests', 'updated_at', 'updated_at TEXT');

  ensureColumn(db, 'reference_documents', 'name', "name TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'reference_documents', 'url', "url TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'reference_documents', 'created_at', 'created_at TEXT');
  ensureColumn(db, 'reference_documents', 'updated_at', 'updated_at TEXT');

  acceptanceTestsHasTitleColumn = tableColumns(db, 'acceptance_tests').some((column) => column.name === 'title');
  if (acceptanceTestsHasTitleColumn) {
    db.exec("UPDATE acceptance_tests SET title = COALESCE(title, '')");
  }

  ensureNotNullDefaults(db);

  const countStmt = db.prepare('SELECT COUNT(*) as count FROM user_stories');
  const { count } = countStmt.get();
  if (count === 0) {
    const timestamp = now();
    const insertStory = db.prepare(
      'INSERT INTO user_stories (title, description, as_a, i_want, so_that, story_point, assignee_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
    );
    const { lastInsertRowid: rootId } = insertStory.run(
      'Enable secure login',
      'As an existing customer I want to sign in quickly so I can reach my dashboard without friction.',
      'Authenticated customer',
      'sign in with email and password',
      'access my personalized dashboard immediately',
      5,
      'pm@example.com',
      'Ready',
      timestamp,
      timestamp
    );

    const insertChild = db.prepare(
      'INSERT INTO user_stories (mr_id, parent_id, title, description, as_a, i_want, so_that, story_point, assignee_email, status, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
    );
    insertChild.run(
      rootId,
      'Render login form',
      'As a returning customer I want a familiar login form so that I can authenticate without confusion.',
      'Returning customer',
      'view the login form instantly',
      'enter my credentials without delay',
      3,
      'designer@example.com',
      'Draft',
      timestamp,
      timestamp
    );

    insertAcceptanceTest(db, {
      storyId: rootId,
      title: 'Happy path login',
      given: ['A customer with valid credentials'],
      when: ['They submit the login form'],
      then: ['Dashboard loads within 2000 ms'],
      status: 'Ready',
      timestamp,
    });

    const insertDoc = db.prepare(
      'INSERT INTO reference_documents (story_id, name, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)' // prettier-ignore
    );
    insertDoc.run(rootId, 'Security checklist', 'https://example.com/security.pdf', timestamp, timestamp);
  }

  return db;
}

function attachChildren(stories) {
  const byId = new Map();
  stories.forEach((story) => {
    story.children = [];
    byId.set(story.id, story);
  });
  const roots = [];
  stories.forEach((story) => {
    if (story.parentId && byId.has(story.parentId)) {
      byId.get(story.parentId).children.push(story);
    } else {
      roots.push(story);
    }
  });
  return { roots, byId };
}

function flattenStories(nodes) {
  const result = [];
  nodes.forEach((node) => {
    result.push(node);
    if (node.children && node.children.length > 0) {
      result.push(...flattenStories(node.children));
    }
  });
  return result;
}

async function loadStories(db) {
  const storyRows = db
    .prepare('SELECT * FROM user_stories ORDER BY (parent_id IS NOT NULL), parent_id, id')
    .all();
  const testRows = db.prepare('SELECT * FROM acceptance_tests ORDER BY story_id, id').all();
  const docRows = db.prepare('SELECT * FROM reference_documents ORDER BY story_id, id').all();

  const stories = storyRows.map((row) => {
    const story = {
      id: row.id,
      mrId: row.mr_id,
      parentId: row.parent_id,
      title: row.title,
      description: row.description ?? '',
      asA: row.as_a ?? '',
      iWant: row.i_want ?? '',
      soThat: row.so_that ?? '',
      storyPoint: row.story_point,
      assigneeEmail: row.assignee_email ?? '',
      status: row.status ?? 'Draft',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      acceptanceTests: [],
      referenceDocuments: [],
    };
    return story;
  });

  const { roots, byId } = attachChildren(stories);

  testRows.forEach((row) => {
    const story = byId.get(row.story_id);
    if (!story) return;
    const given = parseJsonArray(row.given);
    const when = parseJsonArray(row.when_step);
    const then = parseJsonArray(row.then_step);
    const { warnings, suggestions } = measurabilityWarnings(then);
    const gwtHealth = buildGwtHealth(given, when, then, warnings);
    story.acceptanceTests.push({
      id: row.id,
      storyId: row.story_id,
      title: acceptanceTestsHasTitleColumn ? row.title ?? '' : '',
      given,
      when,
      then,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      measurabilityWarnings: warnings,
      measurabilitySuggestions: suggestions,
      gwtHealth,
    });
  });

  docRows.forEach((row) => {
    const story = byId.get(row.story_id);
    if (!story) return;
    story.referenceDocuments.push({
      id: row.id,
      storyId: row.story_id,
      name: row.name,
      url: row.url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });

  await Promise.all(
    stories.map(async (story) => {
      const analysis = await analyzeInvest(story, {
        acceptanceTests: story.acceptanceTests,
        includeTestChecks: true,
      });
      story.investWarnings = analysis.warnings;
      story.investSatisfied = analysis.warnings.length === 0;
      story.investHealth = { satisfied: story.investSatisfied, issues: analysis.warnings };
      story.investAnalysis = {
        source: analysis.source,
        summary: analysis.summary,
        aiSummary: analysis.ai?.summary || '',
        aiWarnings: analysis.ai?.warnings || [],
        aiModel: analysis.ai?.model || null,
        usedFallback: analysis.usedFallback,
        error: analysis.ai?.error || null,
        fallbackWarnings: analysis.fallbackWarnings || [],
      };
    })
  );

  return roots;
}

async function loadStoryWithDetails(db, storyId) {
  const row = db.prepare('SELECT * FROM user_stories WHERE id = ?').get(storyId);
  if (!row) {
    return null;
  }

  const story = {
    id: row.id,
    mrId: row.mr_id,
    parentId: row.parent_id,
    title: row.title,
    description: row.description ?? '',
    asA: row.as_a ?? '',
    iWant: row.i_want ?? '',
    soThat: row.so_that ?? '',
    storyPoint: row.story_point,
    assigneeEmail: row.assignee_email ?? '',
    status: row.status ?? 'Draft',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acceptanceTests: [],
    referenceDocuments: [],
    children: [],
  };

  const testRows = db
    .prepare('SELECT * FROM acceptance_tests WHERE story_id = ? ORDER BY id')
    .all(storyId);
  testRows.forEach((testRow) => {
    const given = parseJsonArray(testRow.given);
    const when = parseJsonArray(testRow.when_step);
    const then = parseJsonArray(testRow.then_step);
    const { warnings, suggestions } = measurabilityWarnings(then);
    const gwtHealth = buildGwtHealth(given, when, then, warnings);
    story.acceptanceTests.push({
      id: testRow.id,
      storyId: testRow.story_id,
      title: acceptanceTestsHasTitleColumn ? testRow.title ?? '' : '',
      given,
      when,
      then,
      status: testRow.status,
      createdAt: testRow.created_at,
      updatedAt: testRow.updated_at,
      measurabilityWarnings: warnings,
      measurabilitySuggestions: suggestions,
      gwtHealth,
    });
  });

  const docRows = db
    .prepare('SELECT * FROM reference_documents WHERE story_id = ? ORDER BY id')
    .all(storyId);
  docRows.forEach((docRow) => {
    story.referenceDocuments.push({
      id: docRow.id,
      storyId: docRow.story_id,
      name: docRow.name,
      url: docRow.url,
      createdAt: docRow.created_at,
      updatedAt: docRow.updated_at,
    });
  });

  const analysis = await analyzeInvest(story, {
    acceptanceTests: story.acceptanceTests,
    includeTestChecks: true,
  });
  story.investWarnings = analysis.warnings;
  story.investSatisfied = analysis.warnings.length === 0;
  story.investHealth = { satisfied: story.investSatisfied, issues: analysis.warnings };
  story.investAnalysis = {
    source: analysis.source,
    summary: analysis.summary,
    aiSummary: analysis.ai?.summary || '',
    aiWarnings: analysis.ai?.warnings || [],
    aiModel: analysis.ai?.model || null,
    usedFallback: analysis.usedFallback,
    error: analysis.ai?.error || null,
    fallbackWarnings: analysis.fallbackWarnings || [],
  };

  return story;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

async function parseJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON body'), { statusCode: 400 });
  }
}

function measurablePayload(payload) {
  const given = ensureArray(payload.given);
  const when = ensureArray(payload.when);
  const then = ensureArray(payload.then);
  if (given.length === 0 || when.length === 0 || then.length === 0) {
    throw Object.assign(new Error('Given/When/Then require at least one entry'), { statusCode: 400 });
  }
  return { given, when, then };
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let filePath = path.join(FRONTEND_DIR, url.pathname);
  if (url.pathname === '/' || url.pathname === '') {
    filePath = path.join(FRONTEND_DIR, 'index.html');
  }
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.html'
        ? 'text/html; charset=utf-8'
        : ext === '.css'
        ? 'text/css; charset=utf-8'
        : ext === '.js'
        ? 'application/javascript; charset=utf-8'
        : 'application/octet-stream';
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(body);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
}

async function serveUpload(pathname, res) {
  const relative = pathname.replace(/^\/uploads\//, '');
  const filePath = resolveUploadPath(`/uploads/${relative}`);
  if (!filePath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Invalid path');
    return;
  }
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType =
      ext === '.pdf'
        ? 'application/pdf'
        : ext === '.txt'
        ? 'text/plain; charset=utf-8'
        : ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.csv'
        ? 'text/csv; charset=utf-8'
        : ext === '.json'
        ? 'application/json; charset=utf-8'
        : 'application/octet-stream';
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(body);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal server error');
  }
}

async function handleFileUpload(req, res, url) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { message: 'Method not allowed' });
    return;
  }
  const filename = url.searchParams.get('filename');
  if (!filename) {
    sendJson(res, 400, { message: 'filename query parameter is required' });
    return;
  }
  const sanitizedBase = sanitizeFilename(filename) || 'upload';
  const ext = path.extname(sanitizedBase);
  const uniqueName = `${Date.now()}-${randomUUID()}${ext}`;
  const destPath = resolveUploadPath(`/uploads/${uniqueName}`);
  if (!destPath) {
    sendJson(res, 400, { message: 'Invalid filename' });
    return;
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_UPLOAD_SIZE) {
      sendJson(res, 413, { message: 'File too large (max 10MB)' });
      return;
    }
    chunks.push(chunk);
  }
  if (total === 0) {
    sendJson(res, 400, { message: 'Empty file upload' });
    return;
  }
  await writeFile(destPath, Buffer.concat(chunks));
  sendJson(res, 201, {
    url: `/uploads/${uniqueName}`,
    originalName: sanitizedBase,
    size: total,
  });
}

export async function createApp() {
  const db = await ensureDatabase();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;
    const method = req.method ?? 'GET';

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (pathname.startsWith('/uploads/')) {
      await serveUpload(pathname, res);
      return;
    }

    if (pathname === '/api/uploads') {
      await handleFileUpload(req, res, url);
      return;
    }

    if (pathname === '/api/stories' && method === 'GET') {
      const stories = await loadStories(db);
      sendJson(res, 200, stories);
      return;
    }

    if (pathname === '/api/stories' && method === 'POST') {
      try {
        const payload = await parseJson(req);
        const title = String(payload.title ?? '').trim();
        if (!title) {
          throw Object.assign(new Error('Title is required'), { statusCode: 400 });
        }
        const asA = String(payload.asA ?? '').trim();
        const iWant = String(payload.iWant ?? '').trim();
        const soThat = String(payload.soThat ?? '').trim();
        const description = String(payload.description ?? '').trim();
        const storyPoint = normalizeStoryPoint(payload.storyPoint);
        const assigneeEmail = String(payload.assigneeEmail ?? '').trim();
        const parentId = payload.parentId == null ? null : Number(payload.parentId);
        const analysis = await analyzeInvest({
          title,
          asA,
          iWant,
          soThat,
          description,
          storyPoint,
        });
        const warnings = analysis.warnings;
        if (warnings.length > 0 && !payload.acceptWarnings) {
          sendJson(res, 409, {
            code: 'INVEST_WARNINGS',
            message: 'User story does not meet INVEST criteria.',
            warnings,
            analysis: {
              source: analysis.source,
              summary: analysis.summary,
              aiSummary: analysis.ai?.summary || '',
              aiModel: analysis.ai?.model || null,
              usedFallback: analysis.usedFallback,
              error: analysis.ai?.error || null,
              fallbackWarnings: analysis.fallbackWarnings || [],
            },
          });
          return;
        }
        const timestamp = now();
        const statement = db.prepare(
          'INSERT INTO user_stories (mr_id, parent_id, title, description, as_a, i_want, so_that, story_point, assignee_email, status, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
        );
        const { lastInsertRowid } = statement.run(
          parentId,
          title,
          description,
          asA,
          iWant,
          soThat,
          storyPoint,
          assigneeEmail,
          'Draft',
          timestamp,
          timestamp
        );
        const created = flattenStories(await loadStories(db)).find(
          (story) => story.id === Number(lastInsertRowid)
        );
        sendJson(res, 201, created ?? null);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to create story' });
      }
      return;
    }

    const storyIdMatch = pathname.match(/^\/api\/stories\/(\d+)$/);
    if (storyIdMatch && method === 'PATCH') {
      const storyId = Number(storyIdMatch[1]);
      try {
        const payload = await parseJson(req);
        const title = String(payload.title ?? '').trim();
        if (!title) {
          throw Object.assign(new Error('Title is required'), { statusCode: 400 });
        }
        const description = String(payload.description ?? '').trim();
        const assigneeEmail = String(payload.assigneeEmail ?? '').trim();
        const asA = payload.asA != null ? String(payload.asA).trim() : undefined;
        const iWant = payload.iWant != null ? String(payload.iWant).trim() : undefined;
        const soThat = payload.soThat != null ? String(payload.soThat).trim() : undefined;

        const existingStmt = db.prepare('SELECT * FROM user_stories WHERE id = ?');
        const existing = existingStmt.get(storyId);
        if (!existing) {
          throw Object.assign(new Error('Story not found'), { statusCode: 404 });
        }

        const storyPoint =
          payload.storyPoint === undefined ? existing.story_point : normalizeStoryPoint(payload.storyPoint);

        const storyForValidation = {
          title,
          asA: asA ?? existing.as_a,
          iWant: iWant ?? existing.i_want,
          soThat: soThat ?? existing.so_that,
          description: description || existing.description || '',
          storyPoint,
        };
        const analysis = await analyzeInvest(storyForValidation);
        const warnings = analysis.warnings;
        if (warnings.length > 0 && !payload.acceptWarnings) {
          sendJson(res, 409, {
            code: 'INVEST_WARNINGS',
            message: 'User story does not meet INVEST criteria.',
            warnings,
            analysis: {
              source: analysis.source,
              summary: analysis.summary,
              aiSummary: analysis.ai?.summary || '',
              aiModel: analysis.ai?.model || null,
              usedFallback: analysis.usedFallback,
              error: analysis.ai?.error || null,
              fallbackWarnings: analysis.fallbackWarnings || [],
            },
          });
          return;
        }

        const update = db.prepare(
          'UPDATE user_stories SET title = ?, description = ?, story_point = ?, assignee_email = ?, as_a = ?, i_want = ?, so_that = ?, updated_at = ? WHERE id = ?' // prettier-ignore
        );
        update.run(
          title,
          description,
          storyPoint,
          assigneeEmail,
          asA ?? existing.as_a,
          iWant ?? existing.i_want,
          soThat ?? existing.so_that,
          now(),
          storyId
        );
        const updated = flattenStories(await loadStories(db)).find((story) => story.id === storyId);
        sendJson(res, 200, updated ?? null);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to update story' });
      }
      return;
    }

    const recheckMatch = pathname.match(/^\/api\/stories\/(\d+)\/health-check$/);
    if (recheckMatch && method === 'POST') {
      const storyId = Number(recheckMatch[1]);
      try {
        const story = await loadStoryWithDetails(db, storyId);
        if (!story) {
          sendJson(res, 404, { message: 'Story not found' });
          return;
        }
        sendJson(res, 200, story);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to refresh story health' });
      }
      return;
    }

    if (storyIdMatch && method === 'DELETE') {
      const storyId = Number(storyIdMatch[1]);
      const statement = db.prepare('DELETE FROM user_stories WHERE id = ?');
      const result = statement.run(storyId);
      if (result.changes === 0) {
        sendJson(res, 404, { message: 'Story not found' });
      } else {
        sendJson(res, 204, {});
      }
      return;
    }

    const testCreateMatch = pathname.match(/^\/api\/stories\/(\d+)\/tests$/);
    if (testCreateMatch && method === 'POST') {
      const storyId = Number(testCreateMatch[1]);
      try {
        const payload = await parseJson(req);
        const { given, when, then } = measurablePayload(payload);
        const { warnings, suggestions } = measurabilityWarnings(then);
        if (warnings.length > 0 && !payload.acceptWarnings) {
          sendJson(res, 409, {
            code: 'MEASURABILITY_WARNINGS',
            message: 'Then steps must be measurable.',
            warnings,
            suggestions,
          });
          return;
        }
        const allStories = flattenStories(await loadStories(db));
        const story = allStories.find((node) => node.id === storyId);
        if (!story) {
          sendJson(res, 404, { message: 'Story not found' });
          return;
        }
        const desiredTitle = acceptanceTestsHasTitleColumn
          ? String(payload.title ?? '').trim() || `AT-${story.id}-${story.acceptanceTests.length + 1}`
          : '';
        const timestamp = now();
        const { lastInsertRowid } = insertAcceptanceTest(db, {
          storyId,
          title: desiredTitle,
          given,
          when,
          then,
          status: payload.status ? String(payload.status) : 'Draft',
          timestamp,
        });
        const refreshedStory = flattenStories(await loadStories(db)).find((node) => node.id === storyId);
        const created = refreshedStory?.acceptanceTests.find((item) => item.id === Number(lastInsertRowid)) ?? null;
        sendJson(res, 201, created);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to create acceptance test' });
      }
      return;
    }

    const testIdMatch = pathname.match(/^\/api\/tests\/(\d+)$/);
    if (testIdMatch && method === 'PATCH') {
      const testId = Number(testIdMatch[1]);
      try {
        const payload = await parseJson(req);
        const { given, when, then } = measurablePayload(payload);
        const { warnings, suggestions } = measurabilityWarnings(then);
        if (warnings.length > 0 && !payload.acceptWarnings) {
          sendJson(res, 409, {
            code: 'MEASURABILITY_WARNINGS',
            message: 'Then steps must be measurable.',
            warnings,
            suggestions,
          });
          return;
        }
        const statement = db.prepare(
          'UPDATE acceptance_tests SET given = ?, when_step = ?, then_step = ?, status = ?, updated_at = ? WHERE id = ?' // prettier-ignore
        );
        statement.run(
          JSON.stringify(given),
          JSON.stringify(when),
          JSON.stringify(then),
          payload.status ? String(payload.status) : 'Draft',
          now(),
          testId
        );
        const test = flattenStories(await loadStories(db))
          .flatMap((story) => story.acceptanceTests)
          .find((item) => item.id === testId);
        if (!test) {
          sendJson(res, 404, { message: 'Acceptance test not found' });
        } else {
          sendJson(res, 200, test);
        }
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to update acceptance test' });
      }
      return;
    }

    if (testIdMatch && method === 'DELETE') {
      const testId = Number(testIdMatch[1]);
      const statement = db.prepare('DELETE FROM acceptance_tests WHERE id = ?');
      const result = statement.run(testId);
      if (result.changes === 0) {
        sendJson(res, 404, { message: 'Acceptance test not found' });
      } else {
        sendJson(res, 204, {});
      }
      return;
    }

    const docCreateMatch = pathname.match(/^\/api\/stories\/(\d+)\/reference-documents$/);
    if (docCreateMatch && method === 'POST') {
      const storyId = Number(docCreateMatch[1]);
      try {
        const payload = await parseJson(req);
        const name = String(payload.name ?? '').trim();
        const urlValue = String(payload.url ?? '').trim();
        if (!name || !urlValue) {
          throw Object.assign(new Error('Name and URL are required'), { statusCode: 400 });
        }
        if (!isLocalUpload(urlValue)) {
          try {
            const parsed = new URL(urlValue);
            if (!(parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
              throw new Error('Only http(s) URLs are allowed');
            }
          } catch {
            throw Object.assign(new Error('URL must be http(s) or an uploaded document'), {
              statusCode: 400,
            });
          }
        }
        const statement = db.prepare(
          'INSERT INTO reference_documents (story_id, name, url, created_at, updated_at) VALUES (?, ?, ?, ?, ?)' // prettier-ignore
        );
        const timestamp = now();
        const { lastInsertRowid } = statement.run(storyId, name, urlValue, timestamp, timestamp);
        const story = flattenStories(await loadStories(db)).find((node) => node.id === storyId);
        const created = story?.referenceDocuments.find((doc) => doc.id === Number(lastInsertRowid)) ?? null;
        sendJson(res, 201, created);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to create reference document' });
      }
      return;
    }

    const docIdMatch = pathname.match(/^\/api\/reference-documents\/(\d+)$/);
    if (docIdMatch && method === 'DELETE') {
      const docId = Number(docIdMatch[1]);
      const existing = db.prepare('SELECT * FROM reference_documents WHERE id = ?').get(docId);
      if (!existing) {
        sendJson(res, 404, { message: 'Reference document not found' });
      } else {
        const statement = db.prepare('DELETE FROM reference_documents WHERE id = ?');
        statement.run(docId);
        try {
          await removeUploadIfLocal(existing.url);
        } catch (error) {
          console.error('Failed to remove uploaded file', error);
        }
        sendJson(res, 204, {});
      }
      return;
    }

    await serveStatic(req, res);
  });

  server.on('close', () => {
    db.close();
  });

  return server;
}

export async function startServer(port = 4000) {
  const app = await createApp();
  return new Promise((resolve, reject) => {
    app.listen(port, () => resolve(app));
    app.once('error', reject);
  });
}
