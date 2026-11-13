import { hashFileStream } from '../core/hash';

self.onmessage = async (e: MessageEvent) => {
  const { type, id, file } = e.data;
  if (type === 'HASH_FILE') {
    try {
      const hash = await hashFileStream(file as Blob, (progress: number) => {
        self.postMessage({ type: 'PROGRESS', id, progress });
      });
      self.postMessage({ type: 'SUCCESS', id, hash });
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      self.postMessage({ type: 'ERROR', id, error });
    }
  }
};

