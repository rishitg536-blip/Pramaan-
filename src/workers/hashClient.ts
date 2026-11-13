import { hashFileStream } from '../core/hash';

export function hashFileWithWorker(
  file: Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  // If Worker is not supported or SSR, fallback to main thread streaming
  if (typeof Worker === 'undefined') {
    return hashFileStream(file, onProgress);
  }

  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;
    let isSettled = false;

    const cleanup = () => {
      if (worker) {
        worker.terminate();
        worker = null;
      }
    };

    try {
      worker = new Worker(new URL('./hash.worker.ts', import.meta.url), {
        type: 'module',
      });
    } catch (e) {
      console.warn('Worker initialization failed, falling back to direct stream:', e);
      hashFileStream(file, onProgress).then(resolve, reject);
      return;
    }

    const id = Math.random().toString(36).substring(2);

    worker.onmessage = (e: MessageEvent) => {
      if (isSettled) return;
      const data = e.data;
      if (data.id !== id) return;

      if (data.type === 'PROGRESS') {
        if (onProgress) onProgress(data.progress);
      } else if (data.type === 'SUCCESS') {
        isSettled = true;
        cleanup();
        resolve(data.hash);
      } else if (data.type === 'ERROR') {
        isSettled = true;
        cleanup();
        console.warn('Worker error message, falling back to direct stream:', data.error);
        hashFileStream(file, onProgress).then(resolve, reject);
      }
    };

    worker.onerror = (err) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      console.warn('Worker error event, falling back to direct stream:', err);
      hashFileStream(file, onProgress).then(resolve, reject);
    };

    worker.postMessage({ type: 'HASH_FILE', id, file });
  });
}
