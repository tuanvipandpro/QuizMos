import pdfMake from 'pdfmake/build/pdfmake.js';
import fonts from 'pdfmake/build/vfs_fonts.js';
import { quizPdfDocument } from '../utils/quizPdf.js';
pdfMake.addVirtualFileSystem(fonts);
self.onmessage = ({ data }) => {
  try {
    const t = (key) => data.labels[key] || key;
    pdfMake
      .createPdf(quizPdfDocument(data.model, { images: data.images, t }))
      .getBlob((blob) => self.postMessage({ blob }));
  } catch {
    self.postMessage({ error: 'PDF_GENERATE' });
  }
};

self.onunhandledrejection = (event) => {
  event.preventDefault();
  self.postMessage({ error: 'PDF_GENERATE' });
};
