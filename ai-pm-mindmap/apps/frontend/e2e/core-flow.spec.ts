import { test, expect, type Page, type Dialog } from '@playwright/test';

const answerPrompts = (page: Page, responses: string[]) => {
  let index = 0;
  const handler = async (dialog: Dialog) => {
    await dialog.accept(responses[index] ?? '');
    index += 1;
    if (index >= responses.length) {
      page.off('dialog', handler);
    }
  };
  page.on('dialog', handler);
};

test('end-to-end planning flow', async ({ page, request }) => {
  await page.goto('/');

  // Create a new merge request
  answerPrompts(page, ['Mindmap Improvements', 'ai/mindmap', 'feature/mindmap']);
  await page.getByRole('button', { name: '+ MR' }).click();
  await expect(page.getByRole('combobox', { name: 'Select Merge Request' })).toHaveValue(/mr-/);

  // Add a root story to the new MR
  answerPrompts(page, [
    'As a manager I want reporting so that stakeholders stay informed',
    'As a manager',
    'I want automatic reports',
    'So that stakeholders stay informed',
    'Given data is collected',
    'When a report is generated',
    'Then the report is delivered within 60 seconds',
    '1'
  ]);
  await page.getByRole('button', { name: 'Add Story' }).click();
  await expect(page.getByText('As a manager I want reporting', { exact: false })).toBeVisible();

  // Add an acceptance test through keyboard shortcut
  const storyNode = page.getByText('As a manager I want reporting', { exact: false }).first();
  await storyNode.click();
  answerPrompts(page, [
    'Manager sees report delivery confirmation',
    'Open dashboard,Trigger report,Receive report within 60 seconds'
  ]);
  await page.keyboard.press('T');
  await expect(page.getByText('🧪 Manager sees report delivery confirmation')).toBeVisible();

  // Switch back to seed MR to inspect failing INVEST story
  await page.getByRole('combobox', { name: 'Select Merge Request' }).selectOption('mr-1');
  const adminStory = page.getByText('As an admin I want to invite teammates', { exact: false }).first();
  await adminStory.click({ modifiers: ['Shift'] });
  const failingStory = page.getByText('As a teammate I want to accept invites fast', { exact: false });
  await expect(failingStory).toBeVisible();
  await failingStory.click();
  await expect(page.getByText(/Estimate should be small/)).toBeVisible();

  // Fix INVEST issue by editing estimate
  answerPrompts(page, ['1']);
  await page.keyboard.press('E');
  await expect(page.getByText('INVEST looks good!')).toBeVisible();

  // Collapse recursively
  await adminStory.click({ modifiers: ['Shift'] });
  await expect(failingStory).not.toBeVisible();

  // Attempt invalid move via API to ensure guard
  const response = await request.patch('/api/stories/story-1/move', {
    data: { parentId: 'story-2', index: 0 }
  });
  expect(response.status()).toBe(409);
});
