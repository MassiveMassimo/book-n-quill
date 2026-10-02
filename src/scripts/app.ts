import {
  DRAFT_KEY,
  DEFAULT_DRAFT,
  PAGE_LIMIT,
  exportBook,
  filename,
  pageFits,
  parseDraft,
} from './book';
import { SETTINGS_KEY, DEFAULT_SETTINGS, parseSettings } from './settings';
import { decodeImage, storedBackground, validateImage } from './background';
import { gameAudio } from './audio';
import { THEMES } from './themes';
import { createPanorama } from './panorama';

// SAFETY: IDs and requested element types match the bundled Astro templates.
const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const game = element('game');
const editor = element<HTMLTextAreaElement>('page-text');
const title = element<HTMLInputElement>('book-title');
const finalize = element<HTMLButtonElement>('finalize');
const next = element<HTMLButtonElement>('next');
const fullscreen = element<HTMLButtonElement>('fullscreen');
const fileInput = element<HTMLInputElement>('background-file');
const chooseBackground = element<HTMLButtonElement>('choose-background');
const restoreBackground = element<HTMLButtonElement>('restore-background');
const cycleTheme = element<HTMLButtonElement>('background-theme');
const notice = element('notice');
let noticeTimer: ReturnType<typeof setTimeout>;
let persistentNotice = '';
let saveBlocked = false;

function notify(message: string, persistent = false) {
  clearTimeout(noticeTimer);
  notice.textContent = message;
  notice.hidden = false;
  if (persistent) persistentNotice = message;
  else
    noticeTimer = setTimeout(() => {
      notice.textContent = persistentNotice;
      notice.hidden = !persistentNotice;
    }, 5000);
}

let draft = structuredClone(DEFAULT_DRAFT);
let settings = { ...DEFAULT_SETTINGS };
try {
  const saved = parseDraft(localStorage.getItem(DRAFT_KEY));
  draft = saved.draft;
  settings = parseSettings(localStorage.getItem(SETTINGS_KEY));
  saveBlocked = saved.invalid;
  if (saveBlocked)
    notify(
      'Saved book could not be read. It is kept untouched. Sign to export new writing.',
      true,
    );
} catch {
  notify(
    'Browser storage is unavailable. Keep this tab open or sign to export.',
    true,
  );
}

function saveDraft() {
  if (saveBlocked) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    notify(
      'Could not save this book. Keep this tab open or sign to export.',
      true,
    );
  }
}
function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    notify('Settings could not be saved in this browser.');
  }
}

const audio = gameAudio(settings);
type Screen =
  | 'book'
  | 'sign'
  | 'scene'
  | 'menu'
  | 'options'
  | 'sounds'
  | 'video'
  | 'export'
  | 'background';
let screen: Screen = 'book';
let resumeScreen: 'book' | 'scene' = 'scene';
const panels: Screen[] = [
  'menu',
  'options',
  'sounds',
  'video',
  'export',
  'background',
];
const focusByScreen = new Map<Screen, HTMLElement>();
const panoramaCanvas = element<HTMLCanvasElement>('panorama');
panoramaCanvas.addEventListener('webglcontextlost', () => {
  panorama = undefined;
  panoramaCanvas.hidden = true;
  if (document.pointerLockElement === game) document.exitPointerLock();
});
const mouseInput = matchMedia('(hover: hover) and (pointer: fine)');
let panorama: Awaited<ReturnType<typeof createPanorama>>;
let panoramaLoading = false;
let lockPending = false;
let lockLostAt = -Infinity;
let suppressContextMenu = false;
const panoramaSelected = () => !backgroundUrl;
const selectedTheme = () =>
  THEMES.find((theme) => theme.id === settings.background) ?? THEMES[0];
const panoramaReady = () =>
  panorama &&
  panoramaCanvas.dataset.source === selectedTheme().panoramaDir &&
  !panoramaCanvas.hidden;

