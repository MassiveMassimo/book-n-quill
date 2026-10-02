import type { Settings } from './settings';

export function gameAudio(settings: Settings) {
  const music = new Audio('/minecraft/sweden.ogg');
  music.loop = true;
  music.preload = 'none';
  let started = false;
  const effects = new Set<HTMLAudioElement>();
  const update = () => {
    music.volume = settings.music / 100;
    for (const sound of effects) sound.volume = settings.effects / 100;
  };
  const resume = () => {
    if (started && settings.music > 0 && !document.hidden)
      void music.play().catch(() => {});
  };
  const start = () => {
    started = true;
    update();
    resume();
  };
  document.addEventListener('pointerdown', start, { once: true });
  document.addEventListener('keydown', start, { once: true });
  document.addEventListener('visibilitychange', () =>
    document.hidden ? music.pause() : resume(),
  );
  update();
  return {
    update() {
      update();
      if (settings.music === 0) music.pause();
      else resume();
    },
    play(kind: 'click' | 'page') {
      if (settings.effects === 0) return;
      const file =
        kind === 'page'
          ? `open_flip${1 + Math.floor(Math.random() * 3)}`
          : 'click';
      const sound = new Audio(`/minecraft/${file}.ogg`);
      sound.volume = settings.effects / 100;
      effects.add(sound);
      sound.addEventListener('ended', () => effects.delete(sound), {
        once: true,
      });
      void sound.play().catch(() => effects.delete(sound));
    },
  };
}
