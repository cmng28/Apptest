import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function navigate(page: Page, name: 'Add an Entry' | 'My Library') {
  const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
  const navigation = await mobileNavigation.isVisible()
    ? mobileNavigation
    : page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await navigation.getByRole('link', { name: new RegExp(`^${name}(?:\\s+\\d+)?$`) }).click();
}

test('adds an experienced movie and retrieves the same entry after a reload', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Add an Entry');
  await page.getByRole('radio', { name: 'Movie', exact: true }).check();
  await page.getByLabel(/^Title/).fill('A quiet evening');
  await page.getByLabel(/^Creator/).fill('Mira Chen');
  await page.getByLabel(/^Year/).fill('2024');
  await page.getByLabel('Entry date', { exact: true }).fill('2026-09-14');
  await page.getByRole('radio', { name: /^Experienced/ }).check();
  await page.getByLabel(/^Reaction/).selectOption({ label: 'Liked' });
  await page.getByRole('checkbox', { name: /^Keep on my explore list/ }).check();
  await page.getByLabel(/^Tags/).fill('slow cinema, light');
  await page.getByLabel(/^Notes/).fill('The ending stayed with me.');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();

  await expect(page).toHaveURL(/#\/item\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'A quiet evening', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText('Mira Chen', { exact: true })).toBeVisible();
  await expect(page.getByText('The ending stayed with me.', { exact: true })).toBeVisible();
  await expect(page.getByText('#slow cinema', { exact: true })).toBeVisible();
  await expect(page.getByText('#light', { exact: true })).toBeVisible();
  await expect(page.getByText('September 14, 2026', { exact: true })).toBeVisible();
  await expect(page.getByText('To explore', { exact: true })).toBeVisible();
  await expect(page.getByText('Experienced', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Liked', { exact: true }).first()).toBeVisible();

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('still-journal-v1')!));
  expect(stored.works).toHaveLength(1);
  expect(stored.entries).toHaveLength(1);
  expect(stored.works[0]).toMatchObject({ type: 'movie', title: 'A quiet evening', creator: 'Mira Chen', year: '2024' });
  expect(stored.works[0]).not.toHaveProperty('reaction');
  expect(stored.entries[0]).toMatchObject({
    workId: stored.works[0].id, date: '2026-09-14', status: 'experienced', reaction: 'liked',
    toExplore: true, tags: ['slow cinema', 'light'], notes: 'The ending stayed with me.',
  });

  await page.reload();
  await expect(page.getByRole('heading', { name: 'A quiet evening', exact: true, level: 1 })).toBeVisible();
  await navigate(page, 'My Library');
  await page.getByRole('link', { name: /A quiet evening/ }).click();
  await expect(page.getByRole('heading', { name: 'A quiet evening', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText('The ending stayed with me.', { exact: true })).toBeVisible();
});

test('can save an item for later without a reaction', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Add an Entry');
  await page.getByLabel(/^Title/).fill('One for a rainy day');
  await page.getByRole('radio', { name: /^Saved for later/ }).check();
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'One for a rainy day', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText('Saved for later', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Liked', { exact: true })).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('still-journal-v1')!));
  expect(stored.entries[0]).toMatchObject({ status: 'saved', reaction: null });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'One for a rainy day', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText('Saved for later', { exact: true }).first()).toBeVisible();
});

test('preserves the form and reports a storage failure instead of pretending to save', async ({ page }) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'still-journal-v1') {
        throw new DOMException('Storage quota exhausted for test', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  });
  await page.goto('/');
  await navigate(page, 'Add an Entry');
  await page.getByLabel(/^Title/).fill('An unsaved entry');
  await page.getByLabel(/^Notes/).fill('Please keep my draft.');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();

  await expect(page.getByRole('alert')).toContainText(/save|storage/i);
  await expect(page.getByLabel(/^Title/)).toHaveValue('An unsaved entry');
  await expect(page.getByLabel(/^Notes/)).toHaveValue('Please keep my draft.');
  await expect(page.getByRole('button', { name: 'Save entry', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('still-journal-v1'))).toBeNull();
  await navigate(page, 'My Library');
  await expect(page.getByRole('link', { name: /An unsaved entry/ })).toHaveCount(0);
});
