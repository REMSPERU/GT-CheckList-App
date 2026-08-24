import 'server-only';

import { DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas';

export interface ExtractedPdfPage {
  number: number;
  text: string;
}

const MIN_USEFUL_TEXT_LENGTH = 20;

const nodeCanvasGlobals = globalThis as Record<string, unknown>;

// PDF.js needs these browser APIs while extracting text in the Node runtime.
nodeCanvasGlobals.DOMMatrix ??= DOMMatrix;
nodeCanvasGlobals.ImageData ??= ImageData;
nodeCanvasGlobals.Path2D ??= Path2D;

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export async function extractPdfText(
  bytes: Uint8Array,
  maxPages: number,
): Promise<ExtractedPdfPage[]> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ]);
  // Node executes the worker in-process. This avoids Turbopack resolving the
  // package's relative worker path from its generated server chunk.
  (globalThis as typeof globalThis & { pdfjsWorker?: unknown }).pdfjsWorker =
    worker;
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  try {
    if (document.numPages > maxPages) throw new Error('PDF_TOO_MANY_PAGES');

    const pages = await Promise.all(
      Array.from({ length: document.numPages }, async (_, index) => {
        const page = await document.getPage(index + 1);
        const content = await page.getTextContent();
        return {
          number: index + 1,
          text: normalizeText(
            content.items
              .map(item => ('str' in item ? item.str : ''))
              .join(' '),
          ),
        };
      }),
    );
    if (!pages.some(page => page.text.length >= MIN_USEFUL_TEXT_LENGTH)) {
      throw new Error('PDF_WITHOUT_TEXT');
    }
    return pages;
  } finally {
    await document.destroy();
  }
}

export function splitPdfPages(
  pages: ExtractedPdfPage[],
  maxCharacters: number,
) {
  const batches: ExtractedPdfPage[][] = [];
  let current: ExtractedPdfPage[] = [];
  let characters = 0;
  for (const page of pages) {
    const pageCharacters = page.text.length + 20;
    if (current.length && characters + pageCharacters > maxCharacters) {
      batches.push(current);
      current = [];
      characters = 0;
    }
    current.push(page);
    characters += pageCharacters;
  }
  if (current.length) batches.push(current);
  return batches;
}

export function formatPdfPages(pages: ExtractedPdfPage[], fileName: string) {
  return `[INFORME TÉCNICO: ${fileName}]\n\n${pages
    .filter(page => page.text)
    .map(page => `[PÁGINA ${page.number}]\n${page.text}`)
    .join('\n\n')}`;
}
