import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});

const question = (id, retired = false) => ({
  id,
  question: `Question ${id}`,
  options: { A: 'First', B: 'Second' },
  answer: ['A'],
  retired,
});

test('retired questions remain in practice and are excluded from new mock exams', async ({
  page,
}) => {
  await page.route('**/quiz/Azure/AZ-900.json*', (route) =>
    route.fulfill({ json: [question('active'), question('retired', true)] })
  );
  await page.goto('./#/quiz/az-900/practice?question=retired', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Question retired' })).toBeVisible();
  await page.goto('./#/quiz/az-900?mode=exam');
  await expect(page.getByRole('combobox', { name: 'Questions' })).toHaveValue('1');
  await page.getByRole('button', { name: 'Start mock exam' }).click();
  await expect(page.getByRole('heading', { name: 'Question active' })).toBeVisible();
  await expect(page.getByText('Question 1 of 1')).toBeVisible();
});

test('an all-retired quiz cannot start a new exam, including by direct link', async ({ page }) => {
  await page.route('**/quiz/Azure/AZ-900.json*', (route) =>
    route.fulfill({ json: [question('retired', true)] })
  );
  await page.goto('./#/quiz/az-900?mode=exam');
  await expect(page.getByText('No questions are available for a new mock exam.')).toBeVisible();
  await expect(page.getByText(/null questions|1–0 questions/)).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Questions' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start mock exam' })).toBeDisabled();
  await page.goto('./#/quiz/az-900/exam');
  await expect(page.getByText('No questions are available for a new mock exam.')).toBeVisible();
  await page.getByRole('button', { name: 'Start practice' }).click();
  await expect(page.getByRole('heading', { name: 'Question retired' })).toBeVisible();
});
