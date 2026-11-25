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

test('private outcomes remain gated and the legacy moderation view is retired', async ({
  page,
}) => {
  await init(page, { enabled: false, sharing: false });
  await page.goto('./#/outcomes');
  await expect(
    page.getByText('Certification outcomes are not enabled here.', { exact: true })
  ).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-outcomes-enabled', '1'));
  await page.goto('./#/outcomes?view=public');
  await page.reload();
  await expect(
    page.getByText('Certification outcomes are not enabled here.', { exact: true })
  ).toBeVisible();
  await expect(btn(page, 'Add certificate link')).toHaveCount(0);
  await page.goto('./#/outcomes?view=moderation');
  await page.reload();
  await expect(
    page.getByText('Public sharing now uses certificate links.', { exact: true })
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

test('owners publish, edit and remove certificate links and guests see only the public URL', async ({
  page,
}) => {
  const first = 'https://www.credly.com/badges/quizmos-test/public_url';
  const updated = 'https://issuer.example.org/verify/quizmos-test';
  const visibleLink = (url) =>
    page.locator('main').getByRole('link', { name: new RegExp(url.replaceAll('.', '\\.')) });
  await init(page);
  await page.goto('./#/outcomes');
  await fill(page);
  await btn(page, 'Save private outcome').click();
  await expect(page.getByText('Private outcome saved.', { exact: true })).toBeVisible();
  await btn(page.locator('main'), 'Public certificate links').click();
  await btn(page, 'Add certificate link').click();
  await field(page, 'Certificate or badge URL').fill(
    'https://account@issuer.example.org/credential'
  );
  await btn(page, 'Publish link').click();
  await expect(field(page, 'Certificate or badge URL')).toHaveAttribute('aria-invalid', 'true');
  await expect(field(page, 'Certificate or badge URL')).toBeFocused();
  await expect(field(page, 'Certificate or badge URL')).toHaveValue(
    'https://account@issuer.example.org/credential'
  );
  await field(page, 'Certificate or badge URL').fill(first);
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-credential-drop-response', '1'));
  await btn(page, 'Publish link').click();
  await expect(
    page.getByText('Could not complete the request. Please retry.', { exact: true })
  ).toBeVisible();
  await expect(field(page, 'Certificate or badge URL')).toHaveValue(first);
  await btn(page, 'Publish link').click();
  await expect(page.getByText('Certificate link published.', { exact: true })).toBeVisible();
  await expect(btn(page, 'Edit link')).toHaveCount(1);
  await switchUser(page, null);
  await expect(btn(page, 'Sign in to publish a link')).toBeVisible();
  await expect(visibleLink(first)).toHaveCount(1);
  await expect(visibleLink(first)).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc');
  await expect(page.getByText('Keep this preparation note private.', { exact: true })).toHaveCount(
    0
  );
  await expect(page.getByText('87.5 / 100', { exact: true })).toHaveCount(0);
  await switchUser(page, reviewer);
  await expect(btn(page, 'Add certificate link')).toBeEnabled();
  await expect(btn(page, 'Edit link')).toHaveCount(0);
  await expect(btn(page, 'Remove link')).toHaveCount(0);
  await btn(page, 'Add certificate link').click();
  await field(page, 'Certificate or badge URL').fill('https://issuer.example.org/other-draft');
  await switchUser(page, owner);
  await expect(field(page, 'Certificate or badge URL')).toHaveCount(0);
  await btn(page, 'Edit link').click();
  await field(page, 'Certificate or badge URL').fill(updated);
  await btn(page, 'Save public link').click();
  await expect(page.getByText('Public link updated.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(visibleLink(updated)).toHaveCount(2);
  await expect(visibleLink(first)).toHaveCount(0);
  await btn(page, 'Remove link').click();
  const confirm = dialog(page, 'Remove this public link?');
  await expect(btn(confirm, 'Cancel')).toBeFocused();
  await clickAfterUiMotion(btn(confirm, 'Remove link'));
  await expect(page.getByText('Public link removed.', { exact: true })).toBeVisible();
  await switchUser(page, null);
  await btn(page, 'Refresh public links').click();
  await expect(page.getByText('No public certificate links yet.', { exact: true })).toBeVisible();
  await switchUser(page, owner);
  await btn(page, 'My certification outcomes').click();
  await expect(
    page.getByText('Keep this preparation note private.', { exact: true })
  ).toBeVisible();
  await btn(page, 'Delete outcome').click();
  await clickAfterUiMotion(
    btn(dialog(page, 'Delete this certification outcome?'), 'Delete outcome')
  );
  await expect(page.getByText('Certification outcome deleted.', { exact: true })).toBeVisible();
});

test('a late retry cannot republish a link removed in another tab', async ({ page, context }) => {
  const url = 'https://issuer.example.org/verify/lost-response';
  await init(page);
  await page.goto('./#/outcomes?view=public');
  await btn(page, 'Add certificate link').click();
  await field(page, 'Certificate or badge URL').fill(url);
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-credential-drop-response', '1'));
  await btn(page, 'Publish link').click();
  await expect(
    page.getByText('Could not complete the request. Please retry.', { exact: true })
  ).toBeVisible();

  const other = await context.newPage();
  await init(other);
  await other.goto('./#/outcomes?view=public');
  await btn(other, 'Remove link').click();
  await clickAfterUiMotion(btn(dialog(other, 'Remove this public link?'), 'Remove link'));
  await expect(other.getByText('Public link removed.', { exact: true })).toBeVisible();
  await expect(other.getByText('No public certificate links yet.', { exact: true })).toBeVisible();
  await btn(page, 'Publish link').click();
  await expect(
    page.getByText('This link changed. Refresh and review the current link.', { exact: true })
  ).toBeVisible();
  await btn(page, 'Refresh my links').click();
  await expect(field(page, 'Certificate or badge URL')).toHaveValue(url);
  await expect(btn(page, 'Publish link')).toBeDisabled();
  await btn(other, 'Refresh public links').click();
  await expect(other.getByText('No public certificate links yet.', { exact: true })).toBeVisible();
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
  await expect(page.getByText(t('Private outcome saved.'), { exact: true })).toBeVisible();
  await btn(page.locator('main'), t('Public certificate links')).click();
  await btn(page, t('Add certificate link')).click();
  const publicForm = page.locator('.credential-form');
  const longUrl = 'https://issuer.example.org/verify/' + 'a'.repeat(240);
  await field(publicForm, t('Certificate or badge URL')).fill(longUrl);
  await field(publicForm, t('Certificate or badge URL')).press('Tab');
  await expect(btn(publicForm, t('Publish link'))).toBeFocused();
  await btn(publicForm, t('Publish link')).press('Enter');
  await expect(page.getByText(t('Certificate link published.'), { exact: true })).toBeVisible();
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
    const bounds = await btn(page, t('Edit link')).boundingBox();
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
  await btn(page, t('Remove link')).click();
  const confirm = dialog(page, t('Remove this public link?'));
  await expect(btn(confirm, t('Cancel'))).toBeFocused();
  await expect(btn(confirm, t('Remove link'))).toBeVisible();
  await confirm.screenshot({ path: info.outputPath('public-link-removal.png') });
});
