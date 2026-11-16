import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import {
  createExamSession,
  questionFingerprint,
  sessionKey,
} from '../../src/utils/studySession.js';
import { emptyAnswer } from '../../src/utils/questionModel.js';

const bank = JSON.parse(
  readFileSync(new URL('../../public/quiz/Google/GCP-GAL.json', import.meta.url))
)
  .slice(0, 56)
  .map(({ retired: _retired, ...question }) => question);
const extra = {
  id: 'migration-test',
  question: 'New question',
  options: { A: 'First', B: 'Second' },
  answer: ['A'],
};
const expanded = [{ ...bank[0], retired: true }, ...bank.slice(1), extra];

test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.includes('/quiz/Google/GCP-GAL.json')) return route.fulfill({ json: expanded });
    return ['127.0.0.1', 'localhost'].includes(new URL(url).hostname)
      ? route.continue()
      : route.abort();
  });
});

test('restores a practice draft after questions are added', async ({ page }) => {
  const draft = { signature: questionFingerprint(bank), index: 0, answers: bank.map(emptyAnswer) };
  await page.addInitScript(({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)), {
    key: sessionKey(null, 'gcp-gal', 'practice'),
    value: draft,
  });
  await page.goto('./#/quiz/gcp-gal/practice');
  await expect(page.getByText(bank[0].question, { exact: true })).toBeVisible();
  const saved = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)),
    sessionKey(null, 'gcp-gal', 'practice')
  );
  expect(saved.answers).toHaveLength(57);
});

test('restores the original mock exam after questions are added and retired', async ({ page }) => {
  const draft = createExamSession(bank, 1, 45, { random: () => 0.99 });
  await page.addInitScript(({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)), {
    key: sessionKey(null, 'gcp-gal', 'exam'),
    value: draft,
  });
  await page.goto('./#/quiz/gcp-gal/exam');
  await expect(page.getByText(draft.questions[0].question, { exact: true })).toBeVisible();
  await expect(page.getByText('Question 1 of 1')).toBeVisible();
});
