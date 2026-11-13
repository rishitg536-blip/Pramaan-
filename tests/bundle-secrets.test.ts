import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Bundle Secret Scan (Zero API keys in client build)', () => {
  const distDir = path.resolve(__dirname, '../dist');

  function getAllFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllFiles(fullPath));
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  it('verifies dist exists and contains no API keys or secret tokens', () => {
    const files = getAllFiles(distDir);
    expect(files.length).toBeGreaterThan(0);

    const secretPatterns = [
      /sk-ant-api03-[A-Za-z0-9_-]{30,}/i, // Anthropic API key
      /sk-[A-Za-z0-9]{32,}/i,             // OpenAI API key
      /AIzaSy[0-9A-Za-z-_]{33}/,          // Google Gemini API key
      /ghp_[A-Za-z0-9]{36}/i,             // GitHub PAT
      /gsk_[A-Za-z0-9_-]{20,}/i,          // Groq API key
    ];

    const violations: Array<{ file: string; match: string }> = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of secretPatterns) {
        const match = content.match(pattern);
        if (match) {
          violations.push({
            file: path.basename(file),
            match: match[0].substring(0, 8) + '...',
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

