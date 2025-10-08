import { expect, test } from '@playwright/test';

const treeitem = (page: any, title: string) =>
  page.getByRole('treeitem').filter({ hasText: title });

test.describe('AI PM Mindmap', () => {
  test('loads outline, expands tree, updates branch', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('AI Project Manager Mindmap')).toBeVisible();
    await expect(treeitem(page, 'US1 Mindmap shell')).toBeVisible();

    await page.getByRole('button', { name: 'Depth 2' }).click();
    await expect(treeitem(page, 'US1-1 Render nodes')).toBeVisible();

    await treeitem(page, 'US1 Mindmap shell').click();
    await page.keyboard.press('T');
    await expect(page.getByText('Acceptance Tests')).toBeVisible();

    await page.getByRole('button', { name: 'Update Branch' }).click();
    await expect(page.getByText(/Drift:/)).toBeVisible();
  });
});
