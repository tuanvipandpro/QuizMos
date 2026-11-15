import { test, expect } from '@playwright/test';
import { accountCases } from './viewports.js';
import { translate } from '../../src/i18n/messages.js';
const cases = accountCases('phone').concat(accountCases('desktop'), [
  { project: 'phone', width: 360, height: 800, language: 'vi', theme: 'light' },
  { project: 'phone', width: 360, height: 800, language: 'en', theme: 'dark' },
]);
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});
for (const view of cases) {
  test('compact header ' + JSON.stringify(view), async ({ page }, info) => {
    test.skip(info.project.name !== view.project);
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.addInitScript(({ language, theme }) => {
      localStorage.setItem('quiz-app-language', language);
      localStorage.setItem('quiz-app-theme', theme);
      sessionStorage.setItem('quiz-e2e-defer-auth', '1');
    }, view);
    await page.goto('./#/library');
    const header = page.getByRole('banner');
    await expect(header.locator('.header-auth-loading')).toBeVisible();
    const before = await header.boundingBox();
    if (view.width <= 900) expect(before.height).toBeLessThanOrEqual(72);
    await page.evaluate(() => window.dispatchEvent(new Event('quiz-e2e-auth-ready')));
    await expect(header.locator('.header-login')).toBeVisible();
    await expect(header.locator('.header-login .anticon')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    if (view.width > 900) {
      await expect(header.locator('.app-brand > span')).toBeVisible();
      await expect(
        header.getByRole('button', { name: translate(view.language, 'Quiz Bank'), exact: true })
      ).toBeVisible();
      return;
    }
    const t = (key) => translate(view.language, key),
      trigger = header.locator('.compact-nav-trigger');
    await trigger.focus();
    await page.keyboard.press('Enter');
    const popup = page.getByRole('dialog', { name: t('Navigation and preferences'), exact: true });
    await expect(popup).toBeVisible();
    await expect(popup.getByRole('button', { name: t('Quiz Bank'), exact: true })).toBeFocused();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      expect(
        await page
          .locator('.compact-header-drawer')
          .evaluate((el) => el.contains(document.activeElement))
      ).toBe(true);
    }
    await popup.getByRole('button', { name: t('Quiz Bank'), exact: true }).focus();
    const box = await popup.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(view.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(view.height + 1);
    await page.keyboard.press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(popup).toBeVisible();
    await page
      .locator('.compact-header-drawer .ant-drawer-mask')
      .click({ position: { x: view.width - 10, y: Math.min(200, view.height - 10) } });
    await expect(popup).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page
      .getByRole('dialog', { name: t('Navigation and preferences'), exact: true })
      .getByRole('button', { name: t('My quizzes'), exact: true })
      .click();
    await expect(page).toHaveURL(/#\/my-quizzes$/);
    await expect(trigger).toHaveText(t('My quizzes'));
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent('quiz-e2e-auth-change', {
          detail: {
            uid: 'header-long',
            displayName: 'A very long display name for the header account controls',
            emailVerified: true,
          },
        })
      )
    );
    await expect(header.locator('.profile-button')).toBeVisible();
    expect((await header.boundingBox()).height).toBe(before.height);
    for (const control of [
      header.locator('.app-brand'),
      trigger,
      header.locator('.quiz-notification-button'),
      header.locator('.profile-button'),
    ]) {
      const rect = await control.boundingBox();
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('compact-header.png'), fullPage: false });
    await trigger.click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(popup).toHaveCount(0);
    await expect(header.locator('.app-brand')).toBeFocused();
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .not.toBe('hidden');
  });
}
test('compact preferences and guarded Exam navigation retain the saved deadline on Cancel', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await expect(page.locator('.question-title')).toBeVisible();
  const read = () =>
    page.evaluate(() => JSON.parse(sessionStorage.getItem('quiz-study-v1:guest:aws-aip-c01:exam')));
  const before = await read();
  await page.locator('.compact-nav-trigger').click();
  await page
    .getByRole('dialog', { name: 'Navigation and preferences', exact: true })
    .getByRole('button', { name: 'My quizzes', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Leave this exam?' })
    .getByRole('button', { name: 'Continue exam', exact: true })
    .click();
  expect((await read()).deadline).toBe(before.deadline);
  await expect(page.locator('.compact-nav-trigger')).toBeFocused();
});

test('landscape drawer scroll stays inside the sidebar and restores background scrolling after close', async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 260 });
  await page.goto('./');
  await expect(page.locator('.landing-hero h1')).toBeVisible();
  const before = await page.evaluate(() => scrollY);
  await page.locator('.compact-nav-trigger').click();
  const body = page.locator('.compact-header-drawer .ant-drawer-body');
  await expect(body).toBeVisible();
  await body.hover();
  await page.mouse.wheel(0, 200);
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await page
    .getByRole('dialog', { name: 'Navigation and preferences', exact: true })
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await expect(body).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden');
  await expect(page.locator('.compact-nav-trigger')).toBeFocused();
});
