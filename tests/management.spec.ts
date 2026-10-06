import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function navigate(page: Page, name: 'Add an Entry' | 'My Library' | 'My Taste') {
  const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
  const navigation = await mobileNavigation.isVisible()
    ? mobileNavigation
    : page.getByRole('navigation', { name: 'Main navigation', exact: true });
  await navigation.getByRole('link', { name: new RegExp(`^${name}(?:\\s+\\d+)?$`) }).click();
}

async function readSavedJournal(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('still-journal-v1')!));
}

async function addWork(page: Page, title: string, reaction = 'Liked') {
  await navigate(page, 'Add an Entry');
  await page.getByRole('radio', { name: 'Movie', exact: true }).check();
  await page.getByLabel(/^Title/).fill(title);
  await page.getByLabel(/^Creator/).fill('Mira Chen');
  await page.getByLabel(/^Year/).fill('2024');
  await page.getByLabel('Entry date', { exact: true }).fill('2026-08-01');
  await page.getByLabel(/^Reaction/).selectOption({ label: reaction });
  await page.getByLabel(/^Notes/).fill('The first watch felt warm.');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true, level: 1 })).toBeVisible();
}

test('preserves changing dated reactions through editing and deleting individual entries', async ({ page }) => {
  await page.goto('/');
  await addWork(page, 'A quiet evening');
  const originalJournal = await readSavedJournal(page);
  await page.getByRole('link', { name: 'Add another entry', exact: true }).click();
  await expect(page.getByLabel(/^Title/)).toHaveValue('A quiet evening');
  await expect(page.getByLabel(/^Title/)).toHaveAttribute('readonly', '');
  await expect(page.getByLabel(/^Creator/)).toHaveAttribute('readonly', '');
  await expect(page.getByLabel(/^Year/)).toHaveAttribute('readonly', '');
  await expect(page.getByRole('radio', { name: 'Movie', exact: true })).toBeDisabled();
  await page.getByLabel('Entry date', { exact: true }).fill('2026-09-14');
  await page.getByLabel(/^Reaction/).selectOption({ label: 'Mixed feelings' });
  await page.getByLabel(/^Notes/).fill('A slower second watch.');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await expect(page.getByRole('article').first()).toContainText('September 14, 2026');
  const beforeEdit = await readSavedJournal(page);
  expect(beforeEdit.works).toHaveLength(1);
  expect(beforeEdit.entries[0]).toEqual(originalJournal.entries[0]);
  expect(beforeEdit.entries[1]).toMatchObject({ date: '2026-09-14', reaction: 'mixed' });

  await navigate(page, 'My Taste');
  // Taste statistics count the most recent experienced reaction for each work.
  await expect(page.getByRole('article').filter({ hasText: 'Currently liked' }).locator('strong')).toHaveText('0');
  await navigate(page, 'My Library');
  await page.getByRole('link', { name: /A quiet evening/ }).click();
  await page.getByRole('article').filter({ hasText: 'September 14, 2026' })
    .getByRole('link', { name: 'Edit entry', exact: true }).click();
  await expect(page.getByLabel(/^Notes/)).toHaveValue('A slower second watch.');
  await page.getByLabel(/^Title/).fill('A quiet evening, reconsidered');
  await page.getByLabel(/^Notes/).fill('Different after a second viewing.');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A quiet evening, reconsidered', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'August 1, 2026' })).toContainText('The first watch felt warm.');
  await expect(page.getByRole('article').filter({ hasText: 'September 14, 2026' })).toContainText('Different after a second viewing.');
  await page.reload();
  await expect(page.getByRole('article')).toHaveCount(2);
  const afterEdit = await readSavedJournal(page);
  expect(afterEdit.works[0]).toMatchObject({ id: originalJournal.works[0].id, title: 'A quiet evening, reconsidered' });
  expect(afterEdit.entries[0]).toEqual(originalJournal.entries[0]);
  expect(afterEdit.entries[1]).toMatchObject({ date: '2026-09-14', reaction: 'mixed', notes: 'Different after a second viewing.' });

  const newerDeleteTrigger = page.getByRole('article').filter({ hasText: 'September 14, 2026' })
    .getByRole('button', { name: 'Delete entry', exact: true });
  await newerDeleteTrigger.click();
  const entryDialog = page.getByRole('dialog', { name: 'Delete this entry?', exact: true });
  await expect(entryDialog).toBeVisible();
  await expect(entryDialog.getByRole('button', { name: 'Keep it', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(newerDeleteTrigger).toBeFocused();
  await expect(page.getByRole('article')).toHaveCount(2);
  expect(await readSavedJournal(page)).toEqual(afterEdit);

  await page.getByRole('article').filter({ hasText: 'September 14, 2026' })
    .getByRole('button', { name: 'Delete entry', exact: true }).click();
  await entryDialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('article')).toContainText('August 1, 2026');
  await expect(page.getByRole('article')).toContainText('Liked');
  const afterDelete = await readSavedJournal(page);
  expect(afterDelete.works).toHaveLength(1);
  expect(afterDelete.entries).toEqual(originalJournal.entries);
  await navigate(page, 'My Taste');
  await expect(page.getByRole('article').filter({ hasText: 'Currently liked' }).locator('strong')).toHaveText('1');
  await navigate(page, 'My Library');
  await page.getByRole('link', { name: /A quiet evening, reconsidered/ }).click();
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await entryDialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page).toHaveURL(/#\/library$/);
  await expect(page.getByRole('link', { name: /A quiet evening, reconsidered/ })).toHaveCount(0);
  expect(await readSavedJournal(page)).toMatchObject({ works: [], entries: [] });
});

test('confirms whole-item deletion and removes all of its dated entries', async ({ page }) => {
  await page.goto('/');
  await addWork(page, 'Two viewing moments');
  await page.getByRole('link', { name: 'Add another entry', exact: true }).click();
  await page.getByLabel('Entry date', { exact: true }).fill('2026-09-14');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  const originalJournal = await readSavedJournal(page);
  await page.getByRole('button', { name: 'Delete item', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this item?', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep it', exact: true }).click();
  expect(await readSavedJournal(page)).toEqual(originalJournal);
  await page.getByRole('button', { name: 'Delete item', exact: true }).click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page).toHaveURL(/#\/library$/);
  expect(await readSavedJournal(page)).toMatchObject({ works: [], entries: [] });
  await page.reload();
  await expect(page.getByRole('link', { name: /Two viewing moments/ })).toHaveCount(0);
});

test('records an experienced work without requiring a reaction', async ({ page }) => {
  await page.goto('/');
  await addWork(page, 'A feeling without a name', 'No reaction');
  await expect(page.getByRole('article')).toContainText('Experienced');
  await expect(page.getByRole('article')).toContainText('No reaction recorded');
  expect((await readSavedJournal(page)).entries[0]).toMatchObject({ status: 'experienced', reaction: null });
  await page.reload();
  await expect(page.getByRole('article')).toContainText('No reaction recorded');
});

test('keeps corrupt saved data intact and blocks writing over it', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('still-journal-v1', '{broken journal'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Your original data has been kept');
  await navigate(page, 'Add an Entry');
  await page.getByLabel(/^Title/).fill('Do not overwrite my existing journal');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: /needs recovery/ })).toBeVisible();
  await expect(page.getByLabel(/^Title/)).toHaveValue('Do not overwrite my existing journal');
  expect(await page.evaluate(() => localStorage.getItem('still-journal-v1'))).toBe('{broken journal');
  await expect(page).not.toHaveURL(/#\/item\//);
});

