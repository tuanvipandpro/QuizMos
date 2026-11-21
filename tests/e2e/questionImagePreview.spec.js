import { test, expect } from '@playwright/test';
import { translate } from '../../src/i18n/messages.js';
import { sessionKey } from '../../src/utils/studySession.js';

const diagram = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <rect width="1200" height="800" fill="#e8f2fc"/>
  <rect x="72" y="72" width="1056" height="656" fill="white" stroke="#1c4b80" stroke-width="12"/>
  <path d="M180 240H1020 M180 400H1020 M180 560H1020" stroke="#2863aa" stroke-width="8"/>
  <text x="180" y="200" font-size="48" fill="#122d4d">Example question diagram</text>
</svg>`;
const imageUrl = '/quiz-app/qa-question-illustration.svg';
const question = (id, props = {}) => ({
  id,
  question: 'Illustrated question ' + id,
  options: { A: 'Alpha', B: 'Beta' },
  answer: ['A'],
  imageUrl,
  ...props,
});
const yesNo = {
  id: 'structured',
  question: 'Structured illustration',
  type: 'yes_no',
  statements: [{ id: 'statement', text: 'Can you inspect this diagram?' }],
  options: { A: 'Yes', B: 'No' },
  answer: { statement: 'A' },
  imageUrl,
};
const button = (root, name) => root.getByRole('button', { name, exact: true });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()
  );
  await page.route('**/quiz/Azure/AZ-900.json', (route) =>
    route.fulfill({ json: [question('one'), question('two'), yesNo] })
  );
  await page.route('**/qa-question-illustration.svg', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: diagram })
  );
});

const views = [
  { width: 320, height: 740, language: 'vi', theme: 'dark', project: 'phone' },
  { width: 390, height: 844, language: 'en', theme: 'light', project: 'phone' },
  { width: 412, height: 915, language: 'vi', theme: 'light', project: 'phone' },
  { width: 844, height: 390, language: 'en', theme: 'dark', project: 'phone' },
  { width: 768, height: 1024, language: 'en', theme: 'dark', project: 'desktop' },
  { width: 1280, height: 900, language: 'en', theme: 'light', project: 'desktop' },
];
for (const view of views) {
  test(`preview fits and scrolls at ${view.width}×${view.height}`, async ({ page }, info) => {
    test.skip(info.project.name !== view.project);
    const t = (key) => translate(view.language, key);
    await page.setViewportSize(view);
    await page.addInitScript(({ language, theme }) => {
      localStorage.setItem('quiz-app-language', language);
      localStorage.setItem('quiz-app-theme', theme);
    }, view);
    await page.goto('./#/quiz/az-900/practice');
    const trigger = button(page, t('Open question illustration'));
    if (view.project === 'phone') await trigger.tap();
    else if (view.width === 768) await trigger.press('Enter');
    else await trigger.click();
    const dialog = page.getByRole('dialog', { name: t('Question illustration'), exact: true });
    const region = dialog.getByRole('region', { name: t('Question illustration'), exact: true });
    const image = dialog.getByRole('img', { name: t('Question illustration'), exact: true });
    await expect(image).toBeVisible();
    const fit = await image.boundingBox();
    const box = await region.boundingBox();
    expect(fit.width).toBeLessThanOrEqual(box.width + 1);
    expect(fit.height).toBeLessThanOrEqual(box.height + 1);
    expect(fit.width / fit.height).toBeCloseTo(1.5, 1);
    expect(fit.y + fit.height).toBeLessThanOrEqual(view.height);
    await dialog.screenshot({ path: info.outputPath('question-image-preview.png') });
    const zoomIn = button(dialog, t('Zoom in'));
    const zoomOut = button(dialog, t('Zoom out'));
    for (const control of [zoomIn, zoomOut]) {
      expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await expect(zoomOut).toBeDisabled();
    await zoomIn.click();
    expect((await image.boundingBox()).width).toBeGreaterThan(fit.width * 1.3);
    await region.press('ArrowDown');
    await region.press('ArrowRight');
    await expect
      .poll(() => region.evaluate((element) => element.scrollTop + element.scrollLeft))
      .toBeGreaterThan(0);
    await zoomOut.click();
    expect((await image.boundingBox()).width).toBeCloseTo(fit.width, 0);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

test('Mock Exam keeps its question, answer, flag and deadline while the preview is open', async ({
  page,
}) => {
  const key = sessionKey(null, 'az-900', 'exam');
  await page.route('**/quiz/Azure/AZ-900.json', (route) =>
    route.fulfill({ json: [question('one'), question('two')] })
  );
  await page.goto('./#/quiz/az-900/exam?count=2&time=15');
  await expect(page.getByText('Question 1 of 2', { exact: true })).toBeVisible();
  await button(page, 'Next question').click();
  const answer = page.getByRole('radio', { name: /Alpha/ });
  await answer.check();
  await button(page, 'Flag').click();
  await expect(button(page, 'Unflag')).toBeVisible();
  const readDraft = () => page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), key);
  const original = await readDraft();
  expect(original.index).toBe(1);
  expect(original.flags).toEqual([1]);
  await button(page, 'Open question illustration').click();
  const modal = page.getByRole('dialog', { name: 'Question illustration', exact: true });
  await expect(modal).toBeVisible();
  const timer = page.locator('[role="timer"]');
  const remaining = async () =>
    (await timer.locator('.ant-statistic-content').innerText())
      .split(':')
      .reduce((seconds, part) => seconds * 60 + Number(part), 0);
  const before = await remaining();
  await expect.poll(remaining, { timeout: 4000 }).toBeLessThan(before);
  expect(await readDraft()).toEqual(original);
  await button(modal, 'Close').click();
  await expect(modal).toBeHidden();
  await expect(button(page, 'Open question illustration')).toBeFocused();
  await expect(page.getByText('Question 2 of 2', { exact: true })).toBeVisible();
  await expect(answer).toBeChecked();
  await expect(button(page, 'Unflag')).toBeVisible();
  expect(await readDraft()).toEqual(original);
});

test('structured images open and broken images leave the question usable', async ({ page }) => {
  await page.route('**/quiz/Azure/AZ-900.json', (route) =>
    route.fulfill({
      json: [yesNo, question('broken', { imageUrl: '/quiz-app/qa-missing.png' })],
    })
  );
  await page.route('**/qa-missing.png', (route) => route.fulfill({ status: 404, body: 'missing' }));
  await page.goto('./#/quiz/az-900/practice');
  await button(page, 'Open question illustration').click();
  const modal = page.getByRole('dialog', { name: 'Question illustration', exact: true });
  await expect(
    modal.getByRole('img', { name: 'Question illustration', exact: true })
  ).toBeVisible();
  await button(modal, 'Close').click();
  await button(page, 'Next question').click();
  await expect(
    page.getByText('Question illustration is unavailable.', { exact: true })
  ).toBeVisible();
  await expect(button(page, 'Open question illustration')).toHaveCount(0);
  const answer = page.getByRole('radio', { name: /Alpha/ });
  await answer.check();
  await expect(answer).toBeChecked();
});
