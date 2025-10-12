import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DATABASE_PATH = path.join(__dirname, 'data', 'app.sqlite');

export async function createDatabase() {
  const db = await open({
    filename: DATABASE_PATH,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      story_point INTEGER DEFAULT NULL,
      assignee_email TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS acceptance_tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      expected_result TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (story_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS reference_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (story_id) REFERENCES user_stories(id) ON DELETE CASCADE
    );
  `);

  const existingStories = await db.get('SELECT COUNT(*) as count FROM user_stories');
  if (existingStories.count === 0) {
    const now = new Date().toISOString();
    const { lastID: storyId } = await db.run(
      'INSERT INTO user_stories (title, description, story_point, assignee_email, created_at) VALUES (?, ?, ?, ?, ?)',
      [
        'Enable user login',
        'As a user I want to login so that I can access my dashboard.',
        5,
        'pm@example.com',
        now,
      ]
    );

    await db.run(
      'INSERT INTO acceptance_tests (story_id, title, expected_result, created_at) VALUES (?, ?, ?, ?)',
      [
        storyId,
        'Given valid credentials when submitting login form then dashboard appears within 2 seconds',
        'Dashboard appears',
        now,
      ]
    );

    await db.run(
      'INSERT INTO reference_documents (story_id, name, url, created_at) VALUES (?, ?, ?, ?)',
      [
        storyId,
        'Design Spec',
        'https://example.com/design',
        now,
      ]
    );
  }

  return db;
}

function mapStory(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    storyPoint: row.story_point,
    assigneeEmail: row.assignee_email,
    createdAt: row.created_at,
  };
}

export async function createApp() {
  const app = express();
  const db = await createDatabase();

  app.use(cors());
  app.use(express.json());

  app.get('/api/stories', async (_req, res) => {
    const stories = await db.all('SELECT * FROM user_stories ORDER BY id');
    const storyIds = stories.map((story) => story.id);
    let acceptanceTests = [];
    let references = [];
    if (storyIds.length) {
      const placeholders = storyIds.map(() => '?').join(',');
      acceptanceTests = await db.all(
        `SELECT * FROM acceptance_tests WHERE story_id IN (${placeholders}) ORDER BY id`,
        storyIds
      );
      references = await db.all(
        `SELECT * FROM reference_documents WHERE story_id IN (${placeholders}) ORDER BY id`,
        storyIds
      );
    }

    const groupedTests = acceptanceTests.reduce((acc, test) => {
      acc[test.story_id] = acc[test.story_id] || [];
      acc[test.story_id].push({
        id: test.id,
        title: test.title,
        expectedResult: test.expected_result,
        createdAt: test.created_at,
      });
      return acc;
    }, {});

    const groupedDocs = references.reduce((acc, doc) => {
      acc[doc.story_id] = acc[doc.story_id] || [];
      acc[doc.story_id].push({
        id: doc.id,
        name: doc.name,
        url: doc.url,
        createdAt: doc.created_at,
      });
      return acc;
    }, {});

    res.json(
      stories.map((story) => ({
        ...mapStory(story),
        acceptanceTests: groupedTests[story.id] || [],
        referenceDocuments: groupedDocs[story.id] || [],
      }))
    );
  });

  app.post('/api/stories', async (req, res) => {
    const { title, description = '', storyPoint = null, assigneeEmail = '' } = req.body;
    if (!title) {
      res.status(400).json({ message: 'Title is required' });
      return;
    }
    const now = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO user_stories (title, description, story_point, assignee_email, created_at) VALUES (?, ?, ?, ?, ?)',
      [title, description, storyPoint, assigneeEmail, now]
    );
    const story = await db.get('SELECT * FROM user_stories WHERE id = ?', [result.lastID]);
    res.status(201).json(mapStory(story));
  });

  app.patch('/api/stories/:id', async (req, res) => {
    const storyId = Number(req.params.id);
    const story = await db.get('SELECT * FROM user_stories WHERE id = ?', [storyId]);
    if (!story) {
      res.status(404).json({ message: 'Story not found' });
      return;
    }

    const {
      title = story.title,
      description = story.description,
      storyPoint = story.story_point,
      assigneeEmail = story.assignee_email,
    } = req.body;

    await db.run(
      'UPDATE user_stories SET title = ?, description = ?, story_point = ?, assignee_email = ? WHERE id = ?',
      [title, description, storyPoint, assigneeEmail, storyId]
    );

    const updated = await db.get('SELECT * FROM user_stories WHERE id = ?', [storyId]);
    res.json(mapStory(updated));
  });

  app.post('/api/stories/:id/acceptance-tests', async (req, res) => {
    const storyId = Number(req.params.id);
    const story = await db.get('SELECT * FROM user_stories WHERE id = ?', [storyId]);
    if (!story) {
      res.status(404).json({ message: 'Story not found' });
      return;
    }
    const { title, expectedResult = '' } = req.body;
    if (!title) {
      res.status(400).json({ message: 'Title is required' });
      return;
    }
    const now = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO acceptance_tests (story_id, title, expected_result, created_at) VALUES (?, ?, ?, ?)',
      [storyId, title, expectedResult, now]
    );
    res.status(201).json({
      id: result.lastID,
      storyId,
      title,
      expectedResult,
      createdAt: now,
    });
  });

  app.delete('/api/stories/:id/acceptance-tests/:testId', async (req, res) => {
    const testId = Number(req.params.testId);
    await db.run('DELETE FROM acceptance_tests WHERE id = ?', [testId]);
    res.status(204).end();
  });

  app.post('/api/stories/:id/reference-documents', async (req, res) => {
    const storyId = Number(req.params.id);
    const story = await db.get('SELECT * FROM user_stories WHERE id = ?', [storyId]);
    if (!story) {
      res.status(404).json({ message: 'Story not found' });
      return;
    }
    const { name, url } = req.body;
    if (!name || !url) {
      res.status(400).json({ message: 'Name and URL are required' });
      return;
    }
    const now = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO reference_documents (story_id, name, url, created_at) VALUES (?, ?, ?, ?)',
      [storyId, name, url, now]
    );
    res.status(201).json({
      id: result.lastID,
      storyId,
      name,
      url,
      createdAt: now,
    });
  });

  app.delete('/api/stories/:id/reference-documents/:docId', async (req, res) => {
    const docId = Number(req.params.docId);
    await db.run('DELETE FROM reference_documents WHERE id = ?', [docId]);
    res.status(204).end();
  });

  app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

  return app;
}
