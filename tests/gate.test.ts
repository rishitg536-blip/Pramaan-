import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { callServer, NotAllowedError } from '../src/net/gate';
import { updateSettings, getAICalls } from '../src/storage/db';

describe('Privacy Gate (src/net/gate.ts)', () => {
  beforeEach(async () => {
    await updateSettings({
      mode: 'local',
      cloudConsentAt: undefined,
      guideAiConsentAt: undefined,
      helperUrl: 'http://127.0.0.1:8000',
    });
    vi.restoreAllMocks();
  });

  it('blocks cloud explain in Local mode without performing a fetch', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response('{}')));

    await expect(
      callServer('explain', { findings: [] })
    ).rejects.toThrow(NotAllowedError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('blocks ocr_cloud in Local mode without performing a fetch', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response('{}')));

    await expect(
      callServer('ocr_cloud', { imageB64: 'abc' }, { userConfirmed: true })
    ).rejects.toThrow(NotAllowedError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('blocks guide chat when Guide AI consent is not granted', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response('{}')));

    await expect(
      callServer('guide', { messages: [], state: {} })
    ).rejects.toThrow(NotAllowedError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('blocks timestamp request if user has not confirmed', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response('{}')));

    await expect(
      callServer('stamp', { digest: 'a'.repeat(64) }, { userConfirmed: false })
    ).rejects.toThrow(NotAllowedError);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows stamp with confirmation and records AI call entry before fetch', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            status: 'pending',
            digest: 'a'.repeat(64),
            submittedAt: new Date().toISOString(),
          })
        )
      )
    );

    const res = await callServer<{ status: string }>(
      'stamp',
      { digest: 'a'.repeat(64) },
      { userConfirmed: true }
    );

    expect(fetchSpy).toHaveBeenCalled();
    expect(res.status).toBe('pending');

    const calls = await getAICalls();
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    expect(lastCall.kind).toBe('stamp');
    expect(lastCall.status).toBe('success');
  });

  it('allows cloud explain only when Cloud mode is active and consent is granted', async () => {
    await updateSettings({
      mode: 'cloud',
      cloudConsentAt: new Date().toISOString(),
    });

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            explanation: 'Findings verified.',
          })
        )
      )
    );

    const res = await callServer<{ explanation: string }>('explain', { findings: [] });
    expect(fetchSpy).toHaveBeenCalled();
    expect(res.explanation).toBe('Findings verified.');
  });
});
