import { createSHA256 } from 'hash-wasm';

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

async function subtleSha256(data: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(buffer));
  }
  throw new Error('No cryptographic SHA-256 provider available');
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  try {
    const hasher = await createSHA256();
    hasher.init();
    hasher.update(bytes);
    return hasher.digest('hex');
  } catch (err) {
    console.warn('hash-wasm failed, falling back to WebCrypto subtle:', err);
    return subtleSha256(bytes);
  }
}

export async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const hex = await sha256Hex(data);
  return hexToBytes(hex);
}

const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB chunks

export async function hashFileStream(
  blob: Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  const totalSize = blob.size;
  if (totalSize === 0) {
    if (onProgress) onProgress(1);
    return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  }

  try {
    const hasher = await createSHA256();
    hasher.init();

    let offset = 0;
    while (offset < totalSize) {
      const sliceEnd = Math.min(offset + CHUNK_SIZE, totalSize);
      const chunk = blob.slice(offset, sliceEnd);
      const buffer = await chunk.arrayBuffer();
      hasher.update(new Uint8Array(buffer));
      offset = sliceEnd;
      if (onProgress) {
        onProgress(Math.min(1, offset / totalSize));
      }
    }

    return hasher.digest('hex');
  } catch (err) {
    console.warn('hash-wasm streaming failed, falling back to WebCrypto subtle:', err);
    const arrayBuffer = await blob.arrayBuffer();
    if (onProgress) onProgress(1);
    return subtleSha256(new Uint8Array(arrayBuffer));
  }
}
