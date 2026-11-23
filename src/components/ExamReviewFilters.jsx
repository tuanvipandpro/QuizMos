import React from 'react';
import { Radio } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { EXAM_REVIEW_FILTERS } from '../utils/examReviewFilters.js';

export default function ExamReviewFilters({ label, value, onChange }) {
  const { t } = useLanguage();
  return (
    <Radio.Group
      role="radiogroup"
      className="review-filters"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={t(label)}
    >
      {EXAM_REVIEW_FILTERS.map(([key, name]) => (
        <Radio.Button key={key} value={key}>
          {t(name)}
        </Radio.Button>
      ))}
    </Radio.Group>
  );
}
