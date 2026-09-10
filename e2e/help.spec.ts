import { test, expect } from '@playwright/test';

test('guide opens from splash and preserves the workspace pause state', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  const help = page.getByRole('button', { name: 'How to Play', exact: true });
  const dialog = page.getByRole('dialog', { name: 'How to Play' });
  await help.click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('heading', { name: 'Your goals' }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Got it' }).click();
  await expect(help).toBeFocused();
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await page.clock.runFor(700);
  await help.click();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Start shift', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.clock.runFor(2000);
  await help.click();
  const clock = page.getByLabel('Session time remaining');
  const remaining = await clock.textContent();
  await page.clock.runFor(5000);
  await expect(clock).toHaveText(remaining!);
  await dialog.getByRole('button', { name: 'Close how to play' }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
  await page.clock.runFor(2000);
  await expect(clock).not.toHaveText(remaining!);
});
