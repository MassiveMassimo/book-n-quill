import { test, expect, type Locator } from '@playwright/test';

async function bounds(
  control: Locator,
  expected: { x: number; y: number; width: number; height: number },
) {
  const actual = await control.boundingBox();
  expect(actual).not.toBeNull();
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(actual![key], `${key} for ${control}`).toBeCloseTo(expected[key], 1);
  }
}

test('short phone keeps readable controls, reachable Done, and the viewport preview crop', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'Phone layout adaptation.');
  await page.setViewportSize({ width: 390, height: 200 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Options...', exact: true }).click();
  await page
    .getByRole('button', { name: 'Background...', exact: true })
    .click();
  const scale = await page.evaluate(() =>
    Number(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--gui-scale',
      ),
    ),
  );
  expect(scale).toBeCloseTo(1.89);
  const hitHeight = await page
    .locator('#choose-background')
    .evaluate((button) => {
      const style = getComputedStyle(button);
      const hit = getComputedStyle(button, '::after');
      const scale =
        button.getBoundingClientRect().height / parseFloat(style.height);
      return parseFloat(hit.height) * scale;
    });
  expect(hitHeight).toBeGreaterThanOrEqual(43.99);
  const preview = (await page.locator('#background-preview').boundingBox())!;
  expect(preview.width / preview.height).toBeCloseTo(390 / 200, 2);
  const done = page
    .locator('#background-panel')
    .getByRole('button', { name: 'Done', exact: true });
  await done.click();
  await expect(page.locator('#options-panel')).toBeVisible();
  await page.setViewportSize({ width: 320, height: 568 });
  await page
    .getByRole('button', { name: 'Background...', exact: true })
    .click();
  const theme = (await page.locator('#background-theme').boundingBox())!;
  const choose = (await page.locator('#choose-background').boundingBox())!;
  expect(choose.y - theme.y).toBeGreaterThanOrEqual(44.99);
  await page.touchscreen.tap(160, 294.43);
  await expect(
    page.getByRole('button', { name: 'Theme: Night Coast', exact: true }),
  ).toBeEnabled();
  await done.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Background...', exact: true })
    .click();
  const portrait = (await page.locator('#background-preview').boundingBox())!;
  expect(portrait.width / portrait.height).toBeCloseTo(390 / 844, 2);
  const image = await page.locator('#background-preview img').boundingBox();
  expect(image!.width).toBeCloseTo(portrait.width, 1);
  expect(image!.height).toBeCloseTo(portrait.height, 1);
});

// Measured from the installed Java 26.3 BookEditScreen and BookSignScreen.
// The book is horizontally centered with y=2; vertical centering would be a regression.
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
]) {
  test(`Java reference geometry at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    test.skip(
      info.project.name === 'phone',
      'Phones use the documented fitted layout.',
    );
    await page.setViewportSize(viewport);
    await page.goto('/');
    const scale = 3;
    const bookLeft = (viewport.width - 192 * scale) / 2;
    const controlsLeft = viewport.width / 2 - 100 * scale;
    await bounds(page.locator('.book-texture'), {
      x: bookLeft,
      y: 2 * scale,
      width: 192 * scale,
      height: 192 * scale,
    });
    await bounds(page.getByRole('button', { name: 'Sign', exact: true }), {
      x: controlsLeft,
      y: 196 * scale,
      width: 98 * scale,
      height: 20 * scale,
    });
    await bounds(page.getByRole('button', { name: 'Done', exact: true }), {
      x: controlsLeft + 102 * scale,
      y: 196 * scale,
      width: 98 * scale,
      height: 20 * scale,
    });
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    for (const [name, x] of [
      ['Previous page', 43],
      ['Next page', 116],
    ] as const) {
      await bounds(page.getByRole('button', { name, exact: true }), {
        x: bookLeft + x * scale,
        y: 159 * scale,
        width: 23 * scale,
        height: 13 * scale,
      });
    }
    await page.getByRole('button', { name: 'Sign', exact: true }).click();
    await bounds(
      page.getByRole('button', { name: 'Sign and Close', exact: true }),
      {
        x: controlsLeft,
        y: 196 * scale,
        width: 98 * scale,
        height: 20 * scale,
      },
    );
    await bounds(page.getByRole('button', { name: 'Cancel', exact: true }), {
      x: controlsLeft + 102 * scale,
      y: 196 * scale,
      width: 98 * scale,
      height: 20 * scale,
    });
  });
}
