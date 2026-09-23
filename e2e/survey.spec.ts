import { test, expect } from '@playwright/test';
import { createLiveSession, tickLive } from '../src/game/live';
import { surveyArrival } from '../src/game/staffSurvey';

for (const width of [1366, 390]) {
  test(`Staff Survey discovery, individual rankings and publication ${width}`, async ({
    page,
  }, testInfo) => {
    const session = tickLive(
      { ...createLiveSession('survey-browser'), paused: false },
      surveyArrival('survey-browser') - 1,
    );
    await page.addInitScript(
      (save) => {
        if (!localStorage.getItem('slut-live-save-v2'))
          localStorage.setItem('slut-live-save-v2', JSON.stringify(save));
      },
      { schemaVersion: 2, session, highScores: [] },
    );
    await page.clock.install();
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Enter executive workspace' })
      .click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.clock.runFor(1000);
    await page
      .getByRole('button', { name: 'Review results', exact: true })
      .click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Staff Survey', exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`survey-initial-${width}.png`),
    });
    await expect(
      page.getByRole('region', { name: 'Original survey results' }),
    ).toContainText('Mean stress');
    await page
      .getByRole('button', { name: 'Individuals', exact: true })
      .click();
    await expect(page.locator('.staff-survey tbody tr')).toHaveCount(
      session.game.employees.filter((e) =>
        ['active', 'notice', 'absent'].includes(e.status),
      ).length,
    );
    await page.getByLabel('Filter survey by team').selectOption('hr');
    await expect(page.locator('.staff-survey tbody')).toContainText('HR');
    await page
      .getByRole('radio', { name: /^Publish the happiest half/ })
      .check();
    await expect(page.getByLabel('Report preview')).toContainText(
      'selected listening cohort',
    );
    await page
      .getByRole('button', { name: 'Publish to board', exact: true })
      .click();
    await expect(
      page.getByText('Board report published', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Publish to board', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.clock.runFor(180000);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(
      page.getByRole('region', { name: 'Survey follow-up' }),
    ).toContainText('Current workforce');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`survey-${width}.png`) });
    await page.reload();
    await page
      .getByRole('button', { name: 'Enter executive workspace' })
      .click();
    await page
      .getByRole('button', { name: 'Staff Survey', exact: true })
      .click();
    await expect(
      page.getByText('Board report published', { exact: true }),
    ).toBeVisible();
  });
}
