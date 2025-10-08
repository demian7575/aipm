import { test, expect } from '@playwright/test';

const backend = 'http://127.0.0.1:8000';

async function resetBackend() {
  await fetch(`${backend}/api/reset`, { method: 'POST' });
}

test.beforeEach(async () => {
  await resetBackend();
});

test('mindmap and outline interactions', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tree', { name: 'Story outline' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand All' }).click();
  await expect(page.getByText('Drag and drop reordering')).toBeVisible();
  await page.getByRole('treeitem', { name: /Outline tree view/ }).click();
  await expect(page.getByRole('heading', { name: 'Details' })).toBeVisible();
  await page.getByText('Mindmap').click();
  await expect(page.getByRole('tree')).toBeVisible();
});
