import { test, expect } from '@playwright/test';
import { accountCases } from './viewports.js';
import { contrastRatio } from './uiContrast.js';
import { quizUpdates } from '../../src/data/quizUpdates.js';
import { translate } from '../../src/i18n/messages.js';
import { clickAfterUiMotion } from './uiMotion.js';
const errors = new WeakMap();
const bell = (page) =>
  page.locator('.app-header').getByRole('button', { name: 'Quiz updates', exact: true });
const panel = (page) => page.getByRole('dialog', { name: 'Quiz updates', exact: true });
test.beforeEach(async ({ page }) => {
  const found = [];
  errors.set(page, found);
  page.on('pageerror', (e) => found.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (r) =>
    ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname)
      ? r.continue()
      : r.abort()
  );
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
function probe(request) {
  return (
    request.resourceType() === 'fetch' && new URL(request.url()).searchParams.has('quizmos-refresh')
  );
}
test('header notifications support keyboard, read persistence and provenance-free history', async ({
  page,
}) => {
  const io = [];
  page.on('request', (r) => {
    if (new URL(r.url()).port === '5176') io.push(r.url());
  });
  await page.goto('./#/library');
  await expect(
    page.locator('.quiz-library').getByRole('button', { name: 'Quiz updates', exact: true })
  ).toHaveCount(0);
  await expect(page.locator('.quiz-notification-trigger .ant-badge-count')).toHaveText(
    String(quizUpdates.length)
  );
  await bell(page).focus();
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(
    panel(page).getByRole('button', { name: 'Close quiz updates', exact: true })
  ).toBeFocused();
  for (const e of quizUpdates) {
    await expect(panel(page)).not.toContainText(e.sourceRevision.slice(0, 7));
  }
  await expect(panel(page).getByRole('link')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(bell(page)).toBeFocused();
  await expect(page.locator('.quiz-notification-trigger .ant-badge-count')).toHaveCount(0);
  await page.reload();
  await bell(page).click();
  await expect(page.locator('.quiz-notification-trigger .ant-badge-count')).toHaveCount(0);
  await panel(page).getByRole('button', { name: 'View all updates', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quiz updates', exact: true })).toBeVisible();
  for (const e of quizUpdates)
    await expect(page.locator('.quiz-updates-list')).not.toContainText(
      e.sourceRevision.slice(0, 7)
    );
  await expect(page.locator('.quiz-update a')).toHaveCount(0);
  expect(io).toEqual([]);
});
test('public notification access survives auth loading, owner changes and blocked preference storage', async ({
  page,
}) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('quiz-e2e-defer-auth', '1');
    const get = Storage.prototype.getItem,
      set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (k) {
      if (k === 'quiz-updates-seen-v1') throw new Error('blocked');
      return get.call(this, k);
    };
    Storage.prototype.setItem = function (k, v) {
      if (k === 'quiz-updates-seen-v1') throw new Error('blocked');
      return set.call(this, k, v);
    };
  });
  await page.goto('./#/library');
  await expect(page.locator('.app-header .ant-spin')).toBeVisible();
  await bell(page).click();
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    localStorage.setItem(
      'quiz-e2e-auth',
      JSON.stringify({ uid: 'notice-alice', displayName: 'Notice Alice', emailVerified: true })
    );
    window.dispatchEvent(new Event('quiz-e2e-auth-ready'));
  });
  await expect(page.getByRole('button', { name: 'Notice Alice', exact: true })).toBeVisible();
  await bell(page).click();
  await expect(panel(page)).toBeVisible();
  await panel(page).getByRole('button', { name: 'Close quiz updates', exact: true }).click();
  await expect(bell(page)).toBeFocused();
  await expect(page.locator('.quiz-notification-trigger .ant-badge-count')).toHaveCount(0);
});
test('empty notifications retain a usable history link and outside click closes the popup', async ({
  page,
}) => {
  await page.route('**/src/data/quizUpdates.js*', (r) =>
    r.fulfill({ contentType: 'application/javascript', body: 'export const quizUpdates=[];' })
  );
  await page.goto('./#/library');
  await bell(page).click();
  await expect(panel(page)).toContainText('No reviewed quiz updates yet.');
  await page.locator('.theme-toggle').click();
  await expect(panel(page)).toHaveCount(0);
  await bell(page).click();
  await panel(page).getByRole('button', { name: 'View all updates', exact: true }).click();
  await expect(page.locator('.updates-page')).toContainText('No reviewed quiz updates yet.');
});
test('long notification content and header fit all locales/themes/phone-landscape views', async ({
  page,
}, info) => {
  test.setTimeout(150000);
  const entries = quizUpdates.map((e) => ({
    ...e,
    summary: 'Long public notice ' + 'unbroken_notice_'.repeat(26),
  }));
  await page.route('**/src/data/quizUpdates.js*', (r) =>
    r.fulfill({
      contentType: 'application/javascript',
      body: 'export const quizUpdates=' + JSON.stringify(entries) + ';',
    })
  );
  await page.goto('./#/library');
  const views = accountCases(info.project.name);
  if (info.project.name === 'phone')
    views.push({ width: 360, height: 800, language: 'en', theme: 'light' });
  for (const v of views) {
    await page.setViewportSize({ width: v.width, height: v.height });
    await page.emulateMedia({
      reducedMotion: [390, 1280].includes(v.width) ? 'no-preference' : 'reduce',
    });
    await page
      .getByRole('button', { name: v.language === 'vi' ? 'Tiếng Việt' : 'English', exact: true })
      .click();
    if ((await page.locator('html').getAttribute('data-theme')) !== v.theme)
      await page.locator('.theme-toggle').click();
    const t = (k) => translate(v.language, k);
    const trigger = page
      .locator('.app-header')
      .getByRole('button', { name: t('Quiz updates'), exact: true });
    const b = await trigger.boundingBox();
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
    await trigger.click();
    const popup = page.getByRole('dialog', { name: t('Quiz updates'), exact: true });
    await expect(popup).toBeVisible();
    const box = await popup.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(v.width + 1);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(v.height + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    expect(await contrastRatio(popup.locator('p').first())).toBeGreaterThanOrEqual(4.5);
    for (const action of await popup.getByRole('button').all()) {
      const a = await action.boundingBox();
      expect(a.width).toBeGreaterThanOrEqual(44);
      expect(a.height).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({
      path: info.outputPath(`notifications-${v.width}-${v.language}-${v.theme}.png`),
    });
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});
test('notification navigation retains active-exam Cancel and unchanged stored deadlines', async ({
  page,
}) => {
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await expect(page.locator('.question-title')).toBeVisible();
  const before = await page.evaluate(() =>
    sessionStorage.getItem('quiz-study-v1:guest:aws-aip-c01:exam')
  );
  await bell(page).click();
  await panel(page).getByRole('button', { name: 'Open quiz', exact: true }).first().click();
  const leave = page.getByRole('dialog').filter({ hasText: 'Leave this exam?' });
  await expect(leave).toBeVisible();
  await clickAfterUiMotion(leave.getByRole('button', { name: 'Continue exam', exact: true }));
  await expect(page).toHaveURL(/#\/quiz\/aws-aip-c01\/exam$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem('quiz-study-v1:guest:aws-aip-c01:exam'))
  ).toBe(before);
});
test('public refresh reloads current app/filter without resetting an existing exam draft', async ({
  page,
}) => {
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await expect(page.locator('.question-title')).toBeVisible();
  const before = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('quiz-study-v1:guest:aws-aip-c01:exam'))
  );
  await page.locator('.app-nav').getByRole('button', { name: 'Quiz Bank', exact: true }).click();
  await clickAfterUiMotion(
    page
      .getByRole('dialog')
      .filter({ hasText: 'Leave this exam?' })
      .getByRole('button', { name: 'Leave exam', exact: true })
  );
  await page.getByRole('textbox', { name: 'Find a certification', exact: true }).fill('GH-600');
  const button = page.getByRole('button', { name: 'Refresh quizzes', exact: true });
  await expect(button).toBeEnabled();
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), button.click()]);
  await expect(
    page.getByRole('textbox', { name: 'Find a certification', exact: true })
  ).toHaveValue('GH-600');
  expect(new URL(page.url()).searchParams.has('quizmos-refresh')).toBe(true);
  const after = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem('quiz-study-v1:guest:aws-aip-c01:exam'))
  );
  expect(after.deadline).toBe(before.deadline);
  expect(after.answers).toEqual(before.answers);
  expect(after.questions).toEqual(before.questions);
});
test('failed refresh preserves current results and a retry really reloads', async ({ page }) => {
  let fail = true;
  await page.route('**/*', (r) =>
    probe(r.request()) && fail
      ? r.fulfill({ status: 503, contentType: 'text/html', body: 'Unavailable' })
      : r.fallback()
  );
  await page.goto('./#/library');
  await page.getByRole('textbox', { name: 'Find a certification', exact: true }).fill('GH-600');
  await page.getByRole('button', { name: 'Refresh quizzes', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not refresh quizzes');
  await expect(page.locator('.library-quiz-row')).toHaveCount(1);
  await expect(
    page.getByRole('textbox', { name: 'Find a certification', exact: true })
  ).toHaveValue('GH-600');
  fail = false;
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.getByRole('button', { name: 'Refresh quizzes', exact: true }).click(),
  ]);
  await expect(
    page.getByRole('textbox', { name: 'Find a certification', exact: true })
  ).toHaveValue('GH-600');
});
for (const change of ['route', 'owner'])
  test(`refresh rejects duplicate and late ${change} continuation`, async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'quiz-e2e-auth',
        JSON.stringify({ uid: 'refresh-alice', displayName: 'Refresh Alice', emailVerified: true })
      )
    );
    let release;
    let count = 0;
    await page.route('**/*', async (r) => {
      if (!probe(r.request())) return r.fallback();
      count++;
      await new Promise((resolve) => {
        release = resolve;
      });
      try {
        await r.fulfill({ contentType: 'text/html', body: '<div id="app"></div>' });
      } catch {
        /* aborted by current context */
      }
    });
    await page.goto('./#/library');
    const button = page.getByRole('button', { name: 'Refresh quizzes', exact: true });
    await button.click();
    await expect(button).toBeDisabled();
    await button.evaluate((el) => el.click());
    await expect.poll(() => count).toBe(1);
    if (change === 'route') {
      await page
        .locator('.app-nav')
        .getByRole('button', { name: 'My quizzes', exact: true })
        .click();
      await expect(page.getByRole('heading', { name: 'My quizzes', exact: true })).toBeVisible();
    } else {
      await page.evaluate(() =>
        window.dispatchEvent(
          new CustomEvent('quiz-e2e-auth-change', {
            detail: { uid: 'refresh-bob', displayName: 'Refresh Bob', emailVerified: true },
          })
        )
      );
      await expect(page.getByRole('button', { name: 'Refresh Bob', exact: true })).toBeVisible();
    }
    release();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
    expect(new URL(page.url()).searchParams.has('quizmos-refresh')).toBe(false);
    await expect(
      page.getByRole('alert').filter({ hasText: 'Could not refresh quizzes' })
    ).toHaveCount(0);
  });
