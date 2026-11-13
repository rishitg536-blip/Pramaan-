import { describe, it, expect } from 'vitest';
import { canonicalJson } from '../src/core/canonical';

describe('Canonical JSON serialization', () => {
  it('is independent of key insertion order', () => {
    const objA = { z: 1, a: 2, m: { y: 'hello', b: 'world' } };
    const objB = { a: 2, m: { b: 'world', y: 'hello' }, z: 1 };
    expect(canonicalJson(objA)).toBe(canonicalJson(objB));
    expect(canonicalJson(objA)).toBe('{"a":2,"m":{"b":"world","y":"hello"},"z":1}');
  });

  it('produces no whitespace', () => {
    const obj = { arr: [1, 2, 'three', { deep: true }] };
    const json = canonicalJson(obj);
    expect(json).not.toMatch(/\s/);
    expect(json).toBe('{"arr":[1,2,"three",{"deep":true}]}');
  });

  it('preserves unicode characters', () => {
    const obj = { text: 'नमस्ते दुनिया 🌟' };
    const json = canonicalJson(obj);
    expect(json).toBe('{"text":"नमस्ते दुनिया 🌟"}');
  });

  it('preserves null and drops undefined in objects', () => {
    const obj = {
      keptNull: null,
      droppedUndefined: undefined,
      nested: {
        alsoNull: null,
        alsoUndefined: undefined,
        valid: 42,
      },
    };
    const json = canonicalJson(obj);
    expect(json).toBe('{"keptNull":null,"nested":{"alsoNull":null,"valid":42}}');
  });
});

