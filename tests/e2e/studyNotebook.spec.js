import { test, expect } from '@playwright/test';
import {
  createNotebookReference,
  notebookEntryKey,
  notebookSourceGroup,
  transitionNotebookState,
} from '../../src/utils/studyNotebook.js';
import { findQuiz } from '../../src/data/quizzes.js';
import { notebookSelection } from '../../src/utils/studyNotebookSelection.js';
import { secureId } from '../../src/utils/secureId.js';
import { accountCases } from './viewports.js';
import { translate } from '../../src/i18n/messages.js';
import { contrastRatio } from './uiContrast.js';
import { waitForUiMotion } from './uiMotion.js';

const uid = 'notebook-alice',
  account = {
    uid,
    displayName: 'Notebook learner',
    email: 'notebook@example.test',
    emailVerified: true,
  };
const question = {
  id: 'ui-q1',
  question: 'Notebook selection question?',
  options: { A: 'Correct option', B: 'Wrong option' },
  answer: ['A'],
};
const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const found = [];
  errors.set(page, found);
  page.on('pageerror', (error) => found.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (route) =>
    ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname)
      ? route.continue()
      : route.abort()
  );
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

async function entry({
  quizId = 'aws-aip-c01',
  q = question,
  note = 'My private note',
  bookmarked = true,
  mistake = false,
  reviewed = false,
  time = 1000,
} = {}) {
  const quiz = { ...findQuiz(quizId), kind: 'bank', questions: [q] };
  const ref = await createNotebookReference(quiz, q, uid);
  let state = transitionNotebookState(null, { kind: 'note', value: note }, time);
  state = transitionNotebookState(state, { kind: 'bookmark', value: bookmarked }, time);
  if (mistake) state = transitionNotebookState(state, { kind: 'outcome', correct: false }, time);
  if (reviewed) state = transitionNotebookState(state, { kind: 'outcome', correct: true }, time);
  return {
    schemaVersion: 1,
    entryKey: await notebookEntryKey(ref),
    ref,
    sourceGroup: notebookSourceGroup(ref),
    ...state,
    revision: 1,
    lastOperationId: secureId(),
    lastOperationFingerprint: 'a'.repeat(64),
    createdAt: time,
    updatedAt: time,
  };
}
async function init(
  page,
  context,
  { entries = [], enabled = true, signedIn = true, language = 'en', theme = 'light' } = {}
) {
  const seed = {
    entries: Object.fromEntries(entries.map((entry) => [entry.entryKey, entry])),
    state: { count: entries.length, revision: entries.length, generation: 0 },
  };
  await context.addInitScript(
    ({ uid, account, seed, enabled, signedIn, language, theme }) => {
      if (!['127.0.0.1', 'localhost'].includes(location.hostname)) return;
      if (!sessionStorage.getItem('notebook-ui-configured')) {
        if (enabled) sessionStorage.setItem('quiz-e2e-notebook-enabled', '1');
        sessionStorage.setItem('quiz-e2e-history-strict', '1');
        sessionStorage.setItem('notebook-ui-configured', '1');
      }
      if (!localStorage.getItem('quiz-e2e-auth'))
        localStorage.setItem('quiz-e2e-auth', JSON.stringify(signedIn ? account : null));
      if (!localStorage.getItem('quiz-e2e-notebook:' + uid))
        localStorage.setItem('quiz-e2e-notebook:' + uid, JSON.stringify(seed));
      if (!localStorage.getItem('quiz-app-language'))
        localStorage.setItem('quiz-app-language', language);
      if (!localStorage.getItem('quiz-app-theme')) localStorage.setItem('quiz-app-theme', theme);
    },
    { uid, account, seed, enabled, signedIn, language, theme }
  );
  for (const id of ['aws-aip-c01', 'gcp-ace'])
    await page.route('**/' + findQuiz(id).file, (route) => route.fulfill({ json: [question] }));
}
const records = (page) =>
  page.evaluate((uid) => JSON.parse(localStorage.getItem('quiz-e2e-notebook:' + uid)), uid);
