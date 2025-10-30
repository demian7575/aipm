import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile, unlink } from 'node:fs/promises';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const SQLITE_COMMAND = process.env.AI_PM_SQLITE_CLI || 'sqlite3';
const CODEX_DEFAULT_DELEGATION_ENDPOINT = 'http://127.0.0.1:5005/delegate';

export const COMPONENT_CATALOG = [
  'WorkModel',
  'Document_Intelligence',
  'Review_Governance',
  'Orchestration_Engagement',
  'Run_Verify',
  'Traceabilty_Insight',
];

const STORY_STATUS_VALUES = ['Draft', 'Ready', 'In Progress', 'Blocked', 'Approved', 'Done'];
const STORY_STATUS_DEFAULT = STORY_STATUS_VALUES[0];

const COMPONENT_LOOKUP = new Map(
  COMPONENT_CATALOG.map((name) => [name.toLowerCase(), name])
);

const UNSPECIFIED_COMPONENT = 'Unspecified';

export const TASK_STATUS_OPTIONS = [
  'Not Started',
  'In Progress',
  'Blocked',
  'Done',
];

const TASK_STATUS_DEFAULT = TASK_STATUS_OPTIONS[0];

const EPIC_STORY_POINT_THRESHOLD = 10;

const STORY_DEPENDENCY_RELATIONSHIPS = ['depends', 'blocks'];
const STORY_DEPENDENCY_DEFAULT = STORY_DEPENDENCY_RELATIONSHIPS[0];

const SQLITE_NO_SUCH_TABLE = /no such table/i;

const PYTHON_SQLITE_EXPORT_SCRIPT = `
import json
import sqlite3
import sys
import datetime
import os
import traceback

target = sys.argv[1]
payload = json.load(sys.stdin)
now = datetime.datetime.utcnow().isoformat(timespec='milliseconds') + 'Z'

tables = payload.get('tables', {})
columns = payload.get('columns', {})

has_title_column = 'title' in columns.get('acceptance_tests', [])

ALLOWED_COMPONENTS = ${JSON.stringify(COMPONENT_CATALOG)}
ALLOWED_LOOKUP = {item.lower(): item for item in ALLOWED_COMPONENTS}

TASK_STATUS_OPTIONS = ${JSON.stringify(TASK_STATUS_OPTIONS)}
TASK_STATUS_LOOKUP = {item.lower(): item for item in TASK_STATUS_OPTIONS}


def normalize_text(value, default=''):
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def normalize_int(value, default=None):
    if value is None or value == '':
        return default
    try:
        return int(value)
    except Exception:
        try:
            return int(float(value))
        except Exception:
            return default


def normalize_timestamp(primary, fallback):
    value = normalize_text(primary, '')
    if value:
        return value
    value = normalize_text(fallback, '')
    if value:
        return value
    return now


def normalize_components(value):
    entries = []
    if isinstance(value, list):
        entries.extend(normalize_text(item, '') for item in value)
    text = normalize_text(value, '')
    if text:
        try:
            parsed = json.loads(text)
            if isinstance(parsed, list):
                entries.extend(normalize_text(item, '') for item in parsed)
        except Exception:
            normalized_text = text.replace(',', chr(10)).replace(';', chr(10))
            for chunk in normalized_text.splitlines():
                entry = normalize_text(chunk, '')
                if entry:
                    entries.append(entry)
    normalized = []
    seen = set()
    for entry in entries:
        key = entry.lower()
        canonical = ALLOWED_LOOKUP.get(key)
        if canonical and canonical not in seen:
            seen.add(canonical)
            normalized.append(canonical)
    return json.dumps(normalized)


def normalize_task_status(value):
    text = normalize_text(value, '')
    if not text:
        return TASK_STATUS_OPTIONS[0]
    lookup = TASK_STATUS_LOOKUP.get(text.lower())
    if lookup:
        return lookup
    return TASK_STATUS_OPTIONS[0]


def normalize_task_estimation(value):
    text = normalize_text(value, '')
    if not text:
        return None
    try:
        number = float(text)
    except Exception:
        return None
    if number < 0:
        return None
    return number


def normalize_task_assignee(value, fallback='owner@example.com'):
    text = normalize_text(value, '')
    if text:
        return text
    return fallback


try:
    conn = sqlite3.connect(target)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS user_stories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mr_id INTEGER DEFAULT 1,
          parent_id INTEGER,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          as_a TEXT DEFAULT '',
          i_want TEXT DEFAULT '',
          so_that TEXT DEFAULT '',
          components TEXT DEFAULT '[]',
          story_point INTEGER,
          assignee_email TEXT DEFAULT '',
          status TEXT DEFAULT 'Draft',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(parent_id) REFERENCES user_stories(id) ON DELETE CASCADE
        );
        """
    )

    if has_title_column:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS acceptance_tests (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              story_id INTEGER NOT NULL,
              title TEXT DEFAULT '',
              given TEXT NOT NULL,
              when_step TEXT NOT NULL,
              then_step TEXT NOT NULL,
              status TEXT DEFAULT 'Draft',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
            );
            """
        )
    else:
        conn.execute(
            """
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
            """
        )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS reference_documents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          story_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
        );
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          story_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          status TEXT DEFAULT 'Not Started',
          assignee_email TEXT NOT NULL,
          estimation_hours REAL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
        );
        """
    )

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS story_dependencies (
          story_id INTEGER NOT NULL,
          depends_on_story_id INTEGER NOT NULL,
          relationship TEXT DEFAULT 'depends',
          PRIMARY KEY (story_id, depends_on_story_id),
          FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE,
          FOREIGN KEY(depends_on_story_id) REFERENCES user_stories(id) ON DELETE CASCADE
        );
        """
    )

    story_rows = []
    for row in tables.get('user_stories', []):
        story_rows.append(
            (
                normalize_int(row.get('id'), 0),
                normalize_int(row.get('mr_id'), 1) or 1,
                normalize_int(row.get('parent_id')),
                normalize_text(row.get('title'), ''),
                normalize_text(row.get('description'), ''),
                normalize_text(row.get('as_a'), ''),
                normalize_text(row.get('i_want'), ''),
                normalize_text(row.get('so_that'), ''),
                normalize_components(row.get('components')),
                normalize_int(row.get('story_point')),
                normalize_text(row.get('assignee_email'), ''),
                normalize_text(row.get('status'), 'Draft'),
                normalize_timestamp(row.get('created_at'), row.get('updated_at')),
                normalize_timestamp(row.get('updated_at'), row.get('created_at')),
            )
        )

    if story_rows:
        conn.executemany(
            """
            INSERT INTO user_stories (
              id, mr_id, parent_id, title, description, as_a, i_want, so_that, components,
              story_point, assignee_email, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            story_rows,
        )

    test_rows = []
    for row in tables.get('acceptance_tests', []):
        base = [normalize_int(row.get('id'), 0), normalize_int(row.get('story_id'))]
        if has_title_column:
            base.append(normalize_text(row.get('title'), ''))
        base.extend(
            [
                normalize_text(row.get('given'), '[]'),
                normalize_text(row.get('when_step'), '[]'),
                normalize_text(row.get('then_step'), '[]'),
                normalize_text(row.get('status'), 'Draft'),
                normalize_timestamp(row.get('created_at'), row.get('updated_at')),
                normalize_timestamp(row.get('updated_at'), row.get('created_at')),
            ]
        )
        test_rows.append(tuple(base))

    if test_rows:
        if has_title_column:
            conn.executemany(
                """
                INSERT INTO acceptance_tests (
                  id, story_id, title, given, when_step, then_step, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                test_rows,
            )
        else:
            conn.executemany(
                """
                INSERT INTO acceptance_tests (
                  id, story_id, given, when_step, then_step, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                test_rows,
            )

    doc_rows = []
    for row in tables.get('reference_documents', []):
        doc_rows.append(
            (
                normalize_int(row.get('id'), 0),
                normalize_int(row.get('story_id')),
                normalize_text(row.get('name'), ''),
                normalize_text(row.get('url'), ''),
                normalize_timestamp(row.get('created_at'), row.get('updated_at')),
                normalize_timestamp(row.get('updated_at'), row.get('created_at')),
            )
        )

    if doc_rows:
        conn.executemany(
            """
            INSERT INTO reference_documents (
              id, story_id, name, url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            doc_rows,
        )

    task_rows = []
    for row in tables.get('tasks', []):
        task_rows.append(
            (
                normalize_int(row.get('id'), 0),
                normalize_int(row.get('story_id')),
                normalize_text(row.get('title'), ''),
                normalize_text(row.get('description'), ''),
                normalize_task_status(row.get('status')),
                normalize_task_assignee(row.get('assignee_email')),
                normalize_task_estimation(row.get('estimation_hours')),
                normalize_timestamp(row.get('created_at'), row.get('updated_at')),
                normalize_timestamp(row.get('updated_at'), row.get('created_at')),
            )
        )

    if task_rows:
        conn.executemany(
            """
            INSERT INTO tasks (
              id, story_id, title, description, status, assignee_email, estimation_hours, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            task_rows,
        )

    dependency_rows = []
    for row in tables.get('story_dependencies', []):
        dependency_rows.append(
            (
                normalize_int(row.get('story_id')),
                normalize_int(row.get('depends_on_story_id')),
                normalize_text(row.get('relationship'), 'depends'),
            )
        )

    if dependency_rows:
        conn.executemany(
            """
            INSERT INTO story_dependencies (story_id, depends_on_story_id, relationship)
            VALUES (?, ?, ?)
            """,
            dependency_rows,
        )

    conn.commit()
    conn.close()
except Exception as exc:
    try:
        conn.close()
    except Exception:
        pass
    if os.path.exists(target):
        os.remove(target)
    traceback.print_exc()
    sys.exit(1)
`;

function createSqliteBinarySnapshot(snapshot) {
  const tempPath = path.join(
    os.tmpdir(),
    `aipm-sqlite-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`
  );
  const result = spawnSync('python3', ['-c', PYTHON_SQLITE_EXPORT_SCRIPT, tempPath], {
    input: Buffer.from(JSON.stringify(snapshot), 'utf8'),
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? String(result.stderr).trim() : 'Unknown error';
    const error = new Error(`Failed to generate SQLite snapshot via python3: ${stderr}`);
    error.stderr = stderr;
    throw error;
  }

  try {
    const buffer = readFileSync(tempPath);
    unlinkSync(tempPath);
    return buffer;
  } catch (error) {
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }
    throw error;
  }
}

