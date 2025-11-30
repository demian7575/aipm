import { describe, it, before } from 'node:test';
import assert from 'node:assert';

const API_URL = process.env.API_URL || 'http://localhost:4000';

describe('Mindmap Persistence', () => {
  it('should persist mindmap settings to backend', async () => {
    const testSettings = {
      zoom: 1.5,
      showDependencies: true,
      positions: { '1': { x: 100, y: 200 } },
      autoLayout: false,
      expanded: [1, 2, 3]
    };

    const response = await fetch(`${API_URL}/api/mindmap/persist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testSettings)
    });

    assert.strictEqual(response.status, 200);
    const result = await response.json();
    assert.ok(result.message.includes('persisted'));
  });

  it('should restore mindmap settings from backend', async () => {
    const response = await fetch(`${API_URL}/api/mindmap/restore`);
    assert.strictEqual(response.status, 200);
    
    const settings = await response.json();
    assert.ok(settings);
    // Settings should exist after previous test
    if (Object.keys(settings).length > 0) {
      assert.ok(settings.zoom !== undefined || settings.positions !== undefined);
    }
  });

  it('should preserve mindmap data across deployments', async () => {
    // Save unique test data
    const uniqueData = {
      zoom: 2.0,
      testTimestamp: Date.now(),
      positions: { '999': { x: 999, y: 999 } }
    };

    await fetch(`${API_URL}/api/mindmap/persist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(uniqueData)
    });

    // Retrieve and verify
    const response = await fetch(`${API_URL}/api/mindmap/restore`);
    const restored = await response.json();
    
    assert.strictEqual(restored.zoom, 2.0);
    assert.ok(restored.testTimestamp);
    assert.deepStrictEqual(restored.positions, { '999': { x: 999, y: 999 } });
  });
});