const editor = (page) => page.getByRole('dialog', { name: 'Question notebook', exact: true });
async function closeEditor(page) {
  await editor(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(editor(page)).toHaveCount(0);
}

test('Practice tools keep bookmark/note separate from checkpoints; a note survives account reload and deletion is explicit', async ({
  page,
  context,
}) => {
  await init(page, context);
  await page.goto('./#/quiz/aws-aip-c01/practice');
  await page.getByRole('button', { name: 'Bookmark and note', exact: true }).click();
  const note = page.getByRole('textbox', { name: 'Private note', exact: true });
  await expect(note).toBeEditable();
  await note.fill('A private note <script>plain text</script>');
  await page.getByRole('checkbox', { name: 'Bookmark this question', exact: true }).check();
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(
    editor(page).getByText('Study notebook synchronized', { exact: true })
  ).toBeVisible();
  expect(Object.values((await records(page)).entries)[0].bookmarked).toBe(true);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('quiz-e2e-profile:' + 'notebook-alice') || '{}')
          .quizProgress || {}
    )
  ).toEqual({});
  await closeEditor(page);
  await page.getByRole('button', { name: account.displayName, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Study notebook', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Study notebook', exact: true })).toBeVisible();
  await expect(page.locator('.notebook-note-text')).toHaveText(
    'A private note <script>plain text</script>'
  );
  await page.reload();
  await page.getByRole('button', { name: 'Edit notebook entry', exact: true }).click();
  await expect(note).toHaveValue('A private note <script>plain text</script>');
  await page.getByRole('button', { name: 'Remove entry', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Remove this notebook entry?', exact: true })
    .getByRole('button', { name: 'Remove entry', exact: true })
    .click();
  await expect(editor(page)).toHaveCount(0);
  expect((await records(page)).state.count).toBe(0);
  await expect(page.locator('.notebook-note-text')).toHaveCount(0);
});

