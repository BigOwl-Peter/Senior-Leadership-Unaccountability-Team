import { test, expect } from '@playwright/test';
test.use({ reducedMotion: 'reduce' });
for (const width of [1366, 390]) {
  test(`team member opens matching employee record ${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Enter executive workspace' })
      .click();
    await page.getByRole('button', { name: 'Teams', exact: true }).click();
    await page.locator('.team-mandate summary').click();
    const member = page.locator('.team-mandate .person-name').first();
    const name = (await member.textContent())!.trim();
    await member.click();
    await expect(page.getByRole('dialog')).toContainText(name);
    await expect(page.getByRole('dialog')).toContainText('Employment history');
    await page.screenshot({
      path: testInfo.outputPath(`profile-${width}.png`),
    });
    await page.getByLabel('Close employee record').click();
    await page.getByRole('button', { name: 'Teams', exact: true }).click();
    await page.locator('.team-mandate summary').click();
    const second = page.locator('.team-mandate .person-name').nth(1);
    const nextName = (await second.textContent())!.trim();
    await second.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toContainText(nextName);
    await page.getByLabel('Close employee record').click();
    await page.getByRole('button', { name: 'Mail', exact: true }).click();
    await page.getByRole('button', { name: 'People', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}
