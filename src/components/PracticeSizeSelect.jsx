import React from 'react';
import { Select } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { QUICK_PRACTICE_COUNTS } from '../data/studySettingsLimits';

export default function PracticeSizeSelect({ id = 'practice-size', value, onChange }) {
  const { t } = useLanguage();
  return (
    <>
      <label htmlFor={id}>{t('Practice size')}</label>
      <Select
        id={id}
        virtual={false}
        aria-label={t('Practice size')}
        value={value}
        onChange={onChange}
        options={[
          { value: 'all', label: t('All questions') },
          ...QUICK_PRACTICE_COUNTS.map((value) => ({
            value,
            label: t('{count} questions', { count: value }),
          })),
        ]}
      />
    </>
  );
}
