import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

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
const scenes = [
  { name: 'Autumn Camp', source: '/minecraft/panorama', still: panoramaFace },
  {
    name: 'Snowy Coast',
    source: '/backgrounds/snowy-coast',
    still: '/backgrounds/snowy-coast/still.jpg',
  },
  {
    name: 'Cherry Grove',
    source: '/backgrounds/cherry-grove',
    still: '/backgrounds/cherry-grove/still.jpg',
  },
  {
    name: 'Sulfur Caves',
    source: '/backgrounds/sulfur-caves',
    still: '/backgrounds/sulfur-caves/still.jpg',
  },
];

// Full Chromium headless supports native pointer lock on macOS; headless-shell does not.
// Keep this launch choice local so the legacy suite still covers headless-shell fallback.
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

async function ready(page: Page, source = scenes[0]!.source) {
  await expect(page.locator('#panorama')).toBeVisible();
  await expect(page.locator('#panorama')).toHaveAttribute(
    'data-source',
    source,
  );
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
  // Native acquisition precedes the app's queued pointerlockchange handler.
  await expect(page.locator('#game')).toHaveAttribute('data-looking', 'true');
}

test.describe('desktop panorama', () => {
  test.describe.configure({ mode: 'default' });
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile,
    'Real desktop Chromium pointer lock and its fallback paths.',
  );

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

  test('Escape releases native pointer lock and opens Game Menu', async ({
    page,
  }) => {
    await page.goto('/');
    await ready(page);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    await expectLocked(page);
    await page.keyboard.press('Escape');
    await expect
      .poll(() => page.evaluate(() => document.pointerLockElement))
      .toBeNull();
    await expect(page.locator('#game')).toHaveAttribute('data-screen', 'menu');
    await expect(
      page.getByRole('heading', { name: 'Game Menu', exact: true }),
    ).toBeVisible();
  });

  test('every built-in supports native mouse-look; rapid cycling keeps the latest selection', async ({
    page,
  }) => {
    const reviewDirectory = '/tmp/book-n-quill-all-panoramas-20261002';
    await mkdir(reviewDirectory, { recursive: true });
    await page.goto('/');
    await ready(page);
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    for (let index = 0; index < scenes.length; index += 1) {
      const scene = scenes[index]!;
      if (index > 0) {
        await page.locator('#background-theme').click();
        await expect(
          page.getByRole('button', {
            name: `Theme: ${scene.name}`,
            exact: true,
          }),
        ).toBeEnabled();
        await ready(page, scene.source);
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
      }
      await expectLocked(page);
      await ready(page, scene.source);
      await expect(page.locator('#background img')).toHaveAttribute(
        'src',
        scene.still,
      );
      const initial = await view(page);
      await page.mouse.move(600, 400);
      await page.mouse.move(760, 480, { steps: 3 });
      await expect
        .poll(async () => (await view(page)).yaw)
        .not.toBe(initial.yaw);
      await page.mouse.click(760, 480, { button: 'right' });
      await expect(page.locator('#game')).toHaveAttribute(
        'data-screen',
        'book',
      );
      await expect
        .poll(() => page.evaluate(() => document.pointerLockElement))
        .toBeNull();
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: 'Options...', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Background...', exact: true })
        .click();
      await expect
        .poll(() =>
          page.locator('#background-preview img').evaluate((image) => {
            if (!(image instanceof HTMLImageElement))
              throw new Error('Expected settings preview');
            return image.complete && image.naturalWidth > 0;
          }),
        )
        .toBe(true);
      await page.screenshot({
        path: `${reviewDirectory}/${scene.name.toLowerCase().replaceAll(' ', '-')}.png`,
      });
    }

    // Hold the first load while two later selections arrive, then release it.
    const gate = Promise.withResolvers<void>();
    let heldFaces = 0;
    const pattern = '**/minecraft/panorama/panorama_*.png';
    await page.route(pattern, async (route) => {
      heldFaces += 1;
      await gate.promise;
      await route.continue();
    });
    try {
      await page.locator('#background-theme').click();
      await expect.poll(() => heldFaces).toBeGreaterThan(0);
      await page.locator('#background-theme').click();
      await page.locator('#background-theme').click();
      await expect(
        page.getByRole('button', { name: 'Theme: Cherry Grove', exact: true }),
      ).toBeEnabled();
    } finally {
      gate.resolve();
    }
    await ready(page, '/backgrounds/cherry-grove');
    await expect(page.locator('#background img')).toHaveAttribute(
      'src',
      '/backgrounds/cherry-grove/still.jpg',
    );
    await page.unroute(pattern);
  });

  test('a custom upload hides the renderer, avoids lock, and keeps ordinary hotbar interaction', async ({
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
      .locator('#background-file')
      .setInputFiles('public/minecraft/book.png');
    await expect(
      page.getByRole('button', { name: 'Theme: Custom', exact: true }),
    ).toBeEnabled();
    await expect(page.locator('#background img')).toHaveAttribute(
      'src',
      /^blob:/,
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
        for (const viewport of [
          { width: 1440, height: 900 },
          { width: 719, height: 480 },
          { width: 390, height: 664 },
        ]) {
          await page.setViewportSize(viewport);
          await page.locator('#reopen').hover();
          const notice = await page.getByRole('status').boundingBox();
          for (const selector of ['.hotbar', '.item-name', '.tooltip']) {
            const hud = await page.locator(selector).boundingBox();
            expect(notice).not.toBeNull();
            expect(hud).not.toBeNull();
            expect(notice!.y + notice!.height).toBeLessThan(hud!.y);
          }
        }
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

test('every phone theme stays static without WebGL or pointer lock; the hotbar reopens the draft', async ({
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
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index]!;
    await expect(page.locator('#panorama')).toBeHidden();
    await expect(page.locator('#background img')).toHaveAttribute(
      'src',
      scene.still,
    );
    await expect
      .poll(() =>
        page.locator('#background img').evaluate((img) => {
          if (!(img instanceof HTMLImageElement))
            throw new Error('Expected phone still image');
          return img.complete && img.naturalWidth > 0;
        }),
      )
      .toBe(true);
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
    if (index < scenes.length - 1) {
      await page
        .getByRole('button', { name: 'Open Game Menu', exact: true })
        .tap();
      await page
        .getByRole('button', { name: 'Options...', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Background...', exact: true })
        .click();
      await page
        .getByRole('button', { name: `Theme: ${scene.name}`, exact: true })
        .click();
      await expect(
        page.getByRole('button', {
          name: `Theme: ${scenes[index + 1]!.name}`,
          exact: true,
        }),
      ).toBeEnabled();
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
    }
  }
  const observed = await page.evaluate(() => window.panoramaObserved);
  expect(observed.contexts.filter((type) => /webgl/.test(type))).toEqual([]);
  expect(observed.lockRequests).toBe(0);
});
