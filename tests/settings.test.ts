import { test, expect } from 'bun:test';
import { DEFAULT_SETTINGS, parseSettings } from '../src/scripts/settings';

test('settings decode numeric volumes and retain valid settings with an invalid theme', () => {
  expect(
    parseSettings(
      JSON.stringify({
        music: 20,
        effects: 30,
        format: 'txt',
        background: 'missing',
      }),
    ),
  ).toEqual({ music: 20, effects: 30, format: 'txt', background: undefined });
  expect(
    parseSettings(
      JSON.stringify({
        music: 0,
        effects: 100,
        format: 'md',
        background: 'panorama',
      }),
    ).background,
  ).toBe('panorama');
  for (const value of [
    null,
    [],
    { music: '20', effects: 30, format: 'md' },
    { music: 101, effects: 30, format: 'md' },
  ]) {
    expect(parseSettings(JSON.stringify(value))).toEqual(DEFAULT_SETTINGS);
  }
});
