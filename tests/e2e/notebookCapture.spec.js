import { test, expect } from '@playwright/test';
import { questionFingerprint } from '../../src/utils/studySession.js';
import fs from 'node:fs';
import {
  questionType,
  questionParts,
  partOptions,
  partLabel,
} from '../../src/utils/questionModel.js';

const uid = 'notebook-alice';
const errors = new WeakMap();
test.beforeEach(({ page }) => {
  const found = [];
  errors.set(page, found);
  page.on('pageerror', (error) => found.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));
const question = {
  id: 'notebook-q1',
  question: 'Notebook capture fixture?',
  options: { A: 'Correct option', B: 'Wrong option' },
  answer: ['A'],
};
const read = (page) =>
  page.evaluate(
    (uid) =>
      JSON.parse(
        localStorage.getItem('quiz-e2e-notebook:' + uid) ||
          '{"entries":{},"state":{"count":0,"revision":0,"generation":0}}'
      ),
    uid
  );
const draft = (page, mode) =>
  page.evaluate(
    ({ uid, mode }) =>
      JSON.parse(sessionStorage.getItem(`quiz-study-v1:${uid}:aws-aip-c01:${mode}`)),
    { uid, mode }
  );
async function init(page, context, { enabled = true, oldPractice = false, strict = false } = {}) {
  await context.addInitScript(
    ({ uid, enabled, oldPractice, signature, strict }) => {
      if (!['127.0.0.1', 'localhost'].includes(location.hostname)) return;
      if (enabled) sessionStorage.setItem('quiz-e2e-notebook-enabled', '1');
      if (strict) sessionStorage.setItem('quiz-e2e-history-strict', '1');
      localStorage.setItem(
        'quiz-e2e-auth',
        JSON.stringify({
          uid,
          displayName: 'Notebook learner',
          email: 'notebook@example.test',
          emailVerified: true,
        })
      );
      if (oldPractice && !sessionStorage.getItem('notebook-old-seeded')) {
        sessionStorage.setItem(
          `quiz-study-v1:${uid}:aws-aip-c01:practice`,
          JSON.stringify({ signature, answers: ['B'], index: 0 })
        );
        sessionStorage.setItem('notebook-old-seeded', '1');
      }
    },
    { uid, enabled, oldPractice, strict, signature: questionFingerprint([question]) }
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
  await page.route('**/quiz/AWS/AIP_C01.json', (route) => route.fulfill({ json: [question] }));
}
test('future Practice edits capture mistakes and retain reviewed entries; reload/revisit never backfills', async ({
  page,
  context,
}) => {
  await init(page, context, { strict: true });
  await page.goto('./#/quiz/aws-aip-c01/practice');
  await expect(page.locator('.question-title')).toBeVisible();
  await page.getByRole('radio', { name: /Wrong option/ }).check();
  await expect.poll(async () => (await read(page)).state.count).toBe(1);
  let row = Object.values((await read(page)).entries)[0];
  expect(row.mistake).toBe(true);
  expect(row.reviewed).toBe(false);
  await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: /Correct option/ }).check();
  await expect.poll(async () => Object.values((await read(page)).entries)[0]?.reviewed).toBe(true);
  const before = await read(page);
  await page.reload();
  await expect(page.locator('.question-title')).toBeVisible();
  expect(await read(page)).toEqual(before);
  row = Object.values((await read(page)).entries)[0];
  expect(row.mistake).toBe(true);
  expect((await draft(page, 'practice')).notebook.revision).toBe(2);
});
test('old Practice drafts remain intact without automatic capture or notebook IO', async ({
  page,
  context,
}) => {
  await init(page, context, { oldPractice: true });
  await page.goto('./#/quiz/aws-aip-c01/practice');
  await expect(page.getByRole('radio', { name: /Wrong option/ })).toBeChecked();
  await page.getByRole('radio', { name: /Correct option/ }).check();
  expect((await draft(page, 'practice')).notebook).toBeUndefined();
  expect((await read(page)).state.count).toBe(0);
  expect(await page.evaluate(() => window.quizNotebookCalls || [])).toEqual([]);
});
test('disabled new sessions never call notebook service', async ({ page, context }) => {
  await init(page, context, { enabled: false });
  await page.goto('./#/quiz/aws-aip-c01/practice');
  await page.getByRole('radio', { name: /Wrong option/ }).check();
  expect(await page.evaluate(() => window.quizNotebookCalls || [])).toEqual([]);
  await expect(page.getByText('Study notebook synchronized', { exact: true })).toHaveCount(0);
});
test('terminal Exam capture preserves score/flags/deadline and StrictMode/reload cannot write twice', async ({
  page,
  context,
}) => {
  await init(page, context, { strict: true });
  await page.goto('./#/quiz/aws-aip-c01/exam?feedback=standard');
  await expect(page.locator('.question-title')).toBeVisible();
  await page.getByRole('radio', { name: 'Wrong option', exact: true }).check();
  await page.getByRole('button', { name: 'Flag', exact: true }).click();
  expect((await read(page)).state.count).toBe(0);
  const before = await draft(page, 'exam');
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Submit and view results', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
  await expect.poll(async () => (await read(page)).state.count).toBe(1);
  const terminal = await draft(page, 'exam');
  expect(terminal.deadline).toBe(before.deadline);
  expect(terminal.flags).toEqual(before.flags);
  expect(terminal.answers).toEqual(before.answers);
  expect(terminal.feedbackMode).toBe('standard');
  await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
  const saved = await read(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
  expect(await read(page)).toEqual(saved);
});
test('response loss leaves a visible pending update; original retry after reload does not duplicate the mistake', async ({
  page,
  context,
}) => {
  await init(page, context);
  await page.goto('./#/quiz/aws-aip-c01/practice');
  await expect(page.locator('.question-title')).toBeVisible();
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-notebook-drop-response', '1'));
  await page.getByRole('radio', { name: /Wrong option/ }).check();
  await expect(
    page.getByText('Some notebook updates are not synchronized. Your answers are kept.', {
      exact: true,
    })
  ).toBeVisible();
  expect((await read(page)).state.revision).toBe(1);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Retry notebook updates', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry notebook updates', exact: true }).click();
  await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
  expect((await read(page)).state.revision).toBe(1);
});

