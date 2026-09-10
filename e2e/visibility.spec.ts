import { test, expect } from '@playwright/test';
import { createLiveSession, manageLivePersonnel } from '../src/game/live';
test.use({ reducedMotion: 'reduce' });
test('joiners and leavers are named and office counts update on arrival', async ({
  page,
}) => {
  const initial = createLiveSession('visible-movements');
  const candidate = initial.game.candidates.find((c) => c.leadTime === 1)!;
  const session = manageLivePersonnel(initial, {
    type: 'hire',
    candidateId: candidate.id,
    officeId: 'continental',
    departmentId: 'operations',
  });
  session.game.employees[0].status = 'notice';
  session.game.employees[0].departureTurn = 3;
  await page.addInitScript(
    (save) => localStorage.setItem('slut-live-save-v2', JSON.stringify(save)),
    { schemaVersion: 2, session, highScores: [] },
  );
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await expect(
    page.getByLabel('Continental office and workforce'),
  ).toContainText('1 joining');
  await expect(page.getByLabel('Albion office and workforce')).toContainText(
    '1 on notice',
  );
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page.getByRole('tab', { name: 'Movements' }).click();
  await expect(page.locator('.workforce-movements')).toContainText(
    `${candidate.employee.firstName} ${candidate.employee.surname}`,
  );
  await expect(page.locator('.workforce-movements')).toContainText(
    'Leaving / retention possible',
  );
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.clock.runFor(60000);
  await expect(
    page.getByLabel('Continental office and workforce'),
  ).toContainText('0 joining / 1 joined');
  await expect(page.locator('.workforce-movements tbody')).toContainText(
    'Joined',
  );
});
test('office comparison and persistent chat activity badge', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await expect(page.getByLabel('Office comparison')).toContainText('Albion');
  await expect(page.getByLabel('Office comparison')).toContainText(
    'Continental',
  );
  await expect(page.getByLabel('Office comparison')).toContainText(
    'allocated turnover',
  );
  await page.getByRole('button', { name: 'Start shift', exact: true }).click();
  await page.clock.runFor(31000);
  const badge = page
    .getByRole('button', { name: 'Chat', exact: true })
    .locator('b');
  await expect(badge).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await expect(badge).toBeVisible();
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(badge).toHaveCount(0);
  await page.getByRole('button', { name: 'Mail', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Enter executive workspace' }).click();
  await expect(badge).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(20000);
  await expect(badge).toBeVisible();
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await page.getByRole('tab', { name: 'Movements', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Joiners & leavers' }),
  ).toBeVisible();
});
