import { test, expect } from '@playwright/test';
import { clickAfterUiMotion } from './uiMotion.js';
import { contrastRatio } from './uiContrast.js';
import { findQuiz } from '../../src/data/quizzes.js';
import {
  createNotebookReference,
  notebookEntryKey,
  notebookSourceGroup,
  transitionNotebookState,
} from '../../src/utils/studyNotebook.js';
import { secureId } from '../../src/utils/secureId.js';
import { translate } from '../../src/i18n/messages.js';

const now = Date.parse('2026-11-24T12:00:00Z');
const day = 86400000;
const uid = 'spaced-alice';
const bank = 'aws-aip-c01',
  other = 'gcp-ace';
const q = {
  id: 'spaced-question',
  question: 'Which option is correct?',
  options: { A: 'Correct option', B: 'Wrong option' },
  answer: ['A'],
};
const button = (root, name) => root.getByRole('button', { name, exact: true });
const heading = (root, name) => root.getByRole('heading', { name, exact: true });
const queueUrl = './#/notebook?view=revision';

async function entry(id, at = now - day) {
  const ref = await createNotebookReference({ kind: 'bank', id, questions: [q] }, q, uid);
  const note = transitionNotebookState(null, { kind: 'note', value: 'Keep my private note' }, at);
  const marked = transitionNotebookState(note, { kind: 'bookmark', value: true }, at);
  return {
    schemaVersion: 1,
    ref,
    entryKey: await notebookEntryKey(ref),
    sourceGroup: notebookSourceGroup(ref),
    ...transitionNotebookState(marked, { kind: 'outcome', correct: false }, at),
    revision: 1,
    lastOperationId: secureId(),
    lastOperationFingerprint: 'b'.repeat(64),
    createdAt: at,
    updatedAt: at,
  };
}
async function init(
  page,
  {
    enabled = true,
    signedIn = true,
    entries = null,
    language = 'en',
    theme = 'light',
    changed = false,
    roadmap = false,
  } = {}
) {
  const rows = entries || [await entry(bank)];
  const seed = {
    entries: Object.fromEntries(rows.map((row) => [row.entryKey, row])),
    state: { count: rows.length, generation: 0, revision: rows.length },
  };
  const plan = {
    schemaVersion: 1,
    slot: 'slot-1',
    instanceId: secureId(),
    revision: 1,
    bankId: bank,
    startDate: '2026-11-23',
    targetDate: '2026-12-20',
    timezone: 'Asia/Ho_Chi_Minh',
    weeklyGoal: 3,
    archived: false,
    overrides: '{}',
  };
  const { slot, ...payload } = plan;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(now);
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
  await page.route('**/' + findQuiz(bank).file, (route) => route.fulfill({ json: [q] }));
  await page.route('**/' + findQuiz(other).file, (route) =>
    route.fulfill({
      json: [{ ...q, ...(changed ? { question: 'The current question changed.' } : {}) }],
    })
  );
  await page.addInitScript(
    ({ uid, enabled, signedIn, seed, language, theme, roadmap, slot, payload }) => {
      sessionStorage.setItem('quiz-e2e-notebook-enabled', '1');
      if (enabled) sessionStorage.setItem('quiz-e2e-spaced-revision', '1');
      if (roadmap) {
        sessionStorage.setItem('quiz-e2e-roadmap-enabled', '1');
        if (!localStorage.getItem('quiz-e2e-roadmap:' + uid))
          localStorage.setItem('quiz-e2e-roadmap:' + uid, JSON.stringify({ [slot]: payload }));
      }
      if (!localStorage.getItem('quiz-e2e-auth') && signedIn)
        localStorage.setItem(
          'quiz-e2e-auth',
          JSON.stringify({ uid, displayName: 'Spaced learner', email: 'fixture@example.test' })
        );
      if (!localStorage.getItem('quiz-e2e-notebook:' + uid))
        localStorage.setItem('quiz-e2e-notebook:' + uid, JSON.stringify(seed));
      localStorage.setItem('quiz-app-language', language);
      localStorage.setItem('quiz-app-theme', theme);
    },
    { uid, enabled, signedIn, seed, language, theme, roadmap, slot, payload }
  );
  return rows[0]?.entryKey;
}
const row = (page, key) =>
  page.evaluate(
    ({ uid, key }) => JSON.parse(localStorage.getItem('quiz-e2e-notebook:' + uid)).entries[key],
    { uid, key }
  );

async function chooseAction(page, name, title) {
  await button(page, name).click();
  const dialog = page.getByRole('dialog', { name: title, exact: true });
  await expect(dialog).toBeVisible();
  await expect(button(dialog, 'Cancel')).toBeFocused();
  await clickAfterUiMotion(button(dialog, name));
  await expect(dialog).toBeHidden();
}

