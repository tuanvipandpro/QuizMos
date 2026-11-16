import React, { useState } from 'react';
import { Alert, Button, Modal, Progress, Typography } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useQuizPdfExport } from '../hooks/useQuizPdfExport';
const errors = {
  PDF_ACCESS: 'This quiz is not available for PDF export.',
  PDF_INVALID: 'This quiz contains invalid content and cannot be exported.',
  PDF_LIMIT: 'This quiz exceeds the PDF export limits.',
  PDF_IMAGE:
    'An image could not be embedded. Check image access and try again. No PDF was downloaded.',
  PDF_IMAGE_LIMIT: 'Quiz images exceed the PDF image limits. No PDF was downloaded.',
  PDF_TIMEOUT: 'PDF generation timed out. Try again on a device with more available resources.',
  PDF_GENERATE: 'Could not generate the PDF. Please try again.',
};
export default function QuizPdfExport({ quiz }) {
  const { t } = useLanguage(),
    [openedFor, setOpenedFor] = useState(null),
    exporter = useQuizPdfExport(quiz);
  const close = () => {
    exporter.cancel();
    setOpenedFor(null);
  };
  if (!exporter.allowed) return null;
  return (
    <>
      <Button
        className="quiz-pdf-export"
        icon={<FilePdfOutlined aria-hidden="true" />}
        onClick={() => setOpenedFor(exporter.sourceKey)}
      >
        {t('Export PDF')}
      </Button>
      <Modal
        className="quiz-pdf-modal"
        title={t('Export PDF')}
        open={openedFor === exporter.sourceKey}
        getContainer={false}
        onCancel={close}
        footer={null}
        destroyOnHidden
      >
        <Typography.Paragraph>
          {t(
            'Export the entire quiz with questions and an answer key. Explanations and private notes are not included.'
          )}
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          {t(
            'Generated on this device. Up to 1,000 questions and 500 images; inaccessible or large images can prevent export.'
          )}
        </Typography.Paragraph>
        <Typography.Paragraph>
          {quiz.name} · {t('{count} questions', { count: quiz.questions.length })}
        </Typography.Paragraph>
        {exporter.status === 'working' && (
          <div role="status">
            <Progress
              percent={
                exporter.progress?.phase === 'images' && exporter.progress.total
                  ? Math.round((exporter.progress.done / exporter.progress.total) * 80)
                  : 90
              }
              status="active"
              showInfo={false}
            />
            {t(
              exporter.progress?.phase === 'images' ? 'Preparing quiz images…' : 'Generating PDF…'
            )}
          </div>
        )}
        {exporter.status === 'error' && (
          <Alert type="error" showIcon message={t(errors[exporter.error] || errors.PDF_GENERATE)} />
        )}
        {exporter.status === 'done' && (
          <Alert type="success" role="status" showIcon message={t('PDF download started.')} />
        )}
        {exporter.status === 'cancelled' && (
          <Typography.Paragraph role="status">{t('PDF export cancelled.')}</Typography.Paragraph>
        )}
        <div className="quiz-dialog-actions">
          <Button onClick={close}>{t(exporter.status === 'working' ? 'Cancel' : 'Close')}</Button>
          <Button type="primary" disabled={exporter.status === 'working'} onClick={exporter.start}>
            {t(exporter.status === 'error' ? 'Retry PDF export' : 'Download PDF')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
