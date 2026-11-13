import { argon2id } from 'hash-wasm';

export interface EncryptedPayload {
  ciphertext: Uint8Array;
  iv: Uint8Array;
}

/**
 * Derive 256-bit AES key from PIN using Argon2id
 */
export async function deriveKeyFromPin(
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  // Argon2id parameters
  const rawKey = await argon2id({
    password: pin,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: 16384, // 16 MB memory cost
    hashLength: 32, // 256-bit key
    outputType: 'binary',
  });

  const subtle = typeof window !== 'undefined' ? window.crypto?.subtle : globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto subtle is unavailable');
  }

  return await subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt bytes using AES-GCM 256-bit
 */
export async function encryptData(
  plaintext: Uint8Array,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const subtle = typeof window !== 'undefined' ? window.crypto?.subtle : globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto subtle is unavailable');
  }

  const iv = new Uint8Array(12);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(iv);
  } else if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(iv);
  } else {
    for (let i = 0; i < 12; i++) iv[i] = Math.floor(Math.random() * 256);
  }

  const ciphertextBuf = await subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    plaintext
  );

  return {
    ciphertext: new Uint8Array(ciphertextBuf),
    iv,
  };
}

/**
 * Decrypt bytes using AES-GCM 256-bit
 */
export async function decryptData(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  const subtle = typeof window !== 'undefined' ? window.crypto?.subtle : globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('WebCrypto subtle is unavailable');
  }

  const decryptedBuf = await subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    ciphertext
  );

  return new Uint8Array(decryptedBuf);
}
