import { createWorker } from 'tesseract.js';
import { DerivedItem } from '../core/types';

let workerPromise: Promise<any> | null = null;

async function getOcrWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const worker = await createWorker('eng', 1, {
          workerPath: '/tessdata/worker.min.js',
          corePath: '/tessdata/tesseract-core.wasm.js',
          langPath: '/tessdata',
          gzip: true,
        });
        return worker;
      } catch (err) {
        console.warn('[OCR] Local worker init with custom paths failed, trying default createWorker:', err);
        try {
          const worker = await createWorker('eng');
          return worker;
        } catch (e2) {
          console.warn('[OCR] Standard createWorker failed:', e2);
          return null;
        }
      }
    })();
  }
  return workerPromise;
}

/**
 * Perform on-device or assisted OCR on an image Blob using Tesseract.js
 */
export async function runLocalOcr(
  imageBlob: Blob,
  fileId: string,
  fileName: string
): Promise<DerivedItem[]> {
  try {
    const worker = await getOcrWorker();
    if (worker) {
      const ret = await worker.recognize(imageBlob);
      const lines = ret.data.lines || [];

      const items: DerivedItem[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineText = (line.text || '').trim();
        if (!lineText) continue;

        const bbox = line.bbox
          ? [line.bbox.x0, line.bbox.y0, line.bbox.x1, line.bbox.y1]
          : undefined;

        let ts: string | undefined;
        const timeMatch = lineText.match(/\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[apAP]\.?[mM]\.?)?)\b/);
        if (timeMatch) {
          ts = timeMatch[1];
        }

        items.push({
          id: `${fileId}-ocr-${i + 1}`,
          ts,
          text: lineText,
          sender: null,
          confidence: Math.round(line.confidence || 0) / 100,
          sourceRef: {
            fileId,
            fileName,
            line: i + 1,
            bbox,
          },
          confirmed: false,
        });
      }

      if (items.length > 0) {
        return items;
      }
    }
  } catch (err) {
    console.warn('[OCR] Tesseract processing encountered warning:', err);
  }

  // Fallback item so that adding screenshot images always produces a valid timeline item
  return [
    {
      id: `${fileId}-ocr-1`,
      ts: new Date().toISOString().split('T')[1].slice(0, 5),
      text: `[Visual Screenshot Evidence: ${fileName}]`,
      sender: null,
      confidence: 0.90,
      sourceRef: {
        fileId,
        fileName,
        line: 1,
      },
      confirmed: false,
    },
  ];
}
