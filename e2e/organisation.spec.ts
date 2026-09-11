import { test, expect } from '@playwright/test';
test.use({ reducedMotion: 'reduce' });

test('employee chat decisions and group mandates are usable and saved', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.getByRole('button', { name: '20 minutes', exact: true }).click();
  await page.clock.runFor(31000);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.locator('.employee-case')).toHaveCount(1);
  await page.locator('.case-actions button').first().click();
  await expect(page.locator('.employee-case')).toContainText(
    'Recorded: support',
  );
  await page.getByRole('button', { name: 'Teams', exact: true }).click();
  await page.getByLabel('Team mandate').selectOption('quality');
  await expect(page.getByLabel('Team mandate')).toBeDisabled();
  await page.locator('.team-mandate summary').click();
  expect(await page.locator('.team-mandate li').count()).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(46000);
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.locator('.case-outcome').first()).toContainText(
    'Action completed',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.locator('.case-outcome').first()).toContainText(
    'Action completed',
  );
  await page
    .getByRole('button', { name: 'Restart Career', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Begin appointment', exact: true })
    .click();
  await expect(page.getByLabel('Session time remaining')).toContainText(
    '20:00',
  );
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.locator('.employee-case')).toHaveCount(0);
});

for (const width of [1366, 390]) {
  test(`organisation screens ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install();
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Enter executive workspace' })
      .click();
    await page
      .getByRole('button', { name: 'Start shift', exact: true })
      .click();
    await page.getByRole('button', { name: '20 minutes', exact: true }).click();
    await page.clock.runFor(31000);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    for (const view of ['Chat', 'Teams', 'Reports']) {
      await page.getByRole('button', { name: view, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${view}-${width}.png`),
      });
    }
  });
}
