import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { accountCases } from './viewports.js';
import { vi } from '../../src/i18n/messages.js';
import { clickAfterUiMotion } from './uiMotion.js';

const bank = JSON.parse(
  fs.readFileSync(new URL('../../public/quiz/AWS/AIP_C01.json', import.meta.url))
);
const question = bank.find((item) => item.id === 'aip-c01-88');

for (const mode of ['practice', 'learning']) {
  test(`${mode} long feedback fits the viewport and leaves study actions reachable`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) =>
      ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
        ? route.continue()
        : route.abort()
    );
    await page.route('**/AIP_C01.json', (route) =>
      route.fulfill({ json: [question, { ...question, id: 'feedback-layout-second' }] })
    );
    for (const view of accountCases(info.project.name)) {
      const t = (key) => (view.language === 'vi' ? vi[key] || key : key);
      await page.setViewportSize({ width: view.width, height: view.height });
      await page.emulateMedia({
        reducedMotion: view.theme === 'dark' ? 'reduce' : 'no-preference',
      });
      await page.goto('./');
      await page
        .getByRole('button', {
          name: view.language === 'vi' ? 'Tiếng Việt' : 'English',
          exact: true,
        })
        .click();
      const themeToggle = page.getByRole('button', {
        name: t(view.theme === 'dark' ? 'Switch to dark mode' : 'Switch to light mode'),
        exact: true,
      });
      if (await themeToggle.count()) await themeToggle.click();
      await page.evaluate(() => sessionStorage.clear());
      await page.goto(`./#/quiz/aws-aip-c01${mode === 'learning' ? '?mode=exam' : ''}`);
      if (mode === 'learning') {
        await page.getByRole('radio', { name: t('Learning exam'), exact: true }).check();
        await page.getByRole('button', { name: t('Start mock exam'), exact: true }).click();
      } else {
        await page.getByRole('button', { name: t('Start practice'), exact: true }).click();
      }
      const wrong = Object.keys(question.options).find((key) => !question.answer.includes(key));
      await page.locator('.question-option').filter({ hasText: question.options[wrong] }).click();
      await expect(page.locator('.question-feedback')).toBeVisible();
      await expect(page.locator('.question-feedback')).toContainText(
        question.options[question.answer[0]]
      );
      const geometry = await page.evaluate(() => {
        const feedback = document.querySelector('.question-feedback');
        return {
          root: document.documentElement.scrollWidth,
          viewport: innerWidth,
          content: feedback.scrollWidth,
          box: feedback.clientWidth,
        };
      });
      expect(geometry.root).toBeLessThanOrEqual(view.width + 1);
      expect(geometry.viewport).toBeLessThanOrEqual(view.width + 1);
      expect(geometry.content).toBeLessThanOrEqual(geometry.box + 1);
      if (mode === 'learning') {
        const deadline = await page.evaluate(
          () => JSON.parse(sessionStorage.getItem('quiz-study-v1:guest:aws-aip-c01:exam')).deadline
        );
        await page.getByRole('button', { name: t('Flag'), exact: true }).click();
        await expect(page.getByRole('button', { name: t('Unflag'), exact: true })).toHaveAttribute(
          'aria-pressed',
          'true'
        );
        await page.getByRole('button', { name: t('Submit exam'), exact: true }).click();
        await expect(
          page.getByRole('dialog', { name: t('Review before submitting'), exact: true })
        ).toBeVisible();
        await clickAfterUiMotion(
          page.getByRole('dialog').getByRole('button', { name: t('Continue exam'), exact: true })
        );
        await expect(page.getByRole('dialog')).toBeHidden();
        expect(
          await page.evaluate(
            () =>
              JSON.parse(sessionStorage.getItem('quiz-study-v1:guest:aws-aip-c01:exam')).deadline
          )
        ).toBe(deadline);
      }
      await page.getByRole('button', { name: t('Next question'), exact: true }).click();
      await page.getByRole('button', { name: t('Previous'), exact: true }).click();
      await expect(page.locator('.question-feedback')).toBeVisible();
      await page.locator('.question-feedback').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `artifacts/feedback-layout/${mode}-${info.project.name}-${view.width}-${view.language}-${view.theme}.png`,
      });
    }
    expect(errors).toEqual([]);
  });
}
