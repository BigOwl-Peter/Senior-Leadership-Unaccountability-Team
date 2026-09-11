import { test, expect } from '@playwright/test';

test('splash, audio routing, mute persistence and paused home navigation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const played: string[] = [];
    Object.assign(window, { played });
    HTMLMediaElement.prototype.play = function () {
      played.push(this.src);
      return Promise.resolve();
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      played.push(`notification:${this.buffer?.duration}`);
      return start.apply(this, args);
    };
  });
  await page.clock.install();
  await page.goto('/');
  await expect(page.locator('.splash-wallpaper')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Start shift', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await expect(page.locator('.splash-entering')).toBeVisible();
  await page.clock.runFor(700);
  await page.getByRole('button', { name: 'Mute music', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Unmute music', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.getByRole('button', { name: '20 minutes', exact: true }).click();
  await page.clock.runFor(30000);
  const played = await page.evaluate(
    () => (window as unknown as { played: string[] }).played,
  );
  expect(played.some((s) => s.endsWith('background_music.mp3'))).toBe(true);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const sounds = (window as unknown as { played: string[] }).played;
        return new Set(sounds.filter((s) => s.startsWith('notification:')))
          .size;
      }),
    )
    .toBe(2);
  await page
    .getByRole('button', { name: 'Pause and return to splash screen' })
    .click();
  const elapsed = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('slut-live-save-v2')!).session.elapsed,
  );
  await page.clock.runFor(5000);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('slut-live-save-v2')!).session.elapsed,
    ),
  ).toBe(elapsed);
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.clock.runFor(700);
  await expect(
    page.getByRole('button', { name: 'Resume', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Unmute music', exact: true }),
  ).toBeVisible();
});

for (const width of [1366, 390]) {
  test(`splash assets and layout ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.locator('.splash-wallpaper')).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('.splash-wallpaper')
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`splash-${width}.png`) });
    await page
      .getByRole('button', { name: 'Enter executive workspace' })
      .click();
    await expect(page.locator('.suite-logo img')).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('.suite-logo img')
          .evaluate(
            (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
          ),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`game-${width}.png`) });
    for (const name of [
      'background_music.mp3',
      'email_notification.mp3',
      'chat_notification.mp3',
    ]) {
      const response = await page.request.get(`/media/${name}`);
      expect(response.ok()).toBe(true);
      expect((await response.body()).length).toBeGreaterThan(1000);
    }
  });
}
