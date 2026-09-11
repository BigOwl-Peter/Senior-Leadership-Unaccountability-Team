import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });
import { createLiveSession, tickLive } from '../src/game/live';
test('live clock, overlapping requests, team chat and approval', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await expect(
    page.getByRole('button', { name: 'Start shift', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.getByRole('button', { name: '20 minutes', exact: true }).click();
  await page.clock.runFor(5000);
  await expect(
    page
      .locator('.conversation')
      .getByText('Please do not promise next-day delivery.', {
        exact: false,
      }),
  ).toBeVisible();
  await expect(page.getByLabel('Session time remaining')).toContainText(
    '19:55',
  );
  await page.clock.runFor(25000);
  expect(await page.locator('.mail-row').count()).toBeGreaterThan(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const clock = await page.getByLabel('Session time remaining').textContent();
  await page.clock.runFor(10000);
  await expect(page.getByLabel('Session time remaining')).toHaveText(clock!);
  await page.locator('.response-option').nth(1).click();
  await expect(page.locator('.request-status')).toHaveText('Decision recorded');
  await page.getByRole('button', { name: 'Teams', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Operations', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('deadline expiry produces a team decision and popup', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.getByRole('button', { name: '20 minutes', exact: true }).click();
  await page.clock.runFor(55000);
  await expect(page.locator('.request-status')).toHaveText(
    'Team proceeded without approval',
  );
  await expect(page.locator('.conversation')).toContainText(
    'No sign-off received.',
  );
  await expect(
    page.getByLabel('Chat notifications', { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(6000);
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('slut-live-save-v2')!),
  );
  expect(state.session.game.turn).toBe(2);
});
test('delegate, receive decision, and restore paused without offline penalty', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.getByLabel('Delegate to team').selectOption('compliance');
  await page
    .getByRole('button', { name: 'Delegate decision', exact: true })
    .click();
  await expect(page.locator('.delegated-banner')).toContainText(
    'Compliance owns this decision',
  );
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.getByRole('button', { name: '20 minutes', exact: true }).click();
  await page.clock.runFor(13000);
  await expect(page.locator('.conversation')).toContainText(
    'Compliance has taken the decision',
  );
  const elapsed = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('slut-live-save-v2')!).session.elapsed,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await expect(
    page.getByRole('button', { name: 'Resume', exact: true }),
  ).toBeVisible();
  await page.clock.runFor(10000);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('slut-live-save-v2')!).session.elapsed,
    ),
  ).toBe(elapsed);
});
test('impact assessment is one-use, speed control works, and office transfer remains available', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page
    .getByRole('button', { name: 'Request impact assessment', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: 'Impact assessment requested',
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.getByRole('button', { name: '20 minutes', exact: true }).click();
  await page.getByRole('button', { name: '2x', exact: true }).click();
  await page.clock.runFor(5000);
  await expect(page.getByLabel('Session time remaining')).toContainText(
    '09:55',
  );
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page
    .getByRole('button', { name: /^Transfer / })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Confirm transfer', exact: true })
    .click();
  await expect(page.locator('.personnel-summary')).toContainText(
    '2 actions this week',
  );
});
test('real-time session ends automatically and same-seed replay starts cleanly', async ({
  page,
}) => {
  const nearEnd = tickLive(
    { ...createLiveSession('browser-end'), paused: false },
    1197,
  );
  await page.addInitScript(
    (save) => localStorage.setItem('slut-live-save-v2', JSON.stringify(save)),
    { schemaVersion: 2, session: nearEnd, highScores: [] },
  );
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(4000);
  await expect(
    page.getByText('FINAL ASSESSMENT', { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('slut-live-save-v2')!).highScores
          .length,
    ),
  ).toBe(1);
  await page
    .getByRole('button', { name: 'Replay same seed', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Start shift', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Session time remaining')).toContainText(
    '20:00',
  );
  await expect(page.locator('.mail-row')).toHaveCount(1);
});
test('new appointment, search, and corrupt-save recovery', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page
    .getByRole('button', { name: 'New appointment', exact: true })
    .click();
  await page.getByLabel('Session seed').fill('LIVE-NEW');
  await page
    .getByRole('button', { name: 'Begin appointment', exact: true })
    .click();
  await expect(page.locator('footer')).toContainText('LIVE-NEW');
  await page.getByLabel('Search inbox').fill('no-such-subject');
  await expect(page.getByText('Nothing waiting here.')).toBeVisible();
  await page.evaluate(() => localStorage.setItem('slut-live-save-v2', '{bad'));
  await page.reload();
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await expect(page.getByRole('status')).toContainText('could not be loaded');
});
test('the live session works offline after load', async ({ page, context }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.getByRole('button', { name: '20 minutes', exact: true }).click();
  await context.setOffline(true);
  await page.clock.runFor(8000);
  await page.locator('.response-option').first().click();
  await expect(page.locator('.request-status')).toHaveText('Decision recorded');
});
for (const width of [1920, 1366, 768, 390]) {
  test(`live workspace layout ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    await page.clock.install();
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Enter executive workspace' })
      .click();
    await page
      .getByRole('button', { name: 'Start shift', exact: true })
      .click();
    await page.getByRole('button', { name: '20 minutes', exact: true }).click();
    await page.clock.runFor(30000);
    if (width < 760) await page.locator('.mail-row').first().click();
    await expect(page.locator('.response-option').first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      animations: 'disabled',
      path: testInfo.outputPath(`live-${width}.png`),
      fullPage: true,
    });
    await page.locator('.response-option').nth(1).click();
    await expect(page.locator('.request-status')).toHaveText(
      'Decision recorded',
    );
    await page.getByRole('button', { name: 'Reports', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Company performance' }),
    ).toBeVisible();
  });
}
