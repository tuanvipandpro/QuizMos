import { test, expect } from '@playwright/test';
import { headerControl, expectHeaderAccount, waitForHeaderPanelClosed } from './headerControls.js';
import fs from 'node:fs';
import { accountCases } from './viewports.js';
import { translate } from '../../src/i18n/messages.js';
import {
  questionType,
  questionParts,
  partOptions,
  partLabel,
} from '../../src/utils/questionModel.js';
import { contrastRatio, contrastFromColors } from './uiContrast.js';
const example = (format) =>
  JSON.parse(
    fs.readFileSync(new URL('../../public/examples/quiz-' + format + '.json', import.meta.url))
  )[0];
const draft = (page, key) => page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), key);
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});
async function answerExample(page, question) {
  if (questionType(question) === 'multiple_choice') {
    for (const key of question.answer)
      await page
        .locator('.question-option')
        .filter({ hasText: question.options[key] })
        .locator('input')
        .check();
  } else if (questionType(question) === 'yes_no') {
    for (const part of questionParts(question))
      await page
        .getByRole('group', { name: part.text, exact: true })
        .getByText(partOptions(question, part.id)[question.answer[part.id]], { exact: true })
        .click();
  } else if (questionType(question) === 'drag_drop') {
    for (const part of questionParts(question)) {
      const key = question.answer[part.id],
        text = partOptions(question, part.id)[key];
      await page
        .locator('.dd-choice-bank')
        .getByRole('button', { name: `${key}. ${text}`, exact: true })
        .click();
      await page.locator(`[data-dd-slot="${part.id}"]`).click();
    }
  } else {
    for (const [index, part] of questionParts(question).entries()) {
      const select = page.getByRole('combobox', {
        name: 'Answer for ' + partLabel(part, index),
        exact: true,
      });
      await select.click();
      const list = page.locator(`[id="${await select.getAttribute('aria-controls')}"]`);
      await list
        .getByRole('option', {
          name: partOptions(question, part.id)[question.answer[part.id]],
          exact: true,
        })
        .click();
    }
  }
}

