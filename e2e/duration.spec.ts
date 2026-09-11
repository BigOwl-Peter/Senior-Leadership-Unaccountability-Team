import { test, expect } from '@playwright/test';

for (const minutes of [10, 20]) {
  test(`${minutes}-minute shift, pause, restore and restart`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Enter executive workspace' })
      .click();
    await page
      .getByRole('button', { name: 'Start shift', exact: true })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'How long do you have?' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel start shift' }).click();
    await page.clock.runFor(5000);
    await expect(page.getByLabel('Session time remaining')).toContainText(
      '20:00',
    );
    await page
      .getByRole('button', { name: 'Start shift', exact: true })
      .click();
    await page
      .getByRole('button', { name: `${minutes} minutes`, exact: true })
      .click();
    await page.clock.runFor(5000);
    await expect(page.getByLabel('Session time remaining')).toContainText(
      minutes === 10 ? '09:55' : '19:55',
    );
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.clock.runFor(5000);
    await page.reload();
    await page
      .getByRole('button', { name: 'Enter executive workspace' })
      .click();
    await expect(page.getByLabel('Session time remaining')).toContainText(
      minutes === 10 ? '09:55' : '19:55',
    );
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page
      .getByRole('button', { name: 'Restart Career', exact: true })
      .click();
    await page.getByRole('button', { name: 'Begin appointment' }).click();
    await page
      .getByRole('button', { name: 'Start shift', exact: true })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'How long do you have?' }),
    ).toBeVisible();
  });
}
