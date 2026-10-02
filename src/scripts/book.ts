import glyphWidths from './glyph-widths.json' with { type: 'json' };
import * as v from 'valibot';

export type Draft = { pages: string[]; page: number; title: string };
export type ExportFormat = 'md' | 'txt';
export const DRAFT_KEY = 'book-n-quill:draft';
export const DEFAULT_DRAFT: Draft = { pages: [''], page: 0, title: '' };
export const PAGE_LIMIT = 100;
const widths = new Map(Object.entries(glyphWidths));
const draftSchema = v.pipe(
  v.object({
    pages: v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(PAGE_LIMIT)),
    page: v.pipe(v.number(), v.integer(), v.minValue(0)),
    title: v.string(),
  }),
  v.check((draft) => draft.page < draft.pages.length),
);
type DraftResult = { draft: Draft; invalid: boolean };

export function parseDraft(raw: string | null): DraftResult {
  if (raw === null)
    return { draft: structuredClone(DEFAULT_DRAFT), invalid: false };
  try {
    const result = v.safeParse(draftSchema, JSON.parse(raw));
    if (!result.success) throw new Error('Invalid draft');
    return { draft: result.output, invalid: false };
  } catch {
    return { draft: structuredClone(DEFAULT_DRAFT), invalid: true };
  }
}

// Vanilla 26.3: text width 114px, line height 9px, 14 lines, 1024 UTF-16 units.
export function pageFits(text: string): boolean {
  if (text.length > 1024) return false;
  let line = 1,
    advance = 0,
    start = 0,
    space = -1;
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (char === '\n') {
      line++;
      advance = 0;
      start = i + 1;
      space = -1;
    } else {
      advance += char === '\t' ? 16 : (widths.get(char) ?? 8);
      if (char === ' ') space = i;
      if (advance > 114) {
        line++;
        const next = space >= start ? space + 1 : i;
        i = next - 1;
        start = next;
        advance = 0;
        space = -1;
      }
    }
    if (line > 14) return false;
  }
  return true;
}

export function exportBook(draft: Draft): string {
  const pages = [...draft.pages];
  while (pages.length > 1 && pages.at(-1) === '') pages.pop();
  return pages.join('\n\n');
}

export function filename(title: string, format: ExportFormat): string {
  const safe = title
    .normalize('NFC')
    .replace(/[<>:"/\\|?*]/g, '')
    .split('')
    .filter((char) => char.charCodeAt(0) > 31)
    .join('')
    .trim()
    .replace(/^\.+|[. ]+$/g, '')
    .trim();
  // Windows device names are reserved even when the extension is supplied.
  const name =
    !safe || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)
      ? 'book'
      : safe;
  return `${name}.${format}`;
}
