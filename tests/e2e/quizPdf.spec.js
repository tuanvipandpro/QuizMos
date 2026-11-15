import { accountCases } from './viewports.js';
import { translate } from '../../src/i18n/messages.js';
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const sample = (format) =>
  JSON.parse(
    fs.readFileSync(new URL('../../public/examples/quiz-' + format + '.json', import.meta.url))
  )[0];
const question = {
  ...sample('single'),
  id: 'pdf-question',
  question: 'Câu hỏi tiếng Việt: đường dẫn và kiểm thử?',
  explanation: 'EXPLANATION_MUST_NOT_APPEAR',
};
const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const found = [];
  errors.set(page, found);
  page.on('pageerror', (e) => found.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && msg.text().includes('two children with the same key'))
      found.push('Duplicate React element keys');
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/*', (r) =>
    ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname)
      ? r.continue()
      : r.abort()
  );
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));
async function upload(page, questions, name = 'PDF fixture') {
  await page.goto('./#/my-quizzes');
  await page.locator('input[type=file]').setInputFiles({
    name: 'pdf-fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(questions)),
  });
  await page.getByRole('textbox', { name: 'Quiz name', exact: true }).fill(name);
  await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
}
async function saveDownload(page, info, name = 'quiz.pdf') {
  let navigations = 0;
  const track = (frame) => {
    if (frame === page.mainFrame()) navigations++;
  };
  page.on('framenavigated', track);
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const download = await pending;
  await download.saveAs(info.outputPath(name));
  const bytes = fs.readFileSync(info.outputPath(name));
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(5000);
  await expect(page.getByText('PDF download started.', { exact: true })).toBeVisible();
  page.off('framenavigated', track);
  expect(navigations).toBe(0);
  return download;
}
async function png(page) {
  return page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 240;
    c.height = 100;
    const x = c.getContext('2d');
    x.fillStyle = 'white';
    x.fillRect(0, 0, 240, 100);
    x.fillStyle = 'black';
    x.font = '18px sans-serif';
    x.fillText('Question illustration', 12, 50);
    return c.toDataURL('image/png');
  });
}
test('whole seven-format quiz downloads with Unicode, image, long text/template and answer section', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto('./');
  const image = await png(page);
  const questions = [
    'single',
    'multiple',
    'yes-no',
    'dropdown-rows',
    'dropdown-inline',
    'drag-drop-rows',
    'drag-drop-inline',
  ].map((format, i) => ({
    ...sample(format),
    id: 'pdf-' + format,
    explanation: 'EXPLANATION_MUST_NOT_APPEAR',
    ...(i === 0
      ? {
          question:
            question.question +
            '\n' +
            'A long question paragraph for readable pagination. '.repeat(150),
          imageUrl: image,
        }
      : {}),
  }));
  await upload(page, questions, 'Bộ câu hỏi - kiểm thử Unicode');
  const download = await saveDownload(page, info, 'seven-formats.pdf');
  expect(download.suggestedFilename()).toContain('Bộ câu hỏi');
  await expect(page.locator('.ant-modal-body')).not.toContainText('EXPLANATION_MUST_NOT_APPEAR');
});
test('export leaves an existing practice draft and an absolute exam deadline unchanged', async ({
  page,
}, info) => {
  await upload(page, [question]);
  await page
    .getByRole('dialog')
    .locator('.quiz-dialog-actions')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Back to quiz overview', exact: true }).click();
  await page.getByText('Mock exam', { exact: true }).click();
  await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  await page.getByRole('button', { name: 'Flag', exact: true }).click();
  await page.getByRole('button', { name: 'Back to quiz overview', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Leave exam', exact: true }).click();
  const read = () =>
    page.evaluate(() =>
      Object.fromEntries(
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith('quiz-study-v1:'))
          .map((k) => [k, sessionStorage.getItem(k)])
      )
    );
  const before = await read();
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  await saveDownload(page, info);
  expect(await read()).toEqual(before);
});
test('failed images show a bounded error, never a partial file, and retry recovers', async ({
  page,
}, info) => {
  let calls = 0;
  await page.route('**/pdf-test-image.png', (r) => {
    calls++;
    return r.fulfill({ status: 404, body: 'Missing' });
  });
  await upload(page, [
    { ...question, imageUrl: 'http://127.0.0.1:5174/quiz-app/pdf-test-image.png' },
  ]);
  let downloads = 0;
  page.on('download', () => downloads++);
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('An image could not be embedded');
  expect(downloads).toBe(0);
  expect(calls).toBe(1);
  const image = await png(page);
  await page.route('**/pdf-test-image.png', (r) =>
    r.fulfill({ contentType: 'image/png', body: Buffer.from(image.split(',')[1], 'base64') })
  );
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Retry PDF export', exact: true }).click();
  const download = await pending;
  await download.saveAs(info.outputPath('retry-image.pdf'));
  expect(downloads).toBe(1);
});
test('cancel and account changes suppress pending image work and duplicate downloads', async ({
  page,
}) => {
  let release;
  await page.route('**/pdf-wait.png', async (r) => {
    await new Promise((resolve) => {
      release = resolve;
    });
    await r.fulfill({ status: 404, body: 'Stopped' }).catch(() => {});
  });
  await upload(page, [{ ...question, imageUrl: 'http://127.0.0.1:5174/quiz-app/pdf-wait.png' }]);
  let downloads = 0;
  page.on('download', () => downloads++);
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toBeDisabled();
  await expect.poll(() => !!release).toBe(true);
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  release();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(downloads).toBe(0);
  release = null;
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect.poll(() => !!release).toBe(true);
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('quiz-e2e-auth-change', {
        detail: { uid: 'pdf-other', displayName: 'Another account', emailVerified: true },
      })
    )
  );
  release();
  await expect(page).toHaveURL(/#\/library$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(downloads).toBe(0);
});
test('resource-limit failures are explicit before any quiz image request', async ({ page }) => {
  let requests = 0;
  const questions = Array.from({ length: 501 }, (_, id) => ({
    ...question,
    id: String(id),
    imageUrl: 'http://127.0.0.1:5174/quiz-app/limit-' + id + '.png',
  }));
  await page.route('**/quiz/AWS/AIP_C01.json', (r) => r.fulfill({ json: questions }));
  await page.route('**/limit-*.png', (r) => {
    requests++;
    return r.abort();
  });
  await page.goto('./#/quiz/aws-aip-c01');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('exceeds the PDF export limits');
  expect(requests).toBe(0);
});
test('owned private source exports but another account cannot reuse its overview', async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'quiz-e2e-auth',
      JSON.stringify({ uid: 'pdf-owner', displayName: 'PDF owner', emailVerified: true })
    )
  );
  await page.goto('./#/my-quizzes');
  await page.locator('input[type=file]').setInputFiles({
    name: 'private-pdf.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([question])),
  });
  await page.getByRole('textbox', { name: 'Quiz name', exact: true }).fill('Owned PDF');
  await page.getByRole('button', { name: 'Save to my quizzes', exact: true }).click();
  await page
    .locator('.cloud-quiz-card')
    .filter({ has: page.getByRole('heading', { name: 'Owned PDF', exact: true }) })
    .getByRole('button', { name: 'Practice', exact: true })
    .click();
  await page.getByRole('button', { name: 'Back to quiz overview', exact: true }).click();
  const sourceUrl = page.url();
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  await saveDownload(page, info, 'owned.pdf');
  await page
    .getByRole('dialog')
    .locator('.quiz-dialog-actions')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('quiz-e2e-auth-change', {
        detail: { uid: 'pdf-other', displayName: 'Other', emailVerified: true },
      })
    )
  );
  await page.goto(sourceUrl);
  await expect(page.getByRole('button', { name: 'Export PDF', exact: true })).toHaveCount(0);
});

