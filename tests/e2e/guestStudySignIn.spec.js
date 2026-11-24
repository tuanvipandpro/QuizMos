import { test, expect } from '@playwright/test';
import { translate } from '../../src/i18n/messages.js';
import { headerControl } from './headerControls.js';
import { clickAfterUiMotion } from './uiMotion.js';

const id = 'aws-aip-c01';
const questions = Array.from({ length: 12 }, (_, index) => ({
  id: 'handoff-' + (index + 1),
  question: 'Guest study question ' + (index + 1),
  options: { A: 'First choice', B: 'Second choice' },
  answer: ['A'],
}));
const key = (owner, mode) => `quiz-study-v1:${owner}:${id}:${mode}`;
const read = (page, name) =>
  page.evaluate((name) => JSON.parse(sessionStorage.getItem(name)), name);
const write = (page, name, value) =>
  page.evaluate(({ name, value }) => sessionStorage.setItem(name, JSON.stringify(value)), {
    name,
    value,
  });
const updateAccount = (page, uid) =>
  page.evaluate(
    (uid) =>
      window.dispatchEvent(
        new CustomEvent('quiz-e2e-auth-change', {
          detail: {
            uid,
            displayName: uid === 'test-alice' ? 'Test account' : 'Other account',
            emailVerified: true,
          },
        })
      ),
    uid
  );
const title = (page) => page.locator('.question-title');
const choose = (page) => page.locator('.question-options input').first().check();
const next = (page) => page.getByRole('button', { name: 'Next question', exact: true }).click();

