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

test('Continue learning preserves both drafts until a learner confirms a new mock exam', async ({
  page,
}) => {
  const uid = 'test-alice';
  const id = 'gcp-gal';
  const practiceKey = sessionKey(uid, id, 'practice');
  const examKey = sessionKey(uid, id, 'exam');
  const practice = {
    signature: questionFingerprint(bank),
    index: bank.length - 1,
    answers: bank.map((question) => question.answer),
  };
  const exam = createExamSession(bank, 1, 45, { random: () => 0.99 });
  expect(exam.questions[0].id).toBe(bank[0].id);
  exam.answers[0] = exam.questions[0].answer;
  exam.flags = [0];
  await page.addInitScript(
    ({ uid, id, practiceKey, examKey, practice, exam }) => {
      localStorage.setItem('quiz-e2e-auth', JSON.stringify({ uid, displayName: 'Test account' }));
      localStorage.setItem(
        `quiz-e2e-profile:${uid}`,
        JSON.stringify({ quizProgress: { [id]: { questionIndex: practice.index, savedAt: 1 } } })
      );
      sessionStorage.setItem(practiceKey, JSON.stringify(practice));
      sessionStorage.setItem(examKey, JSON.stringify(exam));
    },
    { uid, id, practiceKey, examKey, practice, exam }
  );
  await page.goto('./#/library');
  await page
    .getByRole('region', { name: 'Continue learning' })
    .getByRole('button', { name: 'Mock exam', exact: true })
    .click();
  const setup = page.locator('.quiz-mode-picker');
  const startNew = setup.getByRole('button', { name: 'Start a new exam', exact: true });
  const saved = (key) => page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), key);
  await expect(startNew).toBeEnabled();
  await startNew.click();
  const confirmation = page.getByRole('dialog').filter({ hasText: 'Start a new exam?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(confirmation).toBeHidden();
  expect(await saved(examKey)).toEqual(exam);
  expect(await saved(practiceKey)).toEqual(practice);

  await setup.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByText(exam.questions[0].question, { exact: true })).toBeVisible({
    timeout: 25000,
  });
  await expect(page.getByRole('button', { name: 'Unflag', exact: true })).toBeVisible();
  expect(await saved(examKey)).toMatchObject({
    deadline: exam.deadline,
    answers: exam.answers,
    flags: exam.flags,
  });

  await page.getByRole('button', { name: 'Back to quiz overview', exact: true }).click();
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Leave this exam?' })
    .getByRole('button', { name: 'Leave exam', exact: true })
    .click();
  await startNew.click();
  await confirmation.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await expect(page.locator('.question-title')).toBeVisible();
  const replacement = await saved(examKey);
  expect(replacement.questions).not.toHaveLength(exam.questions.length);
  expect(replacement.questions.every((item) => item.id !== bank[0].id)).toBe(true);
  expect(await saved(practiceKey)).toEqual(practice);
});
