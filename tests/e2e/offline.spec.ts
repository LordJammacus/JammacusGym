import { test, expect } from '@playwright/test';

test.describe('Offline Behaviour', () => {
  test('app loads and shows content when offline', async ({ page, context }) => {
    // First visit to cache
    await page.goto('/');
    const getStarted = page.getByRole('button', { name: 'Get Started' });
    if (await getStarted.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStarted.click();
      await page.getByRole('button', { name: 'Continue' }).click();
    }
    await expect(page.getByText('Today')).toBeVisible();

    // Go offline
    await context.setOffline(true);

    // Navigate within the app
    await page.getByRole('link', { name: 'Workout' }).click();
    await expect(page).toHaveURL('/workout');

    await page.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL('/history');

    // Restore online
    await context.setOffline(false);
  });

  test('IndexedDB is available for data storage', async ({ page }) => {
    await page.goto('/');
    const getStarted = page.getByRole('button', { name: 'Get Started' });
    if (await getStarted.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStarted.click();
      await page.getByRole('button', { name: 'Continue' }).click();
    }

    const idbAvailable = await page.evaluate(() => {
      return typeof indexedDB !== 'undefined';
    });
    expect(idbAvailable).toBe(true);
  });
});
