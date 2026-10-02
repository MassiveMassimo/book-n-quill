# Built-in background sources

Selected and visually inspected on 2026-10-02. These are static gameplay images
without baked-in HUD, crosshair, player hand, or watermarks. Files are unmodified
local copies. The app uses centered cover fit and makes no remote image requests.
The images are not claimed to be from Java 26.3; that version remains the GUI
reference. These screenshots do not establish publication permission.

| Theme        | Local file                            | Resolution  | Source page                                                                                                                                                                   |
| ------------ | ------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mountains    | `public/backgrounds/mountains.jpg`    | 2048 × 1152 | [Windows Central Minecraft reporting article](https://www.windowscentral.com/gaming/minecraft/saveminecraft-the-truth-and-controversy-behind-minecrafts-new-player-reporting) |
| Cherry Grove | `public/backgrounds/cherry-grove.jpg` | 748 × 421   | [Mojang: Cherry Grove](https://www.minecraft.net/en-us/article/around-block--cherry-grove)                                                                                    |
| Badlands     | `public/backgrounds/badlands.jpg`     | 748 × 421   | [Mojang: Badlands](https://www.minecraft.net/en-us/article/around-block--badlands)                                                                                            |
| Village      | `public/backgrounds/plains.jpg`       | 748 × 421   | [Mojang: Plains](https://www.minecraft.net/en-us/article/around-block--plains)                                                                                                |

The three Mojang article images have lower resolution than the mountain
image. They retain the original article bytes rather than artificial upscaling.

| File             | Direct source URL                                                                                            | SHA-256                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| mountains.jpg    | https://cdn.mos.cms.futurecdn.net/Dg5DwPErVMs36ar4YqGCcc.jpg                                                 | `9cfca1adb4a3c21943fb8dd540fd4f148d218ab0ee34ff20c0022121ffc95705` |
| cherry-grove.jpg | https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/screenshots/cherry-carousel2.jpg          | `14e60f60c25d8fe96cbc750477beab75df8a5feca62fe24a88a057a7edeb9e60` |
| badlands.jpg     | https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/screenshots/badlands-carousel2.jpg        | `ec07d323b419e16940ea085b9dd51427dc5c3ff9f2037a821d015bd399510ee4` |
| plains.jpg       | https://www.minecraft.net/content/dam/minecraftnet/games/minecraft/screenshots/plains-carousel%20%281%29.jpg | `99266f1abf11a6b9f05048af93ec1154dfbf2c262c4be3b3c3997b0a4a4f831e` |

The previous local gameplay capture was removed from product assets. The game
extraction script no longer copies it. Custom user uploads remain browser-only.
Theme choices are stored in localStorage. Switching from Custom to a built-in
theme preserves the uploaded image bytes; Restore Default removes them.
