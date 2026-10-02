import { picklist } from 'valibot';

export const THEMES = [
  {
    id: 'panorama',
    name: 'Panorama',
    src: '/minecraft/panorama/panorama-still.jpg',
  },
  { id: 'mountains', name: 'Mountains', src: '/backgrounds/mountains.jpg' },
  {
    id: 'cherry-grove',
    name: 'Cherry Grove',
    src: '/backgrounds/cherry-grove.jpg',
  },
  { id: 'badlands', name: 'Badlands', src: '/backgrounds/badlands.jpg' },
  { id: 'village', name: 'Village', src: '/backgrounds/plains.jpg' },
] as const;

export type BackgroundChoice = (typeof THEMES)[number]['id'] | 'custom';

export const backgroundChoiceSchema = picklist([
  'custom',
  ...THEMES.map((theme) => theme.id),
]);
