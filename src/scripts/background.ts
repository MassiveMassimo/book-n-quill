const MAX_BYTES = 10 * 1024 * 1024;

export function validateImage(
  bytes: Uint8Array,
  mime: string,
): 'image/png' | 'image/jpeg' {
  if (bytes.length > MAX_BYTES) throw new Error('Choose an image under 10 MB.');
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (byte, i) => bytes[i] === byte,
  );
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!png && !jpeg) throw new Error('Choose a still PNG or JPEG image.');
  const detected = png ? 'image/png' : 'image/jpeg';
  if (mime && mime !== detected)
    throw new Error('The file type does not match the image.');
  if (png) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset);
      if (offset + 12 + length > bytes.length)
        throw new Error('This PNG file is incomplete.');
      const type = String.fromCharCode(
        ...bytes.subarray(offset + 4, offset + 8),
      );
      if (type === 'acTL')
        throw new Error('Animated images are not supported.');
      offset += 12 + length;
      if (type === 'IEND') break;
    }
  }
  return detected;
}

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('book-n-quill', 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore('background');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(
        new Error('Background storage is busy. Close other tabs and retry.'),
      );
  });
}

export async function storedBackground(
  value?: Blob | null,
): Promise<Blob | undefined> {
  // WebKit can reject Blob objects in IndexedDB. Store their bytes and MIME type.
  const record = value
    ? { bytes: await value.arrayBuffer(), type: value.type }
    : undefined;
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
        'background',
        value === undefined ? 'readonly' : 'readwrite',
      );
      const store = tx.objectStore('background');
      const request =
        value === undefined
          ? store.get('image')
          : value === null
            ? store.delete('image')
            : store.put(record, 'image');
      tx.oncomplete = () => {
        const saved = value === undefined ? request.result : undefined;
        resolve(
          saved ? new Blob([saved.bytes], { type: saved.type }) : undefined,
        );
      };
      request.onerror = () => reject(request.error);
      tx.onerror = () =>
        reject(
          request.error ?? tx.error ?? new Error('Background storage failed.'),
        );
      tx.onabort = () =>
        reject(tx.error ?? new Error('Background storage was interrupted.'));
    });
  } finally {
    db.close();
  }
}

export async function decodeImage(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight)
      throw new Error('Image is empty.');
    return url;
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('This image could not be opened.');
  }
}
