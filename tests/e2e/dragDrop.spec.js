import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { clickAfterUiMotion } from './uiMotion.js';
import { readFileSync } from 'node:fs';
import { accountCases } from './viewports.js';
import { contrastRatio } from './uiContrast.js';
import { translate } from '../../src/i18n/messages.js';

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
const choice = (page, key) =>
  page
    .locator('.dd-choice')
    .filter({ has: page.locator('.dd-choice-key', { hasText: key + '.' }) });
const slot = (page, id) => page.locator(`[data-dd-slot="${id}"]`);
const state = (page) => page.locator('[data-native-answer]');
async function fixture(page, format = 'drag-drop-rows') {
  await page.goto('./tests/fixtures/native-drag.html?format=' + format);
  await expect(page.locator('.drag-drop-answers')).toBeVisible();
}
async function mouseDrag(page, from, to) {
  await from.scrollIntoViewIfNeeded();
  const a = await from.boundingBox(),
    b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

const exampleQuestion = (format = 'drag-drop-rows') =>
  JSON.parse(
    readFileSync(new URL(`../../public/examples/quiz-${format}.json`, import.meta.url))
  )[0];
const frame = (page) =>
  page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );

async function startAppNative(page, mode = 'practice') {
  await page.goto('./#/my-quizzes');
  await page
    .locator('input[type=file]')
    .setInputFiles(
      fileURLToPath(new URL('../../public/examples/quiz-drag-drop-rows.json', import.meta.url))
    );
  await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
  if (mode === 'practice')
    await page.getByRole('button', { name: 'Start practice', exact: true }).click();
  else {
    await page.getByText('Mock exam', { exact: true }).click();
    await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
  }
  await expect(page.locator('.drag-drop-answers')).toBeVisible();
}

test('expiry during a captured native drag rejects the placement and preserves the deadline', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.clock.install();
  await startAppNative(page, 'standard');
  const key = 'quiz-study-v1:guest:custom:exam';
  const before = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), key);
  const a = await choice(page, 'A').locator('.dd-handle').boundingBox();
  await page.mouse.move(a.x + 20, a.y + 20);
  await page.mouse.down();
  await page.mouse.move(a.x + 80, a.y + 80);
  await expect(page.locator('.dd-ghost')).toBeVisible();
  await page.clock.fastForward(60 * 60 * 1000 + 1000);
  await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
  await page.mouse.up();
  const after = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), key);
  expect(after.deadline).toBe(before.deadline);
  expect(after.answers).toEqual(before.answers);
  expect(after.submitted).toBe(true);
  expect(after.timeExpired).toBe(true);
  await expect(page.locator('.dd-ghost')).toHaveCount(0);
  await expect(page.locator('.drag-drop-answers button')).toHaveCount(0);
});

test('account change during a native drag cannot populate the next owner draft', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (['127.0.0.1', 'localhost'].includes(location.hostname))
      localStorage.setItem(
        'quiz-e2e-auth',
        JSON.stringify({
          uid: 'native-alice',
          displayName: 'Native Alice',
          email: 'native@example.test',
          emailVerified: true,
        })
      );
  });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await startAppNative(page);
  await choice(page, 'A').locator('.dd-choice-text').click();
  await slot(page, 'first').click();
  const a = await choice(page, 'B').locator('.dd-handle').boundingBox();
  await page.mouse.move(a.x + 20, a.y + 20);
  await page.mouse.down();
  await page.mouse.move(a.x + 80, a.y + 80);
  await expect(page.locator('.dd-ghost')).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(
      new CustomEvent('quiz-e2e-auth-change', {
        detail: {
          uid: 'native-bob',
          displayName: 'Native Bob',
          email: 'bob@example.test',
          emailVerified: true,
        },
      })
    )
  );
  await expect(page.getByRole('button', { name: 'Native Bob', exact: true })).toBeVisible();
  await page.mouse.up();
  await expect(page.locator('.dd-ghost')).toHaveCount(0);
  await expect(page.locator('.dd-choice-text[aria-pressed=true]')).toHaveCount(0);
  const answers = await page.evaluate(() => {
    const raw = sessionStorage.getItem('quiz-study-v1:native-bob:custom:practice');
    return raw ? JSON.parse(raw).answers : [];
  });
  expect(answers.every((answer) => Object.keys(answer || {}).length === 0)).toBe(true);
});
async function touchDrag(page, context, from, to, cancel = false) {
  const cdp = await context.newCDPSession(page);
  await from.scrollIntoViewIfNeeded();
  const a = await from.boundingBox(),
    b = await to.boundingBox();
  const point = (x, y) => [{ x, y, id: 7, radiusX: 2, radiusY: 2, force: 1 }];
  const height = page.viewportSize().height;
  const centre = b.y + b.height / 2;
  const endY = centre > height - 72 ? height - 6 : centre < 135 ? 6 : centre;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: point(a.x + a.width / 2, a.y + a.height / 2),
  });
  for (let step = 1; step <= 10; step++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: point(
        a.x + a.width / 2 + ((b.x + b.width / 2 - a.x - a.width / 2) * step) / 10,
        a.y + a.height / 2 + ((endY - a.y - a.height / 2) * step) / 10
      ),
    });
  await expect(page.locator('.dd-ghost')).toBeVisible();
  await expect
    .poll(
      async () => {
        const target = await to.boundingBox();
        return target.y + target.height / 2 > 125 && target.y + target.height / 2 < height - 70;
      },
      { timeout: 12000 }
    )
    .toBe(true);
  const target = await to.boundingBox();
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: point(target.x + target.width / 2, target.y + target.height / 2),
  });
  await frame(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: cancel ? 'touchCancel' : 'touchEnd',
    touchPoints: [],
  });
  await cdp.detach();
}

