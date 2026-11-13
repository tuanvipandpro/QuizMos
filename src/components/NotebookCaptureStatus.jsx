import React, { useState } from 'react';
import { Alert, Button, Space, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import NotebookConfirmDialog from './NotebookConfirmDialog';
import { notebookMessage } from '../data/studyNotebookMessages.js';

export default function NotebookCaptureStatus({ capture }) {
  const { t } = useLanguage();
  const [confirmation, setConfirmation] = useState(null);
  if (!capture.enabled || !capture.eligible || capture.status === 'idle') return null;
  if (capture.status !== 'error')
    return (
      <Typography.Text className="notebook-capture-status" type="secondary" role="status">
        {t(
          capture.status === 'saving' ? 'Updating study notebook…' : 'Study notebook synchronized'
        )}
      </Typography.Text>
    );
  const conflict = capture.error?.code === 'NOTEBOOK_CONFLICT';
  return (
    <>
      {confirmation && (
        <NotebookConfirmDialog config={confirmation} onClose={() => setConfirmation(null)} />
      )}
      <Alert
        className="notebook-capture-feedback"
        type="warning"
        showIcon
        message={t('Some notebook updates are not synchronized. Your answers are kept.')}
        description={t(
          conflict
            ? 'Newer notebook changes were preserved. Refresh before retrying.'
            : capture.error?.code === 'NOTEBOOK_STORAGE'
              ? 'Tab recovery storage is unavailable. Free space or enable storage, then retry.'
              : ['NOTEBOOK_NETWORK', 'NOTEBOOK_DENIED'].includes(capture.error?.code)
                ? 'Check your connection and access, then retry the original updates.'
                : notebookMessage(capture.error)
        )}
        action={
          <Space wrap>
            {!conflict && !!capture.retryableCount && !capture.unboundCount && (
              <Button onClick={() => capture.retry()}>{t('Retry notebook updates')}</Button>
            )}
            {(!!capture.retryableCount || capture.needsCapture) && (
              <Button
                onClick={() =>
                  setConfirmation({
                    title: t('Refresh failed notebook updates?'),
                    content: t(
                      'This reads the latest state and may recreate entries you removed. Successful updates are kept.'
                    ),
                    okText: t('Refresh and retry'),
                    cancelText: t('Cancel'),
                    onOk: () => capture.retry({ refresh: true }),
                  })
                }
              >
                {t('Refresh and retry')}
              </Button>
            )}
          </Space>
        }
      />
    </>
  );
}
