import type { ExportFormat } from './book';
import { backgroundChoiceSchema, type BackgroundChoice } from './themes';
import * as v from 'valibot';

export type Settings = {
  music: number;
  effects: number;
  format: ExportFormat;
  background?: BackgroundChoice;
};
export const SETTINGS_KEY = 'book-n-quill:settings';
export const DEFAULT_SETTINGS: Settings = {
  music: 15,
  effects: 50,
  format: 'md',
};
const volumeSchema = v.pipe(v.number(), v.minValue(0), v.maxValue(100));
const settingsSchema = v.object({
  music: volumeSchema,
  effects: volumeSchema,
  format: v.picklist(['md', 'txt']),
  background: v.optional(v.unknown()),
});

export function parseSettings(raw: string | null): Settings {
  try {
    const result = v.safeParse(settingsSchema, JSON.parse(raw ?? 'null'));
    if (!result.success) {
      return { ...DEFAULT_SETTINGS };
    }
    const value = result.output;
    const background = v.safeParse(backgroundChoiceSchema, value.background);
    return {
      music: value.music,
      effects: value.effects,
      format: value.format,
      background: background.success ? background.output : undefined,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
