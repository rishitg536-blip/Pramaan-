import { describe, it, expect } from 'vitest';
import { GUIDE_REGISTRY } from '../src/guide/registry';
import * as fs from 'fs';
import * as path from 'path';

describe('Guide Registry and Coverage', () => {
  it('validates every guide entry has required fields and valid data class', () => {
    const validDataClasses = ['none', 'device', 'fingerprint', 'helper', 'cloud'];
    const entries = Object.values(GUIDE_REGISTRY);

    expect(entries.length).toBeGreaterThan(60);

    for (const entry of entries) {
      expect(entry.id).toBeDefined();
      expect(entry.id.trim()).not.toBe('');
      expect(entry.title).toBeDefined();
      expect(entry.title.trim()).not.toBe('');
      expect(entry.what).toBeDefined();
      expect(entry.what.trim()).not.toBe('');
      expect(validDataClasses).toContain(entry.data);
    }
  });

  it('scans all tsx files in src and ensures every data-guide value exists in GUIDE_REGISTRY', () => {
    const srcDir = path.resolve(__dirname, '../src');

    function getFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...getFiles(fullPath));
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
      return files;
    }

    const allFiles = getFiles(srcDir);
    const regex = /data-guide=["']([^"']+)["']/g;
    const foundTags = new Set<string>();

    for (const file of allFiles) {
      const content = fs.readFileSync(file, 'utf8');
      let match;
      while ((match = regex.exec(content)) !== null) {
        const tag = match[1];
        if (!tag.includes('${')) {
          foundTags.add(tag);
        }
      }
    }

    const missingInRegistry: string[] = [];
    for (const tag of foundTags) {
      if (!GUIDE_REGISTRY[tag]) {
        missingInRegistry.push(tag);
      }
    }

    expect(missingInRegistry).toEqual([]);
  });

  it('verifies that the floating Ask Guide AI button is removed from main.tsx', () => {
    const mainPath = path.resolve(__dirname, '../src/main.tsx');
    const content = fs.readFileSync(mainPath, 'utf8');
    expect(content).not.toContain('fixed bottom-6 right-6');
    expect(content).not.toContain('Ask Guide AI');
  });

  it('verifies that GuideProvider allows side-by-side execution and does not block clicks', () => {
    const providerPath = path.resolve(__dirname, '../src/guide/GuideProvider.tsx');
    const content = fs.readFileSync(providerPath, 'utf8');
    expect(content).not.toContain('e.preventDefault()');
    expect(content).not.toContain('e.stopImmediatePropagation()');
    expect(content).toContain('mouseover');
  });
});
