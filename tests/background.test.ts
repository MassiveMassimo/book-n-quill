import { test } from 'bun:test';
import assert from 'node:assert/strict';
import { validateImage } from '../src/scripts/background.ts';

test('background input excludes videos, GIFs, mismatched types, and oversized files', () => {
  for (const bytes of [
    new Uint8Array([71, 73, 70, 56]),
    new Uint8Array([0, 0, 0, 24]),
  ]) {
    assert.throws(() => validateImage(bytes, ''), /still PNG or JPEG/);
  }
  const jpeg = new Uint8Array([255, 216, 255, 0]);
  assert.equal(validateImage(jpeg, 'image/jpeg'), 'image/jpeg');
  assert.throws(() => validateImage(jpeg, 'image/png'), /does not match/);
  assert.throws(
    () => validateImage(new Uint8Array(10 * 1024 * 1024 + 1), ''),
    /under 10 MB/,
  );
});

test('APNG animation is rejected even when its MIME is image/png', () => {
  const bytes = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0, 97, 99, 84, 76, 0, 0, 0, 0,
  ]);
  assert.throws(() => validateImage(bytes, 'image/png'), /Animated/);
});
