import React from 'react';
import { Tag } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';

export default function QuizUpdateKindBadge({ kind }) {
  const { t } = useLanguage();
  return (
    <Tag className={'quiz-update-kind-' + kind}>{t(kind === 'added' ? 'Added' : 'Updated')}</Tag>
  );
}