test('keeps samples separate and copies only work metadata into a personal entry', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sample library', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Sample data notice', exact: true })).toContainText('fictional notes');
  await expect(page.locator('a[href^="#/sample/"]')).toHaveCount(6);
  expect(await page.evaluate(() => localStorage.getItem('still-journal-v1'))).toBeNull();
  await page.getByRole('link', { name: /Past Lives/ }).click();
  await expect(page).toHaveURL(/#\/sample\/sample-past-lives$/);
  await expect(page.getByText('Sample data', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit entry', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete entry', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('still-journal-v1'))).toBeNull();
  await page.getByRole('link', { name: 'Add to my journal', exact: true }).click();
  await expect(page.getByLabel(/^Title/)).toHaveValue('Past Lives');
  await expect(page.getByLabel(/^Creator/)).toHaveValue('Celine Song');
  await expect(page.getByLabel(/^Year/)).toHaveValue('2023');
  await expect(page.getByRole('radio', { name: 'Movie', exact: true })).toBeChecked();
  await expect(page.getByLabel(/^Reaction/)).toHaveValue('');
  await expect(page.getByLabel(/^Notes/)).toHaveValue('');
  await expect(page.getByLabel(/^Tags/)).toHaveValue('');
  await expect(page.getByRole('checkbox', { name: /^Keep on my explore list/ })).not.toBeChecked();
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  await expect(page.getByLabel('Entry date', { exact: true })).toHaveValue(today);
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page).toHaveURL(/#\/item\/(?!sample-)[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Past Lives', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('No reaction recorded');
  const personalJournal = await readSavedJournal(page);
  expect(personalJournal.works).toHaveLength(1);
  expect(personalJournal.entries).toHaveLength(1);
  expect(personalJournal.works[0]).toMatchObject({ type: 'movie', title: 'Past Lives', creator: 'Celine Song', year: '2023' });
  expect(personalJournal.works[0].id).not.toBe('sample-past-lives');
  expect(personalJournal.entries[0]).toMatchObject({ date: today, reaction: null, notes: '', tags: [], toExplore: false });
  await navigate(page, 'My Taste');
  await expect(page.getByRole('article').filter({ hasText: 'Works collected' }).locator('strong')).toHaveText('1');
  await expect(page.getByRole('article').filter({ hasText: 'Currently liked' }).locator('strong')).toHaveText('0');
  await page.getByRole('button', { name: 'Sample library', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: 'Works collected' }).locator('strong')).toHaveText('6');
  await expect(page.getByRole('article').filter({ hasText: 'Currently liked' }).locator('strong')).toHaveText('4');
  await page.getByRole('button', { name: 'My entries', exact: true }).click();
  await expect(page.getByRole('article').filter({ hasText: 'Works collected' }).locator('strong')).toHaveText('1');
  expect(await readSavedJournal(page)).toEqual(personalJournal);
});

