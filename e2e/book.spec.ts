import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

declare global {
  interface Window {
    audioObserved: { src: string; volume: number; ok: boolean }[];
  }
}

async function options(page: Page) {
  await expect(page.locator('#loading')).toBeHidden();
  // Escape closes the book without starting a pointer-lock request.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Options...', exact: true }).click();
}
async function openBook(page: Page) {
  if (
    await page.evaluate(
      () => matchMedia('(hover: hover) and (pointer: fine)').matches,
    )
  ) {
    const viewport = page.viewportSize()!;
    await page.mouse.click(viewport.width / 2, viewport.height / 2, {
      button: 'right',
    });
  } else {
    await page
      .getByRole('button', { name: 'Open Book and Quill', exact: true })
      .click();
  }
  await expect(page.locator('#book-panel')).toBeVisible();
}
async function returnToBook(page: Page) {
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Back to Game', exact: true }).click();
  await openBook(page);
}

test('draft pages and title persist; signing downloads exact Markdown and keeps the book editable', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Book page 1', exact: true })
    .fill('# First\n\nA small thought.');
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Book page 2', exact: true })
    .fill('Another thought.');
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Book page 2', exact: true }),
  ).toHaveValue('Another thought.');
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Sign and Close', exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel('Enter Book Title:', { exact: true })
    .fill('Little book');
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Sign and Close', exact: true })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('Little book.md');
  expect(await readFile((await download.path())!, 'utf8')).toBe(
    '# First\n\nA small thought.\n\nAnother thought.',
  );
  await openBook(page);
  await page
    .getByRole('textbox', { name: 'Book page 2', exact: true })
    .fill('Still editable.');
  await page.reload();
  await expect(
    page.getByRole('textbox', { name: 'Book page 2', exact: true }),
  ).toHaveValue('Still editable.');
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(
    page.getByLabel('Enter Book Title:', { exact: true }),
  ).toHaveValue('Little book');
});

test('settings save volumes and TXT format, with no format dialog at signing', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Book page 1', exact: true })
    .fill('Plain note.');
  await options(page);
  await page
    .getByRole('button', { name: 'Music & Sounds...', exact: true })
    .click();
  await page.getByRole('slider', { name: 'Music: 15%', exact: true }).fill('0');
  await page
    .getByRole('slider', { name: 'Sound Effects: 50%', exact: true })
    .fill('25');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('button', { name: 'Export Settings...', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Format: Markdown (.md)', exact: true })
    .click();
  await returnToBook(page);
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  await page.getByLabel('Enter Book Title:', { exact: true }).fill('Note');
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Sign and Close', exact: true })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('Note.txt');
  expect(await readFile((await download.path())!, 'utf8')).toBe('Plain note.');
  await page.reload();
  await options(page);
  await page
    .getByRole('button', { name: 'Music & Sounds...', exact: true })
    .click();
  await expect(
    page.getByRole('slider', { name: 'Music: OFF', exact: true }),
  ).toHaveValue('0');
  await expect(
    page.getByRole('slider', { name: 'Sound Effects: 25%', exact: true }),
  ).toHaveValue('25');
});

test('custom still background survives reload; invalid replacement preserves it; restore works', async ({
  page,
}) => {
  await page.goto('/');
  await options(page);
  await page
    .getByRole('button', { name: 'Background...', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Choose Image...', exact: true }),
  ).toBeEnabled();
  await page
    .locator('#background-file')
    .setInputFiles('public/minecraft/book.png');
  await expect(
    page.getByRole('button', { name: 'Choose Image...', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('#background img')).toHaveAttribute(
    'src',
    /^blob:/,
  );
  await page.reload();
  await expect(page.locator('#background img')).toHaveAttribute(
    'src',
    /^blob:/,
  );
  await options(page);
  await page
    .getByRole('button', { name: 'Background...', exact: true })
    .click();
  await page.locator('#background-file').setInputFiles({
    name: 'video.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from('no'),
  });
  await expect(page.getByRole('status')).toContainText('still PNG or JPEG');
  await expect(page.locator('#background img')).toHaveAttribute(
    'src',
    /^blob:/,
  );
  await page
    .getByRole('button', { name: 'Restore Default', exact: true })
    .click();
  await expect(page.locator('#background img')).toHaveAttribute(
    'src',
    '/minecraft/panorama/panorama-still.jpg',
  );
  await page.reload();
  await expect(page.locator('#background img')).toHaveAttribute(
    'src',
    '/minecraft/panorama/panorama-still.jpg',
  );
});

test('page capacity rejects an oversized paste without losing the previous note', async ({
  page,
}) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', {
    name: 'Book page 1',
    exact: true,
  });
  await editor.fill('Keep me.');
  await editor.fill('W'.repeat(19 * 14 + 1));
  await expect(editor).toHaveValue('Keep me.');
  await expect(page.getByRole('status')).toContainText('page is full');
  await page.reload();
  await expect(editor).toHaveValue('Keep me.');
});

test('corrupt saved data stays untouched while the in-memory draft can be exported', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('book-n-quill:draft', 'corrupt original'),
  );
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('kept untouched');
  await page
    .getByRole('textbox', { name: 'Book page 1', exact: true })
    .fill('Emergency note');
  expect(
    await page.evaluate(() => localStorage.getItem('book-n-quill:draft')),
  ).toBe('corrupt original');
  await page.getByRole('button', { name: 'Sign', exact: true }).click();
  await page.getByLabel('Enter Book Title:', { exact: true }).fill('Recovery');
  const pending = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Sign and Close', exact: true })
    .click();
  expect(await readFile((await (await pending).path())!, 'utf8')).toBe(
    'Emergency note',
  );
});

