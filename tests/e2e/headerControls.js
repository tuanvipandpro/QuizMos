import { expect } from '@playwright/test';
import { waitForUiMotion } from './uiMotion.js';
// Responsive controls are direct on desktop and explicitly opened on compact headers.
export async function headerControl(page, options, root = page.locator('.app-header')) {
  await expect
    .poll(() =>
      page
        .locator('.app-header')
        .evaluate(
          (el) =>
            el.classList.contains('is-compact') === window.matchMedia('(max-width: 900px)').matches
        )
    )
    .toBe(true);
  const trigger = page.locator('.compact-nav-trigger');
  const compact = await trigger.isVisible();
  const direct = root.getByRole('button', options);
  if (compact && (await direct.count())) {
    await closeHeaderPanel(page);
    return direct;
  }
  const target = compact
    ? page.locator('.compact-header-popup').getByRole('button', options)
    : root.getByRole('button', options);
  if (compact) {
    await openHeaderPanel(page);
    if (!(await target.count())) await page.keyboard.press('Escape');
  }
  return target;
}

export async function openHeaderPanel(page) {
  const trigger = page.locator('.compact-nav-trigger');
  if (!(await trigger.isVisible())) return;
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await expect(page.locator('.compact-header-popup')).toHaveCount(0);
    await trigger.click();
  }
  await expect(page.locator('.compact-header-popup')).toBeVisible();
  await waitForUiMotion(page.locator('.compact-header-popup'));
}

// Background focus/scroll checks start after modal dismissal and focus restoration.
export async function waitForHeaderPanelClosed(page) {
  await expect(page.locator('.compact-header-popup')).toHaveCount(0);
  await expect(page.locator('.compact-header-drawer')).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
    .not.toBe('hidden');
}

export async function closeHeaderPanel(page) {
  const trigger = page.locator('.compact-nav-trigger');
  if ((await trigger.count()) && (await trigger.getAttribute('aria-expanded')) === 'true') {
    await page.locator('.compact-header-drawer .ant-drawer-close').click();
    await waitForHeaderPanelClosed(page);
  }
}

export async function expectHeaderAccount(page, name) {
  await expect(await headerControl(page, { name, exact: true })).toBeVisible();
  await closeHeaderPanel(page);
}

export async function headerReturnTarget(page, desktopTarget) {
  const trigger = page.locator('.compact-nav-trigger');
  return (await trigger.isVisible()) ? trigger : desktopTarget;
}
