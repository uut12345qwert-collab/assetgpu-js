/**
 * encode-image.js
 *
 * Encodes a raw RGBA8 pixel buffer (as produced by FragmentRenderer)
 * into standard still-image formats via `sharp` (libvips).
 *
 * `sharp` is dynamically imported so that consumers who only need
 * audio (WAV) or pure rendering do not require sharp to be installed.
 */

const SUPPORTED_STILL_FORMATS = new Set(['png', 'jpeg', 'jpg', 'webp', 'avif', 'gif']);

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default;
  } catch (err) {
    throw new Error(
      'sharp is required for image encoding but failed to load. ' +
      'Install it with: npm install sharp\nOriginal error: ' + err.message
    );
  }
}

/**
 * @param {Buffer} rgbaBuffer - raw RGBA8, width*height*4 bytes
 * @param {number} width
 * @param {number} height
 * @param {'png'|'jpeg'|'jpg'|'webp'|'avif'|'gif'} format
 * @param {object} [options]
 * @returns {Promise<Buffer>}
 */
export async function encodeImage(rgbaBuffer, width, height, format, options = {}) {
  const normalizedFormat = format.toLowerCase();
  if (!SUPPORTED_STILL_FORMATS.has(normalizedFormat)) {
    throw new Error(
      `Unsupported still-image format "${format}". Supported: ${[...SUPPORTED_STILL_FORMATS].join(', ')}`
    );
  }
  if (!Buffer.isBuffer(rgbaBuffer)) {
    throw new TypeError('rgbaBuffer must be a Buffer');
  }
  const expectedLength = width * height * 4;
  if (rgbaBuffer.length !== expectedLength) {
    throw new Error(
      `rgbaBuffer length ${rgbaBuffer.length} does not match width*height*4 ` +
      `(${expectedLength}) for ${width}x${height}.`
    );
  }

  const sharp = await loadSharp();
  const image = sharp(rgbaBuffer, { raw: { width, height, channels: 4 } });

  switch (normalizedFormat) {
    case 'png':
      return image.png(options).toBuffer();
    case 'jpeg':
    case 'jpg':
      return image
        .flatten({ background: options.background ?? { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: options.quality ?? 90, ...options })
        .toBuffer();
    case 'webp':
      return image.webp({ quality: options.quality ?? 90, ...options }).toBuffer();
    case 'avif':
      return image.avif({ quality: options.quality ?? 60, ...options }).toBuffer();
    case 'gif':
      return image.gif(options).toBuffer();
    default:
      throw new Error(`Unhandled format ${normalizedFormat}`);
  }
}

/**
 * Packs one source frame into a multi-resolution .ico favicon.
 */
export async function encodeIco(rgbaBuffer, sourceWidth, sourceHeight, sizes = [16, 32, 48, 64]) {
  if (sourceWidth !== sourceHeight) {
    console.warn(
      `[assetgpu] encodeIco: source is ${sourceWidth}x${sourceHeight} (non-square). ` +
      'Favicon sizes are square, so output will be stretched.'
    );
  }

  const sharp = await loadSharp();
  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(rgbaBuffer, { raw: { width: sourceWidth, height: sourceHeight, channels: 4 } })
        .resize(size, size, { fit: 'cover' })
        .png()
        .toBuffer()
    )
  );

  return packIco(pngBuffers, sizes);
}

function packIco(pngBuffers, sizes) {
  const numImages = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(numImages, 4);

  const dirEntries = [];
  let offset = headerSize + dirSize;

  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const pngBuffer = pngBuffers[i];
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(pngBuffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += pngBuffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers]);
}
