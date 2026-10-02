import { picklist } from 'valibot';

export const THEMES = [
  {
    id: 'panorama',
    name: 'Autumn Camp',
    src: '/minecraft/panorama/panorama-still.jpg',
    panoramaDir: '/minecraft/panorama',
  },
  {
    id: 'snowy-coast',
    name: 'Night Coast',
    src: '/backgrounds/snowy-coast/still.jpg',
    panoramaDir: '/backgrounds/snowy-coast',
  },
  {
    id: 'cherry-grove',
    name: 'Cherry Grove',
    src: '/backgrounds/cherry-grove/still.jpg',
    panoramaDir: '/backgrounds/cherry-grove',
  },
  {
    id: 'sulfur-caves',
    name: 'Sulfur Caves',
    src: '/backgrounds/sulfur-caves/still.jpg',
    panoramaDir: '/backgrounds/sulfur-caves',
  },
] as const;

export type BackgroundChoice = (typeof THEMES)[number]['id'] | 'custom';

export const backgroundChoiceSchema = picklist([
  'custom',
  ...THEMES.map((theme) => theme.id),
]);
