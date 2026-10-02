"""Fetch only pinned vanilla panorama faces and derive static phone previews."""
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from math import radians, tan
from pathlib import Path
from urllib.request import urlopen
import hashlib
import json
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REPOSITORY = 'Vanilla-Panorama-Plus/vanilla-panorama-plus-assets'
COMMIT = '04907cea00baa1d6d62f5ffcae19ed862c42071f'
SETS = [
    ('snowy-coast', 'Night Coast', '1.21.11'),
    ('cherry-grove', 'Cherry Grove', '26.1'),
    ('sulfur-caves', 'Sulfur Caves', '26.2'),
]


def github(endpoint):
    return json.loads(subprocess.check_output(['gh', 'api', endpoint]))


def fetch_face(entry):
    path = entry['path']
    url = f'https://raw.githubusercontent.com/{REPOSITORY}/{COMMIT}/{path}'
    with urlopen(url, timeout=30) as response:
        data = response.read()
    blob_hash = hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest()
    if blob_hash != entry['sha']:
        raise ValueError(f'Git blob mismatch: {path}')
    image = Image.open(BytesIO(data))
    image.load()
    if image.format != 'PNG' or image.width != image.height:
        raise ValueError(f'Expected a square PNG: {path}')
    return data, image.convert('RGB'), url


def fixed_still(faces):
    # Same upright yaw/pitch 0 projection as extract-assets.py; no face crop.
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
                face, u, v = (1 if rx > 0 else 3), (1 - 1 / rx) / 2, (1 - ry / abs(rx)) / 2
            image = faces[face]
            pixels.append(image.getpixel((min(image.width - 1, int(u * image.width)),
                                          min(image.height - 1, int(v * image.height)))))
    still = Image.new('RGB', (width, height))
    still.putdata(pixels)
    stream = BytesIO()
    still.save(stream, format='JPEG', quality=95, subsampling=0)
    return stream.getvalue()


def main():
    tree = github(f'repos/{REPOSITORY}/git/trees/{COMMIT}?recursive=1')
    if tree.get('truncated'):
        raise ValueError('Incomplete source tree')
    entries = {entry['path']: entry for entry in tree['tree'] if entry['type'] == 'blob'}
    license_files = [path for path in entries
                     if Path(path).name.lower().startswith(('license', 'copying'))]
    manifest = {
        'repository': f'https://github.com/{REPOSITORY}', 'commit': COMMIT,
        'repositoryLicense': {'files': license_files, 'spdx': None,
                              'status': 'No license file in the pinned repository tree.' if not license_files
                              else 'Inspect the listed license files before redistribution.'},
        'release': 'Local assets only. The mirror does not establish Minecraft redistribution permission.',
        'cubeFacesPositiveNegativeXYZ': [1, 3, 5, 4, 0, 2],
        'mappingSource': 'Java CubeMapTexture.SUFFIXES; same mapping as docs/references/java-26.3.md',
        'uploadFlipY': True, 'uprightRay': ['x', '-y', 'z'],
        'stillProjection': {'yaw': 0, 'pitch': 0, 'verticalFovDegrees': 70,
                            'width': 1600, 'height': 900, 'sampling': 'nearest',
                            'format': 'JPEG', 'quality': 95, 'subsampling': 0},
        'sets': [],
    }
    for identifier, name, version in SETS:
        directory = f'panorama-images/{version}/{version}-vanilla-vanilla'
        expected = [f'{directory}/panorama_{face}.png' for face in range(6)]
        with ThreadPoolExecutor(max_workers=6) as pool:
            downloaded = list(pool.map(fetch_face, [entries[path] for path in expected]))
        if len({image.size for _, image, _ in downloaded}) != 1:
            raise ValueError(f'Mismatched cube face dimensions: {identifier}')
        target = ROOT / 'public/backgrounds' / identifier
        target.mkdir(parents=True, exist_ok=True)
        files = []
        for face, (data, image, url) in enumerate(downloaded):
            filename = f'panorama_{face}.png'
            (target / filename).write_bytes(data)
            files.append({'face': face, 'file': f'backgrounds/{identifier}/{filename}',
                          'sourceUrl': url, 'gitBlobSha1': entries[expected[face]]['sha'],
                          'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data),
                          'width': image.width, 'height': image.height})
        data = fixed_still([image for _, image, _ in downloaded])
        (target / 'still.jpg').write_bytes(data)
        manifest['sets'].append({'id': identifier, 'name': name, 'minecraftVersion': version,
                                 'sourceDirectory': directory, 'faces': files,
                                 'still': {'file': f'backgrounds/{identifier}/still.jpg',
                                           'sourceFaces': [0, 1, 3], 'bytes': len(data),
                                           'sha256': hashlib.sha256(data).hexdigest()}})
        print(f'{identifier}: verified six {downloaded[0][1].width}px faces and generated still.jpg')
    (ROOT / 'docs/references/panoramas.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
