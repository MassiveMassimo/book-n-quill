import { test, expect, type Page } from '@playwright/test';

type PanoramaObservation = {
  contexts: string[];
  lockRequests: number;
  webglRequests: number;
};
declare global {
  interface Window {
    panoramaObserved: PanoramaObservation;
  }
}

const panoramaFace = '/minecraft/panorama/panorama-still.jpg';

// macOS headless-shell rejects native pointer lock with WrongDocumentError.
// Full Chromium supports native lock with CDP focus emulation; no API is mocked.
test.use({
  launchOptions: async ({ browserName }, use) => {
    await use(browserName === 'chromium' ? { channel: 'chromium' } : {});
  },
});

async function view(page: Page) {
  return page.locator('#panorama').evaluate((canvas) => ({
    yaw: Number(canvas.dataset.yaw),
    pitch: Number(canvas.dataset.pitch),
  }));
}

async function ready(page: Page) {
  await expect(page.locator('#panorama')).toBeVisible();
  await expect(page.locator('#panorama')).toHaveAttribute('data-yaw', /\d/);
  await expect(page.locator('#panorama')).toHaveAttribute('data-pitch', /\d/);
  const angles = await view(page);
  expect(Number.isFinite(angles.yaw)).toBe(true);
  expect(Number.isFinite(angles.pitch)).toBe(true);
}

async function expectLocked(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.pointerLockElement?.id))
    .toBe('game');
  await expect(page.locator('#game')).toHaveAttribute('data-screen', 'scene');
}

test.describe('desktop panorama', () => {
  test.describe.configure({ mode: 'default' });
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Real desktop Chromium pointer lock and its fallback paths.',
  );

  test.beforeEach(async ({ page }) => {
    await page.bringToFront();
    const session = await page.context().newCDPSession(page);
    await session.send('Page.bringToFront');
    await session.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  });

  test('Done captures the mouse; movement looks around; right-click opens a frozen book', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('textbox', { name: 'Book page 1', exact: true })
      .fill('A panorama note.');
    await ready(page);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expectLocked(page);

    const initial = await view(page);
    await page.mouse.move(600, 400);
    await page.mouse.move(760, 480, { steps: 4 });
    await expect.poll(async () => (await view(page)).yaw).not.toBe(initial.yaw);
    await expect
      .poll(async () => (await view(page)).pitch)
      .not.toBe(initial.pitch);
    const moved = await view(page);
    expect(Number.isFinite(moved.yaw)).toBe(true);
    expect(Number.isFinite(moved.pitch)).toBe(true);

    await page.mouse.click(760, 480, { button: 'right' });
    await expect(page.locator('#game')).toHaveAttribute('data-screen', 'book');
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement))
      .toBeNull();
    await expect(
      page.getByRole('textbox', { name: 'Book page 1', exact: true }),
    ).toHaveValue('A panorama note.');
    const frozen = await view(page);
    await page.mouse.move(900, 650, { steps: 4 });
    await page.mouse.move(200, 100, { steps: 4 });
    expect(await view(page)).toEqual(frozen);
  });

  test('browser pointer-lock exit opens Game Menu; Back to Game recaptures from its gesture', async ({
    page,
  }) => {
    await page.goto('/');
    await ready(page);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expectLocked(page);
    await page.evaluate(() => document.exitPointerLock());
    await expect(page.locator('#game')).toHaveAttribute('data-screen', 'menu');
    await expect(
      page.getByRole('heading', { name: 'Game Menu', exact: true }),
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement))
      .toBeNull();
    const paused = await view(page);
    await page.mouse.move(300, 200, { steps: 3 });
    expect(await view(page)).toEqual(paused);

    await page
      .getByRole('button', { name: 'Back to Game', exact: true })
      .click();
    await expectLocked(page);
    const resumed = await view(page);
    await page.mouse.move(800, 500, { steps: 3 });
    await expect.poll(async () => (await view(page)).yaw).not.toBe(resumed.yaw);
  });

  test('a screenshot theme hides the renderer and keeps ordinary hotbar interaction', async ({
    page,
  }) => {
    await page.goto('/');
    await ready(page);
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Options...', exact: true }).click();
    await page
      .getByRole('button', { name: 'Background...', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Theme: Panorama', exact: true })
      .click();
    await expect(page.locator('#background img')).toHaveAttribute(
      'src',
      '/backgrounds/mountains.jpg',
    );
    await expect(page.locator('#panorama')).toBeHidden();
    await page
      .locator('#background-panel')
      .getByRole('button', { name: 'Done', exact: true })
      .click();
    await page
      .locator('#options-panel')
      .getByRole('button', { name: 'Done', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Back to Game', exact: true })
      .click();
    await expect(page.locator('#game')).toHaveAttribute('data-screen', 'scene');
    await page.mouse.move(800, 500);
    expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
    await page
      .getByRole('button', { name: 'Open Book and Quill', exact: true })
      .click();
    await expect(page.locator('#book-panel')).toBeVisible();
  });

  for (const fallback of [
    'missing pointer-lock API',
    'denied pointer lock',
    'unavailable WebGL',
  ] as const) {
    test(`${fallback} leaves the scene and hotbar usable`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript((fallback) => {
        window.panoramaObserved = {
          contexts: [],
          lockRequests: 0,
          webglRequests: 0,
        };
        if (fallback === 'missing pointer-lock API') {
          Object.defineProperty(Element.prototype, 'requestPointerLock', {
            configurable: true,
            value: undefined,
          });
        } else if (fallback === 'denied pointer lock') {
          Object.defineProperty(Element.prototype, 'requestPointerLock', {
            configurable: true,
            value() {
              window.panoramaObserved.lockRequests += 1;
              return Promise.reject(
                new DOMException(
                  'Pointer lock denied for this test.',
                  'NotAllowedError',
                ),
              );
            },
          });
        } else {
          const getContext = HTMLCanvasElement.prototype.getContext;
          Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
            configurable: true,
            value(
              this: HTMLCanvasElement,
              type: string,
              options?:
                | WebGLContextAttributes
                | CanvasRenderingContext2DSettings
                | ImageBitmapRenderingContextSettings,
            ) {
              if (
                type === 'webgl' ||
                type === 'webgl2' ||
                type === 'experimental-webgl'
              ) {
                window.panoramaObserved.webglRequests += 1;
                return null;
              }
              return getContext.call(this, type, options);
            },
          });
        }
      }, fallback);
      await page.goto('/');
      await page
        .getByRole('textbox', { name: 'Book page 1', exact: true })
        .fill('Keep the fallback draft.');
      if (fallback === 'unavailable WebGL') {
        await expect
          .poll(() =>
            page.evaluate(() => window.panoramaObserved.webglRequests),
          )
          .toBeGreaterThan(0);
        await expect(page.locator('#panorama')).toBeHidden();
      } else {
        await ready(page);
      }
      if (fallback === 'missing pointer-lock API') {
        expect(
          await page.evaluate(
            () => Element.prototype.requestPointerLock === undefined,
          ),
        ).toBe(true);
      }
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(page.locator('#game')).toHaveAttribute(
        'data-screen',
        'scene',
      );
      expect(await page.evaluate(() => document.pointerLockElement)).toBeNull();
      if (fallback === 'denied pointer lock') {
        await expect
          .poll(() => page.evaluate(() => window.panoramaObserved.lockRequests))
          .toBe(1);
        await expect(page.getByRole('status')).toContainText(
          'Mouse-look unavailable',
        );
      }
      await expect(page.locator('#background img')).toHaveAttribute(
        'src',
        panoramaFace,
      );
      await page
        .getByRole('button', { name: 'Open Book and Quill', exact: true })
        .click();
      await expect(
        page.getByRole('textbox', { name: 'Book page 1', exact: true }),
      ).toHaveValue('Keep the fallback draft.');
      await expect(page.locator('#game')).toHaveAttribute(
        'data-screen',
        'book',
      );
      expect(errors).toEqual([]);
    });
  }
});