test('mouse/touch drops accept visible row/inline slot padding and release hints', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 1400 });
  for (const format of ['drag-drop-rows', 'drag-drop-inline']) {
    await fixture(page, format);
    for (const pointerType of ['mouse', 'touch'])
      for (const surface of ['padding', 'hint']) {
        const from = choice(page, 'A').locator('.dd-handle');
        await from.scrollIntoViewIfNeeded();
        const wrapper = page.locator('[data-dd-drop-slot="first"]');
        const box = await (
          surface === 'hint' ? wrapper.locator('.dd-target-hint') : wrapper
        ).boundingBox();
        const point =
          surface === 'hint'
            ? { x: box.x + box.width / 2, y: box.y + box.height / 2 }
            : { x: box.x + box.width - 5, y: box.y + box.height - 5 };
        expect(
          await page.evaluate(
            ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-dd-slot]'),
            point
          )
        ).toBe(false);
        const a = await from.boundingBox(),
          start = { x: a.x + 22, y: a.y + 22 };
        let cdp;
        if (pointerType === 'touch') {
          cdp = await context.newCDPSession(page);
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ ...start, id: 9 }],
          });
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ ...point, id: 9 }],
          });
        } else {
          await page.mouse.move(start.x, start.y);
          await page.mouse.down();
          await page.mouse.move(point.x, point.y, { steps: 10 });
        }
        await expect(wrapper).toHaveClass(/dd-drop-active/);
        await expect(wrapper.locator('.dd-target-hint')).toHaveText('Release to place');
        if (cdp) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await cdp.detach();
        } else await page.mouse.up();
        await expect(state(page)).toHaveText('{"first":"A"}');
        await expect(page.locator('.dd-ghost')).toHaveCount(0);
        await page
          .getByRole('button', {
            name: format === 'drag-drop-rows' ? 'Clear Worker one' : 'Clear First message',
            exact: true,
          })
          .click();
        await expect(state(page)).toHaveText('{}');
      }
  }
});

test('read-only transitions discard pending tap selection while keeping recorded mappings', async ({
  page,
}) => {
  for (const format of ['drag-drop-rows', 'drag-drop-inline']) {
    await fixture(page, format);
    await choice(page, 'A').locator('.dd-choice-text').click();
    await slot(page, 'first').click();
    await choice(page, 'B').locator('.dd-choice-text').click();
    await page.evaluate(() => window.quizNativeDragFixture.lock(true));
    await expect(page.locator('.drag-drop-answers button')).toHaveCount(0);
    await page.evaluate(() => window.quizNativeDragFixture.lock(false));
    await expect(page.locator('.dd-choice-text[aria-pressed=true]')).toHaveCount(0);
    await slot(page, 'second').click();
    await expect(state(page)).toHaveText('{"first":"A"}');
    await expect(page.locator('.drag-drop-answers').getByRole('status')).toHaveText(
      'Select a choice first.'
    );
    await choice(page, 'B').locator('.dd-choice-text').click();
    await slot(page, 'second').click();
    await expect(state(page)).toHaveText('{"first":"A","second":"B"}');
  }
});

