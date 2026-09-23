import { test, expect } from '@playwright/test';
import { createLiveSession, tickLive } from '../src/game/live';
import { enterCareer } from '../src/world/engine';
import { startShift } from '../src/game/sessionTiming';

for (const width of [1440, 390]) {
  test(`world starts, moves and opens the real laptop ${width}`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Welcome to the top.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Accept appointment' }).click();
    await expect(page.getByLabel('Career status')).toContainText('London');
    await expect
      .poll(() =>
        page
          .locator('.world-canvas canvas')
          .evaluate((canvas: HTMLCanvasElement) => {
            const ctx = canvas.getContext('2d')!;
            const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            const colors = new Set<number>();
            for (let i = 0; i < d.length; i += 400)
              colors.add(d[i] * 65536 + d[i + 1] * 256 + d[i + 2]);
            return colors.size;
          }),
      )
      .toBeGreaterThan(20);
    await page.waitForTimeout(900);
    const position = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('slut-world-save-v1')!).session.world
            .position,
      );
    const before = await position();
    await page.keyboard.down('d');
    await page.waitForTimeout(900);
    await page.keyboard.up('d');
    await page.waitForTimeout(900);
    expect((await position()).x).toBeGreaterThan(before.x + 40);
    await page.screenshot({ path: testInfo.outputPath(`office-${width}.png`) });
    await page.getByRole('button', { name: /Open laptop/ }).click();
    await expect(
      page.getByRole('dialog', { name: 'Executive laptop' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Chat', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Chat', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close Executive laptop' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Executive laptop' }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
}
test('click-to-walk travel and flight arrive at the other office', async ({
  page,
}, testInfo) => {
  test.setTimeout(65000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Accept appointment' }).click();
  await page.getByRole('button', { name: 'Find travel desk' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Executive travel desk' }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Board flight' }).click();
  await expect(page.locator('.world-flight')).toContainText('CPT');
  await page.getByRole('button', { name: 'Open cabin laptop' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Executive laptop' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close Executive laptop' }).click();
  await expect(page.locator('.world-flight')).toHaveCount(0, {
    timeout: 40000,
  });
  await expect(page.locator('.world-location')).toContainText('Cape Town');
  await page.screenshot({ path: testInfo.outputPath('cape-town.png') });
  await page.reload();
  await expect(page.locator('.world-location')).toContainText('Cape Town');
  await expect(
    page.getByRole('button', { name: 'Resume career' }),
  ).toBeVisible();
});
test('MD orders and staff conversations change career metrics', async ({
  page,
}) => {
  const state = tickLive(
    enterCareer(
      startShift(createLiveSession('world-browser'), 20),
      'auditor',
      'operations',
      'Charlie',
    ),
    31,
  );
  await page.addInitScript((s) => {
    if (!localStorage.getItem('slut-world-save-v1'))
      localStorage.setItem(
        'slut-world-save-v1',
        JSON.stringify({ schemaVersion: 2, session: s, highScores: [] }),
      );
  }, state);
  await page.goto('/');
  await page.getByRole('button', { name: /Answer directive/ }).click();
  await expect(page.locator('.world-conversation')).toBeVisible();
  const before = state.game.metrics.accountability;
  await page.locator('.world-choices button').nth(1).click();
  await expect(page.locator('.world-conversation')).toContainText(
    'A paper trail',
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('slut-world-save-v1')!).session.game
          .metrics.accountability,
    ),
  ).toBeLessThan(before);
  await page.getByRole('button', { name: 'Back to the office' }).click();
  await page.getByRole('button', { name: 'Resume career' }).click();
  await page.locator('.world-matters button').first().click();
  await expect(page.locator('.world-conversation')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('.world-choices button')).toHaveCount(3);
});
