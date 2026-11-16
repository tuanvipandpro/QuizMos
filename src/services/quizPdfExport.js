import { PDF_LIMITS, pdfExportError } from '../data/pdfExportLimits.js';
import { projectQuizPdf, quizPdfFilename } from '../utils/quizPdf.js';
const check = (signal, isCurrent) => {
  if (signal?.aborted || !isCurrent()) throw pdfExportError('CANCELLED');
};
function imageUrl(value) {
  try {
    const url = new URL(value, new URL(import.meta.env.BASE_URL, location.origin));
    if (
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && url.origin === location.origin) ||
      (url.protocol === 'data:' && value.startsWith('data:image/'))
    )
      return url.href;
  } catch {
    /* Invalid image URLs fail closed below. */
  }
  throw pdfExportError('IMAGE');
}
async function imageData(value, signal) {
  const controller = new AbortController(),
    cancel = () => controller.abort(),
    timer = setTimeout(cancel, PDF_LIMITS.imageTimeoutMs);
  signal?.addEventListener('abort', cancel, { once: true });
  let objectUrl, img;
  try {
    if (signal?.aborted) throw pdfExportError('CANCELLED');
    const response = await fetch(imageUrl(value), {
      credentials: 'omit',
      signal: controller.signal,
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw pdfExportError('IMAGE');
    const reader = response.body.getReader(),
      chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        size += chunk.byteLength;
        if (size > PDF_LIMITS.imageBytes) throw pdfExportError('IMAGE_LIMIT');
        chunks.push(chunk);
      }
    } finally {
      reader.releaseLock();
      if (size > PDF_LIMITS.imageBytes) controller.abort();
    }
    objectUrl = URL.createObjectURL(
      new Blob(chunks, { type: response.headers.get('content-type') || 'application/octet-stream' })
    );
    img = new Image();
    img.src = objectUrl;
    await Promise.race([
      img.decode(),
      new Promise((_, reject) => {
        if (controller.signal.aborted) reject(pdfExportError('IMAGE'));
        else
          controller.signal.addEventListener('abort', () => reject(pdfExportError('IMAGE')), {
            once: true,
          });
      }),
    ]);
    if (signal?.aborted) throw pdfExportError('CANCELLED');
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > 16000000)
      throw pdfExportError('IMAGE_LIMIT');
    const scale = Math.min(
      1,
      PDF_LIMITS.imagePixels / Math.max(img.naturalWidth, img.naturalHeight)
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
  } catch (error) {
    if (signal?.aborted) throw pdfExportError('CANCELLED');
    throw error?.code?.startsWith('PDF_') ? error : pdfExportError('IMAGE');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (img) img.src = '';
  }
}
export async function generateQuizPdf(
  quiz,
  uid,
  { access, signal, isCurrent = () => true, onProgress = () => {}, t = (key) => key } = {}
) {
  const parentSignal = signal,
    controller = new AbortController(),
    cancel = () => controller.abort();
  if (parentSignal?.aborted) controller.abort();
  parentSignal?.addEventListener('abort', cancel, { once: true });
  signal = controller.signal;
  try {
    check(signal, isCurrent);
    const model = projectQuizPdf(quiz, uid, access),
      urls = [...new Set(model.questions.map((q) => q.imageUrl).filter(Boolean))],
      images = Object.create(null);
    let next = 0,
      done = 0,
      bytes = 0;
    onProgress({ phase: 'images', done: 0, total: urls.length });
    await Promise.all(
      Array.from({ length: Math.min(3, urls.length) }, async () => {
        while (next < urls.length) {
          check(signal, isCurrent);
          const url = urls[next++],
            data = await imageData(url, signal);
          bytes += Math.ceil(data.data.length * 0.75);
          if (bytes > PDF_LIMITS.totalImageBytes) throw pdfExportError('IMAGE_LIMIT');
          images[url] = data;
          done++;
          if (isCurrent()) onProgress({ phase: 'images', done, total: urls.length });
        }
      })
    );
    check(signal, isCurrent);
    onProgress({ phase: 'render', done: model.questions.length, total: model.questions.length });
    const labels = Object.fromEntries(
      [
        'Questions and answers',
        'Question',
        'Answer key',
        'Answer unavailable in the supplied quiz.',
      ].map((key) => [key, t(key)])
    );
    const blob = await new Promise((resolve, reject) => {
      const worker = new Worker(new URL('../workers/quizPdf.worker.js', import.meta.url), {
        type: 'module',
      });
      let timer;
      const cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', cancel);
        worker.onmessage = null;
        worker.onerror = null;
        worker.terminate();
      };
      const cancel = () => {
        cleanup();
        reject(pdfExportError('CANCELLED'));
      };
      signal.addEventListener('abort', cancel, { once: true });
      worker.onerror = (event) => {
        event.preventDefault();
        cleanup();
        reject(pdfExportError('GENERATE'));
      };
      worker.onmessage = ({ data }) => {
        cleanup();
        if (data.error || !(data.blob instanceof Blob)) reject(pdfExportError('GENERATE'));
        else resolve(data.blob);
      };
      timer = setTimeout(() => {
        cleanup();
        reject(pdfExportError('TIMEOUT'));
      }, PDF_LIMITS.renderTimeoutMs);
      worker.postMessage({ model, images, labels });
    });
    check(signal, isCurrent);
    return { blob, filename: quizPdfFilename(model.title) };
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    parentSignal?.removeEventListener('abort', cancel);
  }
}

export function downloadQuizPdf({ blob, filename }) {
  const url = URL.createObjectURL(blob),
    link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