function captureMouse() {
  if (
    screen !== 'scene' ||
    !mouseInput.matches ||
    !panoramaSelected() ||
    !panoramaReady() ||
    !game.requestPointerLock ||
    lockPending ||
    document.pointerLockElement === game
  )
    return;
  lockPending = true;
  try {
    const request = game.requestPointerLock();
    request?.catch(() => {
      lockPending = false;
      notify('Mouse-look unavailable. Click the Book and Quill to write.');
    });
  } catch {
    lockPending = false;
    notify('Mouse-look unavailable. Click the Book and Quill to write.');
  }
}
function enterScene() {
  show('scene');
  captureMouse();
}
document.addEventListener('pointerlockchange', () => {
  lockPending = false;
  const locked = document.pointerLockElement === game;
  const wasLocked = game.dataset.looking === 'true';
  game.dataset.looking = String(locked);
  if (
    locked &&
    (screen !== 'scene' || !mouseInput.matches || !panoramaSelected())
  )
    document.exitPointerLock();
  else if (!locked && wasLocked && screen === 'scene') {
    lockLostAt = performance.now();
    openMenu();
  }
});
document.addEventListener('pointerlockerror', () => {
  lockPending = false;
  notify('Mouse-look unavailable. Click the Book and Quill to write.');
});
document.addEventListener('mousemove', (event) => {
  if (screen === 'scene' && document.pointerLockElement === game)
    panorama?.move(event.movementX, event.movementY);
});
game.addEventListener('click', (event) => {
  if (
    screen === 'scene' &&
    event.target instanceof Element &&
    !event.target.closest('button')
  )
    captureMouse();
});
game.addEventListener('mousedown', (event) => {
  suppressContextMenu = false;
  if (event.button !== 2 || screen !== 'scene' || !mouseInput.matches) return;
  event.preventDefault();
  suppressContextMenu = true;
  show('book');
});
game.addEventListener('contextmenu', (event) => {
  if (!suppressContextMenu) return;
  event.preventDefault();
  suppressContextMenu = false;
});

function show(target: Screen, focus = true) {
  if (document.activeElement instanceof HTMLElement)
    focusByScreen.set(screen, document.activeElement);
  screen = target;
  if (target !== 'scene' && document.pointerLockElement === game)
    document.exitPointerLock();
  game.dataset.screen = target;
  game.scrollTop = 0;
  resize();
  element('book-panel').hidden = !['book', 'sign'].includes(target);
  element('editing').hidden = target !== 'book';
  element('signing').hidden = target !== 'sign';
  element('hud').hidden = target !== 'scene';
  for (const name of panels) element(`${name}-panel`).hidden = target !== name;
  if (
    target === 'background' &&
    panoramaSelected() &&
    panoramaReady() &&
    mouseInput.matches &&
    panorama
  ) {
    element('background-preview').querySelector('img')!.src =
      panorama.snapshot();
  }
  if (!focus) return;
  let field: HTMLElement | null | undefined;
  if (target === 'book') field = editor;
  else if (target === 'sign') field = title;
  else if (target === 'scene') field = element('reopen');
  else
    field =
      focusByScreen.get(target) ??
      element(`${target}-panel`).querySelector<HTMLElement>('button, input');
  field?.focus({ preventScroll: true });
}

function updatePage() {
  editor.value = draft.pages[draft.page];
  element('page-number').textContent =
    `Page ${draft.page + 1} of ${draft.pages.length}`;
  editor.setAttribute('aria-label', `Book page ${draft.page + 1}`);
  element('previous').hidden = draft.page === 0;
  next.disabled = draft.page === PAGE_LIMIT - 1;
}

let composing = false;
let selection = { start: 0, end: 0 };
editor.addEventListener('beforeinput', () => {
  selection = { start: editor.selectionStart, end: editor.selectionEnd };
});
function commitPage() {
  if (pageFits(editor.value)) {
    draft.pages[draft.page] = editor.value;
    saveDraft();
  } else {
    editor.value = draft.pages[draft.page];
    editor.setSelectionRange(selection.start, selection.end);
    notify('This page is full. Turn the page to keep writing.');
  }
}
editor.addEventListener('compositionstart', () => {
  composing = true;
});
editor.addEventListener('compositionend', () => {
  composing = false;
  commitPage();
});
editor.addEventListener('input', () => {
  if (!composing) commitPage();
});
title.addEventListener('input', () => {
  draft.title = title.value;
  finalize.disabled = !title.value.trim();
  saveDraft();
});

function turnPage(direction: -1 | 1) {
  if (composing) return;
  if (direction === -1 && draft.page === 0) return;
  if (direction === 1 && draft.page === PAGE_LIMIT - 1) return;
  if (direction === 1 && draft.page === draft.pages.length - 1)
    draft.pages.push('');
  draft.page += direction;
  updatePage();
  saveDraft();
  audio.play('page');
  editor.focus({ preventScroll: true });
}
element('previous').addEventListener('click', () => turnPage(-1));
next.addEventListener('click', () => turnPage(1));
element('sign').addEventListener('click', () => {
  title.value = draft.title;
  finalize.disabled = !title.value.trim();
  show('sign');
});
element('cancel-sign').addEventListener('click', () => show('book'));
element('close').addEventListener('click', () => {
  saveDraft();
  enterScene();
});
element('reopen').addEventListener('click', () => show('book'));

