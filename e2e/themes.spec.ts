import { test, expect } from '@playwright/test';

test('background themes cycle, persist, preview, and preserve the draft', async ({
  page,
}) => {
  await page.goto('/');
  const desktop = await page.evaluate(
    () => matchMedia('(hover: hover) and (pointer: fine)').matches,
  );
  await page
    .getByRole('textbox', { name: 'Book page 1', exact: true })
    .fill('Keep this thought.');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Options...', exact: true }).click();
  await page
    .getByRole('button', { name: 'Background...', exact: true })
    .click();
  await page
    .locator('#background-panel')
    .getByRole('button', { name: 'Done', exact: true })
    .scrollIntoViewIfNeeded();
  const done = await page
    .locator('#background-panel')
    .getByRole('button', { name: 'Done', exact: true })
    .boundingBox();
  expect(done!.y + done!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  for (const [current, next, src] of [
    ['Autumn Camp', 'Night Coast', '/backgrounds/snowy-coast/still.jpg'],
    ['Night Coast', 'Cherry Grove', '/backgrounds/cherry-grove/still.jpg'],
    ['Cherry Grove', 'Sulfur Caves', '/backgrounds/sulfur-caves/still.jpg'],
    ['Sulfur Caves', 'Autumn Camp', '/minecraft/panorama/panorama-still.jpg'],
  ]) {
    await page
      .getByRole('button', { name: `Theme: ${current}`, exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: `Theme: ${next}`, exact: true }),
    ).toBeEnabled();
    for (const selector of ['#background img', '#background-preview img']) {
      if (selector === '#background-preview img' && desktop) {
        // Check a boolean so a failed snapshot assertion cannot print its data URL.
        await expect
          .poll(() =>
            page
              .locator(selector)
              .evaluate(
                (img) =>
                  img.getAttribute('src')?.startsWith('data:image/png') ===
                  true,
              ),
          )
          .toBe(true);
      } else {
        await expect(page.locator(selector)).toHaveAttribute('src', src);
      }
      await expect
        .poll(() =>
          page.locator(selector).evaluate((img) => {
            if (!(img instanceof HTMLImageElement))
              throw new Error('Expected theme image');
            return img.complete && img.naturalWidth > 0;
          }),
        )
        .toBe(true);
    }
  }
  await page
    .getByRole('button', { name: 'Theme: Autumn Camp', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Theme: Night Coast', exact: true })
    .click();
  await page.reload();
  await expect(page.locator('#background img')).toHaveAttribute(
    'src',
    '/backgrounds/cherry-grove/still.jpg',
  );
  await expect(
    page.getByRole('textbox', { name: 'Book page 1', exact: true }),
  ).toHaveValue('Keep this thought.');
});

test('choosing a theme after an upload persists without deleting custom image bytes', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Options...', exact: true }).click();
  await page
    .getByRole('button', { name: 'Background...', exact: true })
    .click();
  await page
    .locator('#background-file')
    .setInputFiles('public/minecraft/book.png');
  await expect(
    page.getByRole('button', { name: 'Theme: Custom', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('button', { name: 'Theme: Custom', exact: true })
    .click();
  await expect(page.locator('#background img')).toHaveAttribute(
    'src',
    '/minecraft/panorama/panorama-still.jpg',
  );
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('book-n-quill', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<boolean>((resolve, reject) => {
        const request = db
          .transaction('background')
          .objectStore('background')
          .get('image');
        request.onsuccess = () => resolve(Boolean(request.result?.bytes));
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
  expect(stored).toBe(true);
  await page.reload();
  await expect(page.locator('#background img')).toHaveAttribute(
    'src',
    '/minecraft/panorama/panorama-still.jpg',
  );
});
