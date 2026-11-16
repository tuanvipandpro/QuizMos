export const PDF_LIMITS = Object.freeze({
  questions: 1000,
  textBytes: 5 * 1024 * 1024,
  images: 500,
  imageBytes: 2 * 1024 * 1024,
  totalImageBytes: 40 * 1024 * 1024,
  imagePixels: 1600,
  imageTimeoutMs: 15000,
  renderTimeoutMs: 120000,
});
export const pdfExportError = (code) =>
  Object.assign(new Error('PDF_' + code), { code: 'PDF_' + code });