for (const item of accountCases('phone').concat(accountCases('desktop'))) {
  test('settings matrix ' + JSON.stringify(item), async ({ page }, info) => {
    test.skip(info.project.name !== item.project);
    await page.setViewportSize({ width: item.width, height: item.height });
    await page.addInitScript(({ language, theme }) => {
      localStorage.setItem('quiz-app-language', language);
      localStorage.setItem('quiz-app-theme', theme);
    }, item);
    await page.goto('./#/quiz/aws-aip-c01?mode=exam');
    // Set through the real utility controls so preference key changes cannot mask a locale/theme error.
    await (
      await headerControl(page, {
        name: item.language === 'vi' ? 'Tiếng Việt' : 'English',
        exact: true,
      })
    ).click();
    const t = (key, params) => translate(item.language, key, params);
    const theme = await headerControl(page, {
      name: t(item.theme === 'dark' ? 'Switch to dark mode' : 'Switch to light mode'),
      exact: true,
    });
    if (await theme.count()) await theme.click();
    await waitForHeaderPanelClosed(page);
    await expect(page.locator('#study-count')).toHaveValue('75');
    await expect(page.locator('#study-time')).toHaveValue('180');
    await expect(page.locator('#study-time')).toHaveAttribute('readonly', '');
    await expect(page.locator('.cert-profile-info')).toContainText('750/1000');
    expect(await contrastRatio(page.locator('.cert-profile-info strong'))).toBeGreaterThanOrEqual(
      4.5
    );
    for (const input of [page.locator('#study-count'), page.locator('#study-time')]) {
      const colors = await input.evaluate((node) => {
        const s = getComputedStyle(node);
        return { border: s.borderColor, background: s.backgroundColor };
      });
      expect(contrastFromColors(colors.border, [colors.background])).toBeGreaterThanOrEqual(3);
      expect((await input.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('radio', { name: t('Custom timed training'), exact: true }).check();
    const count = page.getByRole('combobox', { name: t('Questions'), exact: true });
    const time = page.getByRole('combobox', { name: t('Time limit'), exact: true });
    await expect(count.locator('option')).toHaveText(
      [50, 60, 70, 80].map((count) => t('{count} questions', { count }))
    );
    await expect(time.locator('option')).toHaveText(
      [50, 60, 70, 80].map((count) => t('{count} minutes', { count }))
    );
    await count.focus();
    await page.keyboard.press('ArrowDown');
    await expect(count).toHaveValue('60');
    await count.selectOption('70');
    await expect(time).toHaveValue('60');
    await time.selectOption('80');
    await expect(count).toHaveValue('70');
    await page.getByRole('radio', { name: t('Certification format'), exact: true }).check();
    await expect(page.locator('#study-count')).toHaveValue('75');
    await expect(page.locator('#study-time')).toHaveValue('180');
    await page.getByRole('radio', { name: t('Custom timed training'), exact: true }).check();
    await expect(count).toHaveValue('70');
    await expect(time).toHaveValue('80');
    for (const select of [count, time]) {
      const colors = await select.evaluate((node) => {
        const s = getComputedStyle(node);
        return { border: s.borderColor, background: s.backgroundColor };
      });
      expect(contrastFromColors(colors.border, [colors.background])).toBeGreaterThanOrEqual(3);
      expect((await select.boundingBox()).height).toBeGreaterThanOrEqual(44);
    }
    await time.focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: t('Standard exam'), exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: info.outputPath('settings.png'), fullPage: true });
    await page.getByRole('button', { name: t('Start mock exam'), exact: true }).click();
    await expect(page.locator('.question-title')).toBeVisible();
    const saved = await draft(page, 'quiz-study-v1:guest:aws-aip-c01:exam');
    expect(saved.questions).toHaveLength(70);
    expect(saved.sessionSettings.minutes).toBe(80);
    expect(saved.deadline - saved.startedAt).toBe(80 * 60_000);
    expect(saved.sessionSettings.kind).toBe('custom');
    await page.getByRole('button', { name: t('Submit exam'), exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: t('Submit and view results'), exact: true })
      .click();
    await expect(page.locator('.exam-score')).toContainText(t('QuizMos benchmark not met'));
    await expect(page.locator('.exam-score')).toContainText(
      t(
        'QuizMos study benchmark: more than 80% raw accuracy. This is not an official certification result.'
      )
    );
  });
}

test('ranged, insufficient, unknown and retiring profiles keep training explicit', async ({
  page,
}) => {
  const q = example('single');
  const pool = Array.from({ length: 67 }, (_, index) => ({
    ...q,
    id: 'preset-' + index,
    retired: index >= 65,
  }));
  await page.route('**/quiz/Google/GCP-GAL.json*', (route) => route.fulfill({ json: pool }));
  await page.goto('./#/quiz/gcp-gal?mode=exam');
  await expect(page.locator('#study-count')).toHaveValue('50');
  await page.locator('#study-count').fill('60');
  await expect(page.locator('#study-settings-error')).toBeEmpty();
  await page.getByRole('radio', { name: 'Custom timed training', exact: true }).check();
  const countSelect = page.getByRole('combobox', { name: 'Questions', exact: true });
  await expect(countSelect.locator('option:not([disabled])')).toHaveText([
    '50 questions',
    '60 questions',
  ]);
  await expect(countSelect.locator('option[disabled]')).toHaveText([
    '70 questions',
    '80 questions',
  ]);
  await expect(page.locator('#study-settings-hint')).toContainText('65 eligible; 2 excluded');
  await countSelect.selectOption('60');
  await expect(page.getByRole('button', { name: 'Start mock exam', exact: true })).toBeEnabled();
  await page.getByRole('radio', { name: 'Certification format', exact: true }).check();
  await expect(page.locator('#study-count')).toHaveValue('60');
  await expect(page.locator('#study-time')).toHaveValue('90');
  await page.goto('./#/quiz/istqb-ctal-ta-v4-0?mode=exam');
  await expect(page.locator('#study-count')).toHaveValue('45');
  await expect(page.locator('#study-settings-hint')).toContainText('42 eligible');
  await expect(page.getByRole('button', { name: 'Start mock exam', exact: true })).toBeDisabled();
  await page.getByRole('radio', { name: 'Custom timed training', exact: true }).check();
  await expect(countSelect).toBeDisabled();
  await expect(countSelect).toHaveValue('42');
  await expect(countSelect.locator('option:checked')).toHaveText('All 42 eligible questions');
  await expect(page.locator('#study-settings-hint')).toContainText('presets start at 50');
  await expect(page.getByRole('button', { name: 'Start mock exam', exact: true })).toBeEnabled();
  await page.goto('./#/quiz/az-900?mode=exam');
  await expect(
    page.getByRole('radio', { name: 'Certification format', exact: true })
  ).toBeDisabled();
  await expect(page.locator('.cert-profile-info')).toContainText('Unverified');
  await expect(page.locator('#study-time')).toHaveValue('60');
  await page.clock.install({ time: new Date('2026-12-01T12:00:00Z') });
  await page.goto('./#/quiz/aws-dva?mode=exam');
  await expect(
    page.getByRole('radio', { name: 'Certification format', exact: true })
  ).toBeDisabled();
  await expect(
    page.getByText('This certification format is unverified or retired. Choose custom training.', {
      exact: true,
    })
  ).toBeVisible();
});

for (const format of [
  'single',
  'multiple',
  'yes-no',
  'dropdown-rows',
  'dropdown-inline',
  'drag-drop-rows',
  'drag-drop-inline',
]) {
  test(
    'short Practice preserves original ' +
      format +
      ' questions, exact subset and independent full draft',
    async ({ page }) => {
      const first = example(format);
      const questions = Array.from({ length: 25 }, (_, index) => ({
        ...first,
        id: 'source-' + index,
      }));
      await page.goto('./#/my-quizzes');
      await page.locator('input[type=file]').setInputFiles({
        name: 'quick.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(questions)),
      });
      await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
      await page.getByRole('button', { name: 'Start practice', exact: true }).click();
      await expect(page.locator('.question-title')).toBeVisible();
      await page.getByRole('button', { name: 'Next question', exact: true }).click();
      const full = await draft(page, 'quiz-study-v1:guest:custom:practice');
      await page.getByRole('button', { name: 'Back to quiz overview', exact: true }).click();
      await page.locator('.practice-size-picker .ant-select-selector').click();
      await page.getByRole('option', { name: '10 questions', exact: true }).click();
      await page.getByRole('button', { name: 'Start practice', exact: true }).click();
      await expect(page.locator('.study-position')).toContainText('Question 1 of 10');
      await expect(page.getByRole('timer')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Save position', exact: true })).toHaveCount(0);
      const key = 'quiz-study-v1:guest:quick:custom:10:manifest';
      const manifest = await draft(page, key);
      expect(new Set(manifest.keys).size).toBe(10);
      expect(manifest.keys.every((id) => questions.some((q) => q.id === id))).toBe(true);
      await answerExample(page, first);
      await page.getByRole('button', { name: 'Next question', exact: true }).click();
      const quickBefore = await draft(page, 'quiz-study-v1:guest:quick:custom:10:practice');
      await page.reload();
      await expect(page.locator('.study-position')).toContainText('Question 2 of 10');
      expect(await draft(page, key)).toEqual(manifest);
      expect(await draft(page, 'quiz-study-v1:guest:quick:custom:10:practice')).toEqual(
        quickBefore
      );
      expect(await draft(page, 'quiz-study-v1:guest:custom:practice')).toEqual(full);
      await page.getByRole('button', { name: 'Start a new practice session', exact: true }).click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Start practice', exact: true })
        .click();
      await expect(page.locator('.study-position')).toContainText('Question 1 of 10');
      expect((await draft(page, key)).runId).not.toBe(manifest.runId);
      expect(await draft(page, 'quiz-study-v1:guest:custom:practice')).toEqual(full);
    }
  );
}

test('a legacy draft wins over invalid URLs, older links and new dropdown choices', async ({
  page,
}) => {
  await page.goto('./#/quiz/aws-aip-c01/exam?count=10&time=0');
  await expect(
    page.getByText('Enter a valid whole-number question count and time limit.', { exact: true })
  ).toBeVisible();
  await page.goto('./#/quiz/aws-aip-c01/exam?count=10&time=15&fresh=2000');
  await expect(page.locator('.question-title')).toBeVisible();
  await page.getByRole('button', { name: 'Flag', exact: true }).click();
  const before = await draft(page, 'quiz-study-v1:guest:aws-aip-c01:exam');
  page.once('dialog', (dialog) => dialog.accept());
  await page.goto('./#/quiz/aws-aip-c01/exam?count=wrong&time=0&fresh=1000');
  await expect(page.locator('.question-title')).toBeVisible();
  expect(await draft(page, 'quiz-study-v1:guest:aws-aip-c01:exam')).toEqual(before);
  page.once('dialog', (dialog) => dialog.accept());
  await page.goto('./#/quiz/aws-aip-c01?mode=exam');
  await page.getByRole('radio', { name: 'Custom timed training', exact: true }).check();
  await page.getByRole('combobox', { name: 'Questions', exact: true }).selectOption('60');
  await page.getByRole('combobox', { name: 'Time limit', exact: true }).selectOption('80');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByText('Question 1 of 10', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Unflag', exact: true })).toBeVisible();
  expect(await draft(page, 'quiz-study-v1:guest:aws-aip-c01:exam')).toEqual(before);
});

test('small pools and incompatible saved subsets expose an explicit new-session recovery', async ({
  page,
}) => {
  const q = example('single');
  await page.route('**/quiz/AWS/AIP_C01.json*', (route) => route.fulfill({ json: [q] }));
  await page.goto('./#/quiz/aws-aip-c01');
  await page.locator('.practice-size-picker .ant-select-selector').click();
  await page.getByRole('option', { name: '10 questions', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeDisabled();
  await page.unroute('**/quiz/AWS/AIP_C01.json*');
  await page.goto('./#/quiz/aws-aip-c01/practice?size=10');
  await page.reload();
  await expect(page.locator('.question-title')).toBeVisible();
  await page.evaluate(() =>
    sessionStorage.setItem('quiz-study-v1:guest:quick:aws-aip-c01:10:manifest', '{broken')
  );
  await page.reload();
  await expect(
    page.getByText('The saved subset is no longer compatible. Start a new practice session.', {
      exact: true,
    })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Back to quiz overview', exact: true }).click();
  await page.locator('.practice-size-picker .ant-select-selector').click();
  await page.getByRole('option', { name: '10 questions', exact: true }).click();
  await page.getByRole('button', { name: 'Start a new practice session', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Start practice', exact: true })
    .click();
  await expect(page.locator('.study-position')).toContainText('Question 1 of 10');
});
test('short Practice with unavailable storage remains usable without claiming a saved subset', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.includes(':quick:')) throw new DOMException('Full', 'QuotaExceededError');
      return set.call(this, key, value);
    };
  });
  await page.goto('./#/quiz/aws-aip-c01/practice?size=20');
  await expect(page.locator('.study-position')).toContainText('Question 1 of 20');
  await expect(
    page.getByText('Draft storage is unavailable in this browser.', { exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expect(page.locator('.study-position')).toContainText('Question 2 of 20');
});

test('private short Practice keeps the source version/checkpoint and clears only its owner on sign-out', async ({
  page,
}) => {
  const question = example('single'),
    questions = Array.from({ length: 25 }, (_, id) => ({ ...question, id: String(id) }));
  await page.goto('./');
  await (await headerControl(page, { name: 'Sign in', exact: true })).click();
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await expectHeaderAccount(page, 'Test account');
  await (await headerControl(page, { name: 'My quizzes', exact: true })).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'private-short.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(questions)),
  });
  await page.getByRole('textbox', { name: 'Quiz name', exact: true }).fill('Private short');
  await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
  await page
    .locator('.cloud-quiz-card')
    .filter({ has: page.getByRole('heading', { name: 'Private short', exact: true }) })
    .getByRole('button', { name: 'Practice', exact: true })
    .click();
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await page.getByRole('button', { name: 'Save position', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Save position?', exact: true })
    .getByRole('button', { name: 'Save', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Position saved', exact: true })).toBeVisible();
  const records = () => page.evaluate(() => localStorage.getItem('quiz-e2e-custom:test-alice'));
  const before = await records();
  await page.getByRole('button', { name: 'Back to quiz overview', exact: true }).click();
  await page.locator('.practice-size-picker .ant-select-selector').click();
  await page.getByRole('option', { name: '10 questions', exact: true }).click();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await expect(page.locator('.study-position')).toContainText('Question 1 of 10');
  const manifest = await page.evaluate(() =>
    JSON.parse(
      sessionStorage.getItem(
        Object.keys(sessionStorage).find((k) => k.includes(':quick:') && k.endsWith(':manifest'))
      )
    )
  );
  expect(manifest.owner).toBe('test-alice');
  expect(manifest.sourceId).toMatch(/^cloud:slot-[123]:.+:v1$/);
  await expect(page.getByRole('button', { name: 'Save position', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.study-position')).toContainText('Question 1 of 10');
  expect(await records()).toEqual(before);
  await (await headerControl(page, { name: 'Test account', exact: true })).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out', exact: true }).click();
  await expectHeaderAccount(page, 'Sign in');
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((k) => k.startsWith('quiz-study-v1:test-alice:'))
    )
  ).toEqual([]);
  expect(await records()).toEqual(before);
});

test('a bank with no gradable answers cannot start a scored or short session', async ({ page }) => {
  const q = { ...example('single'), answer: [] };
  await page.route('**/quiz/AWS/AIP_C01.json*', (route) => route.fulfill({ json: [q] }));
  await page.goto('./#/quiz/aws-aip-c01?mode=exam');
  await expect(
    page.getByText('No eligible questions are available for this session.', { exact: true })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start mock exam', exact: true })).toBeDisabled();
  await page.getByRole('radio', { name: 'Custom timed training', exact: true }).check();
  await expect(page.getByRole('combobox', { name: 'Questions', exact: true })).toBeDisabled();
  await expect(page.getByText('null questions', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start mock exam', exact: true })).toBeDisabled();
  await page.getByText('Practice', { exact: true }).click();
  await page.locator('.practice-size-picker .ant-select-selector').click();
  await page.getByRole('option', { name: '10 questions', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start practice', exact: true })).toBeDisabled();
  await page.goto('./#/quiz/aws-aip-c01/practice?size=10');
  await expect(
    page.getByText('Not enough eligible questions. Choose a smaller training session.', {
      exact: true,
    })
  ).toBeVisible();
  await expect(page.locator('.question-title')).toHaveCount(0);
});
