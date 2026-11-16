import React, { useState } from 'react';
import { Alert, Modal } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { notebookMessage } from '../data/studyNotebookMessages.js';

/** Controlled Modal retains a real title/accessible name (confirm() omits it). */
export default function NotebookConfirmDialog({ config, onClose }) {
  const { t } = useLanguage();
  const [pending, setPending] = useState(false),
    [error, setError] = useState(null);
  if (!config) return null;
  return (
    <Modal
      open
      title={config.title}
      className={config.okButtonProps?.danger ? 'app-danger-dialog' : undefined}
      okText={config.okText}
      cancelText={config.cancelText}
      okButtonProps={config.okButtonProps}
      cancelButtonProps={{ autoFocus: true, disabled: pending }}
      confirmLoading={pending}
      maskClosable={false}
      onCancel={() => {
        if (!pending) onClose();
      }}
      onOk={async () => {
        if (pending) return;
        setPending(true);
        setError(null);
        try {
          await config.onOk?.();
          onClose();
        } catch (failure) {
          setError(failure);
        } finally {
          setPending(false);
        }
      }}
    >
      <p>{config.content}</p>
      {error && <Alert type="error" showIcon message={t(notebookMessage(error))} />}
    </Modal>
  );
}
