"""Read-only extraction of the local Java 26.3 reference. Never writes to game files."""
from pathlib import Path
from io import BytesIO
import hashlib
import json
import zipfile
from math import tan, radians
from PIL import Image
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = Path(__file__).resolve().parents[1]
GAME = Path.home() / 'Library/Application Support/Swift Craft Launcher'
JAR = GAME / 'meta/versions/26.3/26.3.jar'
OUT = ROOT / 'public/minecraft'
OUT.mkdir(parents=True, exist_ok=True)
records = []

def write_asset(source, data, destination):
    target = ROOT / 'public' / destination
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    records.append({'source': source, 'file': destination,
                    'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})

with zipfile.ZipFile(JAR) as jar:
    paths = ['gui/book.png', 'item/writable_book.png', 'item/written_book.png', 'block/dirt.png']
    paths += ['gui/sprites/widget/' + name + '.png' for name in [
        'button', 'button_highlighted', 'button_disabled', 'slider', 'slider_highlighted',
        'slider_handle', 'slider_handle_highlighted', 'page_forward',
        'page_forward_highlighted', 'page_backward', 'page_backward_highlighted']]
    paths += ['gui/sprites/hud/' + name + '.png' for name in ['hotbar', 'hotbar_selection', 'crosshair']]
    for path in paths:
        source = 'assets/minecraft/textures/' + path
        write_asset(source, jar.read(source), 'minecraft/' + Path(path).name)

    # Each opaque source pixel becomes one exact square in an outline webfont.
    # 100 font units = one game pixel; at 8px the em is exactly eight game pixels.
    glyphs = {'.notdef': TTGlyphPen(None).glyph()}
    metrics = {'.notdef': (600, 0)}
    cmap = {}
    widths = {}
    providers = json.loads(jar.read('assets/minecraft/font/include/default.json'))['providers']
    for provider in providers:
        source = 'assets/minecraft/textures/' + provider['file'].split(':')[1]
        data = jar.read(source)
        write_asset(source, data, 'minecraft/reference/' + Path(source).name)
        bitmap = Image.open(BytesIO(data)).convert('RGBA')
        rows = provider['chars']
        cw, ch = bitmap.width // len(rows[0]), bitmap.height // len(rows)
        scale = provider.get('height', 8) / ch
        ascent = provider['ascent']
        for row, chars in enumerate(rows):
            for col, char in enumerate(chars):
                if char == '\x00' or ord(char) in cmap:
                    continue
                tile = bitmap.crop((col*cw, row*ch, (col+1)*cw, (row+1)*ch))
                bounds = tile.getchannel('A').getbbox()
                if not bounds:
                    continue
                pen = TTGlyphPen(None)
                for y in range(ch):
                    for x in range(cw):
                        if tile.getpixel((x, y))[3]:
                            left, right = round(x*scale*100), round((x+1)*scale*100)
                            bottom, top = round((ascent-(y+1)*scale)*100), round((ascent-y*scale)*100)
                            pen.moveTo((left, bottom)); pen.lineTo((left, top))
                            pen.lineTo((right, top)); pen.lineTo((right, bottom)); pen.closePath()
                name = 'u' + format(ord(char), 'X')
                advance = int(bounds[2]*scale + 0.5) + 1
                glyphs[name] = pen.glyph(); metrics[name] = (advance*100, round(bounds[0]*scale*100))
                cmap[ord(char)] = name; widths[char] = advance
    for char, width in [(' ', 4), ('\u200c', 0)]:
        name = 'u' + format(ord(char), 'X')
        glyphs[name] = TTGlyphPen(None).glyph(); metrics[name] = (width*100, 0)
        cmap[ord(char)] = name; widths[char] = width
    fb = FontBuilder(800, isTTF=True)
    fb.setupGlyphOrder(list(glyphs)); fb.setupCharacterMap(cmap); fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics); fb.setupHorizontalHeader(ascent=700, descent=-200, lineGap=0)
    fb.setupNameTable({'familyName': 'Minecraft Java Bitmap', 'styleName': 'Regular',
                      'uniqueFontIdentifier': 'Minecraft-Java-26.3-Bitmap',
                      'fullName': 'Minecraft Java Bitmap', 'psName': 'MinecraftJavaBitmap'})
    fb.setupOS2(sTypoAscender=700, sTypoDescender=-200, sTypoLineGap=0,
                usWinAscent=1000, usWinDescent=300)
    fb.setupPost(); fb.setupMaxp(); fb.font.flavor = 'woff2'
    stream = BytesIO(); fb.font.save(stream)
    write_asset('Java 26.3 bitmap providers; pixel outlines, original advances',
                stream.getvalue(), 'minecraft/minecraft.woff2')
    (ROOT / 'src/scripts').mkdir(parents=True, exist_ok=True)
    (ROOT / 'src/scripts/glyph-widths.json').write_text(json.dumps(widths, ensure_ascii=False))

index = json.loads((GAME / 'meta/assets/indexes/34.json').read_text())['objects']
audio = ['item/book/open_flip1', 'item/book/open_flip2', 'item/book/open_flip3',
         'item/book/close_put1', 'item/book/close_put2', 'random/click', 'music/game/sweden']
for name in audio:
    key = 'minecraft/sounds/' + name + '.ogg'
    digest = index[key]['hash']
    data = (GAME / 'meta/assets/objects' / digest[:2] / digest).read_bytes()
    write_asset(key + ' (object ' + digest + ')', data, 'minecraft/' + Path(name).name + '.ogg')

# Original panorama objects from asset index 34, not the selected resource packs.
panorama = []
for face in range(6):
    key = f'minecraft/textures/gui/title/background/panorama_{face}.png'
    digest = index[key]['hash']
    data = (GAME / 'meta/assets/objects' / digest[:2] / digest).read_bytes()
    if hashlib.sha1(data).hexdigest() != digest:
        raise ValueError(f'Panorama object hash mismatch: {key}')
    write_asset(key + ' (index 34, object ' + digest + ')', data,
                f'minecraft/panorama/panorama_{face}.png')
    panorama.append(Image.open(BytesIO(data)).convert('RGB'))

# Fixed upright perspective, yaw/pitch 0, 70-degree vertical FOV. No phone WebGL.
width, height = 1600, 900
tangent = tan(radians(35))
pixels = []
for y in range(height):
    ry = (1 - 2 * (y + .5) / height) * tangent
    for x in range(width):
        rx = (2 * (x + .5) / width - 1) * width / height * tangent
        if abs(rx) <= 1:
            face, u, v = 0, (rx + 1) / 2, (1 - ry) / 2
        else:
            face = 1 if rx > 0 else 3
            u = (1 - 1 / rx) / 2
            v = (1 - ry / abs(rx)) / 2
        image = panorama[face]
        pixels.append(image.getpixel((min(image.width - 1, int(u * image.width)),
                                      min(image.height - 1, int(v * image.height)))))
still = Image.new('RGB', (width, height)); still.putdata(pixels)
stream = BytesIO(); still.save(stream, format='JPEG', quality=95, subsampling=0)
write_asset('Derived from Java 26.3 panorama faces 0/1/3; upright yaw=0 pitch=0, '
            '70deg vertical FOV, 1600x900, nearest sampling, JPEG quality 95',
            stream.getvalue(), 'minecraft/panorama/panorama-still.jpg')

manifest = {'reference': 'Minecraft Java 26.3', 'jarSha256': hashlib.sha256(JAR.read_bytes()).hexdigest(),
            'files': records, 'fontGlyphs': len(cmap),
            'panorama': {'assetIndex': 34, 'cubeFacesPositiveNegativeXYZ': [1, 3, 5, 4, 0, 2],
                         'mappingSource': 'Installed CubeMapTexture.SUFFIXES and CubeMap.render javap',
                         'uploadFlipY': True, 'uprightRay': [ 'x', '-y', 'z' ],
                         'verticalFovDegrees': 70, 'gameVerticalFovDegrees': 85,
                         'still': 'minecraft/panorama/panorama-still.jpg'},
            'release': 'Local prototype. Review original asset and music redistribution before public release.'}
(ROOT / 'docs/references').mkdir(parents=True, exist_ok=True)
(ROOT / 'docs/references/assets.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Extracted {len(records)} assets; generated {len(cmap)} original bitmap glyphs.')
