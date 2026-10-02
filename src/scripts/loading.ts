const uiImages = [
  'dirt',
  'book',
  'button',
  'button_highlighted',
  'button_disabled',
  'page_backward',
  'page_forward',
  'page_backward_highlighted',
  'page_forward_highlighted',
  'hotbar',
  'hotbar_selection',
  'writable_book',
  'crosshair',
];

export async function loadOpening(
  background: string,
  panoramaDirectory: string | undefined,
  prepareView: () => Promise<void>,
) {
  // SAFETY: The bundled loading screen defines this ID as a progress element.
  const progress = document.getElementById(
    'loading-progress',
  ) as HTMLProgressElement;
  const percentage = document.getElementById('loading-percentage')!;
  const images = [
    ...uiImages.map((name) => `/minecraft/${name}.png`),
    background,
    ...(panoramaDirectory
      ? Array.from(
          { length: 6 },
          (_, face) => `${panoramaDirectory}/panorama_${face}.png`,
        )
      : []),
  ];
  progress.max = images.length + 2;
  let failed = false;
  const complete = () => {
    progress.value += 1;
    percentage.textContent = `${Math.floor((progress.value / progress.max) * 100)}%`;
  };
  const track = async (task: Promise<unknown>) => {
    try {
      await task;
      complete();
    } catch {
      failed = true;
    }
  };
  await Promise.all([
    track(document.fonts.load('8px Minecraft')),
    ...images.map((source) => {
      const image = new Image();
      image.src = source;
      return track(image.decode());
    }),
  ]);
  await track(prepareView());
  return failed;
}
