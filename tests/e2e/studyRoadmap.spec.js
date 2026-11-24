import { expect, test } from '@playwright/test';
import { clickAfterUiMotion } from './uiMotion.js';
import { translate } from '../../src/i18n/messages.js';
import { historyAttempt } from '../fixtures/historyAttempt.js';

const now = new Date('2026-11-23T16:00:00.000Z');
async function init(page, { uid = 'test-alice', enabled = true } = {}) {
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
  await page.clock.setFixedTime(now);
  await page.addInitScript(
    ({ uid, enabled }) => {
      if (enabled) sessionStorage.setItem('quiz-e2e-roadmap-enabled', '1');
      if (uid && localStorage.getItem('quiz-e2e-auth') === null)
        localStorage.setItem(
          'quiz-e2e-auth',
          JSON.stringify({ uid, displayName: 'Test account', email: 'fixture@example.test' })
        );
    },
    { uid, enabled }
  );
}

const btn = (page, name) => page.getByRole('button', { name, exact: true });
const input = (page, name) => page.getByLabel(name, { exact: true });
async function create(page, bank = 'aws-aip-c01', date = '2026-12-18', sessions = '3') {
  await btn(page, 'New study plan').click();
  await input(page, 'Quiz bank').selectOption(bank);
  await input(page, 'Target exam date').fill(date);
  await input(page, 'Time zone').fill('America/New_York');
  await input(page, 'Sessions per week').selectOption(sessions);
  await btn(page, 'Save study plan').click();
}

test('a disabled planner is inert and a guest can reach the sign-in prompt only when enabled', async ({
  page,
}) => {
  await init(page, { uid: null, enabled: false });
  await page.goto('./#/roadmap');
  await expect(page.getByText('Study roadmap is not enabled yet.', { exact: true })).toBeVisible();
  await expect(btn(page, 'New study plan')).toHaveCount(0);
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-roadmap-enabled', '1'));
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Sign in to use your private study roadmap' })
  ).toBeVisible();
});

test('create, retry, reschedule, edit, archive, restore and delete a private roadmap', async ({
  page,
}) => {
  await init(page);
  await page.goto('./#/profile');
  await btn(page, 'Study roadmap').click();
  await expect(page.getByText('Create a plan to schedule your study sessions.')).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-roadmap-write-error', '1'));
  await create(page, 'aws-aip-c01', '2026-11-24');
  await expect(page.getByText('Choose an exam date 7 to 180 days from today.')).toBeVisible();
  await expect(input(page, 'Target exam date')).toBeFocused();
  await input(page, 'Target exam date').fill('2026-12-18');
  await btn(page, 'Save study plan').click();
  await expect(
    page.getByText('Could not save the change. Try again when you are online.')
  ).toBeVisible();
  await expect(input(page, 'Target exam date')).toHaveValue('2026-12-18');
  await page.evaluate(() => sessionStorage.removeItem('quiz-e2e-roadmap-write-error'));
  await btn(page, 'Save study plan').click();
  await expect(page.getByRole('heading', { name: 'Weekly checklist', exact: true })).toBeVisible();
  await expect(page.getByText('0 of 3 sessions complete')).toBeVisible();
  const first = page.locator('.roadmap-tasks > li').first();
  await first.getByRole('checkbox').check();
  await expect(page.getByText('1 of 3 sessions complete')).toBeVisible();
  await btn(first, 'Reschedule').click();
  const move = page.getByRole('dialog', { name: 'Reschedule session' });
  await input(move, 'New session date').fill('2026-11-30');
  await clickAfterUiMotion(btn(move, 'Reschedule'));
  await expect(move).toBeHidden();
  await expect(page.getByText('1 of 4 sessions complete')).toBeVisible();
  await btn(page, 'Edit study plan').click();
  await input(page, 'Sessions per week').selectOption('0');
  await btn(page, 'Save study plan').click();
  await btn(page, 'Next week').click();
  await expect(page.getByText('1 of 1 sessions complete')).toBeVisible();
  await btn(page, 'Archive plan').click();
  await expect(btn(page, 'Restore plan')).toBeVisible();
  await page.reload();
  await expect(btn(page, 'Restore plan')).toBeVisible();
  await btn(page, 'Restore plan').click();
  await expect(btn(page, 'Archive plan')).toBeVisible();
  await btn(page, 'Delete plan').click();
  let dialog = page.getByRole('dialog', { name: 'Delete this study plan?' });
  await expect(btn(dialog, 'Cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await btn(page, 'Delete plan').click();
  dialog = page.getByRole('dialog', { name: 'Delete this study plan?' });
  await clickAfterUiMotion(btn(dialog, 'Delete plan'));
  await expect(page.getByText('Create a plan to schedule your study sessions.')).toBeVisible();
});

test('plans isolate accounts and recover from a stale edit without altering a running exam draft', async ({
  page,
}) => {
  await init(page);
  await page.goto('./#/quiz/aws-aip-c01/exam?format=custom&count=3&time=10&fresh=2000');
  await expect(page.locator('.question-title')).toBeVisible();
  const examKey = 'quiz-study-v1:test-alice:aws-aip-c01:exam';
  const before = await page.evaluate((key) => sessionStorage.getItem(key), examKey);
  expect(JSON.parse(before).deadline).toBeGreaterThan(now.getTime());
  page.once('dialog', (prompt) => prompt.accept());
  await page.goto('./#/roadmap');
  await create(page);
  await expect(btn(page, 'Edit study plan')).toBeVisible();
  await btn(page, 'Edit study plan').click();
  await input(page, 'Sessions per week').selectOption('4');
  await page.evaluate(() => {
    const key = 'quiz-e2e-roadmap:test-alice';
    const records = JSON.parse(localStorage.getItem(key));
    records['slot-1'].revision++;
    records['slot-1'].targetDate = '2026-12-20';
    localStorage.setItem(key, JSON.stringify(records));
  });
  await btn(page, 'Save study plan').click();
  await expect(
    page.getByText(
      'This plan changed on another device. Reload the saved version before trying again.'
    )
  ).toBeVisible();
  await btn(page, 'Refresh plans').click();
  await expect(input(page, 'Sessions per week')).toHaveValue('4');
  await expect(input(page, 'Target exam date')).toHaveValue('2026-12-20');
  await btn(page, 'Save study plan').click();
  await expect(btn(page, 'Edit study plan')).toBeVisible();
  expect(await page.evaluate((key) => sessionStorage.getItem(key), examKey)).toBe(before);
  await create(page, 'gcp-ace', '2026-12-22', '2');
  await expect(page.getByRole('heading', { name: 'Associate Cloud Engineer (ACE)' })).toBeVisible();
  await expect(page.getByText('0 of 2 sessions complete')).toBeVisible();
  await page.getByRole('button', { name: /AIP-C01 ·/ }).click();
  await expect(page.getByText('0 of 4 sessions complete')).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent('quiz-e2e-auth-change', {
        detail: { uid: 'test-bob', displayName: 'Bob', email: 'bob@example.test' },
      })
    );
  });
  await expect(page.getByText('Create a plan to schedule your study sessions.')).toBeVisible();
  await expect(page.getByRole('heading', { name: /AIP-C01/ })).toHaveCount(0);
});

