import { test, expect } from '@playwright/test';

test('initial and cached loading last at least one second and switch directly', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#loading')).toBeHidden();
  expect(await page.evaluate(() => performance.now())).toBeGreaterThanOrEqual(
    1000,
  );
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#loading')).toBeVisible();
  await expect(page.locator('#loading')).toBeHidden();
  expect(await page.evaluate(() => performance.now())).toBeGreaterThanOrEqual(
    1000,
  );
  const style = await page.locator('#loading').evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      transition: style.transitionDuration,
      animation: style.animationName,
    };
  });
  expect(style).toEqual({ transition: '0s', animation: 'none' });
});

test('opening progress waits for a real asset, then opens the restored book', async ({
  page,
  isMobile,
}) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const source = isMobile
    ? '**/minecraft/book.png'
    : '**/minecraft/panorama/panorama_0.png';
  await page.route(source, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#loading')).toBeVisible();
  await expect(page.locator('#game')).toHaveAttribute('inert', '');
  await expect
    .poll(() =>
      page.locator('#loading-progress').evaluate((node) => {
        // SAFETY: This locator targets the loading screen's native progress element.
        const progress = node as HTMLProgressElement;
        return progress.max - progress.value;
      }),
    )
    .toBe(2);
  const percentage = await page.locator('#loading-percentage').textContent();
  expect(Number(percentage!.replace('%', ''))).toBeLessThan(100);
  await page.waitForTimeout(250);
  await expect(page.locator('#loading-percentage')).toHaveText(percentage!);
  release();
  await expect(page.locator('#loading')).toBeHidden();
  await expect(
    page.getByRole('textbox', { name: 'Book page 1', exact: true }),
  ).toBeEditable();
  await expect(page.locator('#loading-percentage')).toHaveText('100%');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('#loading')).toBeHidden();
  await page.reload();
  await expect(page.locator('#loading')).toBeHidden();
  await expect(
    page.getByRole('textbox', { name: 'Book page 1', exact: true }),
  ).toBeEditable();
});

test('failed opening asset releases loading without claiming full success', async ({
  page,
}) => {
  await page.route('**/minecraft/page_forward_highlighted.png', (route) =>
    route.abort(),
  );
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.getByRole('status')).toContainText(
    'Some assets could not be loaded',
  );
  await expect(
    page.getByRole('textbox', { name: 'Book page 1', exact: true }),
  ).toBeEditable();
  const percentage = await page.locator('#loading-percentage').textContent();
  expect(Number(percentage!.replace('%', ''))).toBeLessThan(100);
});

test('phone opening loads no panorama faces', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Static phone opening.');
  const faces: string[] = [];
  page.on('request', (request) => {
    if (/panorama_\d\.png/.test(request.url())) faces.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden();
  expect(faces).toEqual([]);
});

test('failed panorama opens the book with a warning and incomplete progress', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Phones use the still view.');
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value() {
        return null;
      },
    });
  });
  await page.goto('/');
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.getByRole('status')).toContainText(
    'Some assets could not be loaded',
  );
  await expect(
    page.getByRole('textbox', { name: 'Book page 1', exact: true }),
  ).toBeEditable();
  await expect(page.locator('#panorama')).toBeHidden();
  const percentage = await page.locator('#loading-percentage').textContent();
  expect(Number(percentage!.replace('%', ''))).toBeLessThan(100);
});