finalize.addEventListener('click', () => {
  if (!draft.title.trim()) return;
  saveDraft();
  const blob = new Blob([exportBook(draft)], {
    type:
      settings.format === 'md'
        ? 'text/markdown;charset=utf-8'
        : 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename(draft.title, settings.format);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  enterScene();
});

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLButtonElement>('button');
  if (!button || button.disabled) return;
  if (!button.classList.contains('page-arrow')) audio.play('click');
  if (button.dataset.screen) {
    // SAFETY: data-screen values are fixed Screen identifiers in Menus.astro.
    show(button.dataset.screen as Screen);
  }
  if (button.dataset.action === 'resume') {
    if (resumeScreen === 'scene') enterScene();
    else show(resumeScreen);
  }
});
function openMenu() {
  resumeScreen = screen === 'book' || screen === 'sign' ? 'book' : 'scene';
  saveDraft();
  show('menu');
}
element('touch-menu').addEventListener('click', () => {
  if (['book', 'sign', 'scene'].includes(screen)) openMenu();
  else show(resumeScreen);
});
document.addEventListener('keydown', (event) => {
  if (event.isComposing || composing) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (
      event.repeat ||
      (screen === 'menu' && performance.now() - lockLostAt < 150)
    )
      return;
    if (screen === 'book') {
      saveDraft();
      show('scene');
    } else if (screen === 'sign') show('book');
    else if (screen === 'scene') openMenu();
    else if (screen === 'menu') show(resumeScreen);
    else if (screen === 'options') show('menu');
    else show('options');
  } else if (screen === 'book' && ['PageDown', 'PageUp'].includes(event.key)) {
    event.preventDefault();
    turnPage(event.key === 'PageDown' ? 1 : -1);
  } else if (screen === 'sign' && event.key === 'Enter' && !finalize.disabled) {
    event.preventDefault();
    finalize.click();
  }
});

for (const [name, key] of [
  ['music', 'music'],
  ['effects', 'effects'],
] as const) {
  const slider = element<HTMLInputElement>(`${name}-volume`);
  const updateLabel = () => {
    element(`${name}-label`).textContent =
      `${name === 'music' ? 'Music' : 'Sound Effects'}: ${settings[key] === 0 ? 'OFF' : `${settings[key]}%`}`;
  };
  slider.value = String(settings[key]);
  updateLabel();
  slider.addEventListener('input', () => {
    settings[key] = Number(slider.value);
    updateLabel();
    audio.update();
    saveSettings();
  });
  slider.addEventListener('change', () => audio.play('click'));
}
function updateFormat() {
  element('export-format').textContent =
    `Format: ${settings.format === 'md' ? 'Markdown (.md)' : 'Plain Text (.txt)'}`;
}
element('export-format').addEventListener('click', () => {
  settings.format = settings.format === 'md' ? 'txt' : 'md';
  updateFormat();
  saveSettings();
});

function updateFullscreen() {
  const active = Boolean(document.fullscreenElement);
  fullscreen.textContent = `Fullscreen: ${active ? 'ON' : 'OFF'}`;
  fullscreen.setAttribute('aria-pressed', String(active));
  if (!document.fullscreenEnabled) {
    fullscreen.disabled = true;
    element('fullscreen-help').textContent =
      'Fullscreen is unavailable in this browser.';
  }
}
fullscreen.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    notify('The browser could not enter fullscreen.');
  }
  updateFullscreen();
});
document.addEventListener('fullscreenchange', () => {
  updateFullscreen();
  resize();
});

