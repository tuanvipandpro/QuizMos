import React from 'react';
import { Alert, Button } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';

export function studyErrorMessage(error) {
  if (error?.code === 'SESSION_INSUFFICIENT')
    return 'Not enough eligible questions. Choose a smaller training session.';
  if (['SESSION_SOURCE_CHANGED', 'SESSION_INVALID_SUBSET'].includes(error?.code))
    return 'The saved subset is no longer compatible. Start a new session from the overview.';
  if (error?.code === 'SESSION_UNVERIFIED_PROFILE')
    return 'This certification format is unverified or retired. Choose custom training.';
  return 'Enter a valid whole-number question count and time limit.';
}
export default function StudySetupError({ error, onExit }) {
  const { t } = useLanguage();
  return (
    <Alert
      type="warning"
      showIcon
      message={t(studyErrorMessage(error))}
      action={<Button onClick={onExit}>{t('Back to quiz overview')}</Button>}
    />
  );
}