async function answer(page, q, value) {
  if (questionType(q) === 'multiple_choice') {
    const keys = Array.isArray(value) ? value : [value];
    if (q.answer.length > 1) {
      for (const key of Object.keys(q.options)) {
        const control = page.getByRole('checkbox', { name: new RegExp(`^${key}\\.`) });
        if (!keys.includes(key) && (await control.isChecked())) await control.uncheck();
      }
    }
    for (const key of keys)
      await page
        .getByRole(q.answer.length > 1 ? 'checkbox' : 'radio', { name: new RegExp(`^${key}\\.`) })
        .check();
  } else if (questionType(q) === 'yes_no') {
    for (const part of questionParts(q))
      await page
        .getByRole('group', { name: part.text, exact: true })
        .getByText(partOptions(q, part.id)[value[part.id]], { exact: true })
        .click();
  } else if (questionType(q) === 'drag_drop') {
    for (const part of questionParts(q)) {
      const key = value[part.id];
      await page
        .locator('.dd-choice-bank')
        .getByRole('button', { name: `${key}. ${partOptions(q, part.id)[key]}`, exact: true })
        .click();
      await page.locator(`[data-dd-slot="${part.id}"]`).click();
    }
  } else {
    for (const [index, part] of questionParts(q).entries()) {
      const select = page.getByRole('combobox', {
        name: 'Answer for ' + partLabel(part, index),
        exact: true,
      });
      await select.focus();
      await select.press('ArrowDown');
      await page
        .locator(`[id="${await select.getAttribute('aria-controls')}"]`)
        .getByRole('option', { name: partOptions(q, part.id)[value[part.id]], exact: true })
        .click();
    }
  }
}
test('all seven real question surfaces capture only complete wrong answers, then retain reviewed mistakes', async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await init(page, context);
  let count = 0;
  for (const format of [
    'single',
    'multiple',
    'yes-no',
    'dropdown-rows',
    'dropdown-inline',
    'drag-drop-rows',
    'drag-drop-inline',
  ]) {
    const q = JSON.parse(
      fs.readFileSync(new URL(`../../public/examples/quiz-${format}.json`, import.meta.url), 'utf8')
    )[0];
    q.id = 'capture-' + format;
    await page.route('**/quiz/AWS/AIP_C01.json', (route) => route.fulfill({ json: [q] }));
    await page.goto('./#/quiz/aws-aip-c01/practice?fresh=' + (count + 1));
    await page.reload();
    await expect(page.locator('.question-title')).toHaveText(q.question);
    let correct, wrong;
    if (Array.isArray(q.answer)) {
      const incorrect = Object.keys(q.options).find((key) => !q.answer.includes(key));
      correct = q.answer.length > 1 ? q.answer : q.answer[0];
      wrong = q.answer.length > 1 ? [...q.answer.slice(0, -1), incorrect] : incorrect;
    } else {
      const first = questionParts(q)[0].id;
      correct = { ...q.answer };
      wrong = {
        ...q.answer,
        [first]: Object.keys(partOptions(q, first)).find((key) => key !== q.answer[first]),
      };
    }
    await answer(page, q, wrong);
    count++;
    await expect.poll(async () => (await read(page)).state.count).toBe(count);
    await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
    await answer(page, q, correct);
    await expect
      .poll(
        async () =>
          Object.values((await read(page)).entries).find((entry) => entry.ref.questionId === q.id)
            ?.reviewed
      )
      .toBe(true);
    expect((await read(page)).state.count).toBe(count);
    await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
    await page.unroute('**/quiz/AWS/AIP_C01.json');
  }
});
test('Learning expiry captures at the absolute deadline, while reopening an old terminal draft never backfills', async ({
  page,
  context,
}) => {
  await init(page, context, { strict: true });
  await page.clock.install();
  await page.goto('./#/quiz/aws-aip-c01/exam?feedback=learning');
  await page.getByRole('radio', { name: 'Wrong option', exact: true }).check();
  const before = await draft(page, 'exam');
  await page.clock.fastForward(60 * 60 * 1000 + 1000);
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
  await expect.poll(async () => (await read(page)).state.count).toBe(1);
  const terminal = await draft(page, 'exam');
  expect(terminal.endedAt).toBe(before.deadline);
  expect(terminal.feedbackMode).toBe('learning');
  await page.evaluate(
    ({ uid }) => {
      const key = `quiz-study-v1:${uid}:aws-aip-c01:exam`,
        value = JSON.parse(sessionStorage.getItem(key));
      delete value.notebook;
      sessionStorage.setItem(key, JSON.stringify(value));
      localStorage.removeItem('quiz-e2e-notebook:' + uid);
    },
    { uid }
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
  expect((await read(page)).state.count).toBe(0);
  expect(await page.evaluate(() => window.quizNotebookCalls || [])).toEqual([]);
});

test('an eligible restored result with no journal never recreates a deleted entry without a fresh explicit confirmation', async ({
  page,
  context,
}) => {
  await init(page, context);
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await page.getByRole('radio', { name: 'Wrong option', exact: true }).check();
  await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Submit and view results', exact: true })
    .click();
  await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
  const before = await draft(page, 'exam');
  await page.goto('./#/notebook');
  await page.getByRole('button', { name: 'Edit notebook entry', exact: true }).click();
  await page.getByRole('button', { name: 'Remove entry', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Remove this notebook entry?', exact: true })
    .getByRole('button', { name: 'Remove entry', exact: true })
    .click();
  await expect.poll(async () => (await read(page)).state.count).toBe(0);
  await page.evaluate(
    ({ uid, id }) => sessionStorage.removeItem(`quiz-notebook-capture-v1:${uid}:${id}`),
    { uid, id: before.notebook.sessionId }
  );
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'Notebook sync for this result has not been confirmed. Use Refresh and retry to capture it explicitly.',
      { exact: true }
    )
  ).toBeVisible();
  expect((await read(page)).state.count).toBe(0);
  expect(
    await page.evaluate(() =>
      (window.quizNotebookCalls || []).filter((call) => call.method === 'mutate')
    )
  ).toEqual([]);
  await page.getByRole('button', { name: 'Refresh and retry', exact: true }).click();
  const confirm = page.getByRole('dialog', {
    name: 'Refresh failed notebook updates?',
    exact: true,
  });
  await expect(confirm).toContainText('may recreate entries you removed');
  await confirm.getByRole('button', { name: 'Refresh and retry', exact: true }).click();
  await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
  expect((await read(page)).state.count).toBe(1);
  const after = await draft(page, 'exam');
  expect(after.answers).toEqual(before.answers);
  expect(after.deadline).toBe(before.deadline);
  expect(after.attemptId).toBe(before.attemptId);
});
