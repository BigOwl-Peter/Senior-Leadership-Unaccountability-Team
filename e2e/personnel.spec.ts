import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('employee records, promotion and redundancy update the roster', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page
    .getByRole('button', { name: /^View / })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toContainText('Employment history');
  await page.getByLabel('Close employee record').click();
  await page
    .getByRole('button', { name: /^Promote / })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Confirm promote', exact: true })
    .click();
  await expect(page.locator('.personnel-summary')).toContainText(
    '2 actions this week',
  );
  await page
    .getByRole('button', { name: /^Make .* redundant$/ })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Confirm redundancy', exact: true })
    .click();
  await expect(page.locator('tbody tr')).toHaveCount(60);
  await page.getByLabel('Filter employment status').selectOption('all');
  await expect(page.locator('tbody tr')).toHaveCount(61);
  await expect(page.locator('.employee-status.redundant')).toHaveCount(1);
});

test('recruitment offer arrives at the promised week and appears in office totals', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page.getByRole('tab', { name: 'Recruitment', exact: true }).click();
  await expect(page.locator('.candidate')).toHaveCount(6);
  await page.getByLabel('Recruitment office').selectOption('continental');
  await page.getByLabel('Recruitment department').selectOption('compliance');
  await page
    .getByRole('button', { name: 'Make offer', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Confirm offer', exact: true })
    .click();
  await expect(page.locator('tbody')).toContainText('pending');
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.clock.runFor(60000);
  await expect(page.locator('tbody')).toContainText('joined');
  await expect(page.locator('.personnel-summary')).toContainText('62');
  await page.getByRole('tab', { name: 'Offices', exact: true }).click();
  await expect(page.locator('.office-mandate')).toBeVisible();
  await expect(page.locator('.office-comparisons')).toContainText('30');
});

test('a decision creates a linked follow-up thread', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.locator('.response-option').first().click();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.clock.runFor(46000);
  const followUpId = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('slut-live-save-v2')!);
    return save.session.requests.find(
      (r: { parentRequestId?: string }) => r.parentRequestId,
    )?.id;
  });
  expect(followUpId).toBeTruthy();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const rows = page.locator('.mail-row');
  for (let i = 0; i < (await rows.count()); i++) {
    await rows.nth(i).click();
    const parent = page.getByRole('button', {
      name: 'View the decision that led here',
    });
    if (await parent.count()) {
      await parent.click();
      await expect(page.locator('.request-status')).toHaveText(
        'Decision recorded',
      );
      return;
    }
  }
  throw new Error('Follow-up parent link not found');
});

for (const width of [1366, 390]) {
  test(`personnel layouts ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Enter executive workspace' })
      .click();
    await page.getByRole('button', { name: 'People', exact: true }).click();
    for (const tab of ['Directory', 'Recruitment', 'Offices']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${tab}-${width}.png`),
        fullPage: true,
      });
    }
  });
}
