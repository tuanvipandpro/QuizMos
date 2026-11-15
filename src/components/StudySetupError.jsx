import React from 'react';
import { Alert, Button, Modal, Space } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';

export function studyErrorMessage(error) {
  if (error?.code === 'SESSION_INSUFFICIENT')
    return 'Not enough eligible questions. Choose a smaller training session.';
  if (['SESSION_SOURCE_CHANGED', 'SESSION_INVALID_SUBSET'].includes(error?.code))
    return 'The saved subset is no longer compatible. Start a new practice session.';
  if (error?.code === 'SESSION_UNVERIFIED_PROFILE')
    return 'This certification format is unverified or retired. Choose custom training.';
  return 'Enter a valid whole-number question count and time limit.';
}
export default function StudySetupError({
  error,
  onExit,
  onRestart,
  exitLabel = 'Back to quiz overview',
}) {
  const { t } = useLanguage();
  const [modal, holder] = Modal.useModal();
  const recoverable = ['SESSION_SOURCE_CHANGED', 'SESSION_INVALID_SUBSET'].includes(error?.code);
  return (
    <>
      {holder}
      <Alert
        className="study-setup-error"
        type="warning"
        showIcon
        message={t(studyErrorMessage(error))}
        action={
          <Space wrap>
            <Button onClick={onExit}>{t(exitLabel)}</Button>
            {recoverable && onRestart && (
              <Button
                onClick={() =>
                  modal.confirm({
                    title: t('Reset this practice session?'),
                    content: t('Your cloud checkpoint is kept.'),
                    okText: t('Start practice'),
                    cancelText: t('Cancel'),
                    onOk: onRestart,
                  })
                }
              >
                {t('Start a new practice session')}
              </Button>
            )}
          </Space>
        }
      />
    </>
  );
}