test('write failure retains an in-memory book and reports the failed save', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Storage full', 'QuotaExceededError');
    };
  });
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Book page 1', exact: true })
    .fill('Keep this tab open.');
  await expect(page.getByRole('status')).toContainText('Could not save');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await openBook(page);
  await expect(
    page.getByRole('textbox', { name: 'Book page 1', exact: true }),
  ).toHaveValue('Keep this tab open.');
});

test('original glyph advances match the browser font, and the app makes no external requests', async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (
      !request.url().startsWith('blob:') &&
      !request.url().startsWith('data:') &&
      new URL(request.url()).origin !== new URL(baseURL!).origin
    )
      external.push(request.url());
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = '8px Minecraft';
    return ['W', 'i', ' ', 'Hello'].map(
      (text) => context.measureText(text).width,
    );
  });
  expect(metrics).toEqual([6, 2, 4, 24]);
  await page
    .getByRole('textbox', { name: 'Book page 1', exact: true })
    .fill('hello');
  await expect(page.locator('#page-text')).toHaveValue('hello');
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test('fullscreen follows browser state and Escape returns through the menu hierarchy', async ({
  page,
  browserName,
}) => {
  await page.goto('/');
  await options(page);
  await page
    .getByRole('button', { name: 'Video Settings...', exact: true })
    .click();
  const control = page.getByRole('button', {
    name: 'Fullscreen: OFF',
    exact: true,
  });
  if (await control.isEnabled()) {
    await control.click();
    // WebKit may refuse fullscreen in headless or emulated mobile contexts.
    if (browserName === 'chromium') {
      await expect(
        page.getByRole('button', { name: 'Fullscreen: ON', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
      await page.evaluate(() => document.exitFullscreen());
      await expect(control).toHaveAttribute('aria-pressed', 'false');
    } else {
      const active = await page.evaluate(() =>
        Boolean(document.fullscreenElement),
      );
      await expect(page.locator('#fullscreen')).toHaveAttribute(
        'aria-pressed',
        String(active),
      );
      if (active) await page.evaluate(() => document.exitFullscreen());
    }
  }
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('heading', { name: 'Options', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('heading', { name: 'Game Menu', exact: true }),
  ).toBeVisible();
});

test('book and settings fit small and large viewports', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    for (const selector of ['#page-text', '#close', '#next']) {
      const rect = await page.locator(selector).boundingBox();
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(
        width === 320 ? 568 : 900,
      );
    }
  }
  if (testInfo.project.name === 'chromium')
    await page.screenshot({ path: testInfo.outputPath('book-desktop.png') });
  await options(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await page
    .getByRole('button', { name: 'Background...', exact: true })
    .click();
  for (const name of ['Choose Image...', 'Restore Default', 'Done']) {
    const rect = await page
      .getByRole('button', { name, exact: true })
      .boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(320);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(568);
  }
  if (testInfo.project.name === 'phone')
    await page.screenshot({ path: testInfo.outputPath('settings-phone.png') });
});

test('native editing preserves Unicode, selection, undo, and composition commits', async ({
  page,
}) => {
  await page.goto('/');
  const editor = page.getByRole('textbox', {
    name: 'Book page 1',
    exact: true,
  });
  await editor.pressSequentially('note');
  await editor.press('ControlOrMeta+z');
  await expect(editor).toHaveValue('');
  await editor.press('ControlOrMeta+Shift+z');
  await expect(editor).toHaveValue('note');
  await editor.fill('Café 日本語 🙂');
  await editor.evaluate((field) => {
    if (!(field instanceof HTMLTextAreaElement))
      throw new Error('Expected book textarea');
    const textarea = field;
    textarea.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    textarea.value = 'Café 日本語 🙂\n한글';
    textarea.dispatchEvent(
      new InputEvent('input', { bubbles: true, isComposing: true }),
    );
  });
  expect(
    JSON.parse(
      (await page.evaluate(() => localStorage.getItem('book-n-quill:draft')))!,
    ).pages[0],
  ).toBe('Café 日本語 🙂');
  await editor.evaluate((field) =>
    field.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true }),
    ),
  );
  await page.reload();
  await expect(editor).toHaveValue('Café 日本語 🙂\n한글');
  await editor.press('ControlOrMeta+a');
  expect(
    await editor.evaluate((field) => {
      if (!(field instanceof HTMLTextAreaElement))
        throw new Error('Expected book textarea');
      const textarea = field;
      return textarea.selectionEnd - textarea.selectionStart;
    }),
  ).toBe('Café 日本語 🙂\n한글'.length);
});

test('music waits for interaction and UI/page sounds use the original audio sources', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play;
    const observed: { src: string; volume: number; ok: boolean }[] = [];
    Object.assign(window, { audioObserved: observed });
    HTMLMediaElement.prototype.play = async function () {
      const item = { src: this.src, volume: this.volume, ok: false };
      observed.push(item);
      await play.call(this);
      item.ok = true;
    };
  });
  await page.goto('/');
  const observed = () => page.evaluate(() => window.audioObserved);
  expect(await observed()).toEqual([]);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect
    .poll(async () =>
      (await observed()).some(
        (item) => item.src.endsWith('/sweden.ogg') && item.ok,
      ),
    )
    .toBe(true);
  const sounds = await observed();
  expect(sounds.find((item) => item.src.endsWith('/sweden.ogg'))?.volume).toBe(
    0.15,
  );
  expect(
    sounds.some(
      (item) => /open_flip[123]\.ogg$/.test(item.src) && item.volume === 0.5,
    ),
  ).toBe(true);
  expect(sounds.some((item) => item.src.endsWith('/click.ogg'))).toBe(false);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect
    .poll(async () =>
      (await observed()).some(
        (item) => item.src.endsWith('/click.ogg') && item.ok,
      ),
    )
    .toBe(true);
});
