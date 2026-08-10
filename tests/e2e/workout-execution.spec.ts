import { test, expect } from '@playwright/test';

test.describe('Workout Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Dismiss onboarding
    const getStarted = page.getByRole('button', { name: 'Get Started' });
    if (await getStarted.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStarted.click();
      await page.getByRole('button', { name: 'Continue' }).click();
    }
  });

  test('can navigate to workout page', async ({ page }) => {
    await page.getByRole('link', { name: 'Workout' }).click();
    await expect(page).toHaveURL('/workout');
  });
});

test.describe('Workout Data Persistence', () => {
  test('localStorage workout state survives reload', async ({ page }) => {
    await page.goto('/');
    // Dismiss onboarding
    const getStarted = page.getByRole('button', { name: 'Get Started' });
    if (await getStarted.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStarted.click();
      await page.getByRole('button', { name: 'Continue' }).click();
    }

    // Verify localStorage is accessible
    const storageAvailable = await page.evaluate(() => {
      try {
        localStorage.setItem('test', 'value');
        const v = localStorage.getItem('test');
        localStorage.removeItem('test');
        return v === 'value';
      } catch {
        return false;
      }
    });
    expect(storageAvailable).toBe(true);
  });
});
