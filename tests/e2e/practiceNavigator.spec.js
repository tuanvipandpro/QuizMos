import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import {
  isStructuredQuestion,
  questionParts,
  partLabel,
  partOptions,
} from '../../src/utils/questionModel.js';
import { translate } from '../../src/i18n/messages.js';
import { accountCases } from './viewports.js';
import { clickAfterUiMotion } from './uiMotion.js';
import { contrastRatio } from './uiContrast.js';

const example = (format) =>
  JSON.parse(
    fs.readFileSync(new URL(`../../public/examples/quiz-${format}.json`, import.meta.url))
  )[0];
const nav = (page) => page.locator('.question-number').first();
const choice = (page, question, key) =>
  page.locator('.question-option').filter({ hasText: question.options[key] }).locator('input');
async function openNavigator(page) {
  if (!(await page.locator('.study-navigator').evaluate((node) => node.open)))
    await page.locator('.study-navigator > summary').click();
}
async function start(page, question, language = 'en', theme = 'light') {
  await page.goto('./');
  await page
    .getByRole('button', { name: language === 'vi' ? 'Tiếng Việt' : 'English', exact: true })
    .click();
  const themeToggle = page.getByRole('button', {
    name: translate(language, theme === 'dark' ? 'Switch to dark mode' : 'Switch to light mode'),
    exact: true,
  });
  if (await themeToggle.count()) await themeToggle.click();
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('./#/my-quizzes');
  await page.locator('input[type=file]').setInputFiles({
    name: 'navigator.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([question, { ...question, id: 'second' }])),
  });
  await page
    .getByRole('button', { name: translate(language, 'Use this quiz'), exact: true })
    .click();
  await page
    .getByRole('button', { name: translate(language, 'Start practice'), exact: true })
    .click();
  await openNavigator(page);
}
async function part(page, question, item, index, key, language = 'en') {
  if (question.type === 'drag_drop') {
    await page
      .getByRole('button', { name: `${key}. ${partOptions(question, item.id)[key]}`, exact: true })
      .click();
    await page.locator(`[data-dd-slot="${item.id}"]`).click();
  } else if (question.type === 'yes_no') {
    await page
      .getByRole('group', { name: partLabel(item, index), exact: true })
      .getByText(question.options[key], { exact: true })
      .click();
  } else {
    const select = page.getByRole('combobox', {
      name: translate(language, 'Answer for {part}', { part: partLabel(item, index) }),
      exact: true,
    });
    await page.locator('.ant-select').filter({ has: select }).click();
    await page
      .locator(`[id="${await select.getAttribute('aria-controls')}"]`)
      .getByRole('option', { name: partOptions(question, item.id)[key], exact: true })
      .click();
  }
}
test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
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
  test(`Practice navigator reflects correctness, incomplete answers, reload and reset for ${format}`, async ({
    page,
  }) => {
    const question = example(format);
    await start(page, question);
    await expect(nav(page)).toHaveAttribute('aria-label', 'Question 1 · Unanswered');
    const wrong = isStructuredQuestion(question)
      ? Object.keys(partOptions(question, questionParts(question)[0].id)).find(
          (key) => key !== question.answer[questionParts(question)[0].id]
        )
      : Object.keys(question.options).find((key) => !question.answer.includes(key));
    if (!isStructuredQuestion(question)) {
      if (question.answer.length > 1) {
        await choice(page, question, question.answer[0]).check();
        await expect(nav(page)).toHaveAttribute('aria-label', 'Question 1 · Incomplete');
        await choice(page, question, wrong).check();
      } else await choice(page, question, wrong).check();
    } else {
      for (const [index, item] of questionParts(question).entries()) {
        await part(page, question, item, index, index === 0 ? wrong : question.answer[item.id]);
        if (index === 0)
          await expect(nav(page)).toHaveAttribute('aria-label', 'Question 1 · Incomplete');
      }
    }
    await expect(nav(page)).toHaveAttribute('aria-label', 'Question 1 · Incorrect');
    await expect(nav(page).locator('.anticon-close')).toHaveCount(1);
    await expect(nav(page).locator('.anticon-check')).toHaveCount(0);
    await page.reload();
    await openNavigator(page);
    await expect(nav(page)).toHaveAttribute('aria-label', 'Question 1 · Incorrect');
    if (!isStructuredQuestion(question)) {
      if (question.answer.length > 1) {
        await choice(page, question, wrong).uncheck();
        await expect(nav(page)).toHaveAttribute('aria-label', 'Question 1 · Incomplete');
        await choice(page, question, question.answer[1]).check();
      } else await choice(page, question, question.answer[0]).check();
    } else
      await part(
        page,
        question,
        questionParts(question)[0],
        0,
        question.answer[questionParts(question)[0].id]
      );
    await expect(nav(page)).toHaveAttribute('aria-label', 'Question 1 · Correct');
    await expect(nav(page).locator('.anticon-check')).toHaveCount(1);
    await page.getByRole('button', { name: 'Next question', exact: true }).click();
    await expect(nav(page)).toHaveAttribute('aria-label', 'Question 1 · Correct');
    await expect(page.locator('.question-number').nth(1)).toHaveAttribute(
      'aria-label',
      'Question 2 · Unanswered'
    );
    await nav(page).focus();
    await page.keyboard.press('Enter');
    await expect(nav(page)).toHaveAttribute('aria-current', 'step');
    await page.getByRole('button', { name: 'Start a new practice session', exact: true }).click();
    await clickAfterUiMotion(
      page.getByRole('dialog').getByRole('button', { name: 'Start practice', exact: true })
    );
    await expect(nav(page)).toHaveAttribute('aria-label', 'Question 1 · Unanswered');
  });
}

test('Practice status colors and current-question outline preserve readable states across the UI matrix', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const question = example('single');
  for (const view of accountCases(info.project.name)) {
    await page.setViewportSize({ width: view.width, height: view.height });
    await start(page, question, view.language, view.theme);
    await choice(page, question, 'A').check();
    await expect(nav(page)).toHaveAttribute(
      'aria-label',
      translate(view.language, 'Question {number}', { number: 1 }) +
        ' · ' +
        translate(view.language, 'Incorrect')
    );
    const wrong = await nav(page).evaluate((node) => getComputedStyle(node).backgroundColor);
    expect(await contrastRatio(nav(page))).toBeGreaterThanOrEqual(4.5);
    await nav(page).focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(nav(page)).toBeFocused();
    await expect(nav(page)).toHaveCSS('outline-style', 'solid');
    await expect(nav(page)).toHaveCSS('outline-width', '3px');
    await page.screenshot({
      path: `artifacts/practice-navigator/${info.project.name}-${view.width}-${view.language}-${view.theme}-incorrect.png`,
    });
    await choice(page, question, 'B').check();
    expect(await nav(page).evaluate((node) => getComputedStyle(node).backgroundColor)).not.toBe(
      wrong
    );
    expect(await contrastRatio(nav(page))).toBeGreaterThanOrEqual(4.5);
    await expect(nav(page)).not.toHaveCSS('box-shadow', 'none');
    await choice(page, question, 'A').check();
    await expect(nav(page)).toHaveAttribute(
      'aria-label',
      translate(view.language, 'Question {number}', { number: 1 }) +
        ' · ' +
        translate(view.language, 'Incorrect')
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      view.width + 1
    );
  }
});
