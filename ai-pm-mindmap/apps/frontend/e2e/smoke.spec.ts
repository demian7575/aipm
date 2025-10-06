import { test, expect } from '@playwright/test';

const backendBase = 'http://127.0.0.1:3333';

const answerPrompt = async (page: any, values: string[]) => {
  for (const value of values) {
    const dialog = await page.waitForEvent('dialog');
    await dialog.accept(value);
  }
};

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await page.request.post(`${backendBase}/api/reset`);
});

test('core mindmap flow', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Add Story' }).click();
  await answerPrompt(page, [
    'E2E Story',
    'As a tester',
    'I want to validate flows',
    'So that stakeholders trust the tool',
    '1',
  ]);

  await expect(page.getByText('Story created')).toBeVisible();

  const storyCard = page.locator('[data-story-id]').filter({ hasText: 'E2E Story' }).first();
  await storyCard.click();

  const detailPanel = page.getByRole('complementary');
  await expect(detailPanel.getByText('testable', { exact: false })).toHaveText(/Improve/i);

  await storyCard.getByRole('button', { name: 'Add Test' }).click();
  await answerPrompt(page, [
    'Acceptance ensures quality',
    'Given the outline view',
    'When I execute the test',
    'Then it passes in 2 seconds',
  ]);

  await expect(page.getByText('Test created')).toBeVisible();
  await expect(detailPanel.getByText('testable', { exact: false })).toHaveText(/Pass/i);

  const primaryStory = page.locator('[data-story-id]').filter({ hasText: 'Manage backlog' }).first();
  await primaryStory.click({ modifiers: ['Shift'] });
  await expect(primaryStory.locator('ul')).toHaveCount(0);

  await primaryStory.click();
  const keyboardStory = page.locator('[data-story-id]').filter({ hasText: 'Link tests' }).first();
  await expect(keyboardStory).toBeVisible();

  await page
    .locator('[data-story-id]')
    .filter({ hasText: 'E2E Story' })
    .locator('div')
    .first()
    .dragTo(
      page
        .locator('[data-story-id]')
        .filter({ hasText: 'Manage backlog with keyboard accessible tree' })
        .locator('div')
        .first(),
    );
  await expect(page.getByText('Story moved')).toBeVisible();

  await page
    .locator('[data-story-id]')
    .filter({ hasText: 'Manage backlog with keyboard accessible tree' })
    .locator('div')
    .first()
    .dragTo(
      page
        .locator('[data-story-id]')
        .filter({ hasText: 'E2E Story' })
        .locator('div')
        .first(),
    );
  await expect(page.getByText(/Cycle/)).toBeVisible();
});