test('disabled or signed-out spaced review makes no private queue requests', async ({ page }) => {
  await init(page, { enabled: false, signedIn: false });
  await page.goto(queueUrl);
  await expect(button(page.locator('main'), 'Sign in')).toBeVisible();
  expect(await page.evaluate(() => window.quizNotebookCalls || [])).toEqual([]);
  await page.evaluate(
    ({ uid }) =>
      window.dispatchEvent(
        new CustomEvent('quiz-e2e-auth-change', {
          detail: { uid, displayName: 'Spaced learner', email: 'fixture@example.test' },
        })
      ),
    { uid }
  );
  await expect(page.getByText('Spaced review is not enabled yet.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.quizNotebookCalls || [])).toEqual([]);
});

test('corrected due answers update the schedule once, including retry after response loss', async ({
  page,
}) => {
  const key = await init(page);
  await page.goto('./#/notebook');
  await button(page, 'Open spaced review').click();
  await expect(page.getByText('1 due for review', { exact: true })).toBeVisible();
  await expect(page.getByText('1 overdue', { exact: true })).toBeVisible();
  await button(page, 'Start due review').click();
  await expect(page.locator('.question-title')).toBeVisible();
  await page.getByRole('radio', { name: /Wrong option/ }).check();
  await expect.poll(async () => (await row(page, key)).reviewSchedule?.level).toBe(0);
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-notebook-drop-response', '1'));
  await page.getByRole('radio', { name: /Correct option/ }).check();
  await expect.poll(async () => (await row(page, key)).reviewSchedule?.level).toBe(1);
  const saved = await row(page, key);
  await button(page, 'Retry notebook updates').click();
  await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
  expect(await row(page, key)).toEqual(saved);
  await button(page, 'Back to spaced review').click();
  await expect(page.getByText('0 due for review', { exact: true })).toBeVisible();
  await expect(heading(page, 'Upcoming reviews')).toBeVisible();
  await page.reload();
  await expect(page.getByText('0 due for review', { exact: true })).toBeVisible();
});

test('reset, removal and restore preserve Notebook note, bookmark and outcome', async ({
  page,
}) => {
  const old = await entry(bank);
  const key = await init(page, {
    entries: [{ ...old, lastReviewedAt: now, reviewed: true, updatedAt: now }],
  });
  await page.goto(queueUrl);
  await expect(heading(page, 'Upcoming reviews')).toBeVisible();
  await chooseAction(page, 'Reset schedule', 'Reset review schedule?');
  await expect(page.getByText('1 due for review', { exact: true })).toBeVisible();
  await chooseAction(page, 'Remove from review', 'Remove this question from review?');
  await expect(heading(page, 'Removed from review')).toBeVisible();
  await chooseAction(page, 'Restore review', 'Restore this question to review?');
  await expect(page.getByText('1 due for review', { exact: true })).toBeVisible();
  expect(await row(page, key)).toMatchObject({
    note: old.note,
    bookmarked: true,
    reviewed: true,
    lastReviewedAt: now,
    reviewSchedule: { level: 0 },
  });
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('quiz-e2e-auth-change', {
        detail: { uid: 'spaced-bob', displayName: 'Bob', email: 'bob@example.test' },
      })
    )
  );
  await expect(page.getByText('0 due for review', { exact: true })).toBeVisible();
  await expect(page.getByText(q.question, { exact: true })).toHaveCount(0);
});

test('the roadmap scopes due items by bank and excludes changed sources on the all-source view', async ({
  page,
}) => {
  await init(page, {
    roadmap: true,
    changed: true,
    entries: [await entry(bank), await entry(other)],
  });
  await page.goto('./#/roadmap');
  const summary = page.locator('.spaced-roadmap');
  await expect(summary.getByText('1 review this week', { exact: false })).toBeVisible();
  await button(summary, 'Open spaced review').click();
  await expect(page).toHaveURL(/bank=aws-aip-c01&zone=Asia%2FHo_Chi_Minh/);
  await expect(page.getByText('1 due for review', { exact: true })).toBeVisible();
  await expect(heading(page, 'Unavailable questions')).toHaveCount(0);
  await button(page, 'All review sources').click();
  await expect(heading(page, 'Unavailable questions')).toBeVisible();
  await expect(page.getByText('1 due for review', { exact: true })).toBeVisible();
});

test('queue actions fit the supported widths, landscape and both UI languages and themes', async ({
  page,
}, info) => {
  const phone = info.project.name === 'phone';
  const language = phone ? 'vi' : 'en';
  const t = (name) => translate(language, name);
  await init(page, { language, theme: phone ? 'dark' : 'light' });
  await page.goto(queueUrl);
  await expect(heading(page, t('Spaced review'))).toBeVisible();
  expect(await contrastRatio(page.getByText(t('Overdue'), { exact: true }))).toBeGreaterThanOrEqual(
    4.5
  );
  for (const [width, height] of [
    [320, 844],
    [390, 844],
    [412, 915],
    [768, 1024],
    [1280, 900],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    const action = await button(page, t('Start due review')).boundingBox();
    expect(action.height).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize(phone ? { width: 320, height: 880 } : { width: 1280, height: 900 });
  await page.locator('.spaced-revision').screenshot({ path: info.outputPath('spaced-review.png') });
});
