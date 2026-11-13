import { describe, it, expect } from 'vitest';
import { parseWhatsAppText, parseWhatsAppFile } from '../src/parsers/whatsapp';
import JSZip from 'jszip';

describe('WhatsApp Parser', () => {
  const fileId = 'file-test-01';
  const fileName = '_chat.txt';

  it('parses standard Android 12h format', () => {
    const raw = `15/08/2026, 9:41 pm - Alice: Hello Bob!
15/08/2026, 9:42 pm - Bob: Hi Alice, how are you?`;

    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items).toHaveLength(2);
    expect(items[0].sender).toBe('Alice');
    expect(items[0].text).toBe('Hello Bob!');
    expect(items[0].sourceRef.line).toBe(1);
    expect(items[0].ts).toBe('2026-08-15T21:41:00');

    expect(items[1].sender).toBe('Bob');
    expect(items[1].text).toBe('Hi Alice, how are you?');
    expect(items[1].ts).toBe('2026-08-15T21:42:00');
  });

  it('parses standard Android 24h format', () => {
    const raw = `15/08/2026, 21:45 - Alice: Let's meet at 10.
15/08/2026, 21:46 - Bob: Sure.`;

    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items).toHaveLength(2);
    expect(items[0].sender).toBe('Alice');
    expect(items[0].text).toBe("Let's meet at 10.");
    expect(items[0].ts).toBe('2026-08-15T21:45:00');
  });

  it('parses iOS format with square brackets and seconds', () => {
    const raw = `[15/08/2026, 09:41:22 PM] Alice: On my way!
[15/08/2026, 09:42:05 PM] Bob: Sounds good.`;

    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items).toHaveLength(2);
    expect(items[0].sender).toBe('Alice');
    expect(items[0].text).toBe('On my way!');
    expect(items[0].ts).toBe('2026-08-15T21:41:22');
  });

  it('handles multi-line messages cleanly', () => {
    const raw = `15/08/2026, 9:41 pm - Alice: Line 1
Line 2
Line 3
15/08/2026, 9:43 pm - Bob: Understood.`;

    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe('Line 1\nLine 2\nLine 3');
    expect(items[1].text).toBe('Understood.');
  });

  it('handles unicode invisible marks like LTR and narrow non-breaking space', () => {
    // \u200e = Left-to-Right mark, \u202f = Narrow no-break space
    const raw = `\u200e15/08/2026, 9:41\u202fpm - Alice: Hello world`;

    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items).toHaveLength(1);
    expect(items[0].sender).toBe('Alice');
    expect(items[0].text).toBe('Hello world');
    expect(items[0].ts).toBe('2026-08-15T21:41:00');
  });

  it('handles system messages without senders', () => {
    const raw = `15/08/2026, 9:00 pm - Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
15/08/2026, 9:05 pm - Alice: Hey!`;

    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items).toHaveLength(2);
    expect(items[0].sender).toBeNull();
    expect(items[0].flags).toContain('system');
    expect(items[1].sender).toBe('Alice');
  });

  it('detects deleted message notices', () => {
    const raw = `15/08/2026, 9:41 pm - Alice: This message was deleted
15/08/2026, 9:42 pm - Bob: You deleted this message`;

    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items).toHaveLength(2);
    expect(items[0].flags).toContain('deleted');
    expect(items[1].flags).toContain('deleted');
  });

  it('detects edited message markers', () => {
    const raw = `15/08/2026, 9:41 pm - Alice: Please bring the report <This message was edited>`;

    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items).toHaveLength(1);
    expect(items[0].flags).toContain('edited');
    expect(items[0].text).toBe('Please bring the report');
  });

  it('handles omitted media markers', () => {
    const raw = `15/08/2026, 9:41 pm - Alice: <Media omitted>
15/08/2026, 9:42 pm - Bob: audio.opus (file attached)`;

    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items).toHaveLength(2);
    expect(items[0].attachment?.omitted).toBe(true);
    expect(items[1].attachment?.name).toBe('audio.opus');
  });

  it('correctly detects date format when day > 12', () => {
    // 25/04/2026 -> obviously DD/MM/YYYY
    const raw = `25/04/2026, 10:00 am - Alice: Good morning`;
    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items[0].ts).toBe('2026-04-25T10:00:00');
  });

  it('handles 2-digit years correctly', () => {
    const raw = `15/08/26, 9:41 pm - Alice: Hello`;
    const items = parseWhatsAppText(raw, fileId, fileName);
    expect(items[0].ts).toBe('2026-08-15T21:41:00');
  });

  it('parses zip archive containing _chat.txt using parseWhatsAppFile', async () => {
    const zip = new JSZip();
    zip.file('_chat.txt', '15/08/2026, 9:41 pm - Alice: Inside zip archive');
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    const items = await parseWhatsAppFile(zipBlob, fileId, 'WhatsApp Chat - Alice.zip');
    expect(items).toHaveLength(1);
    expect(items[0].sender).toBe('Alice');
    expect(items[0].text).toBe('Inside zip archive');
  });
});