test('offline, validation and conflict feedback preserve note input; refresh is explicit and does not auto-save', async ({
  page,
  context,
}) => {
  await init(page, context, { entries: [await entry()] });
  await page.goto('./#/notebook');
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-notebook-error:get', 'DENIED'));
  await page.getByRole('button', { name: 'Edit notebook entry', exact: true }).click();
  const note = page.getByRole('textbox', { name: 'Private note', exact: true });
  await expect(editor(page)).toContainText('Notebook access was denied.');
  await expect(editor(page).getByText('Not synchronized yet', { exact: true })).toBeVisible();
  await expect(note).toBeDisabled();
  await page.evaluate(() => sessionStorage.removeItem('quiz-e2e-notebook-error:get'));
  await page.getByRole('button', { name: 'Refresh entry', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Refresh this notebook entry?', exact: true })
    .getByRole('button', { name: 'Refresh entry', exact: true })
    .click();
  await expect(note).toBeEditable();
  await note.fill('x'.repeat(2001));
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(editor(page)).toContainText('Shorten the note');
  await expect(note).toHaveValue('x'.repeat(2001));
  await note.fill('My unsaved edit');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Retry original save', exact: true })
  ).toBeVisible();
  await expect(note).toHaveValue('My unsaved edit');
  await context.setOffline(false);
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-notebook-error:mutate', 'DENIED'));
  await page.getByRole('button', { name: 'Retry original save', exact: true }).click();
  await expect(editor(page)).toContainText('Notebook access was denied.');
  await expect(note).toHaveValue('My unsaved edit');
  await page.evaluate((uid) => {
    sessionStorage.removeItem('quiz-e2e-notebook-error:mutate');
    const key = 'quiz-e2e-notebook:' + uid,
      data = JSON.parse(localStorage.getItem(key)),
      row = Object.values(data.entries)[0];
    row.note = 'Another device note';
    row.revision++;
    data.state.revision++;
    localStorage.setItem(key, JSON.stringify(data));
  }, uid);
  await page.getByRole('button', { name: 'Retry original save', exact: true }).click();
  await expect(editor(page)).toContainText('This entry changed in another tab or device.');
  await expect(note).toHaveValue('My unsaved edit');
  await page.getByRole('button', { name: 'Refresh entry', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Refresh this notebook entry?', exact: true })
    .getByRole('button', { name: 'Refresh entry', exact: true })
    .click();
  await expect(editor(page).getByText('Latest saved note', { exact: true })).toBeVisible();
  await expect(note).toHaveValue('My unsaved edit');
  expect(Object.values((await records(page)).entries)[0].note).toBe('Another device note');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(
    editor(page).getByText('Study notebook synchronized', { exact: true })
  ).toBeVisible();
  expect(Object.values((await records(page)).entries)[0].note).toBe('My unsaved edit');
});

test('mixed bank selections preserve duplicate original IDs and isolate revision drafts from full-bank answers', async ({
  page,
  context,
}) => {
  const a = await entry(),
    b = await entry({ quizId: 'gcp-ace', note: 'Second source' });
  await init(page, context, { entries: [a, b] });
  await page.goto('./#/quiz/aws-aip-c01/practice');
  await page.getByRole('radio', { name: /Correct option/ }).check();
  await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
  const full = await page.evaluate(
    (uid) => sessionStorage.getItem(`quiz-study-v1:${uid}:aws-aip-c01:practice`),
    uid
  );
  await page.goto('./#/notebook');
  await expect(page.locator('.notebook-entry')).toHaveCount(2);
  await expect(page.getByText('Ready to study', { exact: true })).toHaveCount(2);
  for (const row of await page.locator('.notebook-entry').all())
    await row.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Study selected questions', exact: true }).click();
  await expect(page).toHaveURL(/#\/notebook\/study\/[0-9a-f]{64}$/);
  await expect(page.getByText('Notebook revision', { exact: true })).toBeVisible();
  await expect(page.getByText('Question 1 of 2', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: /Wrong option/ }).check();
  await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      (uid) => sessionStorage.getItem(`quiz-study-v1:${uid}:aws-aip-c01:practice`),
      uid
    )
  ).toBe(full);
  await page.reload();
  await expect(page.getByRole('radio', { name: /Wrong option/ })).toBeChecked();
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expect(page.getByText('Question 2 of 2', { exact: true })).toBeVisible();
});

test('changed sources retain notes and are excluded, including an explicit zero-current selection', async ({
  page,
  context,
}) => {
  const stale = await entry({
    q: { ...question, question: 'Older wording' },
    note: 'Old version note',
  });
  await init(page, context, { entries: [stale] });
  const manifest = await notebookSelection([stale]);
  await page.goto('./#/notebook');
  await expect(page.getByText('Source changed', { exact: true })).toBeVisible();
  await expect(page.locator('.notebook-note-text')).toHaveText('Old version note');
  await expect(page.locator('.notebook-entry').getByRole('checkbox')).toBeDisabled();
  await page.evaluate(
    ({ uid, selection }) =>
      sessionStorage.setItem(
        `quiz-notebook-selection-v1:${uid}:${selection.id}`,
        JSON.stringify(selection.manifest)
      ),
    { uid, selection: manifest }
  );
  await page.goto(`./#/notebook/study/${manifest.id}`);
  await expect(
    page.getByText('No current questions are available in this selection. Your notes are kept.', {
      exact: true,
    })
  ).toBeVisible();
  await expect(page.locator('.question-title')).toHaveCount(0);
  expect(Object.values((await records(page)).entries)[0].note).toBe('Old version note');
});

test('disabled/guest access makes no notebook IO; active Exam guards the account-menu route and hides question tools', async ({
  page,
  context,
}) => {
  await init(page, context, { enabled: false });
  await page.goto('./#/notebook');
  await expect(page.getByText('Study notebook is not enabled yet.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.quizNotebookCalls || [])).toEqual([]);
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-notebook-enabled', '1'));
  await page.reload();
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('quiz-e2e-auth-change', { detail: null }))
  );
  await expect(
    page.getByText('Sign in to use your private study notebook.', { exact: true })
  ).toBeVisible();
  await page.evaluate(
    (account) => window.dispatchEvent(new CustomEvent('quiz-e2e-auth-change', { detail: account })),
    account
  );
  await page.goto('./#/quiz/aws-aip-c01/exam');
  await expect(page.locator('.question-title')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bookmark and note', exact: true })).toHaveCount(0);
  const before = await page.evaluate(
    (uid) => JSON.parse(sessionStorage.getItem(`quiz-study-v1:${uid}:aws-aip-c01:exam`)),
    uid
  );
  await page.getByRole('button', { name: account.displayName, exact: true }).click();
  await page.getByRole('menuitem', { name: 'Study notebook', exact: true }).click();
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Leave this exam?' })
    .getByRole('button', { name: 'Continue exam', exact: true })
    .click();
  await expect(page).toHaveURL(/\/exam$/);
  const after = await page.evaluate(
    (uid) => JSON.parse(sessionStorage.getItem(`quiz-study-v1:${uid}:aws-aip-c01:exam`)),
    uid
  );
  expect(after.deadline).toBe(before.deadline);
  expect(after.submitted).toBe(false);
});

test('notebook and editor reflow across the phone/landscape/tablet/desktop locale-theme matrix with usable keyboard focus', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(180000);
  await init(page, context, {
    entries: [
      await entry({ note: 'Ghi chú riêng — keep this long plain text intact. '.repeat(20) }),
    ],
  });
  await page.goto('./#/notebook');
  for (const item of accountCases(testInfo.project.name)) {
    const t = (key) => translate(item.language, key);
    await page.setViewportSize({ width: item.width, height: item.height });
    await page.evaluate(({ language, theme }) => {
      localStorage.setItem('quiz-app-language', language);
      localStorage.setItem('quiz-app-theme', theme);
    }, item);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: t('Study notebook'), exact: true })
    ).toBeVisible();
    await expect(page.locator('.notebook-entry')).toHaveCount(1);
    await expect(page.getByText(t('Ready to study'), { exact: true })).toBeVisible();
    const panel = page.locator('.notebook-filter-panel');
    const summary = panel.locator('summary');
    if (!(await panel.getAttribute('open').then((value) => value !== null))) {
      await summary.focus();
      await summary.press('Enter');
    }
    await expect(
      page.getByRole('group', { name: t('Notebook filters'), exact: true })
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    for (const control of await page
      .locator('.notebook-page button:visible, .notebook-page .ant-select:visible')
      .all()) {
      const box = await control.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(43.5);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(item.width + 1);
    }
    if (item.width <= 900) {
      await summary.focus();
      await summary.press('Enter');
    }
    const preview = page.locator('.notebook-note-text');
    const previewBox = await preview.boundingBox();
    const expand = page.getByRole('button', { name: t('Read full note'), exact: true });
    await expand.focus();
    await expand.press('Enter');
    await expect(
      page.getByRole('button', { name: t('Collapse note'), exact: true })
    ).toHaveAttribute('aria-expanded', 'true');
    expect((await preview.boundingBox()).height).toBeGreaterThan(previewBox.height);
    await page.getByRole('button', { name: t('Collapse note'), exact: true }).press('Enter');
    await page.screenshot({
      path: testInfo.outputPath(`notebook-${item.width}-${item.language}-${item.theme}.png`),
      fullPage: true,
    });
    const trigger = page.getByRole('button', { name: t('Edit notebook entry'), exact: true });
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog', { name: t('Question notebook'), exact: true });
    const note = page.getByRole('textbox', { name: t('Private note'), exact: true });
    await expect(note).toBeEditable();
    await waitForUiMotion(dialog);
    await expect(note).toBeFocused();
    const field = await note.boundingBox();
    expect(field.x).toBeGreaterThanOrEqual(0);
    expect(field.x + field.width).toBeLessThanOrEqual(item.width);
    const label = dialog.locator('label[for]').filter({ hasText: t('Private note') });
    expect(await contrastRatio(label)).toBeGreaterThanOrEqual(4.5);
    const remove = dialog.getByRole('button', { name: t('Remove entry'), exact: true });
    expect(await contrastRatio(remove)).toBeGreaterThanOrEqual(4.5);
    await remove.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`notebook-editor-${item.width}-${item.language}-${item.theme}.png`),
    });
    const close = dialog.getByRole('button', { name: /^(Close|Đóng)$/ });
    await close.scrollIntoViewIfNeeded();
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test('loading, empty and server-filtered empty states recover without scanning the account on a question render', async ({
  page,
  context,
}) => {
  await init(page, context);
  await page.goto('./#/quiz/aws-aip-c01/practice');
  await expect(page.locator('.question-title')).toBeVisible();
  expect(await page.evaluate(() => window.quizNotebookCalls || [])).toEqual([]);
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-notebook-defer:list', '1'));
  await page.goto('./#/notebook');
  await expect(page.getByText('Loading notebook…', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    sessionStorage.removeItem('quiz-e2e-notebook-defer:list');
    window.dispatchEvent(new Event('quiz-e2e-notebook-release:list'));
  });
  await expect(
    page.getByText(
      'Your notebook is empty. Add a bookmark, a note or complete a practice answer.',
      { exact: true }
    )
  ).toBeVisible();
  const row = await entry();
  await page.evaluate(
    ({ uid, row }) =>
      localStorage.setItem(
        'quiz-e2e-notebook:' + uid,
        JSON.stringify({
          entries: { [row.entryKey]: row },
          state: { count: 1, revision: 1, generation: 0 },
        })
      ),
    { uid, row }
  );
  await page.getByRole('button', { name: 'Refresh notebook', exact: true }).click();
  await expect(page.locator('.notebook-entry')).toHaveCount(1);
  if (!(await page.getByRole('checkbox', { name: 'Mistakes only', exact: true }).isVisible()))
    await page.locator('.notebook-filter-panel summary').click();
  await page.getByRole('checkbox', { name: 'Mistakes only', exact: true }).check();
  await expect(page.getByText('No entries match these filters.', { exact: true })).toBeVisible();
});