test('actual touch pointer dragging places a choice and touch cancellation keeps prior mappings', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.evaluate(() => {
    window.nativePointerTypes = [];
    document.addEventListener('pointerdown', (e) => window.nativePointerTypes.push(e.pointerType));
  });
  await touchDrag(page, context, choice(page, 'A').locator('.dd-handle'), slot(page, 'first'));
  await expect(state(page)).toHaveText('{"first":"A"}');
  await touchDrag(
    page,
    context,
    choice(page, 'B').locator('.dd-handle'),
    slot(page, 'second'),
    true
  );
  await expect(state(page)).toHaveText('{"first":"A"}');
  await expect(page.locator('.dd-ghost')).toHaveCount(0);
  expect(await page.evaluate(() => window.nativePointerTypes)).toContain('touch');
  await touchDrag(page, context, choice(page, 'A').locator('.dd-handle'), slot(page, 'second'));
  await expect(state(page)).toHaveText('{"first":"A","second":"A"}');
});

test('captured mouse/touch autoscroll reaches offscreen slots without losing source identity', async ({
  page,
  context,
}, info) => {
  await page.setViewportSize({ width: info.project.name === 'phone' ? 390 : 1280, height: 600 });
  await fixture(page);
  const q = exampleQuestion();
  q.question = 'Reach the lower slots.';
  const options = Object.fromEntries(
    Array.from({ length: 26 }, (_, i) => ['K' + i, 'Choice ' + i])
  );
  q.options = { first: options, second: options };
  q.answer = { first: 'K0', second: 'K1' };
  await page.evaluate((value) => window.quizNativeDragFixture.question(value), q);
  const from = choice(page, 'K0').locator('.dd-handle');
  await from.scrollIntoViewIfNeeded();
  const a = await from.boundingBox();
  let cdp;
  if (info.project.name === 'phone') {
    cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: a.x + 20, y: a.y + 20, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: a.x + 30, y: 594, id: 1 }],
    });
  } else {
    await page.mouse.move(a.x + 20, a.y + 20);
    await page.mouse.down();
    await page.mouse.move(a.x + 30, 594, { steps: 8 });
  }
  await expect(page.locator('.dd-ghost')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.scrollY + document.body.scrollTop))
    .toBeGreaterThan(100);
  await expect
    .poll(
      async () => {
        const b = await slot(page, 'first').boundingBox();
        return b.y > 80 && b.y + b.height < 530;
      },
      { timeout: 12000 }
    )
    .toBe(true);
  const b = await slot(page, 'first').boundingBox();
  if (cdp) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 }],
    });
    await frame(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
  }
  await expect(state(page)).toHaveText('{"first":"K0"}');
});

test('incompatible/outside drops and Escape before threshold cannot change an answer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await fixture(page);
  const q = exampleQuestion();
  q.options.second = { A: 'Local', B: 'Remote' };
  q.answer.second = 'B';
  await page.evaluate((value) => window.quizNativeDragFixture.question(value), q);
  const firstRead = page
    .locator('.dd-choice')
    .filter({ has: page.getByRole('button', { name: 'A. Read', exact: true }) })
    .locator('.dd-handle');
  await mouseDrag(page, firstRead, slot(page, 'second'));
  await expect(state(page)).toHaveText('{}');
  await expect(page.locator('.dd-status')).toContainText('cannot be placed');
  const a = await firstRead.boundingBox();
  await page.mouse.move(a.x + 20, a.y + 20);
  await page.mouse.down();
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.locator('.dd-status')).toContainText('cancelled');
  await expect(page.locator('.dd-choice-text[aria-pressed=true]')).toHaveCount(0);
  await page.mouse.move(a.x + 20, a.y + 20);
  await page.mouse.down();
  await page.mouse.move(2, 2, { steps: 8 });
  await page.mouse.up();
  await expect(state(page)).toHaveText('{}');
});

test('same-ID question replacement clears selection/status and stale captured writes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await fixture(page);
  await choice(page, 'A').locator('.dd-choice-text').click();
  const q = exampleQuestion();
  q.question = 'Replacement question, same stable ID.';
  await page.evaluate((value) => window.quizNativeDragFixture.question(value), q);
  await expect(page.locator('.dd-status')).toHaveText('');
  await slot(page, 'first').click();
  await expect(state(page)).toHaveText('{}');
  const a = await choice(page, 'A').locator('.dd-handle').boundingBox();
  await page.mouse.move(a.x + 20, a.y + 20);
  await page.mouse.down();
  await page.mouse.move(a.x + 70, a.y + 70);
  await expect(page.locator('.dd-ghost')).toBeVisible();
  q.question = 'A second replacement, same ID.';
  await page.evaluate((value) => window.quizNativeDragFixture.question(value), q);
  const b = await slot(page, 'first').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.up();
  await expect(state(page)).toHaveText('{}');
  expect(await page.evaluate(() => window.quizNativeDragFixture.changes)).toEqual([]);
  await page.evaluate(() => window.quizNativeDragFixture.visible(false));
  await expect(page.locator('.dd-ghost')).toHaveCount(0);
});