let backgroundUrl: string | undefined;
function applyBackground(url?: string) {
  const previous = backgroundUrl;
  backgroundUrl = url;
  for (const id of ['background', 'background-preview']) {
    const container = element(id);
    container.querySelector('img')!.src =
      url ??
      (THEMES.find((theme) => theme.id === settings.background) ?? THEMES[0])
        .src;
  }
  cycleTheme.textContent = `Theme: ${url ? 'Custom' : (THEMES.find((theme) => theme.id === settings.background) ?? THEMES[0]).name}`;
  updatePanorama();
  if (previous) URL.revokeObjectURL(previous);
}
function updatePanorama() {
  const active = panoramaSelected() && mouseInput.matches;
  const source = selectedTheme().panoramaDir;
  panoramaCanvas.hidden =
    !active || !panorama || panoramaCanvas.dataset.source !== source;
  if (active && panorama && panoramaReady()) {
    panorama.resize();
    if (screen === 'background')
      element('background-preview').querySelector('img')!.src =
        panorama.snapshot();
  }
  if (!active && document.pointerLockElement === game)
    document.exitPointerLock();
  if (active && !panoramaReady() && !panoramaLoading) {
    panoramaLoading = true;
    void (async () => {
      try {
        panorama ??= await createPanorama(panoramaCanvas, source);
        while (
          panorama &&
          panoramaSelected() &&
          mouseInput.matches &&
          panoramaCanvas.dataset.source !== selectedTheme().panoramaDir
        ) {
          await panorama.load(selectedTheme().panoramaDir);
        }
      } catch {
        notify('Background could not be loaded. A still view is shown.');
      } finally {
        panoramaLoading = false;
        panoramaCanvas.hidden =
          !panorama ||
          !panoramaSelected() ||
          !mouseInput.matches ||
          panoramaCanvas.dataset.source !== selectedTheme().panoramaDir;
        if (!panoramaCanvas.hidden && panorama) {
          panorama.resize();
          if (screen === 'background')
            element('background-preview').querySelector('img')!.src =
              panorama.snapshot();
        }
      }
    })();
  }
}
mouseInput.addEventListener('change', updatePanorama);
function backgroundBusy(busy: boolean) {
  chooseBackground.disabled = busy;
  restoreBackground.disabled = busy;
  cycleTheme.disabled = busy;
}
applyBackground();
backgroundBusy(true);
void (async () => {
  try {
    const saved =
      !settings.background || settings.background === 'custom'
        ? await storedBackground()
        : undefined;
    if (saved) applyBackground(await decodeImage(saved));
  } catch {
    notify('Custom background could not be restored. The default is shown.');
  } finally {
    backgroundBusy(false);
  }
})();
chooseBackground.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  backgroundBusy(true);
  let url: string | undefined;
  try {
    if (file.size > 10 * 1024 * 1024)
      throw new Error('Choose an image under 10 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = validateImage(bytes, file.type);
    const blob = new Blob([bytes], { type: mime });
    url = await decodeImage(blob);
    await storedBackground(blob);
    settings.background = 'custom';
    saveSettings();
    applyBackground(url);
    url = undefined;
  } catch (error) {
    notify(
      error instanceof Error &&
        /Choose|image|PNG|Animated|file type/.test(error.message)
        ? error.message
        : 'Image could not be saved. The previous background is kept.',
    );
  } finally {
    if (url) URL.revokeObjectURL(url);
    fileInput.value = '';
    backgroundBusy(false);
  }
});
restoreBackground.addEventListener('click', async () => {
  backgroundBusy(true);
  try {
    await storedBackground(null);
    settings.background = THEMES[0].id;
    saveSettings();
    applyBackground();
  } catch {
    notify('Background could not be reset. Please retry.');
  } finally {
    backgroundBusy(false);
  }
});
cycleTheme.addEventListener('click', () => {
  const index = backgroundUrl
    ? -1
    : THEMES.findIndex(
        (theme) => theme.id === (settings.background ?? THEMES[0].id),
      );
  settings.background = THEMES[(index + 1) % THEMES.length].id;
  saveSettings();
  applyBackground();
});

function resize() {
  const width = window.innerWidth;
  const height = window.visualViewport?.height ?? window.innerHeight;
  const touch = matchMedia('(pointer: coarse), (max-width: 600px)').matches;
  const scale = touch
    ? Math.min((width - 12) / 200, 2)
    : Math.max(
        1,
        Math.min(
          Math.floor(width / 320),
          Math.floor(height / (screen === 'background' ? 260 : 240)),
        ),
      );
  document.documentElement.style.setProperty(
    '--gui-scale',
    String(Math.max(0.65, scale)),
  );
  document.documentElement.style.setProperty(
    '--viewport-ratio',
    String(width / window.innerHeight),
  );
  document.documentElement.style.setProperty('--visible-height', `${height}px`);
  panorama?.resize();
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
window.addEventListener('pagehide', saveDraft);
updatePage();
updateFormat();
updateFullscreen();
resize();
show('book', !matchMedia('(pointer: coarse)').matches);