test('a late owner write cannot leak notes into the next account, and the original account can recover its pending input', async ({
  page,
  context,
}) => {
  await init(page, context, { entries: [await entry()] });
  await page.goto('./#/notebook');
  await page.getByRole('button', { name: 'Edit notebook entry', exact: true }).click();
  const note = page.getByRole('textbox', { name: 'Private note', exact: true });
  await expect(note).toBeEditable();
  await note.fill('Alice pending input');
  await page.evaluate(() => sessionStorage.setItem('quiz-e2e-notebook-defer:mutate', '1'));
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(editor(page).getByText('Saving notebook entry…', { exact: true })).toBeVisible();
  const bob = {
    uid: 'notebook-bob',
    displayName: 'Other learner',
    email: 'bob@example.test',
    emailVerified: true,
  };
  await page.evaluate((bob) => {
    window.dispatchEvent(new CustomEvent('quiz-e2e-auth-change', { detail: bob }));
    sessionStorage.removeItem('quiz-e2e-notebook-defer:mutate');
    window.dispatchEvent(new Event('quiz-e2e-notebook-release:mutate'));
  }, bob);
  await expect(page.getByRole('button', { name: bob.displayName, exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'Your notebook is empty. Add a bookmark, a note or complete a practice answer.',
      { exact: true }
    )
  ).toBeVisible();
  await expect(page.getByText('Alice pending input', { exact: true })).toHaveCount(0);
  await expect(editor(page)).toHaveCount(0);
  await page.evaluate(
    (account) => window.dispatchEvent(new CustomEvent('quiz-e2e-auth-change', { detail: account })),
    account
  );
  await page.getByRole('button', { name: 'Edit notebook entry', exact: true }).click();
  await expect(note).toHaveValue('Alice pending input');
  await page.getByRole('button', { name: 'Retry original save', exact: true }).click();
  await expect(
    editor(page).getByText('Study notebook synchronized', { exact: true })
  ).toBeVisible();
  expect(Object.values((await records(page)).entries)[0].note).toBe('Alice pending input');
});

test('pagination renders one bounded page and cached back-navigation; server review filters never delete notes', async ({
  page,
  context,
}) => {
  const questions = Array.from({ length: 45 }, (_, i) => ({ ...question, id: `page-${i}` }));
  const entries = await Promise.all(
    questions.map((q, i) =>
      entry({ q, time: 1000 + i, mistake: i % 3 === 0, bookmarked: i % 2 === 0 })
    )
  );
  await init(page, context, { entries });
  await page.route('**/' + findQuiz('aws-aip-c01').file, (route) =>
    route.fulfill({ json: questions })
  );
  await page.goto('./#/notebook');
  await expect(page.locator('.notebook-entry')).toHaveCount(20);
  await expect(page.getByText('Question page-44', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByText('Page 2', { exact: true })).toBeVisible();
  await expect(page.locator('.notebook-entry')).toHaveCount(20);
  const calls = await page.evaluate(
    () => window.quizNotebookCalls.filter((call) => call.method === 'list').length
  );
  expect(calls).toBeLessThanOrEqual(3);
  await page.getByRole('button', { name: 'Previous page', exact: true }).click();
  await expect(page.getByText('Page 1', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => window.quizNotebookCalls.filter((call) => call.method === 'list').length
    )
  ).toBe(calls);
  if (!(await page.getByRole('checkbox', { name: 'Mistakes only', exact: true }).isVisible()))
    await page.locator('.notebook-filter-panel summary').click();
  await page.getByRole('checkbox', { name: 'Mistakes only', exact: true }).check();
  await expect(page.locator('.notebook-entry')).toHaveCount(15);
  const review = page.getByRole('combobox', { name: 'Review status', exact: true });
  await review.focus();
  await review.press('ArrowDown');
  await page
    .locator(`[id="${await review.getAttribute('aria-controls')}"]`)
    .getByRole('option', { name: 'Reviewed correctly', exact: true })
    .click();
  await expect(page.getByText('No entries match these filters.', { exact: true })).toBeVisible();
  expect((await records(page)).state.count).toBe(45);
});

test('capacity explains the limit without evicting entries or interrupting practice', async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  const entries = await Promise.all(
    Array.from({ length: 500 }, (_, i) =>
      entry({ q: { ...question, id: `full-${i}` }, note: `Kept note ${i}`, time: 1000 + i })
    )
  );
  await init(page, context, { entries });
  await page.goto('./#/quiz/aws-aip-c01/practice');
  await page.getByRole('button', { name: 'Bookmark and note', exact: true }).click();
  const note = page.getByRole('textbox', { name: 'Private note', exact: true });
  await expect(note).toBeEditable();
  await note.fill('Retain this input at capacity');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(editor(page)).toContainText('Your notebook has reached 500 entries.');
  await expect(note).toHaveValue('Retain this input at capacity');
  expect((await records(page)).state.count).toBe(500);
  expect(Object.keys((await records(page)).entries)).toHaveLength(500);
  await editor(page).getByRole('button', { name: 'Close', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Keep your note draft and close?', exact: true })
    .getByRole('button', { name: 'Close editor', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Bookmark and note', exact: true })).toBeFocused();
  await page.getByRole('radio', { name: /Correct option/ }).check();
  await expect(page.getByRole('radio', { name: /Correct option/ })).toBeChecked();
  expect((await records(page)).state.count).toBe(500);
});

for (const sourceState of ['missing', 'replaced'])
  test(`a ${sourceState} private source keeps its owner note editable and removable`, async ({
    page,
    context,
  }) => {
    const instanceId = secureId(),
      ref = await createNotebookReference(
        {
          kind: 'cloud-custom',
          owner: uid,
          slotId: 'slot-1',
          instanceId,
          contentVersion: 1,
          id: `cloud:slot-1:${instanceId}`,
          questions: [question],
        },
        question,
        uid
      );
    const row = {
      ...(await entry({ note: 'Private source note' })),
      ref,
      entryKey: await notebookEntryKey(ref),
      sourceGroup: notebookSourceGroup(ref),
    };
    await init(page, context, { entries: [row] });
    if (sourceState === 'replaced')
      await context.addInitScript(
        ({ uid, question }) => {
          const replacement = {
            instanceId: '70000000-0000-4000-8000-000000000002',
            title: 'New occupant',
            questions: [question],
            questionCount: 1,
            contentVersion: 1,
            revision: 1,
            checkpoint: null,
            createdAt: 1000,
            updatedAt: 1000,
          };
          localStorage.setItem('quiz-e2e-custom:' + uid, JSON.stringify({ 'slot-1': replacement }));
        },
        { uid, question }
      );
    await page.goto('./#/notebook');
    await expect(
      page.getByText(sourceState === 'missing' ? 'Source unavailable' : 'Private quiz replaced', {
        exact: true,
      })
    ).toBeVisible();
    await expect(page.locator('.notebook-note-text')).toHaveText('Private source note');
    await expect(page.locator('.notebook-entry').getByRole('checkbox')).toBeDisabled();
    await page.getByRole('button', { name: 'Edit notebook entry', exact: true }).click();
    const note = page.getByRole('textbox', { name: 'Private note', exact: true });
    await expect(note).toBeEditable();
    await note.fill('Retained orphan note');
    await page.getByRole('button', { name: 'Save note', exact: true }).click();
    await expect(
      editor(page).getByText('Study notebook synchronized', { exact: true })
    ).toBeVisible();
    expect((await records(page)).entries[row.entryKey].note).toBe('Retained orphan note');
    await page.getByRole('button', { name: 'Remove entry', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Remove this notebook entry?', exact: true })
      .getByRole('button', { name: 'Remove entry', exact: true })
      .click();
    await expect(editor(page)).toHaveCount(0);
    expect((await records(page)).state.count).toBe(0);
  });

test('a persisted mixed-current/changed selection labels exclusions and studies only its matching current reference', async ({
  page,
  context,
}) => {
  const current = await entry({ note: 'Current note' });
  const stale = await entry({
    q: { ...question, question: 'Previous version wording' },
    note: 'Keep old version note',
  });
  await init(page, context, { entries: [current, stale] });
  const selection = await notebookSelection([current, stale]);
  await page.goto('./#/notebook');
  await page.evaluate(
    ({ uid, selection }) =>
      sessionStorage.setItem(
        `quiz-notebook-selection-v1:${uid}:${selection.id}`,
        JSON.stringify(selection.manifest)
      ),
    { uid, selection }
  );
  await page.goto(`./#/notebook/study/${selection.id}`);
  await expect(
    page.getByText('1 selected question is unavailable and excluded.', { exact: true })
  ).toBeVisible();
  await expect(page.getByText('Question 1 of 1', { exact: true })).toBeVisible();
  await expect(page.locator('.question-title')).toHaveText(question.question);
  await page.getByRole('radio', { name: /Wrong option/ }).check();
  await expect(page.getByText('Study notebook synchronized', { exact: true })).toBeVisible();
  expect((await records(page)).entries[stale.entryKey].note).toBe('Keep old version note');
  expect((await records(page)).entries[current.entryKey].mistake).toBe(true);
});
