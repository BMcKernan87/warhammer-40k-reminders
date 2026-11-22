import { test, expect, type Page } from '@playwright/test';
async function choose(page: Page, label: string, name: string) {
  const field = page.getByRole('combobox', { name: label, exact: true });
  await field.click();
  await field.fill(name);
  await page.getByRole('option', { name, exact: true }).click();
}
async function add(page: Page, name: string, count = 1) {
  await choose(page, 'Datasheet', name);
  if (count !== 1) await choose(page, 'Unit copies', String(count));
  await page.getByRole('button', { name: 'Add unit', exact: true }).click();
}
const sheet = (page: Page) => page.getByRole('region', { name: 'Reminder sheet', exact: true });
const row = (page: Page, name: string) =>
  page.locator('.roster-row').filter({ has: page.getByText(name, { exact: true }) });

test('builds and reloads two Immortal units with different weapons and a shared pair of Leaders', async ({
  page,
}) => {
  await page.goto('./');
  await add(page, 'Immortals', 2);
  const second = row(page, 'Immortals #2');
  await second.getByRole('button', { name: /Configure/ }).click();
  await second.getByLabel('Squad weapon').selectOption('tesla-carbine');
  await second.getByLabel('Models in this unit').selectOption('10');
  await add(page, 'Plasmancer');
  await page.getByLabel('Bodyguard for Plasmancer').selectOption({ label: 'Immortals #2' });
  await row(page, 'Plasmancer').getByLabel('Enhancement').selectOption('veil-of-darkness');
  await add(page, 'Overlord');
  await page.getByLabel('Bodyguard for Overlord').selectOption({ label: 'Immortals #2' });
  await expect(row(page, 'Immortals #2')).toContainText('Led by Plasmancer + Overlord');
  await page.getByRole('button', { name: 'Play reminders' }).click();
  await sheet(page).getByLabel('Phase', { exact: true }).selectOption('Shooting');
  const critical = sheet(page).locator('article').filter({ hasText: 'Harbinger of Destruction' });
  await expect(critical).toContainText('Immortals #2 + Plasmancer + Overlord');
  await expect(critical).toContainText('two hits');
  await expect(sheet(page).locator('article').filter({ hasText: 'Gauss blasters' })).toContainText(
    'Immortals #1',
  );
  await critical.getByRole('checkbox').check();
  await expect(critical).toHaveCount(0);
  await page.reload();
  await sheet(page).getByLabel('Show completed').check();
  await expect(critical.getByRole('checkbox')).toBeChecked();
  await critical.getByRole('button', { name: /Hide/ }).click();
  await expect(critical).toHaveCount(0);
  await sheet(page).getByLabel('Show hidden').check();
  await critical.getByRole('button', { name: /Restore/ }).click();
  await sheet(page).getByRole('button', { name: 'Collapse all' }).click();
  await expect(critical).toHaveCount(0);
  await sheet(page).getByRole('button', { name: 'Expand all' }).click();
  await expect(critical).toBeVisible();
  await page.getByRole('button', { name: 'Edit army' }).click();
  await row(page, 'Immortals #2')
    .getByRole('button', { name: /Remove/ })
    .click();
  await expect(sheet(page).getByText('Harbinger of Destruction', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('prints the complete sheet with formations while the screen shows only the opposing turn', async ({
  page,
}) => {
  await page.goto('./');
  await add(page, 'Canoptek Wraiths');
  await add(page, 'Technomancer');
  await page.getByLabel('Bodyguard for Technomancer').selectOption({ label: 'Canoptek Wraiths' });
  await choose(page, 'Detachment', 'Hypercrypt Legion');
  await sheet(page).getByLabel('Phase', { exact: true }).selectOption('Turn end');
  await sheet(page).getByLabel('Turn', { exact: true }).selectOption('opponent');
  await expect(sheet(page).getByText('Hyperphasing', { exact: true })).toBeVisible();
  await expect(sheet(page).getByText('Reanimation Protocols', { exact: true })).toHaveCount(0);
  await page.emulateMedia({ media: 'print' });
  const print = page.locator('.print-sheet');
  await expect(print).toBeVisible();
  await expect(page.locator('.builder')).toBeHidden();
  for (const phase of ['Command', 'Movement', 'Shooting', 'Charge', 'Fight', 'Turn end'])
    await expect(print.getByRole('heading', { name: phase, exact: true })).toBeVisible();
  await expect(print.getByText('Reanimation Protocols', { exact: true })).toHaveCount(1);
  await expect(print.getByText('Apply Feel No Pain 5+.', { exact: true })).toBeVisible();
  await expect(print.locator('.roster-summary')).toContainText('leads Canoptek Wraiths');
});
test('saves, renames, duplicates, shares and exports armies without overwriting the original', async ({
  page,
}) => {
  await page.goto('./');
  await add(page, 'Immortals');
  const manage = page.locator('.manager');
  async function opened() {
    if (!(await manage.evaluate((el) => (el as HTMLDetailsElement).open)))
      await manage.locator('summary').click();
  }
  await opened();
  await manage.getByRole('button', { name: 'Rename', exact: true }).click();
  await manage.getByLabel('Army name').fill('Dynasty');
  await manage.getByRole('button', { name: 'Save name' }).click();
  await manage.getByRole('button', { name: 'Duplicate' }).click();
  await opened();
  await expect(manage.getByLabel('Load army').locator('option:checked')).toHaveText('Dynasty copy');
  await manage.getByRole('button', { name: 'Share army' }).click();
  const link = await manage.getByLabel('Army link').inputValue();
  await page.goto(link);
  await page.getByRole('button', { name: 'Save shared army' }).click();
  await opened();
  await expect(manage.getByLabel('Load army').locator('option')).toHaveCount(3);
  const download = page.waitForEvent('download');
  await manage.getByRole('button', { name: 'Export army' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
  await manage
    .getByLabel('Army JSON file')
    .setInputFiles({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"version":99}'),
    });
  await expect(manage.getByRole('status')).toContainText('Invalid army file');
  await manage.getByRole('button', { name: 'Delete army', exact: true }).click();
  await manage.getByRole('button', { name: 'Confirm delete' }).click();
  await opened();
  await expect(manage.getByLabel('Load army').locator('option')).toHaveCount(2);
  await manage.getByLabel('Load army').selectOption({ label: 'Dynasty' });
  await expect(row(page, 'Immortals')).toBeVisible();
});
test('searches the faction catalog by keyboard and keeps the previous army when switching', async ({
  page,
}) => {
  await page.goto('./');
  await add(page, 'Immortals');
  const input = page.getByRole('combobox', { name: 'Faction', exact: true });
  await input.fill('Ultram');
  await input.press('Enter');
  await expect(input).toHaveValue('Ultramarines');
  await add(page, 'Roboute Guilliman');
  await expect(row(page, 'Roboute Guilliman')).toBeVisible();
  await expect(sheet(page).getByText('Oath of Moment', { exact: true })).toBeVisible();
  await expect(sheet(page).getByText('Reanimation Protocols', { exact: true })).toHaveCount(0);
  await page.locator('.manager summary').click();
  await page.getByLabel('Load army').selectOption({ label: 'Necrons army' });
  await expect(row(page, 'Immortals')).toBeVisible();
});