test('both native layouts fit locales/themes, narrow-to-landscape viewports and read-only review', async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const cases = accountCases(info.project.name);
  if (info.project.name === 'phone')
    cases.push({ width: 360, height: 800, language: 'en', theme: 'light' });
  await page.goto('./');
  for (const view of cases)
    for (const format of ['drag-drop-rows', 'drag-drop-inline']) {
      await page.setViewportSize({ width: view.width, height: view.height });
      await page.emulateMedia({
        reducedMotion: [390, 1280].includes(view.width) ? 'no-preference' : 'reduce',
      });
      await page
        .getByRole('button', {
          name: view.language === 'vi' ? 'Tiếng Việt' : 'English',
          exact: true,
        })
        .click();
      if ((await page.locator('html').getAttribute('data-theme')) !== view.theme)
        await page.locator('.theme-toggle').click();
      await expect(page.locator('html')).toHaveAttribute('lang', view.language);
      await expect(page.locator('html')).toHaveAttribute('data-theme', view.theme);
      const q = exampleQuestion(format);
      q.id = `matrix-${view.width}-${view.language}-${view.theme}-${format}`;
      for (const options of Object.values(q.options))
        options.A += ' ' + 'long_unbroken_identifier_'.repeat(5);
      const t = (key) => translate(view.language, key);
      await page.goto('./#/my-quizzes');
      await page.locator('input[type=file]').setInputFiles({
        name: 'native-matrix.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify([q])),
      });
      await page.getByRole('button', { name: t('Use this quiz'), exact: true }).click();
      await page.getByText(t('Mock exam'), { exact: true }).click();
      await page.getByRole('button', { name: t('Start mock exam'), exact: true }).click();
      await expect(page.locator('.drag-drop-answers')).toBeVisible();
      await expect(page.getByRole('combobox')).toHaveCount(0);
      for (const button of await page.locator('.drag-drop-answers button').all()) {
        const box = await button.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      expect(
        await contrastRatio(choice(page, 'A').locator('.dd-choice-text'))
      ).toBeGreaterThanOrEqual(4.5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await choice(page, 'A').locator('.dd-choice-text').scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath(`bank-${format}-${view.width}-${view.language}-${view.theme}.png`),
      });
      for (const part of q.slots) {
        await choice(page, q.answer[part.id]).locator('.dd-choice-text').click();
        await slot(page, part.id).click();
      }
      await expect(page.locator('.dd-correct,.dd-incorrect')).toHaveCount(0);
      await slot(page, q.slots.at(-1).id).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await page.screenshot({
        path: info.outputPath(`placed-${format}-${view.width}-${view.language}-${view.theme}.png`),
      });
      await page.getByRole('button', { name: t('Submit exam'), exact: true }).click();
      await clickAfterUiMotion(
        page
          .getByRole('dialog', { name: t('Review before submitting'), exact: true })
          .getByRole('button', { name: t('Submit and view results'), exact: true })
      );
      await expect(
        page.getByRole('heading', { name: t('Exam results'), exact: true })
      ).toBeVisible();
      await expect(page.locator('.drag-drop-answers button')).toHaveCount(0);
      await page.locator('.dd-slot').last().scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await page.screenshot({
        path: info.outputPath(
          `readonly-${format}-${view.width}-${view.language}-${view.theme}.png`
        ),
      });
    }
});

