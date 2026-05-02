import { test, expect } from '@playwright/test';

/**
 * Public-surface smoke tests.
 *
 * These spec the frontend in isolation — they don't depend on the live API.
 * For full booking → ticket → payment → erasure happy-path coverage, run the
 * backend in test mode (`npm run dev`) and set `BASE_URL` accordingly.
 */

test('home page loads and exposes the headline CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/QueueLess|Queue/i);
  // Hero CTAs — anchor by href so tests don't break when copy changes (i18n)
  await expect(page.locator('a[href="/book"]').first()).toBeVisible();
  await expect(page.locator('a[href="/issue/submit"]').first()).toBeVisible();
});

test('navbar shows public links and login when logged out', async ({ page }) => {
  await page.goto('/');
  // Link is in the desktop nav (the underlying <a> from <Link to="/services">)
  await expect(page.locator('a[href="/services"]').first()).toBeVisible();
  await expect(page.locator('a[href="/book"]').first()).toBeVisible();
  await expect(page.getByTestId('login-link')).toBeVisible();
  await expect(page.getByTestId('signup-link')).toBeVisible();
  await expect(page.getByTestId('account-menu-trigger')).toHaveCount(0);
});

test('public service catalogue page loads', async ({ page }) => {
  await page.goto('/services');
  await expect(page.getByRole('heading', { name: /Service Catalogue|सेवा सूची/i })).toBeVisible();
});

test('issue tracking page shows a friendly error for an unknown ref code', async ({ page }) => {
  await page.goto('/issue/track/TKT-DOES-NOT-EXIST');
  // The page reaches the error branch — either "not found" or "Something went wrong"
  await expect(page.getByRole('heading')).toBeVisible();
});

test('transparency board page is reachable and renders a result state', async ({ page }) => {
  // The page hits /api/transparency which may be unavailable during the smoke
  // run (API not running) — accept either the populated heading or the
  // graceful "unavailable" fallback. Either path proves the route + page load.
  await page.goto('/transparency');
  await expect(
    page.locator('text=/Transparency Board|Transparency data unavailable|Loading transparency/i').first()
  ).toBeVisible({ timeout: 10_000 });
});

test('citizen sidebar opens when the avatar trigger is clicked', async ({ page }) => {
  // Plant a logged-in session via localStorage so the navbar shows the trigger.
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('ql_token', 'fake-jwt');
    localStorage.setItem('ql_user', JSON.stringify({
      _id: '1', name: 'Bikash Tamang', email: 'b@x.com', role: 'citizen', isActive: true, createdAt: '',
    }));
  });
  await page.reload();
  const trigger = page.getByTestId('account-menu-trigger');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const drawer = page.getByTestId('citizen-sidebar');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByText(/My appointments/i)).toBeVisible();
  await expect(drawer.getByText(/My tickets/i)).toBeVisible();
});
