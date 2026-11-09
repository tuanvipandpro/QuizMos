import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createExamSession } from '../../src/utils/studySession.js';
import { accountCases } from './viewports.js';
import { translate } from '../../src/i18n/messages.js';
import { clickAfterUiMotion } from './uiMotion.js';
const bank = JSON.parse(
  fs.readFileSync(new URL('../../public/quiz/Azure/GH-600_QuizMos.json', import.meta.url))
);
const native = bank.find((q) => q.id === 'q-51');
const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const found = [];
  errors.set(page, found);
  page.on('pageerror', (e) => found.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
test('GH-600 catalog/search retains provider grouping and reachable localized controls', async ({
  page,
}, info) => {
  await page.goto('./#/library');
  for (const view of accountCases(info.project.name)) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page
      .getByRole('button', { name: view.language === 'vi' ? 'Tiếng Việt' : 'English', exact: true })
      .click();
    if ((await page.locator('html').getAttribute('data-theme')) !== view.theme)
      await page.locator('.theme-toggle').click();
    const t = (key) => translate(view.language, key);
    await page
      .getByRole('textbox', { name: t('Find a certification'), exact: true })
      .fill('GH-600');
    const row = page
      .locator('.library-quiz-row')
      .filter({ has: page.getByText('GH-600', { exact: true }) });
    await expect(row).toContainText('GitHub Certified: Agentic AI Developer');
    await expect(row).toContainText('98');
    await row.scrollIntoViewIfNeeded();
    for (const button of await row.getByRole('button').all()) {
      const b = await button.boundingBox();
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    await row.getByRole('button', { name: t('Practice'), exact: true }).focus();
    await expect(row.getByRole('button', { name: t('Practice'), exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: info.outputPath(`gh600-${view.width}-${view.language}-${view.theme}.png`),
    });
  }
});
test('GH-600 source formats and native code render from the real public bank', async ({ page }) => {
  for (const type of ['multiple_choice', 'yes_no', 'dropdown', 'drag_drop']) {
    const q = type === 'drag_drop' ? native : bank.find((q) => q.type === type);
    await page.goto(`./#/quiz/gh-600/practice?question=${q.id}`);
    await expect(page.locator('.question-title')).toContainText(q.question.slice(0, 70));
    if (type === 'drag_drop') {
      await expect(page.locator('.dd-template')).toContainText('${{ github.ref }}');
      await expect(page.getByRole('combobox')).toHaveCount(0);
      expect(
        (await page.locator('.dd-template').innerText()).match(/risk_reviewer:/g)?.length
      ).toBe(1);
    }
  }
});
test('GH-600 native assignments survive both exam modes, reload and submitted review', async ({
  page,
}) => {
  for (const mode of ['standard', 'learning']) {
    const session = createExamSession(bank, 98, 60, { random: () => 0.999, feedbackMode: mode });
    session.index = session.questions.findIndex((q) => q.id === native.id);
    await page.goto('./');
    await page.evaluate(
      (session) =>
        sessionStorage.setItem('quiz-study-v1:guest:gh-600:exam', JSON.stringify(session)),
      session
    );
    await page.goto('./#/quiz/gh-600/exam');
    await expect(page.locator('.dd-template')).toContainText('${{ github.ref }}');
    for (const part of native.slots) {
      const key = native.answer[part.id];
      await page
        .locator('.dd-choice-bank')
        .getByRole('button', { name: `${key}. ${native.options[part.id][key]}`, exact: true })
        .click();
      await page.locator(`[data-dd-slot="${part.id}"]`).click();
    }
    if (mode === 'standard') await expect(page.locator('.dd-correct,.dd-incorrect')).toHaveCount(0);
    else await expect(page.locator('.dd-correct')).toHaveCount(3);
    await page.reload();
    for (const part of native.slots)
      await expect(page.locator(`[data-dd-slot="${part.id}"]`)).toContainText(
        native.options[part.id][native.answer[part.id]]
      );
    const saved = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('quiz-study-v1:guest:gh-600:exam'))
    );
    expect(saved.deadline).toBe(session.deadline);
    expect(saved.answers[saved.index]).toEqual(native.answer);
    await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
    await clickAfterUiMotion(
      page
        .getByRole('dialog', { name: 'Review before submitting', exact: true })
        .getByRole('button', { name: 'Submit and view results', exact: true })
    );
    await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
    await expect(page.locator('.drag-drop-answers button')).toHaveCount(0);
  }
});

test('the reviewed GH-600 addition is visible in updates and opens its canonical bank', async ({
  page,
}) => {
  await page.goto('./#/updates');
  const entry = page.locator('.quiz-update').filter({
    has: page.getByRole('heading', {
      name: 'GitHub Certified: Agentic AI Developer (GH-600)',
      exact: true,
    }),
  });
  await expect(entry).toContainText('Added 98 GH-600 practice questions');
  await expect(entry.locator('time')).toHaveAttribute('datetime', '2026-11-10');
  await expect(entry.getByRole('link')).toHaveAttribute(
    'href',
    /\/commit\/ed026d08b94d62e67f6a29d3b3e52c77dd12c1d0$/
  );
  await entry.getByRole('button', { name: 'Open quiz', exact: true }).click();
  await expect(page).toHaveURL(/#\/quiz\/gh-600$/);
  await expect(page.locator('.quiz-overview-identity')).toContainText('98');
});