test('native mouse drag copies and reuses choices, moves placements, clears and cancels', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await fixture(page);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await mouseDrag(page, choice(page, 'A').locator('.dd-handle'), slot(page, 'first'));
  await expect(state(page)).toHaveText('{"first":"A"}');
  await mouseDrag(page, choice(page, 'A').locator('.dd-handle'), slot(page, 'second'));
  await expect(state(page)).toHaveText('{"first":"A","second":"A"}');
  await expect(page.getByText('Correct answer!', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear Worker one', exact: true }).click();
  await expect(state(page)).toHaveText('{"second":"A"}');
  await mouseDrag(
    page,
    page
      .locator('.dd-slot')
      .filter({ has: slot(page, 'second') })
      .locator('.dd-handle'),
    slot(page, 'first')
  );
  await expect(state(page)).toHaveText('{"first":"A"}');
  const handle = choice(page, 'B').locator('.dd-handle');
  const a = await handle.boundingBox();
  await page.mouse.move(a.x + 20, a.y + 20);
  await page.mouse.down();
  await page.mouse.move(a.x + 50, a.y + 50);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(state(page)).toHaveText('{"first":"A"}');
  await expect(page.locator('.dd-ghost')).toHaveCount(0);
});

test('native tap and keyboard placement preserve inline code and do not expose Select controls', async ({
  page,
}) => {
  await fixture(page, 'drag-drop-inline');
  await expect(page.locator('.dd-template')).toContainText('${{ github.ref }}');
  await choice(page, 'A').locator('.dd-choice-text').focus();
  await page.keyboard.press('Space');
  await slot(page, 'first').focus();
  await page.keyboard.press('Enter');
  await expect(state(page)).toHaveText('{"first":"A"}');
  await choice(page, 'B').locator('.dd-choice-text').click();
  await slot(page, 'second').click();
  await expect(state(page)).toHaveText('{"first":"A","second":"B"}');
  await slot(page, 'first').focus();
  await page.keyboard.press('Delete');
  await expect(state(page)).toHaveText('{"second":"B"}');
  await expect(slot(page, 'first')).toBeFocused();
});

test('StrictMode question/read-only changes cancel an active captured gesture', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await fixture(page);
  const h = await choice(page, 'A').locator('.dd-handle').boundingBox();
  await page.mouse.move(h.x + 20, h.y + 20);
  await page.mouse.down();
  await page.mouse.move(h.x + 70, h.y + 70);
  await expect(page.locator('.dd-ghost')).toBeVisible();
  await page.evaluate(() => window.quizNativeDragFixture.lock(true));
  await page.mouse.up();
  await expect(state(page)).toHaveText('{}');
  await expect(page.locator('.dd-ghost')).toHaveCount(0);
  await expect(page.locator('.drag-drop-answers button')).toHaveCount(0);
  expect(await page.evaluate(() => window.quizNativeDragFixture.changes)).toEqual([]);
});

test('real Practice and both exam modes retain native mappings and lock submitted answers', async ({
  page,
}) => {
  for (const mode of ['practice', 'standard', 'learning']) {
    await page.goto('./#/my-quizzes');
    await page
      .locator('input[type=file]')
      .setInputFiles(
        fileURLToPath(new URL('../../public/examples/quiz-drag-drop-rows.json', import.meta.url))
      );
    await page.getByRole('button', { name: 'Use this quiz', exact: true }).click();
    if (mode === 'practice')
      await page.getByRole('button', { name: 'Start practice', exact: true }).click();
    else {
      await page.getByText('Mock exam', { exact: true }).click();
      if (mode === 'learning')
        await page.getByRole('radio', { name: 'Learning exam', exact: true }).check();
      await page.getByRole('button', { name: 'Start mock exam', exact: true }).click();
    }
    await choice(page, 'A').locator('.dd-choice-text').click();
    if (mode === 'practice') {
      await page.getByRole('button', { name: 'Tiếng Việt', exact: true }).click();
      await expect(page.locator('.dd-status')).toContainText('Đã chọn A');
      await expect(choice(page, 'A').locator('.dd-choice-text')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await page.getByRole('button', { name: 'English', exact: true }).click();
    }
    await slot(page, 'first').click();
    await expect(page.getByText('Correct answer!', { exact: true })).toHaveCount(0);
    await choice(page, 'A').locator('.dd-choice-text').click();
    await slot(page, 'second').click();
    if (mode === 'standard')
      await expect(page.getByText('Correct answer!', { exact: true })).toHaveCount(0);
    else await expect(page.getByText('Correct answer!', { exact: true })).toBeVisible();
    await page.reload();
    await expect(slot(page, 'first')).toContainText('A. Read');
    await expect(slot(page, 'second')).toContainText('A. Read');
    if (mode !== 'practice') {
      await page.getByRole('button', { name: 'Submit exam', exact: true }).click();
      await clickAfterUiMotion(
        page
          .getByRole('dialog', { name: 'Review before submitting', exact: true })
          .getByRole('button', { name: 'Submit and view results', exact: true })
      );
      await expect(page.getByRole('heading', { name: 'Exam results', exact: true })).toBeVisible();
      await expect(page.locator('.drag-drop-answers button')).toHaveCount(0);
    }
  }
});
