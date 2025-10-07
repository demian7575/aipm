import { test, expect } from '@playwright/test';

test('core flow', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('text=Merge Requests');
  await page.getByRole('tab', { name: 'Outline Tree' }).click();
  await page.getByRole('tree').press('ArrowDown');
  await page.getByRole('tree').press('Enter');
  await expect(page.getByText('INVEST Assessment')).toBeVisible();
  await page.getByRole('tab', { name: 'Mindmap' }).click();
  await expect(page.locator('.mindmap-node').first()).toBeVisible();
});
