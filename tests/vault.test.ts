import { describe, it, expect } from 'vitest';
import { deriveKeyFromPin, encryptData, decryptData } from '../src/vault/crypto';

describe('Vault Cryptography (Argon2id + AES-GCM)', () => {
  const testPin = '123456';
  const wrongPin = '654321';
  const sampleData = new TextEncoder().encode('Sensitive evidence metadata payload');

  it('encrypts and decrypts data with the correct PIN', async () => {
    const salt = new Uint8Array(16);
    salt.fill(42);

    const key = await deriveKeyFromPin(testPin, salt);
    const encrypted = await encryptData(sampleData, key);

    expect(encrypted.ciphertext.byteLength).toBeGreaterThan(0);
    expect(encrypted.iv.byteLength).toBe(12);

    const decrypted = await decryptData(encrypted.ciphertext, encrypted.iv, key);
    const decryptedText = new TextDecoder().decode(decrypted);

    expect(decryptedText).toBe('Sensitive evidence metadata payload');
  });

  it('fails decryption with wrong key', async () => {
    const salt = new Uint8Array(16);
    salt.fill(42);

    const correctKey = await deriveKeyFromPin(testPin, salt);
    const wrongKey = await deriveKeyFromPin(wrongPin, salt);

    const encrypted = await encryptData(sampleData, correctKey);

    await expect(
      decryptData(encrypted.ciphertext, encrypted.iv, wrongKey)
    ).rejects.toThrow();
  });
});

