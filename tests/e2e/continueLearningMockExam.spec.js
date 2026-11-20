import { test, expect } from '@playwright/test';
import { translate } from '../../src/i18n/messages.js';

const quizId = 'aws-aip-c01';
const uid = 'test-alice';

const cases = [
  { width: 320, height: 740, language: 'vi', theme: 'dark' },
  { width: 390, height: 844, language: 'en', theme: 'light' },
  { width: 412, height: 915, language: 'vi', theme: 'light' },
  { width: 768, height: 1024, language: 'en', theme: 'dark' },
  { width: 844, height: 390, language: 'vi', theme: 'dark' },
  { width: 1280, height: 900, language: 'en', theme: 'light' },
];

for (const item of cases) {
  test(`Continue learning opens exam setup at ${item.width}×${item.height}`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== (item.width <= 412 ? 'phone' : 'desktop'));
    const t = (key, params) => translate(item.language, key, params);
    await page.setViewportSize(item);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/*', (route) =>
      new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort()
    );
    await page.addInitScript(
      ({ uid, quizId, language, theme }) => {
        localStorage.setItem('quiz-app-language', language);
        localStorage.setItem('quiz-app-theme', theme);
        localStorage.setItem('quiz-e2e-auth', JSON.stringify({ uid, displayName: 'Test account' }));
        localStorage.setItem(
          `quiz-e2e-profile:${uid}`,
          JSON.stringify({ quizProgress: { [quizId]: { questionIndex: 1, savedAt: 1 } } })
        );
      },
      { uid, quizId, language: item.language, theme: item.theme }
    );
    await page.goto('./#/library');
    const card = page.getByRole('region', { name: t('Continue learning'), exact: true });
    const resume = card.getByRole('button', { name: t('Resume'), exact: true });
    const mockExam = card.getByRole('button', { name: t('Mock exam'), exact: true });
    await expect(resume).toBeVisible();
    await resume.focus();
    await page.keyboard.press('Tab');
    await expect(mockExam).toBeFocused();
    for (const button of [resume, mockExam]) {
      const box = await button.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(item.width);
      if (item.width <= 412) expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await card.screenshot({ path: info.outputPath('continue-learning.png') });
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/quiz\/aws-aip-c01\?mode=exam$/);
    await expect(page.locator('#study-count')).toHaveValue('75');
    await expect(page.locator('#study-time')).toHaveValue('180');
    await expect(
      page.getByRole('button', { name: t('Start mock exam'), exact: true })
    ).toBeEnabled();
    expect(
      await page.evaluate(
        (key) => sessionStorage.getItem(key),
        `quiz-study-v1:${uid}:${quizId}:exam`
      )
    ).toBeNull();
  });
}