test('a matching archived exam is shown as evidence, separate from manual completion', async ({
  page,
}) => {
  await init(page);
  const attempt = await historyAttempt({ uid: 'test-alice', now: now.getTime() });
  await page.addInitScript((attempt) => {
    const id = attempt.summary.attemptId;
    sessionStorage.setItem('quiz-e2e-history-enabled', '1');
    localStorage.setItem(
      'quiz-e2e-history:test-alice',
      JSON.stringify({
        attempts: { [id]: attempt },
        receipts: { [id]: { state: 'saved', payloadHash: attempt.summary.payloadHash } },
        revision: 1,
      })
    );
  }, attempt);
  await page.goto('./#/roadmap');
  await create(page, 'gcp-ace');
  await expect(page.getByText('Archived exam', { exact: true })).toBeVisible();
  await expect(page.getByText('1 of 3 sessions complete')).toBeVisible();
  const exam = page.locator('.roadmap-task').filter({ hasText: 'Archived exam' });
  await expect(exam.getByRole('checkbox')).not.toBeChecked();
  await btn(exam, 'View saved result').click();
  await expect(page).toHaveURL(new RegExp('#/history/' + attempt.summary.attemptId + '$'));
});

test('plan editor and checklist fit required viewports and keep all fields reachable', async ({
  page,
}, info) => {
  await init(page);
  const phone = info.project.name === 'phone';
  const language = phone ? 'vi' : 'en';
  const t = (name) => translate(language, name);
  if (phone)
    await page.addInitScript(() => {
      localStorage.setItem('quiz-app-language', 'vi');
      localStorage.setItem('quiz-app-theme', 'dark');
    });
  await page.goto('./#/roadmap');
  await btn(page, t('New study plan')).click();
  const root = page.locator('.roadmap-editor');
  await expect(root).toBeVisible();
  const sizes = [
    [320, 844],
    [390, 844],
    [412, 915],
    [768, 1024],
    [1280, 900],
    [844, 390],
  ];
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await expect(input(root, t('Target exam date'))).toBeVisible();
    const action = await btn(root, t('Save study plan')).boundingBox();
    expect(action.height).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize(phone ? { width: 320, height: 844 } : { width: 1280, height: 900 });
  await page.screenshot({
    path: info.outputPath('study-roadmap-editor.png'),
    animations: 'disabled',
  });
  await input(root, t('Quiz bank')).selectOption('aws-aip-c01');
  await input(root, t('Target exam date')).fill('2026-12-18');
  await btn(root, t('Save study plan')).click();
  const checklist = page.locator('.roadmap-week');
  await expect(checklist).toBeVisible();
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    const next = await btn(checklist, t('Next week')).boundingBox();
    expect(next.height).toBeGreaterThanOrEqual(44);
  }
  await page.setViewportSize(phone ? { width: 320, height: 844 } : { width: 1280, height: 900 });
  await checklist.screenshot({
    path: info.outputPath('study-roadmap-week.png'),
    animations: 'disabled',
  });
});
