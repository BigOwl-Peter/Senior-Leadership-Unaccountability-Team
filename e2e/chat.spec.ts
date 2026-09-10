import { test, expect } from '@playwright/test';
test.use({ reducedMotion: 'reduce' });
for (const width of [1366, 390]) {
  test(`messenger is separate from inbox ${width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install();
    await page.goto('/');
    await page
      .getByRole('button', { name: 'Enter executive workspace' })
      .click();
    await page
      .getByRole('button', { name: 'Start shift', exact: true })
      .click();
    await page.clock.runFor(31000);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Chat', exact: true }).click();
    await expect(page.locator('.folder-sidebar')).toBeHidden();
    await expect(page.getByLabel('Search chats')).toBeVisible();
    await page.locator('.chat-contact').last().click();
    await expect(page.locator('.messenger-heading')).toBeVisible();
    await expect(page.locator('.case-actions')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`chat-thread-${width}.png`),
    });
    await page.locator('.case-actions button').first().click();
    await expect(page.locator('.chat-sent')).toContainText('support');
    if (width < 760) await page.getByLabel('Back to chats').click();
    await page.getByLabel('Search chats').fill('not-a-person');
    await expect(page.locator('.chat-contact')).toHaveCount(0);
    await page.getByLabel('Search chats').fill('');
    await page
      .getByRole('button', { name: 'Leadership & teams Group conversation' })
      .click();
    await expect(page.locator('.messenger-heading')).toContainText(
      'Leadership & teams',
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Mail', exact: true }).click();
    await expect(page.locator('.mail-row').first()).toBeVisible();
    await expect(page.locator('.messenger')).toHaveCount(0);
  });
}