test('searches metadata and historical tags and combines medium and status filters', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sample library', exact: true }).click();
  const cards = page.locator('a[href^="#/sample/"]');
  const search = page.getByRole('searchbox', { name: 'Search works, creators, or tags', exact: true });
  const status = page.getByRole('combobox', { name: 'Filter by status', exact: true });
  await expect(cards).toHaveCount(6);
  await search.fill('Wassily');
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Composition VIII');
  await search.fill('atmospheric');
  await expect(cards).toHaveCount(2);
  await expect(page.getByRole('link', { name: /In Rainbows/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Space Song/ })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).click();
  await status.selectOption({ label: 'Saved only' });
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Nighthawks');
  await status.selectOption({ label: 'Liked' });
  await expect(cards).toHaveCount(4);
  await expect(page.getByRole('link', { name: /In Rainbows/ })).toHaveCount(0);
  await status.selectOption({ label: 'To explore' });
  await expect(cards).toHaveCount(2);
  await page.getByRole('group', { name: 'Filter by medium', exact: true })
    .getByRole('button', { name: 'Movies', exact: true }).click();
  await expect(cards).toHaveCount(0);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(cards).toHaveCount(6);
  await expect(search).toHaveValue('');
  await expect(status).toHaveValue('all');
  await page.getByRole('group', { name: 'Filter by medium', exact: true })
    .getByRole('button', { name: 'Movies', exact: true }).click();
  await status.selectOption({ label: 'Liked' });
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText('Past Lives');
  expect(await page.evaluate(() => localStorage.getItem('still-journal-v1'))).toBeNull();
});

test('rejects a stale tab save and preserves both the newer saved entry and the older draft', async ({ page, context }) => {
  await page.goto('/');
  const staleTab = await context.newPage();
  await staleTab.goto('/');
  await navigate(staleTab, 'Add an Entry');
  await staleTab.getByLabel(/^Title/).fill('A draft from another tab');
  await staleTab.getByLabel(/^Notes/).fill('Keep these words when the other tab changes.');
  await addWork(page, 'The saved entry from the first tab');
  const savedJournal = await readSavedJournal(page);
  await staleTab.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(staleTab.getByRole('alert')).toContainText('Your journal changed in another tab');
  await expect(staleTab.getByLabel(/^Title/)).toHaveValue('A draft from another tab');
  await expect(staleTab.getByLabel(/^Notes/)).toHaveValue('Keep these words when the other tab changes.');
  expect(await readSavedJournal(staleTab)).toEqual(savedJournal);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The saved entry from the first tab', exact: true, level: 1 })).toBeVisible();
});

test('skip-to-content moves keyboard focus without losing the route or form draft', async ({ page }) => {
  await page.goto('/');
  await navigate(page, 'Add an Entry');
  await page.getByLabel(/^Title/).fill('My current draft');
  const route = page.url();
  const skipLink = page.getByRole('link', { name: 'Skip to content', exact: true });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveURL(route);
  await expect(page.getByLabel(/^Title/)).toHaveValue('My current draft');
});

test('fits the four primary screens in a 320-pixel mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /My Library/, level: 1 })).toBeVisible();
  const assertFits = async () => {
    const size = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    }));
    expect(size.content).toBeLessThanOrEqual(size.viewport);
  };
  await assertFits();
  await navigate(page, 'Add an Entry');
  await expect(page.getByLabel(/^Title/)).toBeVisible();
  await assertFits();
  await page.getByLabel(/^Title/).fill('A mobile moment');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A mobile moment', exact: true, level: 1 })).toBeVisible();
  await assertFits();
  await navigate(page, 'My Taste');
  await expect(page.getByRole('heading', { name: /My Taste/, level: 1 })).toBeVisible();
  await assertFits();
});
