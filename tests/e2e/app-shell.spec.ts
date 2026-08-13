import { test, expect } from '@playwright/test';

test.describe('App Shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Dismiss onboarding if present
    const getStarted = page.getByRole('button', { name: 'Get Started' });
    if (await getStarted.isVisible({ timeout: 2000 }).catch(() => false)) {
      await getStarted.click();
      await page.getByRole('button', { name: 'Continue' }).click();
    }
  });

  test('loads the Today page', async ({ page }) => {
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Today')).toBeVisible();
  });

  test('bottom navigation works', async ({ page }) => {
    await page.getByRole('link', { name: 'Workout' }).click();
    await expect(page).toHaveURL('/workout');

    await page.getByRole('link', { name: 'Programs' }).click();
    await expect(page).toHaveURL('/programs');

    await page.getByRole('link', { name: 'History' }).click();
    await expect(page).toHaveURL('/history');

    await page.getByRole('link', { name: 'Stats' }).click();
    await expect(page).toHaveURL('/analytics');
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();

    await page.getByRole('link', { name: 'Today' }).click();
    await expect(page).toHaveURL('/');
  });

  test('More hub is reachable from Today', async ({ page }) => {
    await page.getByRole('button', { name: 'More' }).click();
    await expect(page).toHaveURL('/more');
    await expect(page.getByRole('heading', { name: 'More' })).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
  });

  test('has proper dark theme', async ({ page }) => {
    const bgColor = await page.locator('body').evaluate(
      el => getComputedStyle(el).backgroundColor
    );
    expect(bgColor).not.toBe('rgb(255, 255, 255)');
  });
});
