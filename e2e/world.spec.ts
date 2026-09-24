import { test, expect } from '@playwright/test';
import { createLiveSession, tickLive } from '../src/game/live';
import { enterCareer } from '../src/world/engine';
import { startShift } from '../src/game/sessionTiming';

test('travels through the office to attend all three meeting rounds', async ({
  page,
}, testInfo) => {
  const state = tickLive(
    enterCareer(
      startShift(createLiveSession('meeting-browser'), 20),
      'diplomat',
      'bdm',
      'Sam',
    ),
    115,
  );
  state.world!.office = 'continental';
  await page.addInitScript(
    (s) =>
      localStorage.setItem(
        'slut-world-save-v1',
        JSON.stringify({ schemaVersion: 2, session: s, highScores: [] }),
      ),
    state,
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume career' }).click();
  await page.getByRole('button', { name: 'Find meeting room' }).click();
  const meeting = page.getByRole('dialog', {
    name: 'S.L.U.T. leadership meeting',
  });
  await expect(meeting).toBeVisible({ timeout: 15000 });
  await meeting
    .getByRole('button', { name: 'Take your seat (+25 points)' })
    .click();
  await expect(
    meeting.getByText('Round 1: Who owns the promise?'),
  ).toBeVisible();
  await meeting.locator('.politics-choices button').nth(2).click();
  await meeting.locator('.politics-choices button').nth(0).click();
  await meeting.locator('.politics-choices button').nth(1).click();
  await expect(meeting.getByText(/Meeting complete/)).toBeVisible();
  await expect(page.locator('.politics-bonus')).toContainText('+70');
  await page.screenshot({ path: testInfo.outputPath('meeting.png') });
});

test('walks to the CEO suite and answers Radish in person', async ({
  page,
}, testInfo) => {
  const state = tickLive(
    enterCareer(
      startShift(createLiveSession('radish-browser'), 20),
      'operator',
      'specialists',
      'Zanele',
    ),
    90,
  );
  await page.addInitScript(
    (s) =>
      localStorage.setItem(
        'slut-world-save-v1',
        JSON.stringify({ schemaVersion: 2, session: s, highScores: [] }),
      ),
    state,
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume career' }).click();
  await page.getByRole('button', { name: 'Find CEO team' }).click();
  const ceo = page.getByRole('dialog', { name: 'Parent company / CEO Team' });
  await expect(ceo).toBeVisible({ timeout: 15000 });
  await expect(
    ceo.getByRole('img', { name: 'Radish / CEO Team' }),
  ).toBeVisible();
  await ceo.getByRole('button', { name: /Get Radish to sign/ }).click();
  await expect(ceo.getByText(/Radish signed the scope/)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('radish-dialog.png') });
  await page
    .getByRole('button', { name: 'Close Parent company / CEO Team' })
    .click();
  await page.screenshot({ path: testInfo.outputPath('ceo-suite.png') });
});

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
    await expect(page.getByText('Appointment length')).toHaveCount(0);
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
test('stock room can be reached and shows live inventory', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Accept appointment' }).click();
  await expect(page.getByText('ONGOING CAREER')).toBeVisible();
  await page.getByRole('button', { name: 'Find stock room' }).click();
  const stock = page.getByRole('dialog', { name: 'London stock and dispatch' });
  await expect(stock).toBeVisible({ timeout: 15000 });
  await expect(stock.getByText('Stock on hand')).toBeVisible();
  await expect(stock.getByText('180 units', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('stock-room.png') });
  await stock
    .getByRole('button', { name: 'Open logistics correspondence' })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Executive laptop' }),
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
  await page
    .locator('.world-matters button')
    .filter({ hasText: 'Preferred supplier' })
    .click();
  await expect(page.locator('.world-conversation')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('.world-choices button')).toHaveCount(3);
});
