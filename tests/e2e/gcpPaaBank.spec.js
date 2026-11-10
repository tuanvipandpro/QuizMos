import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createExamSession } from '../../src/utils/studySession.js';
import { quizUpdates } from '../../src/data/quizUpdates.js';
import { accountCases } from './viewports.js';
import { translate } from '../../src/i18n/messages.js';
import { clickAfterUiMotion } from './uiMotion.js';
const bank = JSON.parse(fs.readFileSync('public/quiz/Google/GCP_PAA.json', 'utf8'));
const multi = bank.find((q) => q.id === 'q-22');
const entry = quizUpdates.find((e) => e.bankId === 'gcp-paa');
const errors = new WeakMap();
const choice = (page, key, role = 'checkbox') =>
  page.getByRole(role, { name: new RegExp('^' + key + '\\.') });
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

test('PAA catalog/search aliases and actions fit the existing locale/theme/viewport matrix', async ({
  page,
}, info) => {
  await page.goto('./#/library');
  const views = accountCases(info.project.name);
  if (info.project.name === 'phone')
    views.push({ width: 360, height: 800, language: 'en', theme: 'light' });
  for (const view of views) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.emulateMedia({
      reducedMotion: [390, 1280].includes(view.width) ? 'no-preference' : 'reduce',
    });
    await page
      .getByRole('button', { name: view.language === 'vi' ? 'Tiếng Việt' : 'English', exact: true })
      .click();
    if ((await page.locator('html').getAttribute('data-theme')) !== view.theme)
      await page.locator('.theme-toggle').click();
    const t = (k) => translate(view.language, k);
    const search = page.getByRole('textbox', { name: t('Find a certification'), exact: true });
    for (const query of ['GCP-PAA', 'GCP_PAA', 'Professional Agentic Architect']) {
      await search.fill(query);
      await expect(page.locator('.library-quiz-row')).toHaveCount(1);
    }
    const row = page.locator('.library-quiz-row');
    await expect(row).toContainText('Professional Agentic Architect');
    await expect(row).toContainText('75');
    await row.scrollIntoViewIfNeeded();
    for (const button of await row.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await row.getByRole('button', { name: t('Practice'), exact: true }).focus();
    await expect(row.getByRole('button', { name: t('Practice'), exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: info.outputPath(`paa-${view.width}-${view.language}-${view.theme}.png`),
    });
  }
});

test('PAA single/multiple Practice, supplied reference and reload work without AI requests', async ({
  page,
}) => {
  const io = [];
  page.on('request', (r) => {
    if (new URL(r.url()).port === '5176') io.push(r.url());
  });
  await page.goto('./#/quiz/gcp-paa/practice?question=q-2');
  await expect(page.locator('.question-title')).toContainText('proprietary internal engineering');
  await choice(page, 'D', 'radio').check();
  await expect(page.locator('.question-feedback')).toContainText('Correct answer!');
  const explain = page.getByRole('button', { name: 'Explain', exact: true });
  await explain.click();
  await expect(page.locator('.included-explanation')).toContainText('ACL metadata');
  await expect(page.locator('.explanation-panel')).toBeFocused();
  await page
    .locator('.explanation-panel')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await expect(explain).toBeFocused();
  await page.goto('./#/quiz/gcp-paa/practice?question=q-22');
  await expect(page.locator('.question-title')).toContainText(multi.question.slice(0, 70));
  await choice(page, 'B').check();
  await expect(page.locator('.question-feedback')).toHaveCount(0);
  await choice(page, 'E').check();
  await expect(page.locator('.question-feedback')).toContainText('Correct answer!');
  await page.reload();
  await expect(choice(page, 'B')).toBeChecked();
  await expect(choice(page, 'E')).toBeChecked();
  expect(io).toEqual([]);
});

for (const mode of ['standard', 'learning'])
  test(`PAA ${mode} exam preserves partial/correct answers, deadline and locked review`, async ({
    page,
  }) => {
    const session = createExamSession(bank, 75, 60, { random: () => 0.999, feedbackMode: mode });
    const examChoice = (key) =>
      page.getByRole('checkbox', { name: multi.options[key], exact: true });
    session.index = session.questions.findIndex((q) => q.id === multi.id);
    await page.goto('./');
    await page.evaluate(
      (s) => sessionStorage.setItem('quiz-study-v1:guest:gcp-paa:exam', JSON.stringify(s)),
      session
    );
    await page.goto('./#/quiz/gcp-paa/exam');
    await expect(page.locator('.question-title')).toContainText(multi.question.slice(0, 70));
    await examChoice('B').check();
    await expect(page.locator('.question-feedback')).toHaveCount(0);
    await page.reload();
    await expect(examChoice('B')).toBeChecked();
    await expect(examChoice('E')).not.toBeChecked();
    await examChoice('E').check();
    if (mode === 'learning')
      await expect(page.locator('.question-feedback')).toContainText('Correct answer!');
    else await expect(page.locator('.question-feedback')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Explain', exact: true })).toHaveCount(0);
    await page.reload();
    const saved = await page.evaluate(() =>
      JSON.parse(sessionStorage.getItem('quiz-study-v1:guest:gcp-paa:exam'))
    );
    expect(saved.deadline).toBe(session.deadline);
    expect(saved.answers[saved.index]).toEqual(multi.answer);
    await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
    const confirm = page.getByRole('dialog', { name: 'Review before submitting', exact: true });
    await clickAfterUiMotion(
      confirm.getByRole('button', { name: 'Submit and view results', exact: true })
    );
    await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
    for (const checkbox of await page.getByRole('checkbox').all())
      await expect(checkbox).toBeDisabled();
    await expect(page.locator('.question-feedback')).toContainText('Correct answer!');
  });

test('PAA update link is canonical and notification navigation preserves active-exam Cancel', async ({
  page,
}) => {
  await page.goto('./#/updates');
  const update = page.locator('.quiz-update').filter({ hasText: 'Professional Agentic Architect' });
  await expect(update).toContainText('Added 75');
  await expect(update.locator('time')).toHaveAttribute('datetime', '2026-11-10');
  await expect(update).not.toContainText(entry.sourceRevision.slice(0, 7));
  await expect(update.getByRole('link')).toHaveCount(0);
  await update.getByRole('button', { name: 'Open quiz', exact: true }).click();
  await expect(page).toHaveURL(/#\/quiz\/gcp-paa$/);
  await expect(page.locator('.quiz-overview-identity')).toContainText('75');
  await page.goto('./#/quiz/gcp-paa/exam');
  await expect(page.locator('.question-title')).toBeVisible();
  const before = await page.evaluate(() =>
    sessionStorage.getItem('quiz-study-v1:guest:gcp-paa:exam')
  );
  await page
    .locator('.app-header')
    .getByRole('button', { name: 'Quiz updates', exact: true })
    .click();
  const popup = page.getByRole('dialog', { name: 'Quiz updates', exact: true });
  const notice = popup.getByRole('listitem').filter({ hasText: 'Professional Agentic Architect' });
  await notice.getByRole('button', { name: 'Open quiz', exact: true }).click();
  const leave = page.getByRole('dialog').filter({ hasText: 'Leave this exam?' });
  await expect(leave).toBeVisible();
  await clickAfterUiMotion(leave.getByRole('button', { name: 'Continue exam', exact: true }));
  await expect(page).toHaveURL(/#\/quiz\/gcp-paa\/exam$/);
  expect(
    await page.evaluate(() => sessionStorage.getItem('quiz-study-v1:guest:gcp-paa:exam'))
  ).toBe(before);
});

test('PAA loading failure is recoverable and does not replace an existing Practice draft', async ({
  page,
}) => {
  await page.goto('./#/quiz/gcp-paa/practice?question=q-22');
  await choice(page, 'B').check();
  const before = await page.evaluate(() =>
    sessionStorage.getItem('quiz-study-v1:guest:gcp-paa:practice')
  );
  let fail = true;
  await page.route('**/quiz/Google/GCP_PAA.json*', (r) =>
    fail ? r.fulfill({ status: 503, body: 'Unavailable' }) : r.fallback()
  );
  await page.reload();
  await expect(page.getByText('Could not load this quiz.', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem('quiz-study-v1:guest:gcp-paa:practice'))
  ).toBe(before);
  fail = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(choice(page, 'B')).toBeChecked();
});

test('a cancelled late PAA response cannot replace the library after navigation', async ({
  page,
}) => {
  let release, finish;
  const finished = new Promise((resolve) => {
    finish = resolve;
  });
  await page.route('**/quiz/Google/GCP_PAA.json*', async (r) => {
    await new Promise((resolve) => {
      release = resolve;
    });
    try {
      await r.fulfill({ json: bank });
    } catch {
      /* Request may have been aborted by navigation. */
    } finally {
      finish();
    }
  });
  await page.goto('./#/quiz/gcp-paa/practice');
  await expect.poll(() => !!release).toBe(true);
  await page.locator('.app-nav').getByRole('button', { name: 'Quiz Bank', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quiz Bank', exact: true })).toBeVisible();
  release();
  await finished;
  await expect(page).toHaveURL(/#\/library$/);
  await expect(page.locator('.question-title')).toHaveCount(0);
});

test('long PAA options and included references remain readable in the full UI matrix', async ({
  page,
}, info) => {
  await page.goto('./#/quiz/gcp-paa/practice?question=q-66');
  const views = accountCases(info.project.name);
  if (info.project.name === 'phone')
    views.push({ width: 360, height: 800, language: 'en', theme: 'light' });
  for (const view of views) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.emulateMedia({
      reducedMotion: [390, 1280].includes(view.width) ? 'no-preference' : 'reduce',
    });
    await page
      .getByRole('button', { name: view.language === 'vi' ? 'Tiếng Việt' : 'English', exact: true })
      .click();
    if ((await page.locator('html').getAttribute('data-theme')) !== view.theme)
      await page.locator('.theme-toggle').click();
    const t = (k) => translate(view.language, k);
    await expect(page.locator('.question-title')).toContainText('healthcare organization');
    for (const option of await page.locator('.question-option').all()) {
      const b = await option.boundingBox();
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
    const explain = page.getByRole('button', { name: t('Explain'), exact: true });
    await explain.click();
    await expect(page.locator('.explanation-panel')).toBeFocused();
    await expect(page.locator('.included-explanation')).toContainText(
      'PSC alone is not an air gap'
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.screenshot({
      path: info.outputPath(`paa-reference-${view.width}-${view.language}-${view.theme}.png`),
    });
    await page
      .locator('.explanation-panel')
      .getByRole('button', { name: t('Close'), exact: true })
      .click();
    await expect(explain).toBeFocused();
  }
});
