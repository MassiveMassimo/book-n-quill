import { test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  exportBook,
  parseDraft,
  filename,
  pageFits,
  DEFAULT_DRAFT,
} from '../src/scripts/book.ts';

test('exports exact text and paragraphs, without visual wrapping or inferred headings', () => {
  const draft = {
    pages: ['# hello\n\n  indented', 'second **page**'],
    page: 1,
    title: 'My book',
  };
  assert.equal(exportBook(draft), '# hello\n\n  indented\n\nsecond **page**');
  assert.equal(exportBook({ ...draft, pages: ['hello', '', ''] }), 'hello');
});

test('safe filenames retain Unicode and cannot contain paths', () => {
  assert.equal(filename('  ../日本語: notes?  ', 'md'), '日本語 notes.md');
  assert.equal(filename('... /:*?', 'txt'), 'book.txt');
});

test('invalid stored drafts are reported instead of silently replaced', () => {
  assert.deepEqual(parseDraft(null), { draft: DEFAULT_DRAFT, invalid: false });
  for (const raw of [
    'oops',
    '{}',
    '{"pages":[7],"page":0,"title":""}',
    '{"pages":["hi"],"page":9,"title":""}',
  ]) {
    assert.equal(parseDraft(raw).invalid, true);
  }
  const draft = { pages: ['unsaved meaning', 'two'], page: 1, title: 'title' };
  assert.deepEqual(parseDraft(JSON.stringify(draft)).draft, draft);
});

test('pages use measured original widths, 14 lines, and 1024 UTF-16 units', () => {
  assert.equal(pageFits('line\n'.repeat(13) + 'last'), true);
  assert.equal(pageFits('line\n'.repeat(14) + 'overflow'), false);
  assert.equal(pageFits('W'.repeat(19)), true);
  assert.equal(pageFits('W'.repeat(19 * 14 + 1)), false);
  assert.equal(pageFits('i'.repeat(57 * 14)), true);
  assert.equal(pageFits(' '.repeat(1025)), false);
});