for (const view of accountCases('desktop').concat(accountCases('phone'))) {
  test('PDF dialog responsive ' + JSON.stringify(view), async ({ page }, info) => {
    test.skip(info.project.name !== view.project);
    await page.setViewportSize({ width: view.width, height: view.height });
    await page.addInitScript(({ language, theme }) => {
      localStorage.setItem('quiz-app-language', language);
      localStorage.setItem('quiz-app-theme', theme);
    }, view);
    await page.route('**/quiz/AWS/AIP_C01.json', (r) => r.fulfill({ json: [question] }));
    await page.goto('./#/quiz/aws-aip-c01');
    const t = (key) => translate(view.language, key),
      trigger = page.getByRole('button', { name: t('Export PDF'), exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: t('Export PDF'), exact: true });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(view.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    for (const button of await dialog.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(view.width <= 700 ? 44 : 40);
    }
    await dialog.getByRole('button', { name: t('Download PDF'), exact: true }).focus();
    await page.screenshot({ path: info.outputPath('pdf-dialog.png'), fullPage: false });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

test('PDF layout remains cancellable before a large document can download', async ({ page }) => {
  const questions = Array.from({ length: 300 }, (_, id) => ({
    ...question,
    id: String(id),
    question:
      question.question +
      ' ' +
      'Long layout content that must not block the cancel button. '.repeat(90),
  }));
  await page.route('**/quiz/AWS/AIP_C01.json', (r) => r.fulfill({ json: questions }));
  await page.goto('./#/quiz/aws-aip-c01');
  await page.getByRole('button', { name: 'Export PDF', exact: true }).click();
  let downloads = 0;
  page.on('download', () => downloads++);
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.getByText('Generating PDF…', { exact: true })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(downloads).toBe(0);
});

test('a failed PDF worker reports an error without downloading a partial file', async ({
  page,
}) => {
  await page.route('**/src/workers/quizPdf.worker.js*', (r) => r.abort());
  await upload(page, [question]);
  let downloads = 0;
  page.on('download', () => downloads++);
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Could not generate the PDF');
  expect(downloads).toBe(0);
  await expect(page.getByRole('button', { name: 'Retry PDF export', exact: true })).toBeEnabled();
});