async function setup(page, context, language = 'en', theme = 'light') {
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()
  );
  await page.route('**/quiz/AWS/AIP_C01.json', (route) => route.fulfill({ json: questions }));
  await context.addInitScript(
    ({ language, theme }) => {
      localStorage.setItem('quiz-app-language', language);
      localStorage.setItem('quiz-app-theme', theme);
      sessionStorage.setItem('quiz-e2e-history-enabled', '1');
    },
    { language, theme }
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function openSignIn(page, t = (name) => name) {
  await (await headerControl(page, { name: t('Sign in'), exact: true })).click();
  return page.getByRole('dialog', { name: t('Sign in'), exact: true });
}

async function google(dialog, t = (name) => name) {
  await clickAfterUiMotion(
    dialog.getByRole('button', { name: t('Continue with Google'), exact: true })
  );
}

test('Practice survives popup cancellation, failure and observer-before-result sign-in', async ({
  page,
  context,
}) => {
  await setup(page, context);
  await page.goto('./#/quiz/' + id + '/practice');
  await expect(title(page)).toBeVisible();
  await choose(page);
  await next(page);
  const before = await read(page, key('guest', 'practice'));
  const currentQuestion = await title(page).innerText();

  let dialog = await openSignIn(page);
  await dialog.getByRole('button', { name: 'Continue as guest', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(await read(page, key('guest', 'practice'))).toEqual(before);

  await write(page, 'quiz-e2e-fail-signin', '1');
  dialog = await openSignIn(page);
  await google(dialog);
  await expect(dialog.getByRole('alert')).toContainText('Could not sign in');
  await dialog.getByRole('button', { name: 'Continue as guest', exact: true }).click();
  expect(await read(page, key('guest', 'practice'))).toEqual(before);
  await page.evaluate(() => sessionStorage.removeItem('quiz-e2e-fail-signin'));

  await write(page, 'quiz-e2e-defer-signin-result', '1');
  dialog = await openSignIn(page);
  await google(dialog);
  await expect(page.getByText('Loading quiz…', { exact: true })).toBeVisible();
  expect(await read(page, key('guest', 'practice'))).toEqual(before);
  expect(await read(page, key('test-alice', 'practice'))).toBeNull();
  await page.evaluate(() => window.dispatchEvent(new Event('quiz-e2e-resolve-signin-result')));
  await expect(title(page)).toHaveText(currentQuestion);
  await expect
    .poll(() => read(page, key('test-alice', 'practice')))
    .toMatchObject({
      index: before.index,
      answers: before.answers,
    });
  expect(await read(page, key('guest', 'practice'))).toBeNull();
  await updateAccount(page, 'test-alice');
  await page.reload();
  await expect(title(page)).toHaveText(currentQuestion);
  expect((await read(page, key('test-alice', 'practice'))).answers).toEqual(before.answers);
  await updateAccount(page, 'test-bob');
  await expect(title(page)).toHaveText('Guest study question 1');
  expect(await read(page, key('test-alice', 'practice'))).toBeNull();
  await expect.poll(() => read(page, key('test-bob', 'practice'))).toMatchObject({ index: 0 });
});

test('a timed guest exam keeps its original settings, answers, flags and expiry after sign-in', async ({
  page,
  context,
}) => {
  await setup(page, context);
  await page.clock.install();
  await page.goto('./#/quiz/' + id + '/exam?format=custom&count=3&time=10');
  await expect(title(page)).toBeVisible();
  await choose(page);
  await page.getByRole('button', { name: 'Flag', exact: true }).click();
  await next(page);
  const before = await read(page, key('guest', 'exam'));
  const currentQuestion = await title(page).innerText();
  await google(await openSignIn(page));
  await expect(title(page)).toHaveText(currentQuestion);
  await expect
    .poll(() => read(page, key('test-alice', 'exam')))
    .toMatchObject({
      attemptId: before.attemptId,
      startedAt: before.startedAt,
      deadline: before.deadline,
      questions: before.questions,
      answers: before.answers,
      flags: before.flags,
      index: before.index,
      sessionSettings: before.sessionSettings,
      captureHistory: false,
      notebook: null,
    });
  await page.clock.fastForward(before.deadline - before.startedAt + 1000);
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
  const result = await read(page, key('test-alice', 'exam'));
  expect(result).toMatchObject({ endedAt: before.deadline, endReason: 'expired' });
  expect(
    await page.evaluate(() =>
      (window.quizHistoryCalls || []).filter(({ method }) => method === 'save')
    )
  ).toEqual([]);
});

for (const choice of ['account', 'guest']) {
  test(
    'conflict explicitly keeps the ' + choice + ' exam draft',
    async ({ page, context }, info) => {
      const phone = info.project.name === 'phone';
      const language = phone ? 'vi' : 'en';
      const t = (text) => translate(language, text);
      if (phone) await page.setViewportSize({ width: 320, height: 844 });
      await setup(page, context, language, phone ? 'dark' : 'light');
      await page.goto('./#/quiz/' + id + '/exam?format=custom&count=3&time=10&fresh=2000');
      await expect(title(page)).toBeVisible();
      const guest = await read(page, key('guest', 'exam'));
      const account = { ...guest, freshToken: '1000', index: 2, flags: [2] };
      await write(page, key('test-alice', 'exam'), account);
      await google(await openSignIn(page, t), t);
      const decision = page.getByRole('dialog', { name: t('Choose which study draft to keep') });
      await expect(decision).toBeVisible();
      expect(await read(page, key('test-alice', 'exam'))).toEqual(account);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await decision.screenshot({ path: info.outputPath('guest-draft-conflict.png') });
      if (choice === 'account') {
        const keepAccount = decision.getByRole('button', {
          name: t('Keep account draft'),
          exact: true,
        });
        await expect(keepAccount).toBeFocused();
        for (const [width, height] of [
          [320, 844],
          [390, 844],
          [412, 915],
          [768, 1024],
          [1280, 900],
          [844, 390],
        ]) {
          await page.setViewportSize({ width, height });
          await expect
            .poll(async () => {
              const box = await decision.boundingBox();
              return (
                box && box.x >= 0 && box.x + box.width <= width && box.y + box.height <= height
              );
            })
            .toBe(true);
          if (phone && width < 768) {
            const bounds = await keepAccount.boundingBox();
            expect(bounds.height).toBeGreaterThanOrEqual(44);
          }
        }
        await decision.screenshot({ path: info.outputPath('guest-draft-conflict-landscape.png') });
        await page.keyboard.press('Escape');
      } else
        await decision
          .getByRole('button', { name: t('Continue guest draft'), exact: true })
          .click();
      const expected = choice === 'account' ? account : guest;
      await expect(title(page)).toHaveText(expected.questions[expected.index].question);
      await expect(page).not.toHaveURL(/fresh=/);
      await expect
        .poll(() => read(page, key('test-alice', 'exam')))
        .toMatchObject({
          index: expected.index,
          flags: expected.flags,
          deadline: expected.deadline,
          freshToken: expected.freshToken,
        });
    }
  );
}

test('a guest short Practice on a local upload keeps the same subset and position after sign-in and reload', async ({
  page,
  context,
}) => {
  await setup(page, context);
  await page.goto('./#/my-quizzes');
  await page.locator('input[type=file]').setInputFiles({
    name: 'guest-study.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(questions)),
  });
  await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
  await page.goto('./#/quiz/custom/practice?size=10&fresh=2000');
  await expect(title(page)).toBeVisible();
  await choose(page);
  await next(page);
  const before = await read(page, 'quiz-study-v1:guest:quick:custom:10:manifest');
  const selected = await title(page).innerText();
  await google(await openSignIn(page));
  await expect(title(page)).toHaveText(selected);
  await page.reload();
  await expect(title(page)).toHaveText(selected);
  expect(await read(page, 'quiz-study-v1:test-alice:quick:custom:10:manifest')).toEqual({
    ...before,
    owner: 'test-alice',
  });
  expect(await read(page, 'quiz-tab-upload-v1')).toMatchObject({ owner: 'test-alice', questions });
});