test('phone panorama stays static without WebGL or pointer lock; the hotbar reopens the draft', async ({
  page,
  isMobile,
}) => {
  test.skip(
    !isMobile,
    'The phone project exercises the coarse-pointer static adaptation.',
  );
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    const requestPointerLock = Element.prototype.requestPointerLock;
    const observed: PanoramaObservation = {
      contexts: [],
      lockRequests: 0,
      webglRequests: 0,
    };
    Object.assign(window, { panoramaObserved: observed });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value(
        this: HTMLCanvasElement,
        type: string,
        options?:
          | WebGLContextAttributes
          | CanvasRenderingContext2DSettings
          | ImageBitmapRenderingContextSettings,
      ) {
        observed.contexts.push(type);
        return getContext.call(this, type, options);
      },
    });
    Object.defineProperty(Element.prototype, 'requestPointerLock', {
      configurable: true,
      value(this: Element) {
        observed.lockRequests += 1;
        return requestPointerLock?.call(this);
      },
    });
  });
  await page.goto('/');
  expect(
    await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    ),
  ).toBe(false);
  await page
    .getByRole('textbox', { name: 'Book page 1', exact: true })
    .fill('A static phone note.');
  await expect(page.locator('#panorama')).toBeHidden();
  await expect(page.locator('#background img')).toHaveAttribute(
    'src',
    panoramaFace,
  );
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('#game')).toHaveAttribute('data-screen', 'scene');
  await expect(page.locator('#panorama')).toBeHidden();
  expect(
    await page.evaluate(() => document.pointerLockElement ?? null),
  ).toBeNull();
  await page
    .getByRole('button', { name: 'Open Book and Quill', exact: true })
    .tap();
  await expect(
    page.getByRole('textbox', { name: 'Book page 1', exact: true }),
  ).toHaveValue('A static phone note.');
  const observed = await page.evaluate(() => window.panoramaObserved);
  expect(observed.contexts.filter((type) => /webgl/.test(type))).toEqual([]);
  expect(observed.lockRequests).toBe(0);
});