async function exportRuntimeDataBuffer(db) {
  if (db && typeof db.exportRuntimeSnapshot === 'function') {
    const snapshot = await db.exportRuntimeSnapshot();
    return Buffer.isBuffer(snapshot) ? snapshot : Buffer.from(snapshot);
  }

  return readFile(DATABASE_PATH);
}

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
    'components',
    'story_point',
    'assignee_email',
    'status',
    'created_at',
    'updated_at',
  ],
  acceptance_tests: ['id', 'story_id', 'given', 'when_step', 'then_step', 'status', 'created_at', 'updated_at'],
  reference_documents: ['id', 'story_id', 'name', 'url', 'created_at', 'updated_at'],
  tasks: ['id', 'story_id', 'title', 'description', 'status', 'assignee_email', 'estimation_hours', 'created_at', 'updated_at'],
  story_dependencies: ['story_id', 'depends_on_story_id', 'relationship'],
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
      tasks: [],
      story_dependencies: [],
    };
    this.sequences = {
      user_stories: 0,
      acceptance_tests: 0,
      reference_documents: 0,
      tasks: 0,
      story_dependencies: 0,
    };
    this.columns = JSON.parse(JSON.stringify(DEFAULT_COLUMNS));
    this.driver = 'json-fallback';
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
            this.tables.tasks = data.tables.tasks ?? [];
            this.tables.story_dependencies = data.tables.story_dependencies ?? [];
          }
          if (data.sequences) {
            this.sequences = {
              user_stories: data.sequences.user_stories ?? this._maxId(this.tables.user_stories),
              acceptance_tests:
                data.sequences.acceptance_tests ?? this._maxId(this.tables.acceptance_tests),
              reference_documents:
                data.sequences.reference_documents ?? this._maxId(this.tables.reference_documents),
              tasks: data.sequences.tasks ?? this._maxId(this.tables.tasks),
              story_dependencies: data.sequences.story_dependencies ?? 0,
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
              tasks: data.columns.tasks ?? this.columns.tasks,
              story_dependencies: data.columns.story_dependencies ?? this.columns.story_dependencies,
            };
          }
        }
      } else {
        this._persist();
        return;
      }
      this._writeSqliteMirror();
    } catch {
      this._refreshSequences();
      this._writeSqliteMirror();
    }
  }

  _refreshSequences() {
    this.sequences.user_stories = this._maxId(this.tables.user_stories);
    this.sequences.acceptance_tests = this._maxId(this.tables.acceptance_tests);
    this.sequences.reference_documents = this._maxId(this.tables.reference_documents);
    this.sequences.tasks = this._maxId(this.tables.tasks);
    this.sequences.story_dependencies = 0;
  }

  _maxId(rows) {
    return rows.reduce((max, row) => (row.id > max ? row.id : max), 0);
  }

  _snapshot() {
    return {
      tables: {
        user_stories: this.tables.user_stories.map((row) => ({ ...row })),
        acceptance_tests: this.tables.acceptance_tests.map((row) => ({ ...row })),
        reference_documents: this.tables.reference_documents.map((row) => ({ ...row })),
        tasks: this.tables.tasks.map((row) => ({ ...row })),
        story_dependencies: this.tables.story_dependencies.map((row) => ({ ...row })),
      },
      sequences: { ...this.sequences },
      columns: {
        user_stories: [...(this.columns.user_stories ?? [])],
        acceptance_tests: [...(this.columns.acceptance_tests ?? [])],
        reference_documents: [...(this.columns.reference_documents ?? [])],
        tasks: [...(this.columns.tasks ?? [])],
        story_dependencies: [...(this.columns.story_dependencies ?? [])],
      },
      driver: 'json-fallback',
    };
  }

  _writeSqliteMirror() {
    const snapshot = this._snapshot();
    try {
      mkdirSync(path.dirname(this.sqlitePath), { recursive: true });
      const buffer = createSqliteBinarySnapshot(snapshot);
      writeFileSync(this.sqlitePath, buffer);
    } catch (error) {
      const message =
        'Failed to mirror JSON database to SQLite format. Ensure python3 with sqlite3 support is available.';
      const wrapped = new Error(`${message} ${error.message ?? ''}`.trim());
      wrapped.cause = error;
      throw wrapped;
    }
  }

  _persist() {
    mkdirSync(path.dirname(this.jsonPath), { recursive: true });
    const snapshot = this._snapshot();
    const serialized = JSON.stringify(snapshot, null, 2);
    writeFileSync(this.jsonPath, serialized, 'utf8');
    this._writeSqliteMirror();
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
    if (normalized.includes("UPDATE user_stories SET components = '[]'")) {
      this._setDefault('user_stories', 'components', '[]');
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
    if (normalized.includes('UPDATE tasks SET description =')) {
      this._setDefault('tasks', 'description', '');
      return;
    }
    if (normalized.includes('UPDATE tasks SET status =')) {
      this._setDefault('tasks', 'status', TASK_STATUS_DEFAULT);
      return;
    }
    if (normalized.includes('UPDATE tasks SET assignee_email =')) {
      this._setDefault('tasks', 'assignee_email', 'owner@example.com');
      return;
    }
    const deleteMatch = normalized.match(/^DELETE FROM (\w+)(?:\s+WHERE\s+(.+))?$/i);
    if (deleteMatch) {
      const [, table, whereClause] = deleteMatch;
      if (!whereClause || /^1\s*=\s*1$/i.test(whereClause)) {
        this._truncateTable(table);
        return;
      }
    }
  }

  _truncateTable(table) {
    const key = table?.toLowerCase();
    if (!key || !(key in this.tables)) {
      return;
    }
    if (key === 'user_stories') {
      const hadRows = Array.isArray(this.tables.user_stories) && this.tables.user_stories.length > 0;
      this.tables.user_stories = [];
      this.tables.acceptance_tests = [];
      this.tables.reference_documents = [];
      this.tables.tasks = [];
      this.tables.story_dependencies = [];
      if (hadRows) {
        this._refreshSequences();
      }
      return;
    }
    this.tables[key] = [];
    if (Object.prototype.hasOwnProperty.call(this.sequences, key)) {
      this.sequences[key] = 0;
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

  exportRuntimeSnapshot() {
    this._writeSqliteMirror();
    return readFileSync(this.sqlitePath);
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
    if (sql.startsWith('SELECT id FROM user_stories WHERE id = ?')) {
      const id = Number(params[0]);
      const row = this.tables.user_stories.find((entry) => entry.id === id);
      return row ? [{ id: row.id }] : [];
    }
    if (sql.startsWith('SELECT * FROM reference_documents WHERE id = ?')) {
      const id = Number(params[0]);
      const row = this.tables.reference_documents.find((entry) => entry.id === id);
      return row ? [this._clone(row)] : [];
    }
    if (sql.startsWith('SELECT * FROM tasks WHERE id = ?')) {
      const id = Number(params[0]);
      const row = this.tables.tasks.find((entry) => entry.id === id);
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
    if (sql.startsWith('SELECT id, title, status FROM user_stories WHERE id IN (')) {
      const ids = params.map(Number);
      const result = this.tables.user_stories
        .filter((row) => ids.includes(row.id))
        .map((row) => ({ id: row.id, title: row.title, status: row.status }));
      result.sort((a, b) => a.id - b.id);
      return result;
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
    if (sql.startsWith('SELECT story_id, depends_on_story_id, relationship FROM story_dependencies ORDER BY')) {
      const rows = this.tables.story_dependencies.map((row) => ({ ...row }));
      rows.sort((a, b) => {
        if (a.story_id !== b.story_id) {
          return a.story_id - b.story_id;
        }
        return a.depends_on_story_id - b.depends_on_story_id;
      });
      return rows;
    }
    if (sql.startsWith('SELECT relationship FROM story_dependencies WHERE story_id = ? AND depends_on_story_id = ?')) {
      const storyId = Number(params[0]);
      const dependsOnId = Number(params[1]);
      const row = this.tables.story_dependencies.find(
        (entry) => entry.story_id === storyId && entry.depends_on_story_id === dependsOnId
      );
      return row ? [{ relationship: row.relationship }] : [];
    }
    if (sql.startsWith('SELECT * FROM tasks WHERE story_id = ?')) {
      const storyId = Number(params[0]);
      const rows = this.tables.tasks
        .filter((row) => row.story_id === storyId)
        .map((row) => this._clone(row));
      rows.sort((a, b) => a.id - b.id);
      return rows;
    }
    if (sql.startsWith('SELECT * FROM tasks ORDER BY')) {
      const rows = this.tables.tasks.map((row) => this._clone(row));
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
    const insertMatch = sql.match(/^INSERT(?: OR IGNORE)? INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)$/i);
    if (insertMatch) {
      const [, table, columnList, valueList] = insertMatch;
      const orIgnore = /^INSERT OR IGNORE/i.test(sql);
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
      if (!('id' in row) && this.columns[table]?.includes('id')) {
        row.id = this._generateId(table);
      } else if ('id' in row) {
        row.id = Number(row.id);
        this.sequences[table] = Math.max(this.sequences[table] ?? 0, row.id);
      }
      this._applyInsertDefaults(table, row);
      const nowRow = this.tables[table];
      if (table === 'story_dependencies') {
        const storyId = Number(row.story_id);
        const dependsOnId = Number(row.depends_on_story_id);
        const existing = Array.isArray(nowRow)
          ? nowRow.find((entry) => entry.story_id === storyId && entry.depends_on_story_id === dependsOnId)
          : null;
        if (existing) {
          if (!orIgnore) {
            existing.relationship = row.relationship ?? existing.relationship;
            this._persist();
            return { changes: 1, lastInsertRowid: 0 };
          }
          return { changes: 0, lastInsertRowid: 0 };
        }
      }
      if (Array.isArray(nowRow)) {
        nowRow.push(row);
      }
      this._persist();
      return { changes: 1, lastInsertRowid: row.id ?? 0 };
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
    if (sql.startsWith('UPDATE tasks SET')) {
      return this._updateRow('tasks', sql, params);
    }
    if (sql.startsWith('UPDATE story_dependencies SET relationship = ? WHERE story_id = ? AND depends_on_story_id = ?')) {
      const [relationship, storyId, dependsOnId] = params;
      const rows = this.tables.story_dependencies;
      if (!Array.isArray(rows)) {
        return { changes: 0, lastInsertRowid: 0 };
      }
      const target = rows.find(
        (entry) => entry.story_id === Number(storyId) && entry.depends_on_story_id === Number(dependsOnId)
      );
      if (!target) {
        return { changes: 0, lastInsertRowid: 0 };
      }
      target.relationship = relationship ?? target.relationship;
      this._persist();
      return { changes: 1, lastInsertRowid: 0 };
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
    if (sql.startsWith('DELETE FROM tasks WHERE id = ?')) {
      return this._deleteRow('tasks', params[0]);
    }
    if (sql.startsWith('DELETE FROM story_dependencies WHERE story_id = ? AND depends_on_story_id = ?')) {
      const [storyId, dependsOnId] = params.map(Number);
      const rows = this.tables.story_dependencies;
      if (!Array.isArray(rows)) {
        return { changes: 0, lastInsertRowid: 0 };
      }
      const originalLength = rows.length;
      this.tables.story_dependencies = rows.filter(
        (entry) => !(entry.story_id === storyId && entry.depends_on_story_id === dependsOnId)
      );
      const changes = originalLength - this.tables.story_dependencies.length;
      if (changes > 0) {
        this._persist();
      }
      return { changes, lastInsertRowid: 0 };
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
      this.tables.tasks = this.tables.tasks.filter((task) => !targetSet.has(task.story_id));
      this.tables.story_dependencies = this.tables.story_dependencies.filter(
        (link) => !targetSet.has(link.story_id) && !targetSet.has(link.depends_on_story_id)
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
    if (key === 'components') {
      if (Array.isArray(value)) {
        return JSON.stringify(value);
      }
      if (value == null) {
        return '[]';
      }
      if (typeof value === 'string') {
        return value;
      }
      return JSON.stringify([String(value)]);
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
      if (!('components' in row) || row.components == null) row.components = '[]';
      if (!('assignee_email' in row) || row.assignee_email == null) row.assignee_email = '';
    } else if (table === 'acceptance_tests') {
      if (!('status' in row) || row.status == null) row.status = 'Draft';
      if (!('created_at' in row)) row.created_at = now();
      if (!('updated_at' in row)) row.updated_at = now();
    } else if (table === 'reference_documents') {
      if (!('name' in row) || row.name == null) row.name = '';
      if (!('url' in row) || row.url == null) row.url = '';
    } else if (table === 'tasks') {
      if (!('status' in row) || row.status == null) row.status = TASK_STATUS_DEFAULT;
      if (!('description' in row) || row.description == null) row.description = '';
      if (!('assignee_email' in row) || row.assignee_email == null || row.assignee_email === '') {
        row.assignee_email = 'owner@example.com';
      }
      if (!('created_at' in row)) row.created_at = now();
      if (!('updated_at' in row)) row.updated_at = now();
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

const ACCEPTANCE_TEST_STATUS_DRAFT = 'Draft';
const ACCEPTANCE_TEST_STATUS_REVIEW = 'Need review with update';

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
  const combinedText = [
    story.title,
    story.description,
    story.asA,
    story.iWant,
    story.soThat,
    ...(Array.isArray(story.components) ? story.components : []),
  ]
    .filter(Boolean)
    .join(' ');

  let numericStoryPoint = Number.NaN;
  if (typeof story.storyPoint === 'number') {
    numericStoryPoint = Number.isFinite(story.storyPoint) ? story.storyPoint : Number.NaN;
  } else if (typeof story.storyPoint === 'string') {
    const trimmed = story.storyPoint.trim();
    if (trimmed) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        numericStoryPoint = parsed;
      }
    }
  }
  const hasStoryPointEstimate = Number.isFinite(numericStoryPoint);
  const epicStory = hasStoryPointEstimate && numericStoryPoint > EPIC_STORY_POINT_THRESHOLD;

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

  if (hasStoryPointEstimate && numericStoryPoint >= 13 && !epicStory) {
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
      suggestion:
        'Pair acceptance tests with observable or measurable outcomes (e.g., confirmation messages, status changes, or performance targets) for each Then step.',
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
        details: 'INVEST “Testable” expects observable or measurable acceptance criteria so the team can validate delivery.',
        suggestion: 'Capture a Given/When/Then scenario covering the expected behaviour.',
      });
    } else {
      const unresolved = tests.flatMap((test) => (test.gwtHealth?.issues ?? []));
      if (unresolved.length > 0) {
        warnings.push({
          criterion: 'testable',
          message: 'Resolve Given/When/Then gaps in acceptance tests.',
          details: 'Some acceptance tests have ambiguous or incomplete steps that block verification.',
          suggestion: 'Edit the failing scenarios to remove ambiguity and include observable outcomes or quantitative targets.',
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

function normalizeStoryStatus(value) {
  if (value == null) {
    return STORY_STATUS_DEFAULT;
  }
  const text = String(value).trim();
  if (!text) {
    return STORY_STATUS_DEFAULT;
  }
  const match = STORY_STATUS_VALUES.find((status) => status.toLowerCase() === text.toLowerCase());
  if (!match) {
    const error = new Error(`Story status must be one of: ${STORY_STATUS_VALUES.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
  return match;
}

function safeNormalizeStoryStatus(value) {
  try {
    return normalizeStoryStatus(value);
  } catch (error) {
    return STORY_STATUS_DEFAULT;
  }
}

function normalizeTaskStatus(value) {
  if (value == null) {
    return TASK_STATUS_DEFAULT;
  }
  const text = String(value).trim();
  if (!text) {
    return TASK_STATUS_DEFAULT;
  }
  const match = TASK_STATUS_OPTIONS.find((option) => option.toLowerCase() === text.toLowerCase());
  if (!match) {
    const error = new Error(`Task status must be one of: ${TASK_STATUS_OPTIONS.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
  return match;
}

function normalizeTaskEstimationHours(value) {
  if (value == null || value === '') {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    const error = new Error('Estimation hours must be a number');
    error.statusCode = 400;
    throw error;
  }
  if (numeric < 0) {
    const error = new Error('Estimation hours cannot be negative');
    error.statusCode = 400;
    throw error;
  }
  return numeric;
}

function readCodexDelegationConfig(overrides = {}) {
  const envEndpoint =
    typeof process.env.AI_PM_CODEX_DELEGATION_URL === 'string'
      ? process.env.AI_PM_CODEX_DELEGATION_URL.trim()
      : '';
  const envProjectUrl =
    typeof process.env.AI_PM_CODEX_PROJECT_URL === 'string'
      ? process.env.AI_PM_CODEX_PROJECT_URL.trim()
      : '';
  const envToken =
    typeof process.env.AI_PM_CODEX_DELEGATION_TOKEN === 'string'
      ? process.env.AI_PM_CODEX_DELEGATION_TOKEN.trim()
      : '';

  const overrideEndpoint =
    typeof overrides.endpoint === 'string' ? overrides.endpoint.trim() : '';
  const overrideProjectUrl =
    typeof overrides.projectUrl === 'string' ? overrides.projectUrl.trim() : '';
  const overrideToken = typeof overrides.token === 'string' ? overrides.token.trim() : '';

  const endpoint = overrideEndpoint || envEndpoint || CODEX_DEFAULT_DELEGATION_ENDPOINT;

  return {
    endpoint,
    projectUrl: overrideProjectUrl || envProjectUrl,
    token: overrideToken || envToken,
  };
}

function buildDelegationStoryPayload(story) {
  if (!story || typeof story !== 'object') {
    return null;
  }
  const payload = {
    id: story.id,
    mrId: story.mrId,
    parentId: story.parentId,
    title: story.title || '',
    description: story.description || '',
    asA: story.asA || story.as_a || '',
    iWant: story.iWant || story.i_want || '',
    soThat: story.soThat || story.so_that || '',
    components: Array.isArray(story.components) ? [...story.components] : [],
    storyPoint: story.storyPoint ?? null,
    status: story.status || '',
    assigneeEmail: story.assigneeEmail || story.assignee_email || '',
    acceptanceTests: [],
    tasks: [],
    referenceDocuments: Array.isArray(story.referenceDocuments)
      ? story.referenceDocuments.map((doc) => ({
          id: doc.id,
          name: doc.name || '',
          url: doc.url || '',
        }))
      : [],
  };

  if (Array.isArray(story.acceptanceTests)) {
    payload.acceptanceTests = story.acceptanceTests.map((test) => ({
      id: test.id,
      title: test.title || '',
      given: Array.isArray(test.given) ? [...test.given] : [],
      when: Array.isArray(test.when) ? [...test.when] : [],
      then: Array.isArray(test.then) ? [...test.then] : [],
      status: test.status || '',
    }));
  }

  if (Array.isArray(story.tasks)) {
    payload.tasks = story.tasks.map((task) => ({
      id: task.id,
      title: task.title || '',
      description: task.description || '',
      status: task.status || '',
      assigneeEmail: task.assigneeEmail || task.assignee_email || '',
      estimationHours:
        task.estimationHours ?? task.estimation_hours ?? task.estimation ?? null,
    }));
  }

  return payload;
}

function normalizeDelegationResponse(value) {
  if (!value || typeof value !== 'object') {
    return {
      pullRequestUrl: '',
      pullRequestNumber: null,
      status: '',
      branchName: '',
      message: '',
      metadata: value,
    };
  }

  const metadata = value;
  const pullRequestUrl = [
    value.pullRequestUrl,
    value.prUrl,
    value.pull_request_url,
    value.htmlUrl,
    value.html_url,
    metadata.pullRequest && metadata.pullRequest.htmlUrl,
    metadata.pullRequest && metadata.pullRequest.url,
  ].find((entry) => typeof entry === 'string' && entry.trim().length > 0);

  const numberCandidates = [
    value.pullRequestNumber,
    value.prNumber,
    value.pull_request_number,
    metadata.pullRequest && metadata.pullRequest.number,
    metadata.number,
  ];
  let pullRequestNumber = null;
  for (const candidate of numberCandidates) {
    if (candidate == null || candidate === '') {
      continue;
    }
    const numeric = Number(candidate);
    if (Number.isInteger(numeric)) {
      pullRequestNumber = numeric;
      break;
    }
  }

  const status = [
    value.status,
    value.state,
    metadata.status,
    metadata.state,
    metadata.pullRequest && metadata.pullRequest.status,
    metadata.pullRequest && metadata.pullRequest.state,
  ].find((entry) => typeof entry === 'string' && entry.trim().length > 0);

  const branchName = [
    value.branchName,
    value.branch,
    value.headRef,
    value.headRefName,
    metadata.branchName,
    metadata.branch,
    metadata.headRef,
    metadata.headRefName,
    metadata.pullRequest && metadata.pullRequest.headRefName,
  ].find((entry) => typeof entry === 'string' && entry.trim().length > 0);

  const message = [
    value.message,
    value.summary,
    metadata.message,
    metadata.summary,
    metadata.statusMessage,
  ].find((entry) => typeof entry === 'string' && entry.trim().length > 0);

  return {
    pullRequestUrl: pullRequestUrl ? pullRequestUrl.trim() : '',
    pullRequestNumber,
    status: status ? status.trim() : '',
    branchName: branchName ? branchName.trim() : '',
    message: message ? message.trim() : '',
    metadata,
  };
}

async function delegateImplementationToCodex(story, options) {
  if (!options || typeof options !== 'object') {
    throw Object.assign(new Error('Delegation options are required'), { statusCode: 400 });
  }
  const endpoint = typeof options.endpoint === 'string' ? options.endpoint.trim() : '';
  if (!endpoint) {
    const error = new Error('Codex delegation endpoint is not configured');
    error.statusCode = 503;
    throw error;
  }

  const body = {
    repositoryUrl: options.repositoryUrl,
    prTitle: options.prTitle,
    prBody: options.prBody,
    story: buildDelegationStoryPayload(story),
    metadata: {
      source: 'aipm',
      storyId: story?.id ?? null,
      storyStatus: story?.status ?? null,
      submittedAt: now(),
    },
  };
  if (options.prTitleTemplate) {
    body.prTitleTemplate = options.prTitleTemplate;
  }
  if (options.prBodyTemplate) {
    body.prBodyTemplate = options.prBodyTemplate;
  }
  if (options.branchName) {
    body.branchName = options.branchName;
  }
  if (options.projectUrl) {
    body.projectUrl = options.projectUrl;
  }

  const headers = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
  } catch (error) {
    const networkCode =
      (error && typeof error === 'object' && 'code' in error && error.code) ||
      (error && typeof error === 'object' && 'cause' in error && error.cause && error.cause.code);

    let message = 'Failed to contact Codex delegation server';
    let statusCode = 502;
    if (networkCode && typeof networkCode === 'string') {
      const normalized = networkCode.toUpperCase();
      if (['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN', 'EHOSTUNREACH'].includes(normalized)) {
        message = `Unable to reach Codex delegation server at ${endpoint}. Confirm the service is running or update the delegation URL.`;
        statusCode = 503;
      }
    }

    const requestError = new Error(message);
    requestError.cause = error;
    requestError.statusCode = statusCode;
    requestError.details = { endpoint, code: networkCode };
    throw requestError;
  }

  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(
      payload && typeof payload.message === 'string'
        ? payload.message
        : `Codex delegation failed with status ${response.status}`
    );
    error.statusCode = response.status;
    if (payload && typeof payload === 'object') {
      error.details = payload;
    }
    throw error;
  }

  return normalizeDelegationResponse(payload);
}

function normalizeDependencyRelationship(value) {
  if (value == null) {
    return STORY_DEPENDENCY_DEFAULT;
  }
  const text = String(value).trim().toLowerCase();
  if (!text) {
    return STORY_DEPENDENCY_DEFAULT;
  }
  const match = STORY_DEPENDENCY_RELATIONSHIPS.find((entry) => entry === text);
  return match || STORY_DEPENDENCY_DEFAULT;
}

function normalizeComponentsInput(value, options = {}) {
  const { strict = false } = options;
  let entries = [];
  if (Array.isArray(value)) {
    entries = value.map((entry) => String(entry).trim());
  } else if (value == null) {
    entries = [];
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          entries = parsed.map((entry) => String(entry).trim());
        } else {
          entries = [];
        }
      } catch {
        entries = trimmed.split(/[\n,;]+/).map((entry) => entry.trim());
      }
    }
  } else {
    entries = [String(value).trim()];
  }

  const seen = new Set();
  const normalized = [];
  const invalid = [];

  entries
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .forEach((entry) => {
      const canonical = COMPONENT_LOOKUP.get(entry.toLowerCase());
      if (canonical) {
        if (!seen.has(canonical)) {
          seen.add(canonical);
          normalized.push(canonical);
        }
      } else {
        invalid.push(entry);
      }
    });

  if (strict && invalid.length) {
    const error = new Error(
      `Components must be chosen from: ${COMPONENT_CATALOG.join(', ')}`
    );
    error.code = 'INVALID_COMPONENTS';
    error.details = { invalid, allowed: COMPONENT_CATALOG };
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function serializeComponents(components) {
  return JSON.stringify(Array.isArray(components) ? components : []);
}

function collapseWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanFragment(value) {
  const collapsed = collapseWhitespace(value);
  return collapsed.replace(/^[\s,.;:!?-]+/, '').replace(/[\s,.;:!?]+$/, '');
}

function sentenceFragment(value) {
  const cleaned = cleanFragment(value);
  if (!cleaned) {
    return '';
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function ensureSentence(value) {
  const fragment = cleanFragment(value);
  if (!fragment) {
    return '';
  }
  const sentence = fragment.charAt(0).toUpperCase() + fragment.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function limitLength(value, maxLength) {
  const text = String(value ?? '');
  if (text.length <= maxLength) {
    return text;
  }
  const truncated = text.slice(0, Math.max(0, maxLength - 1)).trimEnd();
  return `${truncated}…`;
}

function toStoryTitle(value) {
  const fragment = cleanFragment(value);
  if (!fragment) {
    return 'New User Story';
  }
  const words = fragment.split(/\s+/).map((word) => {
    if (/^[A-Z0-9]+$/.test(word)) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  const title = words.join(' ');
  return limitLength(title, 120);
}

function cleanupPersona(value) {
  let persona = cleanFragment(value)
    .replace(/^(?:the|a|an|my|our)\s+/i, '')
    .trim();
  if (!persona) {
    return '';
  }
  return sentenceFragment(persona);
}

function cleanupGoal(value) {
  let goal = cleanFragment(value);
  goal = goal.replace(/^to\s+/i, '').replace(/^that\s+/i, '');
  return goal.trim();
}

function cleanupBenefit(value) {
  return cleanFragment(value);
}

function parseIdeaSegments(text) {
  const normalized = collapseWhitespace(text);
  const result = { persona: '', goal: '', benefit: '' };
  if (!normalized) {
    return result;
  }

  const personaPattern = /\bas\s+(?:an?\s+)?([^,.;]+?)\s*,?\s*i\s+want\s+(.*?)(?:\s*(?:,|\s)+so\s+that\s+(.+))?$/i;
  const match = normalized.match(personaPattern);
  if (match) {
    result.persona = match[1] ?? '';
    result.goal = match[2] ?? '';
    result.benefit = match[3] ?? '';
    return result;
  }

  const lower = normalized.toLowerCase();
  const soIndex = lower.indexOf(' so that ');
  if (soIndex >= 0) {
    result.goal = normalized.slice(0, soIndex);
    result.benefit = normalized.slice(soIndex + 9);
  } else {
    result.goal = normalized;
  }

  if (!result.persona) {
    const forMatch = normalized.match(/\bfor\s+(?:the\s+)?([a-z][^,.;]+)/i);
    if (forMatch) {
      result.persona = forMatch[1] ?? '';
    }
  }

  return result;
}

function lowercaseSentenceFragment(value) {
  const fragment = sentenceFragment(value);
  if (!fragment) {
    return '';
  }
  return fragment.charAt(0).toLowerCase() + fragment.slice(1);
}

function formatComponentSentence(components) {
  const valid = (Array.isArray(components) ? components : [])
    .map((component) => String(component || '').trim())
    .filter((component) => component && component !== UNSPECIFIED_COMPONENT);
  if (valid.length === 0) {
    return '';
  }
  const readable = valid.map((component) => {
    const spaced = component
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2');
    return toStoryTitle(spaced);
  });
  const [last] = readable.slice(-1);
  const initial = readable.slice(0, -1);
  const list = initial.length ? `${initial.join(', ')} and ${last}` : last;
  const suffix = readable.length > 1 ? 'components' : 'component';
  return ensureSentence(`Focus on the ${list} ${suffix}.`);
}

function deriveStoryTitleFromSegments(segments, normalized) {
  const goal = cleanupGoal(segments.goal);
  if (goal) {
    return toStoryTitle(goal);
  }
  let candidate = collapseWhitespace(normalized);
  candidate = candidate.replace(
    /^as\s+(?:an?\s+)?[^,.;]+?,?\s*i\s+(?:want|need)\s+/i,
    ''
  );
  const soIndex = candidate.toLowerCase().indexOf(' so that ');
  if (soIndex >= 0) {
    candidate = candidate.slice(0, soIndex);
  }
  const firstSentence = candidate.split(/(?<=[.!?])\s+/)[0] || candidate;
  const firstClause = firstSentence.split(/[,:;]/)[0] || firstSentence;
  return toStoryTitle(firstClause);
}

function deriveDescriptionFromIdea(text, segments, context = {}, wantFragment = '') {
  const normalized = collapseWhitespace(text);
  const parent = context?.parent || null;
  const components = context?.components || [];
  const persona = cleanupPersona(segments.persona) || sentenceFragment(parent?.asA) || 'User';
  const benefitRaw =
    cleanupBenefit(segments.benefit) || cleanFragment(parent?.soThat || '');
  const benefitClause = lowercaseSentenceFragment(benefitRaw);
  let goalClause = lowercaseSentenceFragment(wantFragment || segments.goal || normalized);
  if (goalClause) {
    goalClause = /^to\s+/i.test(goalClause) ? goalClause : `to ${goalClause}`;
  }

  const sentences = [];

  if (persona && goalClause) {
    const firstSentence = `As a ${persona}, I want ${goalClause}`;
    sentences.push(ensureSentence(firstSentence));
  } else if (goalClause) {
    const firstSentence = `This story enables the team ${goalClause}`;
    sentences.push(ensureSentence(firstSentence));
  } else if (normalized) {
    sentences.push(ensureSentence(normalized));
  }

  if (benefitClause) {
    sentences.push(ensureSentence(`This ensures ${benefitClause}`));
  }

  const componentSentence = formatComponentSentence(components);
  if (componentSentence) {
    sentences.push(componentSentence);
  }

  if (parent?.title) {
    sentences.push(ensureSentence(`This work supports the parent story "${parent.title}".`));
  }

  return sentences.filter(Boolean).join(' ');
}

function generateStoryDraftFromIdea(idea, context = {}) {
  const normalized = collapseWhitespace(idea);
  if (!normalized) {
    throw Object.assign(new Error('Idea text is required'), { statusCode: 400 });
  }

  const segments = parseIdeaSegments(normalized);
  const persona = cleanupPersona(segments.persona);
  const goal = cleanupGoal(segments.goal);
  const benefit = cleanupBenefit(segments.benefit);
  const parent = context?.parent || null;
  const parentComponents = parent
    ? normalizeComponentsInput(parent.components || [])
    : [];
  const parentStoryPoint = Number.isFinite(parent?.storyPoint)
    ? Number(parent.storyPoint)
    : Number.isFinite(parent?.story_point)
    ? Number(parent.story_point)
    : null;

  let suggestedStoryPoint = null;
  if (Number.isFinite(parentStoryPoint) && parentStoryPoint > 1) {
    suggestedStoryPoint = Math.max(1, Math.min(8, Math.round(parentStoryPoint / 2)));
  }

  const verbPattern = /^(?:implement|enable|provide|allow|support|deliver|build|create|add|improve|automate|migrate|configure|update|design|introduce|establish|monitor|audit|analyze|define|draft|refine|document|collect|optimize|secure|measure|track|streamline|orchestrate)\b/i;
  let wantFragment = goal;
  if (wantFragment) {
    const normalizedGoal = wantFragment.trim().toLowerCase();
    if (!verbPattern.test(wantFragment) || /^audit\s+\w+ing\b/.test(normalizedGoal)) {
      wantFragment = `implement ${wantFragment}`;
    }
  }

  const draft = {
    title: deriveStoryTitleFromSegments(segments, normalized),
    description: deriveDescriptionFromIdea(normalized, segments, { parent, components: parentComponents }, wantFragment),
    asA: persona || sentenceFragment(parent?.asA) || 'User',
    iWant: wantFragment ? sentenceFragment(wantFragment) : sentenceFragment(normalized),
    soThat: benefit ? sentenceFragment(benefit) : sentenceFragment(parent?.soThat || ''),
    components: parentComponents,
    storyPoint: suggestedStoryPoint,
    assigneeEmail: parent?.assigneeEmail ? String(parent.assigneeEmail).trim() : '',
  };

  if (!draft.soThat) {
    draft.soThat = '';
  }

  return draft;
}

function buildStoryPathLabel(story, storyMap) {
  if (!story) return '';
  if (!storyMap) return story.title || '';
  const segments = [];
  let current = story;
  while (current) {
    segments.unshift(current.title || 'Untitled');
    current =
      current.parentId != null && storyMap.has(current.parentId)
        ? storyMap.get(current.parentId)
        : null;
  }
  return segments.join(' › ');
}

function renderStepList(label, steps) {
  const lines = [`${label}:`];
  if (Array.isArray(steps) && steps.length > 0) {
    steps.forEach((step) => {
      const text = String(step ?? '').trim() || '(blank)';
      lines.push(`- ${text}`);
    });
  } else {
    lines.push('- (not provided)');
  }
  return lines;
}

function collectChildSummaries(story, depth = 0, lines = []) {
  if (!story || !Array.isArray(story.children)) {
    return lines;
  }
  story.children.forEach((child) => {
    const indent = '  '.repeat(depth);
    const parts = [child.title || 'Untitled story'];
    if (child.status) {
      parts.push(`Status: ${child.status}`);
    }
    if (child.storyPoint != null) {
      parts.push(`Story Point: ${child.storyPoint}`);
    }
    lines.push(`${indent}- ${parts.join(' | ')}`);
    collectChildSummaries(child, depth + 1, lines);
  });
  return lines;
}

function summarizeInvestWarnings(warnings, analysis) {
  if (!Array.isArray(warnings) || warnings.length === 0) {
    if (analysis && analysis.source === 'openai' && analysis.summary) {
      return [`- ChatGPT summary: ${analysis.summary}`];
    }
    return ['- ChatGPT confirmed the story currently meets INVEST criteria.'];
  }
  return warnings.map((warning) => {
    const criterion = warning.criterion ? String(warning.criterion).toUpperCase() : '';
    const suggestion = warning.suggestion ? ` Suggestion: ${warning.suggestion}` : '';
    return `- ${criterion ? `${criterion}: ` : ''}${warning.message || 'Follow-up required.'}${suggestion}`;
  });
}

function listReferenceDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) {
    return ['No reference documents recorded.'];
  }
  return documents.map((doc, index) => {
    const name = doc.name || `Document ${index + 1}`;
    const url = doc.url || 'N/A';
    return `- ${name}: ${url}`;
  });
}

function formatMarkdownTableCell(value) {
  if (value == null) {
    return '';
  }
  return String(value)
    .replace(/\r?\n/g, '<br />')
    .replace(/\|/g, '\\|');
}

function componentDisplayName(name) {
  return (typeof name === 'string' && name.trim().length > 0 ? name : UNSPECIFIED_COMPONENT).replace(
    /_/g,
    ' '
  );
}

function groupStoriesByComponent(flatStories) {
  const groups = new Map();
  const order = [...COMPONENT_CATALOG, UNSPECIFIED_COMPONENT];
  order.forEach((component) => groups.set(component, []));

  flatStories.forEach((story) => {
    const components =
      Array.isArray(story.components) && story.components.length > 0
        ? story.components
        : [UNSPECIFIED_COMPONENT];
    components.forEach((component) => {
      if (!groups.has(component)) {
        groups.set(component, []);
        order.push(component);
      }
      groups.get(component).push(story);
    });
  });

  groups.forEach((stories) => {
    stories.sort((a, b) => {
      const aTitle = a.title || '';
      const bTitle = b.title || '';
      const compare = aTitle.localeCompare(bTitle, undefined, { sensitivity: 'base' });
      if (compare !== 0) {
        return compare;
      }
      return (a.id || 0) - (b.id || 0);
    });
  });

  return { groups, order };
}

function enumerateRequirementEntries(context = {}) {
  const flatStories = Array.isArray(context.flat) ? context.flat : [];
  const { groups, order } = groupStoriesByComponent(flatStories);
  const requirements = [];
  let componentSequence = 0;

  order.forEach((component) => {
    const stories = groups.get(component) ?? [];
    if (stories.length === 0) {
      return;
    }
    componentSequence += 1;
    stories.forEach((story, storyIndex) => {
      const storySequence = storyIndex + 1;
      const identifier = `REQ-${String(componentSequence).padStart(2, '0')}-${String(
        storySequence
      ).padStart(2, '0')}`;
      requirements.push({
        id: identifier,
        componentKey: component,
        componentDisplayName: componentDisplayName(component),
        componentSequence,
        storySequence,
        story,
      });
    });
  });

  return { flatStories, groups, order, requirements };
}

function buildCommonTestDocument(context = {}) {
  const storyMap =
    context.map instanceof Map
      ? context.map
      : new Map((Array.isArray(context.flat) ? context.flat : []).map((story) => [story.id, story]));
  const { flatStories, groups, order, requirements } = enumerateRequirementEntries(context);

  const totalTests = flatStories.reduce((sum, story) => {
    if (!Array.isArray(story.acceptanceTests)) {
      return sum;
    }
    return sum + story.acceptanceTests.length;
  }, 0);

  const lines = [];
  lines.push('# Common Test Document');
  lines.push('');
  lines.push('## 1. Document Control');
  lines.push('');
  lines.push('| Field | Detail |');
  lines.push('| --- | --- |');
  lines.push('| Template | Common Test Document template |');
  lines.push(`| Generated On | ${now()} |`);
  lines.push(`| Total User Stories | ${flatStories.length} |`);
  lines.push(`| Total Acceptance Tests | ${totalTests} |`);
  lines.push(`| Requirements Covered | ${requirements.length} |`);
  lines.push('');

  lines.push('## 2. Test Strategy & Scope');
  lines.push('');
  lines.push(
    'Testing is organised by AIPM component so every requirement has at least one verification scenario. '
      +
      'Procedures combine existing acceptance tests with additional guidance on environment, data, and evidence collection.'
  );
  lines.push('');
  if (flatStories.length === 0) {
    lines.push('No user stories are available. Capture stories to generate test documentation.');
    lines.push('');
    lines.push('## 3. Requirement Traceability Matrix');
    lines.push('');
    lines.push('No requirements have been catalogued yet, so traceability cannot be established.');
    lines.push('');
    lines.push('## 4. Detailed Test Procedures');
    lines.push('');
    lines.push('Test procedures will populate automatically once requirements are defined.');
    lines.push('');
    lines.push('## 5. Test Environment & Tooling');
    lines.push('');
    lines.push('- Core Application: AIPM web client and backend services.');
    lines.push('- Tooling: Modern Chromium-based browser, SQLite database seeded with sample data.');
    lines.push('- Automation Hooks: REST API endpoints under `/api/*` for scripted verification.');
    lines.push('');
    lines.push('## 6. Risks & Mitigations');
    lines.push('');
    lines.push('- Incomplete requirements: collaborate with product owners to capture missing stories.');
    lines.push('- Environment drift: document configuration and capture evidence before upgrades.');
    lines.push('');
    lines.push('## 7. References & Approvals');
    lines.push('');
    lines.push('- Product strategy overview');
    lines.push('- INVEST guideline reference');
    lines.push('- QA sign-off checklist');
    return { title: 'Common Test Document', content: lines.join('\n') };
  }

  const summaryRows = [];
  const requirementsByComponent = new Map();
  order.forEach((component) => {
    const stories = groups.get(component) ?? [];
    if (stories.length === 0) {
      return;
    }
    const componentTests = stories.reduce((sum, story) => {
      if (!Array.isArray(story.acceptanceTests)) {
        return sum;
      }
      return sum + story.acceptanceTests.length;
    }, 0);
    summaryRows.push(`| ${componentDisplayName(component)} | ${stories.length} | ${componentTests} |`);
    requirementsByComponent.set(
      component,
      requirements.filter((entry) => entry.componentKey === component)
    );
  });

  lines.push('## 3. Requirement Traceability Matrix');
  lines.push('');
  if (requirements.length === 0) {
    lines.push('No requirements have been catalogued yet, so traceability cannot be established.');
  } else {
    lines.push('| Requirement | Story | Primary Test | Coverage |');
    lines.push('| --- | --- | --- | --- |');
    requirements.forEach((entry) => {
      const story = entry.story || {};
      const tests = Array.isArray(story.acceptanceTests) ? story.acceptanceTests : [];
      const primaryTest = tests.length
        ? formatMarkdownTableCell(
            tests[0].title && tests[0].title.trim() ? tests[0].title.trim() : 'Scenario 1'
          )
        : 'Pending test design';
      const coverage = tests.length ? 'Full' : 'Pending';
      lines.push(
        `| ${entry.id} | ${formatMarkdownTableCell(story.title || 'Untitled Story')} | ${primaryTest} | ${coverage} |`
      );
    });
  }
  lines.push('');

  lines.push('## 4. Component Test Summaries');
  lines.push('');
  if (summaryRows.length === 0) {
    lines.push('No user stories are available. Capture stories to generate test documentation.');
    return { title: 'Common Test Document', content: lines.join('\n') };
  }

  lines.push('| Component | Stories | Acceptance Tests |');
  lines.push('| --- | ---:| ---:|');
  summaryRows.forEach((row) => lines.push(row));
  lines.push('');

  lines.push('## 5. Detailed Test Procedures');
  lines.push('');

  let componentIndex = 0;
  order.forEach((component) => {
    const componentRequirements = requirementsByComponent.get(component) || [];
    if (componentRequirements.length === 0) {
      return;
    }
    componentIndex += 1;
    lines.push(`### 5.${componentIndex} ${componentDisplayName(component)}`);
    lines.push('');
    lines.push(
      'This section outlines end-to-end verification for the component, combining existing acceptance tests with repeatable QA '
        + 'instructions.'
    );
    lines.push('');

    componentRequirements.forEach((requirement) => {
      const story = requirement.story || {};
      const tests = Array.isArray(story.acceptanceTests) ? story.acceptanceTests : [];
      const storyPoint =
        story.storyPoint != null && story.storyPoint !== '' ? story.storyPoint : 'Unestimated';
      const assignee = story.assigneeEmail || 'Unassigned';
      const path = buildStoryPathLabel(story, storyMap);

      lines.push(`#### ${requirement.id} — ${story.title || 'Untitled Story'}`);
      lines.push('');
      lines.push(`- Component: ${requirement.componentDisplayName}`);
      lines.push(`- Path: ${formatMarkdownTableCell(path)}`);
      lines.push(`- Status: ${formatMarkdownTableCell(story.status || 'Draft')}`);
      lines.push(`- Estimate: ${formatMarkdownTableCell(storyPoint)}`);
      lines.push(`- Assignee: ${formatMarkdownTableCell(assignee)}`);
      lines.push('');

      lines.push('**Requirement Summary**');
      lines.push('');
      lines.push(`- As a ${story.asA || '…'}`);
      lines.push(`- I want ${story.iWant || '…'}`);
      lines.push(`- So that ${story.soThat || '…'}`);
      if (story.description && story.description.trim()) {
        lines.push('');
        lines.push('> ' + story.description.trim().replace(/\r?\n/g, '\n> '));
        lines.push('');
      } else {
        lines.push('');
      }

      lines.push('**Test Objectives**');
      lines.push('');
      lines.push(
        '- Validate end-user workflows align with the requirement narrative and acceptance criteria.'
      );
      lines.push('- Confirm integration touchpoints respond with expected signals and events.');
      lines.push('- Capture evidence (screenshots, logs, API responses) for auditability.');
      lines.push('');

      if (tests.length === 0) {
        lines.push('_No acceptance tests defined. Develop manual or automated coverage before release._');
        lines.push('');
        return;
      }

      tests.forEach((test, testIndex) => {
        const heading = test.title && test.title.trim() ? test.title.trim() : `Scenario ${testIndex + 1}`;
        const testCaseId = `${requirement.id}-TC${String(testIndex + 1).padStart(2, '0')}`;
        lines.push(`##### ${testCaseId} — ${heading}`);
        lines.push('');
        lines.push('| Section | Detail |');
        lines.push('| --- | --- |');
        lines.push(`| Requirement | ${requirement.id} |`);
        lines.push(`| Status | ${formatMarkdownTableCell(test.status || 'Draft')} |`);
        const givenSteps = renderStepList('Given', test.given).slice(1).map((line) => line.replace(/^-\s*/, ''));
        const whenSteps = renderStepList('When', test.when).slice(1).map((line) => line.replace(/^-\s*/, ''));
        const thenSteps = renderStepList('Then', test.then).slice(1).map((line) => line.replace(/^-\s*/, ''));
        const prerequisites = givenSteps.length ? givenSteps.join('<br />') : 'Documented in test data sheet.';
        const procedure = whenSteps.length
          ? whenSteps.map((step, index) => `${index + 1}. ${step}`).join('<br />')
          : 'Execute the primary user journey as described in the requirement summary.';
        const expected = thenSteps.length
          ? thenSteps.map((step, index) => `${index + 1}. ${step}`).join('<br />')
          : 'System responds according to INVEST-compliant acceptance criteria.';
        lines.push(`| Preconditions | ${formatMarkdownTableCell(prerequisites)} |`);
        lines.push(`| Procedure | ${formatMarkdownTableCell(procedure)} |`);
        lines.push(`| Expected Results | ${formatMarkdownTableCell(expected)} |`);
        if (Array.isArray(test.referenceDocuments) && test.referenceDocuments.length > 0) {
          const references = test.referenceDocuments
            .map((doc) => `${doc.name || 'Reference'} (${doc.url || 'N/A'})`)
            .join('<br />');
          lines.push(`| References | ${formatMarkdownTableCell(references)} |`);
        } else {
          lines.push('| References | Requirement specification, design guidelines |');
        }
        if (test.gwtHealth) {
          const healthLabel = test.gwtHealth.satisfied ? 'Pass' : 'Needs review';
          lines.push(`| Gherkin Health | ${healthLabel} |`);
          if (Array.isArray(test.gwtHealth.issues) && test.gwtHealth.issues.length > 0) {
            const issues = test.gwtHealth.issues
              .map((issue) => {
                const criterion = issue.criterion ? `${issue.criterion.toUpperCase()}: ` : '';
                return `${criterion}${issue.message || 'Follow-up required.'}`;
              })
              .join('<br />');
            lines.push(`| Review Notes | ${formatMarkdownTableCell(issues)} |`);
          }
        }
        lines.push('');
      });
    });
  });

  lines.push('## 6. Test Environment & Tooling');
  lines.push('');
  lines.push('- **Application Tier:** AIPM backend services with SQLite persistence.');
  lines.push('- **Client Tier:** Browser-based UI (Chrome 119+ or Firefox 118+ recommended).');
  lines.push('- **Test Data:** Sample dataset generated via `scripts/generate-sample-dataset.mjs`.');
  lines.push('- **Automation Hooks:** REST API calls documented under `/api/*` endpoints.');
  lines.push('- **Monitoring:** Browser devtools network logs, server console output, and database snapshots.');
  lines.push('');

  lines.push('## 7. Risks & Mitigations');
  lines.push('');
  lines.push('- **Scope creep:** Lock sprint backlog before executing regression cycles.');
  lines.push('- **Integration drift:** Pin external dependencies and verify API contracts with mocks.');
  lines.push('- **Insufficient evidence:** Store artefacts in the QA share with timestamps.');
  lines.push('');

  lines.push('## 8. References & Approvals');
  lines.push('');
  lines.push('- AIPM Common Requirement Specification (latest revision).');
  lines.push('- Engineering design review minutes.');
  lines.push('- QA sign-off checklist and retrospective notes.');

  return { title: 'Common Test Document', content: lines.join('\n') };
}

function buildCommonRequirementSpecificationDocument(context = {}) {
  const storyMap =
    context.map instanceof Map
      ? context.map
      : new Map((Array.isArray(context.flat) ? context.flat : []).map((story) => [story.id, story]));
  const { flatStories, groups, order, requirements } = enumerateRequirementEntries(context);

  const lines = [];
  lines.push('# Common Requirement Specification');
  lines.push('');
  lines.push('## 1. Document Control');
  lines.push('');
  lines.push('| Field | Detail |');
  lines.push('| --- | --- |');
  lines.push('| Template | Common Requirement Specification template |');
  lines.push(`| Generated On | ${now()} |`);
  lines.push(`| Total User Stories | ${flatStories.length} |`);
  lines.push(`| Requirements Catalogued | ${requirements.length} |`);
  lines.push('');

  lines.push('## 2. About AIPM');
  lines.push('');
  lines.push(
    'AI Project Manager (AIPM) orchestrates agile delivery with AI-assisted story analysis, documentation, and verification '
      +
      'pipelines. The platform centralises story capture, INVEST health assessments, automated acceptance test generation, and '
      +
      'document exports so distributed teams share a single source of truth.'
  );
  lines.push('');
  lines.push('- **Core capabilities:** backlog modelling, documentation generation, traceability, and quality signals.');
  lines.push('- **Primary stakeholders:** product managers, engineers, quality analysts, and compliance reviewers.');
  lines.push('- **Value proposition:** shorten feedback loops by combining structured requirements with AI-authored insights.');
  lines.push('');

  lines.push('## 3. System Design & Architecture');
  lines.push('');
  lines.push(
    'The solution follows a layered architecture. The conceptual block diagram includes:');
  lines.push('- **Presentation Layer:** Browser SPA rendering mindmaps, outlines, and document workflows.');
  lines.push('- **Application Services:** Node.js backend exposing REST APIs for stories, health checks, and document export.');
  lines.push('- **Intelligence Services:** Optional OpenAI integrations performing INVEST and document synthesis.');
  lines.push('- **Data Layer:** SQLite persistence with traceable relationships between stories, tests, and references.');
  lines.push('- **Integrations:** Webhooks and document download endpoints for downstream tooling.');
  lines.push('');
  lines.push(
    'Signals traverse from UI interactions (create/update stories) to backend validation, onward to AI enrichment, and finally '
      +
      'to persistence and reporting layers. This ensures each requirement change propagates to testing and documentation.'
  );
  lines.push('');

  lines.push('## 4. Operational Workflow & Signalling');
  lines.push('');
  lines.push('- **Story lifecycle:** Draft → Ready → In Progress → Blocked/Approved → Done. Status updates trigger INVEST checks.');
  lines.push('- **Signal propagation:** Story edits invoke acceptance test regeneration, gWT health evaluation, and layout refresh.');
  lines.push('- **Traceability:** Requirement IDs map to acceptance scenarios and reference documents for audit readiness.');
  lines.push('- **Notifications:** UI toasts and document exports inform stakeholders of changes.');
  lines.push('');

  lines.push('## 5. Installation & Deployment');
  lines.push('');
  lines.push('1. Install Node.js 20+ and npm.');
  lines.push('2. Clone the AIPM repository and run `npm install`.');
  lines.push('3. Seed sample data with `npm run seed` or `node scripts/generate-sample-dataset.mjs`.');
  lines.push('4. Launch the backend via `npm run backend` and the static front-end host.');
  lines.push('5. Configure optional OpenAI credentials for enhanced analysis.');
  lines.push('6. Verify document generation through the Generate Document modal.');
  lines.push('');

  if (flatStories.length === 0) {
    lines.push('## 6. Requirements Catalogue');
    lines.push('');
    lines.push('No user stories are available. Capture stories to generate requirement documentation.');
    lines.push('');
    lines.push('## 7. Assumptions, Constraints, and Non-functional Requirements');
    lines.push('');
    lines.push('- Availability target: 99.5% for core documentation endpoints.');
    lines.push('- Performance: document generation completes within 5 seconds for 100 stories.');
    lines.push('- Security: enforce role-based access for editing and exporting artefacts.');
    lines.push('');
    lines.push('## 8. References');
    lines.push('');
    lines.push('- Product vision deck');
    lines.push('- QA strategy playbook');
    lines.push('- OpenAI API documentation');
    lines.push('');
    lines.push('## 9. Glossary & Acronyms');
    lines.push('');
    lines.push('- **AIPM:** AI Project Manager.');
    lines.push('- **INVEST:** Independent, Negotiable, Valuable, Estimable, Small, Testable.');
    lines.push('- **GWT:** Given/When/Then.');
    lines.push('');
    return { title: 'Common Requirement Specification', content: lines.join('\n') };
  }

  const statusCounts = new Map();
  flatStories.forEach((story) => {
    const status = story.status || 'Draft';
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });

  lines.push('## 6. Requirements Catalogue');
  lines.push('');
  lines.push('### 6.1 Portfolio Snapshot');
  lines.push('');
  lines.push('| Status | Stories |');
  lines.push('| --- | ---:|');
  Array.from(statusCounts.keys())
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .forEach((status) => {
      lines.push(`| ${status} | ${statusCounts.get(status)} |`);
    });
  lines.push('');

  lines.push('| Component | Stories | Ready/Done | Blocked |');
  lines.push('| --- | ---:| ---:| ---:|');
  order.forEach((component) => {
    const stories = groups.get(component) ?? [];
    if (stories.length === 0) {
      return;
    }
    let readyCount = 0;
    let blockedCount = 0;
    stories.forEach((story) => {
      const status = (story.status || '').toLowerCase();
      if (['ready', 'approved', 'done'].includes(status)) {
        readyCount += 1;
      }
      if (status === 'blocked') {
        blockedCount += 1;
      }
    });
    lines.push(`| ${componentDisplayName(component)} | ${stories.length} | ${readyCount} | ${blockedCount} |`);
  });
  lines.push('');

  const requirementsByComponent = new Map();
  order.forEach((component) => {
    requirementsByComponent.set(
      component,
      requirements.filter((entry) => entry.componentKey === component)
    );
  });

  let componentIndex = 0;
  order.forEach((component) => {
    const componentRequirements = requirementsByComponent.get(component) || [];
    if (componentRequirements.length === 0) {
      return;
    }
    componentIndex += 1;
    lines.push(`### 6.${componentIndex + 1} ${componentDisplayName(component)}`);
    lines.push('');
    lines.push(
      'The following requirements encapsulate scope, dependencies, and verification expectations for this component.'
    );
    lines.push('');

    componentRequirements.forEach((entry) => {
      const story = entry.story || {};
      const storyPoint =
        story.storyPoint != null && story.storyPoint !== '' ? story.storyPoint : 'Unestimated';
      const componentsList =
        Array.isArray(story.components) && story.components.length > 0
          ? story.components.map((name) => componentDisplayName(name)).join(', ')
          : componentDisplayName(UNSPECIFIED_COMPONENT);
      const assignee = story.assigneeEmail || 'Unassigned';
      const path = buildStoryPathLabel(story, storyMap);
      const tests = Array.isArray(story.acceptanceTests) ? story.acceptanceTests : [];
      const docs = Array.isArray(story.referenceDocuments) ? story.referenceDocuments : [];
      const childLines = collectChildSummaries(story, 0, []);

      lines.push(`#### ${entry.id} ${story.title || 'Untitled Story'}`);
      lines.push('');
      lines.push('| Field | Detail |');
      lines.push('| --- | --- |');
      lines.push(`| Component | ${formatMarkdownTableCell(entry.componentDisplayName)} |`);
      lines.push(`| Status | ${formatMarkdownTableCell(story.status || 'Draft')} |`);
      lines.push(`| Story Point | ${formatMarkdownTableCell(storyPoint)} |`);
      lines.push(`| Assignee | ${formatMarkdownTableCell(assignee)} |`);
      lines.push(`| Path | ${formatMarkdownTableCell(path)} |`);
      lines.push(`| Linked Components | ${formatMarkdownTableCell(componentsList)} |`);
      lines.push(`| Acceptance Tests | ${tests.length} |`);
      lines.push('');

      lines.push('**Requirement Statement**');
      lines.push('');
      lines.push(`- As a ${story.asA || '…'}`);
      lines.push(`- I want ${story.iWant || '…'}`);
      lines.push(`- So that ${story.soThat || '…'}`);
      if (story.description && story.description.trim()) {
        lines.push('');
        lines.push('> ' + story.description.trim().replace(/\r?\n/g, '\n> '));
        lines.push('');
      } else {
        lines.push('');
      }

      lines.push('**Functional Expectations**');
      lines.push('');
      lines.push('- Align UI/UX behaviour with INVEST-compliant acceptance criteria.');
      lines.push('- Ensure data persistence and API responses reflect state transitions.');
      lines.push('- Surface validation errors and success feedback to end users.');
      lines.push('');

      lines.push('**Interfaces & Signalling**');
      lines.push('');
      lines.push('- Trigger story health checks upon status change.');
      lines.push('- Emit document regeneration signal when requirements or acceptance tests update.');
      lines.push('- Maintain websocket or polling hooks (where applicable) for UI synchronisation.');
      lines.push('');

      lines.push('**Verification Overview**');
      lines.push('');
      if (tests.length === 0) {
        lines.push('- Acceptance tests pending authoring.');
      } else {
        tests.forEach((test, index) => {
          const heading = test.title && test.title.trim() ? test.title.trim() : `Scenario ${index + 1}`;
          const outcomes =
            Array.isArray(test.then) && test.then.length > 0
              ? test.then.map((step) => String(step).trim()).join('; ')
              : 'Then steps not specified.';
          lines.push(`- ${heading} (Status: ${test.status || 'Draft'})`);
          lines.push(`  Outcomes: ${outcomes}`);
        });
      }
      lines.push('');

      lines.push('**Dependencies & Child Work**');
      lines.push('');
      if (childLines.length === 0) {
        lines.push('- No child stories linked.');
      } else {
        childLines.forEach((line) => lines.push(line));
      }
      lines.push('');

      lines.push('**Reference Materials**');
      lines.push('');
      if (docs.length === 0) {
        lines.push('- No reference documents recorded.');
      } else {
        listReferenceDocuments(docs).forEach((docLine) => lines.push(docLine));
      }
      lines.push('');

      lines.push('**INVEST & Quality Notes**');
      lines.push('');
      const investHealth = story.investHealth || null;
      const investLines = summarizeInvestWarnings(
        investHealth?.issues || [],
        story.investAnalysis && story.investAnalysis.aiSummary
          ? { summary: story.investAnalysis.aiSummary, source: story.investAnalysis.source }
          : story.investAnalysis
      );
      investLines.forEach((line) => lines.push(line));
      lines.push('');
    });
  });

  lines.push('## 7. Assumptions, Constraints, and Non-functional Requirements');
  lines.push('');
  lines.push('- **Performance:** Generate mindmap and document exports in under 3 seconds for standard datasets.');
  lines.push('- **Security:** Protect API endpoints with authentication and audit logging.');
  lines.push('- **Scalability:** Support concurrent editors with eventual consistency across UI panels.');
  lines.push('- **Compliance:** Maintain traceability from requirements to verification for audits.');
  lines.push('');

  lines.push('## 8. References');
  lines.push('');
  lines.push('- Product vision deck');
  lines.push('- QA strategy playbook');
  lines.push('- OpenAI API documentation');
  lines.push('- Internal UX guidelines for mindmap interactions');
  lines.push('');

  lines.push('## 9. Glossary & Acronyms');
  lines.push('');
  lines.push('- **AIPM:** AI Project Manager.');
  lines.push('- **INVEST:** Independent, Negotiable, Valuable, Estimable, Small, Testable.');
  lines.push('- **GWT:** Given/When/Then.');
  lines.push('- **RACI:** Responsible, Accountable, Consulted, Informed.');
  lines.push('');

  lines.push('## 10. Revision History');
  lines.push('');
  lines.push('| Version | Date | Description | Author |');
  lines.push('| --- | --- | --- | --- |');
  lines.push(`| 1.0 | ${now()} | Auto-generated specification from current backlog | AIPM |`);

  return { title: 'Common Requirement Specification', content: lines.join('\n') };
}

function normalizeDocumentType(type) {
  const normalized = String(type || '').toLowerCase();
  if (
    [
      'test',
      'test-document',
      'test_document',
      'common-test',
      'common-test-document',
      'common_test_document',
    ].includes(normalized)
  ) {
    return 'common-test-document';
  }
  if (
    [
      'system',
      'system-requirement',
      'system_requirement',
      'system-requirement-document',
      'common-requirement',
      'common-requirement-specification',
      'common_requirement_specification',
    ].includes(normalized)
  ) {
    return 'common-requirement-specification';
  }
  return normalized;
}

function defaultDocumentTitle(type) {
  const normalized = normalizeDocumentType(type);
  if (normalized === 'common-test-document') {
    return 'Common Test Document';
  }
  if (normalized === 'common-requirement-specification') {
    return 'Common Requirement Specification';
  }
  return 'AI Project Manager Document';
}

function slugifyFilename(value, fallback = 'document') {
  const base = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (base || 'document') + '.md';
}

function prepareStoriesForDocument(context = {}) {
  const flatStories = Array.isArray(context.flat) ? context.flat : [];
  const storyMap =
    context.map instanceof Map
      ? context.map
      : new Map(flatStories.map((story) => [story.id, story]));

  return flatStories.map((story) => ({
    id: story.id,
    title: story.title || '',
    status: story.status || '',
    storyPoint: story.storyPoint ?? null,
    components: Array.isArray(story.components) ? story.components : [],
    assigneeEmail: story.assigneeEmail || '',
    path: buildStoryPathLabel(story, storyMap),
    investSummary: story.investAnalysis?.summary || '',
    investIssues: Array.isArray(story.investHealth?.issues)
      ? story.investHealth.issues.map((issue) => ({
          criterion: issue.criterion ? String(issue.criterion) : '',
          message: issue.message ? String(issue.message) : '',
          suggestion: issue.suggestion ? String(issue.suggestion) : '',
        }))
      : [],
    acceptanceTests: Array.isArray(story.acceptanceTests)
      ? story.acceptanceTests.map((test) => ({
          id: test.id,
          title: test.title || '',
          status: test.status || '',
          given: Array.isArray(test.given) ? test.given.map((step) => String(step)) : [],
          when: Array.isArray(test.when) ? test.when.map((step) => String(step)) : [],
          then: Array.isArray(test.then) ? test.then.map((step) => String(step)) : [],
          gwtIssues: Array.isArray(test.gwtHealth?.issues)
            ? test.gwtHealth.issues.map((issue) => ({
                criterion: issue.criterion ? String(issue.criterion) : '',
                message: issue.message ? String(issue.message) : '',
                suggestion: issue.suggestion ? String(issue.suggestion) : '',
              }))
            : [],
        }))
      : [],
    referenceDocuments: Array.isArray(story.referenceDocuments)
      ? story.referenceDocuments.map((doc) => ({
          name: doc.name || '',
          url: doc.url || '',
        }))
      : [],
  }));
}

function buildComponentSummary(flatStories) {
  const { groups, order } = groupStoriesByComponent(flatStories);
  return order.map((component) => {
    const entries = groups.get(component) ?? [];
    return {
      component,
      displayName: componentDisplayName(component),
      storyCount: entries.length,
      stories: entries.map((story) => ({
        id: story.id,
        title: story.title || '',
        status: story.status || '',
        storyPoint: story.storyPoint ?? null,
        assigneeEmail: story.assigneeEmail || '',
      })),
    };
  });
}

async function requestDocumentFromOpenAi(type, context, config) {
  if (!config?.enabled) {
    return null;
  }

  const normalizedType = normalizeDocumentType(type);
  const flatStories = Array.isArray(context.flat) ? context.flat : [];
  const preparedStories = prepareStoriesForDocument(context);
  const componentSummary = buildComponentSummary(flatStories);

  const systemPrompt =
    'You are a technical writer assisting an agile team. Generate concise Markdown documents grouped by component. Respond ONLY with JSON containing "title" and "markdown" keys. The markdown must be valid GitHub-flavoured Markdown.';

  const userPayload = {
    requestType: normalizedType,
    generatedAt: now(),
    components: componentSummary,
    stories: preparedStories,
  };

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: JSON.stringify(userPayload, null, 2),
    },
  ];

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      response_format: { type: 'json_object' },
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(`OpenAI document request failed with status ${response.status}`);
    error.statusCode = response.status;
    error.body = text;
    throw error;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    const error = new Error('OpenAI document response did not contain JSON content');
    error.body = content;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    const parseError = new Error('Failed to parse OpenAI document response');
    parseError.cause = error;
    parseError.body = jsonText;
    throw parseError;
  }

  const markdown = typeof parsed.markdown === 'string' ? parsed.markdown.trim() : '';
  if (!markdown) {
    throw new Error('OpenAI document response did not include markdown content');
  }

  const title = parsed.title ? String(parsed.title).trim() : defaultDocumentTitle(type);
  return { title, content: markdown };
}

async function generateDocumentFile(type, context = {}) {
  const config = readOpenAiConfig();
  if (config.enabled) {
    try {
      const aiDocument = await requestDocumentFromOpenAi(type, context, config);
      if (aiDocument && aiDocument.content) {
        return { ...aiDocument, source: 'openai' };
      }
    } catch (error) {
      console.error('OpenAI document generation failed', error);
    }
  }

  const fallbackDocument = generateDocumentPayload(type, context);
  const source = config.enabled ? 'fallback' : 'baseline';
  return { ...fallbackDocument, source };
}

function generateDocumentPayload(type, context = {}) {
  const normalized = String(type || '').toLowerCase();
  if (
    [
      'test',
      'test-document',
      'test_document',
      'common-test',
      'common-test-document',
      'common_test_document',
    ].includes(normalized)
  ) {
    return buildCommonTestDocument(context);
  }
  if (
    [
      'system',
      'system-requirement',
      'system_requirement',
      'system-requirement-document',
      'common-requirement',
      'common-requirement-specification',
      'common_requirement_specification',
    ].includes(normalized)
  ) {
    return buildCommonRequirementSpecificationDocument(context);
  }
  const error = new Error('Unsupported document type');
  error.statusCode = 400;
  throw error;
}

const MEASURABLE_PATTERN = /([0-9]+\s*(ms|s|sec|seconds?|minutes?|hours?|%|percent|users?|items?|requests?|errors?))/i;
const HTTP_STATUS_CODE_PATTERN = /\b(20\d|30\d|40\d|50\d)\b/;
const OBSERVABLE_KEYWORDS = [
  'display',
  'show',
  'visible',
  'see',
  'hide',
  'hidden',
  'reveal',
  'status',
  'update',
  'updated',
  'redirect',
  'navigat',
  'receive',
  'sent',
  'email',
  'message',
  'notification',
  'approved',
  'rejected',
  'enabled',
  'disabled',
  'error',
  'success',
  'log',
  'record',
  'save',
  'persist',
  'create',
  'generated',
  'delete',
  'download',
  'response',
  'http',
  'json',
  'table',
  'list',
  'modal',
  'screen',
  'document',
  'report',
  'audit',
  'chart',
  'value',
  'field',
  'button',
  'link',
  'toast',
  'highlight',
  'select',
  'count',
  'badge',
  'tab',
  'workflow',
  'progress',
  'api',
  'return',
  'flag',
  'equal',
  'match',
  'exists',
  'contain',
  'appear',
  'generated',
  'accessible',
  'render',
  'approve',
  'reject',
  'tooltip',
  'indicat',
  'draw',
  'dod',
  'blocker',
];

function isObservableOutcome(step) {
  const text = typeof step === 'string' ? step.trim() : String(step ?? '').trim();
  if (!text) {
    return false;
  }
  const normalized = text.toLowerCase();
  if (MEASURABLE_PATTERN.test(normalized)) {
    return true;
  }
  if (HTTP_STATUS_CODE_PATTERN.test(normalized) && (normalized.includes('http') || normalized.includes('status'))) {
    return true;
  }
  return OBSERVABLE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function measurabilityWarnings(thenSteps) {
  const warnings = [];
  const suggestions = [];
  thenSteps.forEach((step, index) => {
    const text = typeof step === 'string' ? step.trim() : String(step ?? '').trim();
    if (!text) {
      const suggestion =
        `Then step ${index + 1}: describe the expected outcome so testers know what to observe or measure.`;
      warnings.push({
        index,
        message: `Then step ${index + 1} is blank or missing an outcome.`,
        details: 'Then steps should explain what changes, appears, or is validated after the action.',
        suggestion,
      });
      suggestions.push(suggestion);
      return;
    }
    if (!isObservableOutcome(text)) {
      const suggestion =
        `Then step ${index + 1}: explain what is observable (e.g., status updates, confirmation message) or include a quantitative target such as “within 2 seconds”.`;
      warnings.push({
        index,
        message: `Then step ${index + 1} lacks an observable or measurable result.`,
        details: 'Then steps should describe what testers can see, confirm, or measure to verify success.',
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
      suggestion: 'Example: “Then the request status updates to Approved and a confirmation email is sent”.',
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

function insertAcceptanceTest(
  db,
  { storyId, title = '', given, when, then, status = ACCEPTANCE_TEST_STATUS_DRAFT, timestamp = now() }
) {
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

  function insertTask(
    db,
    {
      storyId,
      title,
      description = '',
      status = TASK_STATUS_DEFAULT,
      assigneeEmail,
      estimationHours = null,
      timestamp = now(),
    }
  ) {
    const statement = db.prepare(
      'INSERT INTO tasks (story_id, title, description, status, assignee_email, estimation_hours, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
    );
    return statement.run(
      storyId,
      title,
      description,
      status,
      assigneeEmail,
      estimationHours,
      timestamp,
      timestamp
    );
  }

  function insertDependency(db, { storyId, dependsOnStoryId, relationship = STORY_DEPENDENCY_DEFAULT }) {
    const normalizedRelationship = normalizeDependencyRelationship(relationship);
    const statement = db.prepare(
      'INSERT OR IGNORE INTO story_dependencies (story_id, depends_on_story_id, relationship) VALUES (?, ?, ?)' // prettier-ignore
    );
    return statement.run(storyId, dependsOnStoryId, normalizedRelationship);
  }

function buildTaskFromRow(row) {
  let status = TASK_STATUS_DEFAULT;
  try {
    status = normalizeTaskStatus(row.status);
  } catch {
    status = TASK_STATUS_DEFAULT;
  }
  let estimationHours = null;
  if (row != null && Object.prototype.hasOwnProperty.call(row, 'estimation_hours')) {
    const numeric = Number(row.estimation_hours);
    if (Number.isFinite(numeric) && numeric >= 0) {
      estimationHours = numeric;
    }
  }
  return {
    id: row.id,
    storyId: row.story_id,
    title: row.title ?? '',
    description: row.description ?? '',
    status,
    assigneeEmail: row.assignee_email ?? '',
    estimationHours,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeStoryText(value, fallback) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || fallback;
}

function normalizeIdeaAction(idea) {
  if (!idea) return { action: '', summary: '' };
  let text = String(idea).trim();
  if (!text) return { action: '', summary: '' };
  const summary = text.replace(/\s+/g, ' ');
  text = summary;
  text = text.replace(/^[Gg]iven\s+/, '');
  text = text.replace(/^[Ww]hen\s+/, '');
  text = text.replace(/^[Tt]hen\s+/, '');
  text = text.replace(/^to\s+/, '');
  text = text.replace(/\.$/, '');
  if (!text) return { action: '', summary };
  if (/^I\s+want\s+to\s+/i.test(text)) {
    text = text.replace(/^I\s+want\s+to\s+/i, '');
  }
  if (/^We\s+need\s+to\s+/i.test(text)) {
    text = text.replace(/^We\s+need\s+to\s+/i, '');
  }
  if (/^[A-Z]/.test(text)) {
    text = text.charAt(0).toLowerCase() + text.slice(1);
  }
  const pronounPrefix = /^(?:they|the|a|an|user|customer|system|administrator)\b/i.test(text)
    ? ''
    : 'they ';
  const action = pronounPrefix ? `${pronounPrefix}${text}` : text;
  return { action, summary };
}

function describePersona(persona) {
  const normalized = normalizeStoryText(persona, 'the user');
  if (/^(?:the|a|an)\b/i.test(normalized)) {
    return normalized;
  }
  return `the ${normalized}`;
}

function defaultAcceptanceTestDraft(story, ordinal, reason, idea = '') {
  const persona = normalizeStoryText(story.asA, 'the user');
  const action = normalizeStoryText(story.iWant, 'perform the described action');
  const outcome = normalizeStoryText(story.soThat, 'achieve the desired outcome');
  const titleBase = normalizeStoryText(story.title, `Story ${story.id}`);
  const verificationLabel = reason === 'update' ? 'Update verification' : 'Initial verification';
  const title = acceptanceTestsHasTitleColumn
    ? `${titleBase} – ${verificationLabel} #${ordinal}`
    : '';

  const personaSubject = describePersona(persona);
  const normalizedAction = action.replace(/^to\s+/i, '').replace(/\.$/, '');
  const sanitizedAction = normalizedAction.replace(/^(?:attempts|tries)\s+to\s+/i, '');
  const fallbackAction = sanitizedAction
    ? `attempts to ${sanitizedAction}`
    : 'attempts to perform the described action';
  const { summary: ideaSummary } = normalizeIdeaAction(idea);

  const given = ideaSummary
    ? [
        `Given ${personaSubject} has access to the system`,
        `And the idea "${ideaSummary}" has been prioritised for implementation`,
      ]
    : [`Given ${personaSubject} has access to the system`];

  const when = ideaSummary
    ? [`When ${personaSubject} works on the idea "${ideaSummary}" within the system`]
    : [`When ${personaSubject} ${fallbackAction}`];

  const then = ideaSummary
    ? [
        `Then observable evidence confirms "${ideaSummary}" meets the acceptance criteria`,
        `And ${outcome} is verified with stakeholders`,
      ]
    : [
        `Then ${outcome} is completed within 2 seconds`,
        'And a confirmation code of at least 6 characters is recorded',
      ];

  return { title, given, when, then, source: 'fallback', summary: '' };
}

function normalizeGeneratedSteps(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry && entry.length > 0);
}

async function requestAcceptanceTestDraftFromOpenAi(story, ordinal, reason, config, { idea = '' } = {}) {
  if (!config.enabled) {
    return null;
  }

  const messages = [
    {
      role: 'system',
      content:
        'You are a QA engineer who writes Given/When/Then acceptance tests. Respond ONLY with JSON containing "summary", optional "titleSuffix", and string arrays "given", "when", "then". Each array must include at least one entry. Describe observable or measurable outcomes in the Then steps.',
    },
    {
      role: 'user',
      content: JSON.stringify(
        {
          story: {
            id: story.id,
            title: story.title || '',
            asA: story.asA || story.as_a || '',
            iWant: story.iWant || story.i_want || '',
            soThat: story.soThat || story.so_that || '',
            description: story.description || '',
            components: normalizeComponentsInput(
              Array.isArray(story.components) || typeof story.components === 'string'
                ? story.components
                : []
            ),
            reason,
            ordinal,
          },
          idea: idea || undefined,
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
    const errorText = await response.text().catch(() => '');
    const error = new Error(`OpenAI request failed with status ${response.status}`);
    error.status = response.status;
    error.body = errorText;
    throw error;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    const error = new Error('OpenAI response did not include JSON content for acceptance test draft');
    error.body = content;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    const parseError = new Error('Failed to parse OpenAI acceptance test draft response');
    parseError.cause = error;
    parseError.body = jsonText;
    throw parseError;
  }

  const given = normalizeGeneratedSteps(parsed.given);
  const when = normalizeGeneratedSteps(parsed.when);
  const then = normalizeGeneratedSteps(parsed.then);

  if (!given.length || !when.length || !then.length) {
    const error = new Error('OpenAI acceptance test draft missing Given/When/Then content');
    error.body = parsed;
    throw error;
  }

  const titleSuffix = typeof parsed.titleSuffix === 'string' ? parsed.titleSuffix.trim() : '';
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';

  const titleBase = normalizeStoryText(story.title, `Story ${story.id}`);
  const title = acceptanceTestsHasTitleColumn
    ? `${titleBase} – ${titleSuffix || (reason === 'update' ? 'Update verification' : 'Initial verification')} #${ordinal}`
    : '';

  return {
    title,
    given,
    when,
    then,
    source: 'ai',
    summary,
  };
}

async function generateAcceptanceTestDraft(story, ordinal, reason, { idea = '' } = {}) {
  const config = readOpenAiConfig();
  if (!config.enabled) {
    return defaultAcceptanceTestDraft(story, ordinal, reason, idea);
  }

  try {
    const aiDraft = await requestAcceptanceTestDraftFromOpenAi(story, ordinal, reason, config, { idea });
    if (aiDraft) {
      return aiDraft;
    }
  } catch (error) {
    console.error('OpenAI acceptance test draft generation failed', error);
  }

  return defaultAcceptanceTestDraft(story, ordinal, reason, idea);
}

async function createAutomaticAcceptanceTest(db, story, { reason = 'create', existingCount = null } = {}) {
  const countRow =
    existingCount != null
      ? { count: existingCount }
      : db.prepare('SELECT COUNT(*) as count FROM acceptance_tests WHERE story_id = ?').get(story.id) || {
          count: 0,
        };
  const ordinal = Number(countRow.count ?? 0) + 1;
  const content = await generateAcceptanceTestDraft(story, ordinal, reason);
  return insertAcceptanceTest(db, {
    storyId: story.id,
    title: content.title,
    given: content.given,
    when: content.when,
    then: content.then,
    status: ACCEPTANCE_TEST_STATUS_DRAFT,
  });
}

function markAcceptanceTestsForReview(db, storyId) {
  const statement = db.prepare(
    'UPDATE acceptance_tests SET status = ?, updated_at = ? WHERE story_id = ?' // prettier-ignore
  );
  statement.run(ACCEPTANCE_TEST_STATUS_REVIEW, now(), storyId);
}

function isAcceptanceTestPassed(status) {
  return typeof status === 'string' && status.trim().toLowerCase() === 'pass';
}

function ensureCanMarkStoryDone(db, storyId) {
  const storyRows = db
    .prepare('SELECT id, parent_id, title, status FROM user_stories')
    .all();
  const childrenByParent = new Map();
  storyRows.forEach((row) => {
    const parentId = row.parent_id == null ? null : Number(row.parent_id);
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push(row);
  });

  const descendants = [];
  const stack = [...(childrenByParent.get(storyId) || [])];
  while (stack.length) {
    const node = stack.pop();
    descendants.push(node);
    const nested = childrenByParent.get(node.id) || [];
    nested.forEach((child) => stack.push(child));
  }

  const incompleteChildren = descendants.filter(
    (child) => safeNormalizeStoryStatus(child.status) !== 'Done'
  );

  const testQuery = acceptanceTestsHasTitleColumn
    ? 'SELECT id, title, status FROM acceptance_tests WHERE story_id = ?'
    : 'SELECT id, status FROM acceptance_tests WHERE story_id = ?';
  const tests = db.prepare(testQuery).all(storyId);
  const failingTests = tests.filter((test) => !isAcceptanceTestPassed(test.status));

  const details = {
    incompleteChildren: incompleteChildren.map((child) => ({
      id: child.id,
      title: child.title || '',
      status: safeNormalizeStoryStatus(child.status),
    })),
    failingTests: failingTests.map((test) => ({
      id: test.id,
      title: acceptanceTestsHasTitleColumn && typeof test.title === 'string' ? test.title : '',
      status: test.status || ACCEPTANCE_TEST_STATUS_DRAFT,
    })),
    missingTests: tests.length === 0,
  };

  if (
    details.incompleteChildren.length > 0 ||
    details.missingTests ||
    details.failingTests.length > 0
  ) {
    const error = new Error(
      'Cannot mark story as Done until all child stories are Done and acceptance tests have status Pass.'
    );
    error.statusCode = 409;
    error.code = 'STORY_STATUS_BLOCKED';
    error.details = details;
    throw error;
  }
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
    UPDATE user_stories SET components = '[]' WHERE components IS NULL OR TRIM(components) = '';
    UPDATE user_stories SET assignee_email = '' WHERE assignee_email IS NULL;
    UPDATE user_stories SET status = 'Draft' WHERE status IS NULL;
    UPDATE acceptance_tests SET status = 'Draft' WHERE status IS NULL;
    UPDATE reference_documents SET name = '' WHERE name IS NULL;
    UPDATE reference_documents SET url = '' WHERE url IS NULL;
    UPDATE tasks SET description = '' WHERE description IS NULL;
    UPDATE tasks SET status = 'Not Started' WHERE status IS NULL OR TRIM(status) = '';
    UPDATE story_dependencies SET relationship = 'depends' WHERE relationship IS NULL OR TRIM(relationship) = '';
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
      components TEXT DEFAULT '[]',
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
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'Not Started',
      assignee_email TEXT NOT NULL,
      estimation_hours REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS story_dependencies (
      story_id INTEGER NOT NULL,
      depends_on_story_id INTEGER NOT NULL,
      relationship TEXT DEFAULT 'depends',
      PRIMARY KEY (story_id, depends_on_story_id),
      FOREIGN KEY(story_id) REFERENCES user_stories(id) ON DELETE CASCADE,
      FOREIGN KEY(depends_on_story_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
  `);

  ensureColumn(db, 'user_stories', 'mr_id', 'mr_id INTEGER DEFAULT 1');
  ensureColumn(db, 'user_stories', 'parent_id', 'parent_id INTEGER');
  ensureColumn(db, 'user_stories', 'description', "description TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'as_a', "as_a TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'i_want', "i_want TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'so_that', "so_that TEXT DEFAULT ''");
  ensureColumn(db, 'user_stories', 'components', "components TEXT DEFAULT '[]'");
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

  ensureColumn(db, 'tasks', 'description', "description TEXT DEFAULT ''");
  ensureColumn(db, 'tasks', 'status', "status TEXT DEFAULT 'Not Started'");
  ensureColumn(db, 'tasks', 'assignee_email', "assignee_email TEXT DEFAULT ''");
  ensureColumn(db, 'tasks', 'estimation_hours', 'estimation_hours REAL');
  ensureColumn(db, 'tasks', 'created_at', 'created_at TEXT');
  ensureColumn(db, 'tasks', 'updated_at', 'updated_at TEXT');

  db.exec(`
    UPDATE tasks
    SET assignee_email = COALESCE(assignee_email, '')
  `);
  db.exec(`
    UPDATE tasks
    SET assignee_email = (
      SELECT assignee_email FROM user_stories WHERE user_stories.id = tasks.story_id
    )
    WHERE (assignee_email IS NULL OR TRIM(assignee_email) = '')
      AND EXISTS (
        SELECT 1 FROM user_stories WHERE user_stories.id = tasks.story_id
      );
  `);
  db.exec(`
    UPDATE tasks
    SET assignee_email = 'owner@example.com'
    WHERE assignee_email IS NULL OR TRIM(assignee_email) = '';
  `);

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
      'INSERT INTO user_stories (title, description, as_a, i_want, so_that, components, story_point, assignee_email, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
    );
    const { lastInsertRowid: rootId } = insertStory.run(
      'Enable secure login',
      'As an existing customer I want to sign in quickly so I can reach my dashboard without friction.',
      'Authenticated customer',
      'sign in with email and password',
      'access my personalized dashboard immediately',
      JSON.stringify(['WorkModel', 'Orchestration_Engagement']),
      5,
      'pm@example.com',
      'Ready',
      timestamp,
      timestamp
    );

    const insertChild = db.prepare(
      'INSERT INTO user_stories (mr_id, parent_id, title, description, as_a, i_want, so_that, components, story_point, assignee_email, status, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
    );
    const { lastInsertRowid: formStoryId } = insertChild.run(
      rootId,
      'Render login form',
      'As a returning customer I want a familiar login form so that I can authenticate without confusion.',
      'Returning customer',
      'view the login form instantly',
      'enter my credentials without delay',
      JSON.stringify(['Document_Intelligence', 'Run_Verify']),
      3,
      'designer@example.com',
      'Blocked',
      timestamp,
      timestamp
    );

    const blockerTimestamp = now();
    const { lastInsertRowid: apiStoryId } = insertChild.run(
      rootId,
      'Finalize login API contract',
      'As a platform engineer I want an agreed API contract so integrations remain stable.',
      'Platform engineer',
      'share the login API schema with dependent teams',
      'prevent breaking changes from blocking dependent workstreams',
      JSON.stringify(['WorkModel', 'Traceabilty_Insight']),
      5,
      'lead@example.com',
      'In Progress',
      blockerTimestamp,
      blockerTimestamp
    );

    insertAcceptanceTest(db, {
      storyId: Number(apiStoryId),
      title: 'API contract published',
      given: ['The platform team has drafted the login API schema'],
      when: ['The schema is shared with downstream integrators'],
      then: ['All dependent teams confirm compatibility within 3 business days'],
      status: 'Draft',
      timestamp: blockerTimestamp,
    });

    insertDependency(db, {
      storyId: Number(formStoryId),
      dependsOnStoryId: Number(apiStoryId),
      relationship: 'blocks',
    });

    insertAcceptanceTest(db, {
      storyId: rootId,
      title: 'Happy path login',
      given: ['A customer with valid credentials'],
      when: ['They submit the login form'],
      then: ['Dashboard loads within 2000 ms'],
      status: 'Ready',
      timestamp,
    });

    insertTask(db, {
      storyId: rootId,
      title: 'Review authentication logs',
      description: 'Ensure login attempts are captured for auditing.',
      status: 'In Progress',
      assigneeEmail: 'designer@example.com',
      timestamp,
    });

    insertTask(db, {
      storyId: rootId,
      title: 'Plan MFA rollout comms',
      description: 'Draft announcement and customer education plan.',
      status: 'Not Started',
      assigneeEmail: 'designer@example.com',
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

function hasActiveProgressChild(children) {
  if (!Array.isArray(children) || children.length === 0) {
    return false;
  }
  return children.some((child) => {
    if (!child) return false;
    const status = safeNormalizeStoryStatus(child.status);
    return status === 'In Progress' || status === 'Done';
  });
}

function propagateParentProgressStatus(nodes) {
  function walk(story) {
    if (!story || !Array.isArray(story.children) || story.children.length === 0) {
      return;
    }
    story.children.forEach((child) => walk(child));
    const storyStatus = safeNormalizeStoryStatus(story.status);
    if (storyStatus === 'Ready' && hasActiveProgressChild(story.children)) {
      story.status = 'In Progress';
    }
  }

  nodes.forEach((story) => walk(story));
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

function loadDependencyRows(db) {
  try {
    return db
      .prepare('SELECT story_id, depends_on_story_id, relationship FROM story_dependencies ORDER BY story_id, depends_on_story_id')
      .all();
  } catch (error) {
    if (error && SQLITE_NO_SUCH_TABLE.test(error.message || '')) {
      return [];
    }
    throw error;
  }
}

async function loadStories(db) {
  const storyRows = db
    .prepare('SELECT * FROM user_stories ORDER BY (parent_id IS NOT NULL), parent_id, id')
    .all();
  const testRows = db.prepare('SELECT * FROM acceptance_tests ORDER BY story_id, id').all();
  const docRows = db.prepare('SELECT * FROM reference_documents ORDER BY story_id, id').all();
  const taskRows = db.prepare('SELECT * FROM tasks ORDER BY story_id, id').all();

  const stories = storyRows.map((row) => {
    const components = normalizeComponentsInput(parseJsonArray(row.components));
    const story = {
      id: row.id,
      mrId: row.mr_id,
      parentId: row.parent_id,
      title: row.title,
      description: row.description ?? '',
      asA: row.as_a ?? '',
      iWant: row.i_want ?? '',
      soThat: row.so_that ?? '',
      components,
      storyPoint: row.story_point,
      assigneeEmail: row.assignee_email ?? '',
      status: safeNormalizeStoryStatus(row.status),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      acceptanceTests: [],
      referenceDocuments: [],
      tasks: [],
      dependencies: [],
      dependents: [],
      blockedBy: [],
      blocking: [],
    };
    return story;
  });

  const { roots, byId } = attachChildren(stories);

  propagateParentProgressStatus(roots);

  const dependencyRows = loadDependencyRows(db);
  dependencyRows.forEach((row) => {
    const dependent = byId.get(row.story_id);
    const dependency = byId.get(row.depends_on_story_id);
    if (!dependent || !dependency) {
      return;
    }
    const relationship = normalizeDependencyRelationship(row.relationship);
    const dependencyEntry = {
      storyId: dependency.id,
      title: dependency.title,
      status: dependency.status,
      relationship,
    };
    dependent.dependencies.push(dependencyEntry);
    if (relationship === 'blocks') {
      dependent.blockedBy.push(dependencyEntry);
    }
    const dependentEntry = {
      storyId: dependent.id,
      title: dependent.title,
      status: dependent.status,
      relationship,
    };
    dependency.dependents.push(dependentEntry);
    if (relationship === 'blocks') {
      dependency.blocking.push(dependentEntry);
    }
  });

  const sortByStoryId = (a, b) => {
    if (a.storyId === b.storyId) {
      return a.title.localeCompare(b.title);
    }
    return a.storyId - b.storyId;
  };
  stories.forEach((story) => {
    story.dependencies.sort(sortByStoryId);
    story.dependents.sort(sortByStoryId);
    story.blockedBy.sort(sortByStoryId);
    story.blocking.sort(sortByStoryId);
  });

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

  taskRows.forEach((row) => {
    const story = byId.get(row.story_id);
    if (!story) return;
    story.tasks.push(buildTaskFromRow(row));
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
    components: normalizeComponentsInput(parseJsonArray(row.components)),
    storyPoint: row.story_point,
    assigneeEmail: row.assignee_email ?? '',
    status: safeNormalizeStoryStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    acceptanceTests: [],
    referenceDocuments: [],
    tasks: [],
    children: [],
    dependencies: [],
    dependents: [],
    blockedBy: [],
    blocking: [],
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

  const taskRows = db.prepare('SELECT * FROM tasks WHERE story_id = ? ORDER BY id').all(storyId);
  taskRows.forEach((taskRow) => {
    story.tasks.push(buildTaskFromRow(taskRow));
  });

  const childRows = db.prepare('SELECT id, status FROM user_stories WHERE parent_id = ?').all(storyId);
  if (safeNormalizeStoryStatus(story.status) === 'Ready' && hasActiveProgressChild(childRows)) {
    story.status = 'In Progress';
  }

  const dependencyRows = loadDependencyRows(db).filter(
    (entry) => entry.story_id === storyId || entry.depends_on_story_id === storyId
  );
  if (dependencyRows.length > 0) {
    const relatedIds = new Set();
    dependencyRows.forEach((entry) => {
      relatedIds.add(entry.story_id);
      relatedIds.add(entry.depends_on_story_id);
    });
    relatedIds.delete(storyId);
    let relatedStories = [];
    if (relatedIds.size > 0) {
      const placeholders = Array.from({ length: relatedIds.size }, () => '?').join(', ');
      const lookupStatement = db.prepare(
        `SELECT id, title, status FROM user_stories WHERE id IN (${placeholders})`
      );
      relatedStories = lookupStatement.all(...Array.from(relatedIds));
    }
    const relatedById = new Map();
    relatedStories.forEach((item) => {
      relatedById.set(item.id, {
        id: item.id,
        title: item.title,
        status: safeNormalizeStoryStatus(item.status),
      });
    });

    dependencyRows.forEach((entry) => {
      const relationship = normalizeDependencyRelationship(entry.relationship);
      if (entry.story_id === storyId) {
        const dependency = relatedById.get(entry.depends_on_story_id);
        if (dependency) {
          const dependencyEntry = {
            storyId: dependency.id,
            title: dependency.title,
            status: dependency.status,
            relationship,
          };
          story.dependencies.push(dependencyEntry);
          if (relationship === 'blocks') {
            story.blockedBy.push(dependencyEntry);
          }
        }
      }
      if (entry.depends_on_story_id === storyId) {
        const dependent = relatedById.get(entry.story_id);
        if (dependent) {
          const dependentEntry = {
            storyId: dependent.id,
            title: dependent.title,
            status: dependent.status,
            relationship,
          };
          story.dependents.push(dependentEntry);
          if (relationship === 'blocks') {
            story.blocking.push(dependentEntry);
          }
        }
      }
    });

    const sortByStoryId = (a, b) => {
      if (a.storyId === b.storyId) {
        return a.title.localeCompare(b.title);
      }
      return a.storyId - b.storyId;
    };
    story.dependencies.sort(sortByStoryId);
    story.dependents.sort(sortByStoryId);
    story.blockedBy.sort(sortByStoryId);
    story.blocking.sort(sortByStoryId);
  }

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

    if (pathname === '/api/runtime-data' && method === 'GET') {
      try {
        const body = await exportRuntimeDataBuffer(db);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="app.sqlite"',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Disposition',
        });
        res.end(body);
      } catch (error) {
        if (error && error.code === 'ENOENT') {
          sendJson(res, 404, { message: 'Runtime data not found' });
        } else {
          console.error('Failed to read runtime data', error);
          sendJson(res, 500, {
            message: 'Failed to read runtime data',
            details: error.message,
          });
        }
      }
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
        const components = normalizeComponentsInput(payload.components, { strict: true });
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
          components,
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
          'INSERT INTO user_stories (mr_id, parent_id, title, description, as_a, i_want, so_that, components, story_point, assignee_email, status, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' // prettier-ignore
        );
        const { lastInsertRowid } = statement.run(
          parentId,
          title,
          description,
          asA,
          iWant,
          soThat,
          serializeComponents(components),
          storyPoint,
          assigneeEmail,
          'Draft',
          timestamp,
          timestamp
        );
        const newStoryId = Number(lastInsertRowid);
        await createAutomaticAcceptanceTest(db, {
          id: newStoryId,
          title,
          asA,
          iWant,
          soThat,
          components,
        });
        const created = flattenStories(await loadStories(db)).find((story) => story.id === newStoryId);
        sendJson(res, 201, created ?? null);
      } catch (error) {
        const status = error.statusCode ?? 500;
        const body = { message: error.message || 'Failed to create story' };
        if (error.code) body.code = error.code;
        if (error.details) body.details = error.details;
        sendJson(res, status, body);
      }
      return;
    }

    if (pathname === '/api/stories/draft' && method === 'POST') {
      try {
        const payload = await parseJson(req);
        const idea = String(payload.idea ?? '').trim();
        if (!idea) {
          throw Object.assign(new Error('Idea text is required'), { statusCode: 400 });
        }
        const parentId =
          payload.parentId == null || payload.parentId === '' ? null : Number(payload.parentId);
        let parent = null;
        if (Number.isFinite(parentId)) {
          const stories = await loadStories(db);
          parent = flattenStories(stories).find((story) => story.id === parentId) ?? null;
        }
        const draft = generateStoryDraftFromIdea(idea, { parent });
        sendJson(res, 200, draft);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to generate story draft' });
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
        const requestedComponents = payload.components;

        const existingStmt = db.prepare('SELECT * FROM user_stories WHERE id = ?');
        const existing = existingStmt.get(storyId);
        if (!existing) {
          throw Object.assign(new Error('Story not found'), { statusCode: 404 });
        }

        const storyPoint =
          payload.storyPoint === undefined ? existing.story_point : normalizeStoryPoint(payload.storyPoint);
        const existingComponents = parseJsonArray(existing.components);
        const normalizedExistingComponents = normalizeComponentsInput(existingComponents);
        const components =
          requestedComponents === undefined
            ? normalizedExistingComponents
            : normalizeComponentsInput(requestedComponents, { strict: true });

        const currentStatus = safeNormalizeStoryStatus(existing.status);
        const nextStatus =
          payload.status === undefined ? currentStatus : normalizeStoryStatus(payload.status);

        const storyForValidation = {
          title,
          asA: asA ?? existing.as_a,
          iWant: iWant ?? existing.i_want,
          soThat: soThat ?? existing.so_that,
          description: description || existing.description || '',
          storyPoint,
          components,
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

        if (nextStatus === 'Done') {
          ensureCanMarkStoryDone(db, storyId);
        }

        const nextAsA = asA ?? existing.as_a ?? '';
        const nextIWant = iWant ?? existing.i_want ?? '';
        const nextSoThat = soThat ?? existing.so_that ?? '';
        const descriptionChanged = description !== (existing.description ?? '');
        const assigneeChanged = assigneeEmail !== (existing.assignee_email ?? '');
        const storyPointChanged = (storyPoint ?? null) !== (existing.story_point ?? null);
        const asAChanged = nextAsA !== (existing.as_a ?? '');
        const iWantChanged = nextIWant !== (existing.i_want ?? '');
        const soThatChanged = nextSoThat !== (existing.so_that ?? '');
        const titleChanged = title !== existing.title;
        const componentsChanged =
          JSON.stringify(components) !== JSON.stringify(normalizedExistingComponents);
        const contentChanged =
          titleChanged ||
          descriptionChanged ||
          assigneeChanged ||
          storyPointChanged ||
          asAChanged ||
          iWantChanged ||
          soThatChanged ||
          componentsChanged;

        const update = db.prepare(
          'UPDATE user_stories SET title = ?, description = ?, components = ?, story_point = ?, assignee_email = ?, as_a = ?, i_want = ?, so_that = ?, status = ?, updated_at = ? WHERE id = ?' // prettier-ignore
        );
        update.run(
          title,
          description,
          serializeComponents(components),
          storyPoint,
          assigneeEmail,
          nextAsA,
          nextIWant,
          nextSoThat,
          nextStatus,
          now(),
          storyId
        );

        if (contentChanged) {
          const existingTestCountRow =
            db.prepare('SELECT COUNT(*) as count FROM acceptance_tests WHERE story_id = ?').get(storyId) ||
            {
              count: 0,
            };
          if (Number(existingTestCountRow.count ?? 0) > 0) {
            markAcceptanceTestsForReview(db, storyId);
          }
          await createAutomaticAcceptanceTest(
            db,
            {
              id: storyId,
              title,
              asA: nextAsA,
              iWant: nextIWant,
              soThat: nextSoThat,
              components,
            },
            { reason: 'update', existingCount: Number(existingTestCountRow.count ?? 0) }
          );
        }
        const updated = flattenStories(await loadStories(db)).find((story) => story.id === storyId);
        sendJson(res, 200, updated ?? null);
      } catch (error) {
        const status = error.statusCode ?? 500;
        const body = { message: error.message || 'Failed to update story' };
        if (error.code) body.code = error.code;
        if (error.details) body.details = error.details;
        sendJson(res, status, body);
      }
      return;
    }

    const dependencyCreateMatch = pathname.match(/^\/api\/stories\/(\d+)\/dependencies$/);
    if (dependencyCreateMatch && method === 'POST') {
      const storyId = Number(dependencyCreateMatch[1]);
      try {
        const payload = await parseJson(req);
        const candidateId =
          payload.dependsOnStoryId ?? payload.storyId ?? payload.dependsOn ?? payload.targetStoryId;
        const dependsOnStoryId = Number(candidateId);
        if (!Number.isFinite(dependsOnStoryId)) {
          throw Object.assign(new Error('Select a valid dependency story'), { statusCode: 400 });
        }
        if (dependsOnStoryId === storyId) {
          throw Object.assign(new Error('Stories cannot depend on themselves'), { statusCode: 400 });
        }

        const relationship = normalizeDependencyRelationship(payload.relationship);

        const storyLookup = db.prepare('SELECT id FROM user_stories WHERE id = ?');
        const storyExists = storyLookup.get(storyId);
        if (!storyExists) {
          throw Object.assign(new Error('Story not found'), { statusCode: 404 });
        }
        const dependencyExists = storyLookup.get(dependsOnStoryId);
        if (!dependencyExists) {
          throw Object.assign(new Error('Dependency story not found'), { statusCode: 404 });
        }

        const existing = db
          .prepare('SELECT relationship FROM story_dependencies WHERE story_id = ? AND depends_on_story_id = ?')
          .get(storyId, dependsOnStoryId);
        if (existing) {
          if (existing.relationship !== relationship) {
            db.prepare(
              'UPDATE story_dependencies SET relationship = ? WHERE story_id = ? AND depends_on_story_id = ?'
            ).run(relationship, storyId, dependsOnStoryId);
          }
        } else {
          insertDependency(db, { storyId, dependsOnStoryId, relationship });
        }

        const refreshed = await loadStoryWithDetails(db, storyId);
        sendJson(res, 201, refreshed ?? null);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to add dependency' });
      }
      return;
    }

    const dependencyDeleteMatch = pathname.match(/^\/api\/stories\/(\d+)\/dependencies\/(\d+)$/);
    if (dependencyDeleteMatch && method === 'DELETE') {
      const storyId = Number(dependencyDeleteMatch[1]);
      const dependsOnStoryId = Number(dependencyDeleteMatch[2]);
      try {
        const storyLookup = db.prepare('SELECT id FROM user_stories WHERE id = ?');
        const storyExists = storyLookup.get(storyId);
        if (!storyExists) {
          throw Object.assign(new Error('Story not found'), { statusCode: 404 });
        }

        const result = db
          .prepare('DELETE FROM story_dependencies WHERE story_id = ? AND depends_on_story_id = ?')
          .run(storyId, dependsOnStoryId);
        if (result.changes === 0) {
          sendJson(res, 404, { message: 'Dependency not found' });
          return;
        }

        const refreshed = await loadStoryWithDetails(db, storyId);
        sendJson(res, 200, refreshed ?? null);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to remove dependency' });
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

    const testDraftMatch = pathname.match(/^\/api\/stories\/(\d+)\/tests\/draft$/);
    if (testDraftMatch && method === 'POST') {
      const storyId = Number(testDraftMatch[1]);
      try {
        const payload = await parseJson(req);
        const idea = typeof payload.idea === 'string' ? payload.idea.trim() : '';
        const allStories = flattenStories(await loadStories(db));
        const story = allStories.find((node) => node.id === storyId);
        if (!story) {
          sendJson(res, 404, { message: 'Story not found' });
          return;
        }
        const ordinal = story.acceptanceTests.length + 1;
        const draft = await generateAcceptanceTestDraft(story, ordinal, 'manual', { idea });
        sendJson(res, 200, {
          ...draft,
          status: ACCEPTANCE_TEST_STATUS_DRAFT,
        });
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to generate acceptance test draft' });
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
            message: 'Then steps must describe observable or measurable outcomes.',
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
            message: 'Then steps must describe observable or measurable outcomes.',
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

    const codexDelegationMatch = pathname.match(/^\/api\/stories\/(\d+)\/codex-delegation$/);
    if (codexDelegationMatch && method === 'POST') {
      const storyId = Number(codexDelegationMatch[1]);
      try {
        const story = await loadStoryWithDetails(db, storyId);
        if (!story) {
          sendJson(res, 404, { message: 'Story not found' });
          return;
        }

        const payload = await parseJson(req);
        const repositoryUrlInput =
          typeof payload.repositoryUrl === 'string' ? payload.repositoryUrl.trim() : '';
        if (!repositoryUrlInput) {
          sendJson(res, 400, { message: 'Repository URL is required' });
          return;
        }
        let repositoryUrl;
        try {
          const parsedRepository = new URL(repositoryUrlInput);
          if (!['http:', 'https:'].includes(parsedRepository.protocol)) {
            throw new Error('Repository URL must use HTTP or HTTPS');
          }
          repositoryUrl = parsedRepository.toString();
        } catch (error) {
          sendJson(res, 400, { message: 'Repository URL must be a valid HTTP(S) address' });
          return;
        }

        const prTitle = String(payload.prTitle ?? '').trim();
        if (!prTitle) {
          sendJson(res, 400, { message: 'PR title is required' });
          return;
        }

        const prBody = typeof payload.prBody === 'string' ? payload.prBody : '';
        const prTitleTemplate =
          typeof payload.prTitleTemplate === 'string' ? payload.prTitleTemplate : '';
        const prBodyTemplate =
          typeof payload.prBodyTemplate === 'string' ? payload.prBodyTemplate : '';
        const branchName = typeof payload.branchName === 'string' ? payload.branchName.trim() : '';
        if (branchName && /\s/.test(branchName)) {
          sendJson(res, 400, { message: 'Branch name cannot contain whitespace' });
          return;
        }

        const projectUrlInput = typeof payload.projectUrl === 'string' ? payload.projectUrl.trim() : '';
        let projectUrl = projectUrlInput;
        if (projectUrl) {
          try {
            const parsedProject = new URL(projectUrl);
            if (!['http:', 'https:'].includes(parsedProject.protocol)) {
              throw new Error('Codex project URL must use HTTP or HTTPS');
            }
            projectUrl = parsedProject.toString();
          } catch (error) {
            sendJson(res, 400, { message: 'Codex project URL must be a valid HTTP(S) address' });
            return;
          }
        }

        const delegationOverride =
          typeof payload.delegationServerUrl === 'string' ? payload.delegationServerUrl.trim() : '';
        const delegationToken =
          typeof payload.delegationToken === 'string' ? payload.delegationToken.trim() : '';
        let delegationEndpoint = delegationOverride;
        if (delegationEndpoint) {
          try {
            const parsedDelegation = new URL(delegationEndpoint);
            if (!['http:', 'https:'].includes(parsedDelegation.protocol)) {
              throw new Error('Delegation server URL must use HTTP or HTTPS');
            }
            delegationEndpoint = parsedDelegation.toString();
          } catch (error) {
            sendJson(res, 400, { message: 'Delegation server URL must be a valid HTTP(S) address' });
            return;
          }
        }

        const config = readCodexDelegationConfig({
          endpoint: delegationEndpoint,
          projectUrl,
          token: delegationToken,
        });

        if (!config.endpoint) {
          sendJson(res, 503, { message: 'Codex delegation endpoint is not configured' });
          return;
        }

        const result = await delegateImplementationToCodex(story, {
          endpoint: config.endpoint,
          token: config.token,
          repositoryUrl,
          prTitle,
          prBody,
          prTitleTemplate,
          prBodyTemplate,
          branchName,
          projectUrl: config.projectUrl || undefined,
        });

        sendJson(res, 200, result);
      } catch (error) {
        const status = error.statusCode ?? 500;
        const body = { message: error.message || 'Failed to delegate story to Codex' };
        if (error.details) {
          body.details = error.details;
        }
        sendJson(res, status, body);
      }
      return;
    }

    const taskCreateMatch = pathname.match(/^\/api\/stories\/(\d+)\/tasks$/);
    if (taskCreateMatch && method === 'POST') {
      const storyId = Number(taskCreateMatch[1]);
      try {
        const story = await loadStoryWithDetails(db, storyId);
        if (!story) {
          sendJson(res, 404, { message: 'Story not found' });
          return;
        }
        const payload = await parseJson(req);
        const title = String(payload.title ?? '').trim();
        if (!title) {
          throw Object.assign(new Error('Task title is required'), { statusCode: 400 });
        }
        const description = String(payload.description ?? '').trim();
        const status = normalizeTaskStatus(payload.status);
        const assigneeEmail = String(payload.assigneeEmail ?? '').trim();
        if (!assigneeEmail) {
          throw Object.assign(new Error('Task assignee is required'), { statusCode: 400 });
        }
        const estimationHours = normalizeTaskEstimationHours(payload.estimationHours);
        const timestamp = now();
        const { lastInsertRowid } = insertTask(db, {
          storyId,
          title,
          description,
          status,
          assigneeEmail,
          estimationHours,
          timestamp,
        });
        const refreshed = await loadStoryWithDetails(db, storyId);
        const created = refreshed?.tasks.find((task) => task.id === Number(lastInsertRowid));
        sendJson(res, 201, created || buildTaskFromRow({
          id: Number(lastInsertRowid),
          story_id: storyId,
          title,
          description,
          status,
          assignee_email: assigneeEmail,
          estimation_hours: estimationHours,
          created_at: timestamp,
          updated_at: timestamp,
        }));
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to create task' });
      }
      return;
    }

    const taskIdMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
    if (taskIdMatch && method === 'PATCH') {
      const taskId = Number(taskIdMatch[1]);
      try {
        const payload = await parseJson(req);
        const existing = db
          .prepare('SELECT * FROM tasks WHERE id = ?')
          .get(taskId);
        if (!existing) {
          sendJson(res, 404, { message: 'Task not found' });
          return;
        }
        const updates = [];
        const params = [];
        let nextTitle = existing.title ?? '';
        let nextDescription = existing.description ?? '';
        let nextStatus = existing.status ?? TASK_STATUS_DEFAULT;
        let nextAssigneeEmail = existing.assignee_email ?? '';
        let nextEstimationHours = existing.estimation_hours ?? null;
        if (Object.prototype.hasOwnProperty.call(payload, 'title')) {
          const title = String(payload.title ?? '').trim();
          if (!title) {
            throw Object.assign(new Error('Task title is required'), { statusCode: 400 });
          }
          updates.push('title = ?');
          params.push(title);
          nextTitle = title;
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
          const description = String(payload.description ?? '').trim();
          updates.push('description = ?');
          params.push(description);
          nextDescription = description;
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
          const status = normalizeTaskStatus(payload.status);
          updates.push('status = ?');
          params.push(status);
          nextStatus = status;
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'assigneeEmail')) {
          const assigneeEmail = String(payload.assigneeEmail ?? '').trim();
          if (!assigneeEmail) {
            throw Object.assign(new Error('Task assignee is required'), { statusCode: 400 });
          }
          updates.push('assignee_email = ?');
          params.push(assigneeEmail);
          nextAssigneeEmail = assigneeEmail;
        }
        if (Object.prototype.hasOwnProperty.call(payload, 'estimationHours')) {
          const estimationHours = normalizeTaskEstimationHours(payload.estimationHours);
          updates.push('estimation_hours = ?');
          params.push(estimationHours);
          nextEstimationHours = estimationHours;
        }
        if (updates.length === 0) {
          throw Object.assign(new Error('No fields to update'), { statusCode: 400 });
        }
        const updatedAt = now();
        updates.push('updated_at = ?');
        params.push(updatedAt);
        params.push(taskId);
        const statement = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
        statement.run(...params);
        const refreshed = await loadStoryWithDetails(db, existing.story_id);
        const updated = refreshed?.tasks.find((task) => task.id === taskId);
        sendJson(res, 200, updated || buildTaskFromRow({
          ...existing,
          title: nextTitle,
          description: nextDescription,
          status: nextStatus,
          assignee_email: nextAssigneeEmail,
          estimation_hours: nextEstimationHours,
          updated_at: updatedAt,
        }));
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to update task' });
      }
      return;
    }

    if (taskIdMatch && method === 'DELETE') {
      const taskId = Number(taskIdMatch[1]);
      const statement = db.prepare('DELETE FROM tasks WHERE id = ?');
      const result = statement.run(taskId);
      if (result.changes === 0) {
        sendJson(res, 404, { message: 'Task not found' });
      } else {
        sendJson(res, 204, {});
      }
      return;
    }

    if (pathname === '/api/documents/generate' && method === 'POST') {
      try {
        const payload = await parseJson(req);
        const type = payload?.type;
        if (!type) {
          sendJson(res, 400, { message: 'Document type is required' });
          return;
        }
        const tree = await loadStories(db);
        const flat = flattenStories(tree);
        const storyMap = new Map(flat.map((node) => [node.id, node]));
        const document = await generateDocumentFile(type, { tree, flat, map: storyMap });
        const title = document.title || defaultDocumentTitle(type);
        const filename = slugifyFilename(title);
        const markdown = document.content || '';
        const buffer = Buffer.from(markdown, 'utf8');

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('X-Document-Title', encodeURIComponent(title));
        res.setHeader('X-Document-Source', document.source || 'unknown');
        res.setHeader('X-Generated-At', now());
        res.end(buffer);
      } catch (error) {
        const status = error.statusCode ?? 500;
        sendJson(res, status, { message: error.message || 'Failed to generate document' });
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
