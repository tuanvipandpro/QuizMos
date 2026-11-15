import { expect } from '@playwright/test';
import { waitForUiMotion } from './uiMotion.js';
// Responsive controls are direct on desktop and explicitly opened on compact headers.
export async function headerControl(page, options, root = page) {
  const trigger = page.locator('.compact-nav-trigger');
  const compact = await trigger.isVisible();
  const target = compact
    ? page.locator('.compact-header-popup').getByRole('button', options)
    : root.getByRole('button', options);
  if (compact) {
    if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
      await expect(page.locator('.compact-header-popup')).toHaveCount(0);
      await trigger.click();
    }
    await waitForUiMotion(page.locator('.compact-header-popup'));
    if (!(await target.count())) await page.keyboard.press('Escape');
  }
  return target;
}
