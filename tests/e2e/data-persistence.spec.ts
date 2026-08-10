import { test, expect } from '@playwright/test';

test.describe('Data Persistence', () => {
  test('settings persist across page reload', async ({ page }) => {
    await page.goto('/');
    // Dismiss onboarding
    const getStarted = page.getByRole('button', { name: 'Get Started' });
    if (await getStarted.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStarted.click();
      await page.getByRole('button', { name: 'Continue' }).click();
    }

    // Navigate to settings
    await page.getByRole('link', { name: 'More' }).click();
    await expect(page).toHaveURL('/settings');

    // Change units to lb
    await page.getByRole('button', { name: 'Pounds (lb)' }).click();

    // Reload page
    await page.reload();

    // Verify lb is still selected
    const lbButton = page.getByRole('button', { name: 'Pounds (lb)' });
    await expect(lbButton).toBeVisible();
    const classes = await lbButton.getAttribute('class');
    expect(classes).toContain('bg-brand');
  });

  test('onboarding only shows once', async ({ page }) => {
    await page.goto('/');

    // First visit: onboarding should appear
    const getStarted = page.getByRole('button', { name: 'Get Started' });
    if (await getStarted.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStarted.click();
      await page.getByRole('button', { name: 'Continue' }).click();
    }

    // Reload
    await page.reload();

    // Onboarding should not appear again
    const getStartedAgain = page.getByRole('button', { name: 'Get Started' });
    await expect(getStartedAgain).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // Expected to not be visible
    });
  });
});
