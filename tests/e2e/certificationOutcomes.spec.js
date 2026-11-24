import { test, expect } from '@playwright/test';
import { clickAfterUiMotion } from './uiMotion.js';
import { translate } from '../../src/i18n/messages.js';

const uid = 'outcomes-alice';
const planId = 'e332e16c-94fe-4a0c-b606-5392713da865';
const btn = (root, name) => root.getByRole('button', { name, exact: true });
const field = (root, name) => root.getByLabel(name, { exact: true });
const dialog = (root, name) => root.getByRole('dialog', { name, exact: true });

async function init(
  page,
  {
    enabled = true,
    sharing = true,
    signedIn = true,
    language = 'en',
    theme = 'light',
    plans = false,
  } = {}
) {
  await page.clock.setFixedTime(new Date('2026-11-24T12:00:00Z'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
  await page.addInitScript(
    ({ enabled, sharing, signedIn, language, theme, plans, planId, uid }) => {
      if (enabled) sessionStorage.setItem('quiz-e2e-outcomes-enabled', '1');
      if (sharing) sessionStorage.setItem('quiz-e2e-outcomes-sharing', '1');
      if (plans) {
        const plan = {
          schemaVersion: 1,
          instanceId: planId,
          revision: 1,
          bankId: 'gcp-ace',
          startDate: '2026-11-01',
          targetDate: '2026-12-18',
          timezone: 'Asia/Ho_Chi_Minh',
          archived: false,
          weeklyGoal: 3,
          overrides: '{}',
        };
        sessionStorage.setItem('quiz-e2e-roadmap-enabled', '1');
        localStorage.setItem('quiz-e2e-roadmap:' + uid, JSON.stringify({ 'slot-1': plan }));
      }
      if (localStorage.getItem('quiz-e2e-auth') === null && signedIn)
        localStorage.setItem(
          'quiz-e2e-auth',
          JSON.stringify({ uid, displayName: 'Outcome learner', email: 'fixture@example.test' })
        );
      localStorage.setItem('quiz-app-language', language);
      localStorage.setItem('quiz-app-theme', theme);
    },
    { enabled, sharing, signedIn, language, theme, plans, planId, uid }
  );
}
const switchUser = (page, user) =>
  page.evaluate(
    (detail) => window.dispatchEvent(new CustomEvent('quiz-e2e-auth-change', { detail })),
    user
  );
const owner = { uid, displayName: 'Outcome learner', email: 'fixture@example.test' };
const reviewer = {
  uid: 'outcomes-reviewer',
  moderator: true,
  displayName: 'Outcome reviewer',
  email: 'reviewer@example.test',
};

async function fill(page, date = '2026-11-21') {
  await btn(page, 'New certification outcome').click();
  await field(page, 'Quiz bank').selectOption('gcp-ace');
  await field(page, 'Exam date').fill(date);
  await field(page, 'Exam outcome').selectOption('passed');
  await field(page, 'Reported score (optional)').fill('87.5');
  await field(page, 'Maximum score (optional)').fill('100');
  await field(page, 'Private preparation note (optional)').fill(
    'Keep this preparation note private.'
  );
}

test('private outcomes remain gated and ordinary accounts cannot access moderation', async ({
  page,
}) => {
  await init(page, { enabled: false });
  await page.goto('./#/outcomes');
  await expect(
    page.getByText('Certification outcomes are not enabled here.', { exact: true })
  ).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-outcomes-enabled', '1'));
  await page.goto('./#/outcomes?view=moderation');
  await page.reload();
  await expect(
    page.getByText('You do not have permission for this action.', { exact: true })
  ).toBeVisible();
  await expect(btn(page, 'Publish report')).toHaveCount(0);
});

test('a private result retains data after a lost response, links a plan, and never follows another account', async ({
  page,
}) => {
  await init(page, { plans: true });
  await page.goto('./#/profile');
  await btn(page, 'Certification outcomes').click();
  await fill(page, '2026-11-25');
  await btn(page, 'Save private outcome').click();
  await expect(page.getByText('Choose an exam date through today.', { exact: true })).toBeVisible();
  await expect(field(page, 'Exam date')).toBeFocused();
  await field(page, 'Exam date').fill('2026-11-21');
  await field(page, 'Study target (optional)').selectOption(planId);
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-outcomes-drop-response', '1'));
  await btn(page, 'Save private outcome').click();
  await expect(
    page.getByText('Could not complete the request. Please retry.', { exact: true })
  ).toBeVisible();
  await expect(field(page, 'Private preparation note (optional)')).toHaveValue(
    'Keep this preparation note private.'
  );
  await btn(page, 'Save private outcome').click();
  await expect(page.getByText('Private outcome saved.', { exact: true })).toBeVisible();
  await expect(page.getByText('87.5 / 100', { exact: true })).toBeVisible();
  await expect(btn(page, 'Edit outcome')).toHaveCount(1);
  await btn(page, 'Dec 18, 2026').click();
  await expect(page).toHaveURL(new RegExp('plan=' + planId + '$'));
  await expect(page.getByRole('heading', { name: 'Weekly checklist' })).toBeVisible();
  await page.goBack();
  await expect(btn(page, 'Edit outcome')).toBeVisible();
  await btn(page, 'Edit outcome').click();
  await field(page, 'Private preparation note (optional)').fill('Edited privately.');
  await btn(page, 'Save private outcome').click();
  await expect(page.getByText('Edited privately.', { exact: true })).toBeVisible();
  await switchUser(page, reviewer);
  await expect(
    page.getByText('Record your first actual certification exam outcome.', { exact: true })
  ).toBeVisible();
  await expect(page.getByText('Edited privately.', { exact: true })).toHaveCount(0);
});

test('public preview needs opt-in, approval exposes only selected fields, and withdrawal removes the projection', async ({
  page,
}) => {
  await init(page);
  await page.goto('./#/outcomes');
  await fill(page);
  await btn(page, 'Save private outcome').click();
  await btn(page, 'Preview public report').click();
  const preview = dialog(page, 'Preview public report');
  await expect(btn(preview, 'Submit for moderation')).toBeDisabled();
  await field(preview, 'Public study experience (optional)').fill('The practice helped.');
  const renderedPreview = preview.getByLabel('Public preview', { exact: true });
  await expect(renderedPreview.getByText('The practice helped.', { exact: true })).toBeVisible();
  await expect(
    preview.getByText('Keep this preparation note private.', { exact: true })
  ).toHaveCount(0);
  await expect(preview.getByText('87.5 / 100', { exact: true })).toHaveCount(0);
  await preview.getByRole('checkbox').check();
  await clickAfterUiMotion(btn(preview, 'Submit for moderation'));
  await expect(page.getByText('Pending moderation', { exact: true })).toBeVisible();
  await switchUser(page, null);
  await page.goto('./#/outcomes?view=public');
  await expect(page.getByText('No public outcomes yet.', { exact: true })).toBeVisible();
  await switchUser(page, reviewer);
  await btn(page.locator('main'), 'Outcome moderation').click();
  await expect(page.getByText('The practice helped.', { exact: true })).toBeVisible();
  await btn(page, 'Publish report').click();
  await clickAfterUiMotion(btn(dialog(page, 'Publish this report?'), 'Publish report'));
  await expect(page.getByText('No reports in this queue.', { exact: true })).toBeVisible();
  await switchUser(page, null);
  await page.goto('./#/outcomes?view=public');
  await expect(page.getByText('The practice helped.', { exact: true })).toBeVisible();
  await expect(page.getByText('Self-reported', { exact: true })).toBeVisible();
  await expect(page.getByText('Keep this preparation note private.', { exact: true })).toHaveCount(
    0
  );
  await expect(page.getByText('87.5 / 100', { exact: true })).toHaveCount(0);
  await switchUser(page, owner);
  await page.goto('./#/outcomes');
  await btn(page, 'Withdraw report').click();
  await clickAfterUiMotion(btn(dialog(page, 'Withdraw this public report?'), 'Withdraw report'));
  await expect(page.getByText('Report withdrawn.', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Keep this preparation note private.', { exact: true })
  ).toBeVisible();
  await switchUser(page, null);
  await page.goto('./#/outcomes?view=public');
  await expect(page.getByText('No public outcomes yet.', { exact: true })).toBeVisible();
  await switchUser(page, owner);
  await page.goto('./#/outcomes');
  await btn(page, 'Delete outcome').click();
  await clickAfterUiMotion(
    btn(dialog(page, 'Delete this certification outcome?'), 'Delete outcome')
  );
  await expect(page.getByText('Certification outcome deleted.', { exact: true })).toBeVisible();
});

test('private editor fits the supported widths and themes with reachable controls', async ({
  page,
}, info) => {
  const phone = info.project.name === 'phone';
  const language = phone ? 'vi' : 'en';
  const t = (name) => translate(language, name);
  await init(page, { language, theme: phone ? 'dark' : 'light' });
  await page.goto('./#/outcomes');
  await btn(page, t('New certification outcome')).click();
  const form = page.locator('.outcome-form');
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
    const bounds = await btn(form, t('Save private outcome')).boundingBox();
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    await expect(field(form, t('Private preparation note (optional)'))).toBeVisible();
  }
  await page.setViewportSize(phone ? { width: 320, height: 880 } : { width: 1280, height: 900 });
  await form.screenshot({ path: info.outputPath('private-outcome.png') });
  await field(form, t('Quiz bank')).selectOption('gcp-ace');
  await field(form, t('Exam date')).fill('2026-11-21');
  await field(form, t('Exam outcome')).selectOption('passed');
  await btn(form, t('Save private outcome')).click();
  await btn(page, t('Preview public report')).click();
  const preview = dialog(page, t('Preview public report'));
  await expect(btn(preview, t('Cancel'))).toBeFocused();
  await preview.screenshot({ path: info.outputPath('public-preview.png') });
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(preview.getByRole('checkbox')).toBeVisible();
  const submit = await btn(preview, t('Submit for moderation')).boundingBox();
  expect(submit.height).toBeGreaterThanOrEqual(44);
});
