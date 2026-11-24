import React, { useId, useState } from 'react';
import { Alert, Button, Card, Input, Typography } from 'antd';
import { quizzes } from '../data/quizzes.js';
import { canonicalQuizId } from '../data/quizAliases.js';
import { useLanguage } from '../contexts/LanguageContext';
import {
  addRoadmapDays,
  roadmapDayInZone,
  roadmapFields,
  roadmapZone,
  ROADMAP_GOAL_MAX,
  ROADMAP_TARGET_MIN,
  ROADMAP_TARGET_MAX,
} from '../utils/studyRoadmap.js';

export default function StudyPlanEditor({ initial, previous, busy, onCancel, onSave }) {
  const { t, language } = useLanguage();
  const prefix = useId();
  const [changes, setChanges] = useState({});
  const form = { ...initial, ...previous, ...changes };
  const [validation, setValidation] = useState(null);
  const timezone = roadmapZone(form.timezone.trim());
  const today = timezone ? roadmapDayInZone(Date.now(), timezone) : null;
  const minimum = today ? addRoadmapDays(today, ROADMAP_TARGET_MIN) : undefined;
  const maximum = today ? addRoadmapDays(today, ROADMAP_TARGET_MAX) : undefined;
  const set = (key, value) => {
    setChanges((current) => ({ ...current, [key]: value }));
    if (validation?.field === key) setValidation(null);
  };
  const attributes = (field) => ({
    id: prefix + field,
    'aria-invalid': validation?.field === field || undefined,
    'aria-describedby': validation?.field === field ? prefix + 'error' : undefined,
  });
  const submit = (event) => {
    event.preventDefault();
    const result = roadmapFields(form, previous, Date.now());
    setValidation(result.error ? result : null);
    if (result.error) document.getElementById(prefix + result.field)?.focus();
    else onSave(result.value);
  };
  return (
    <Card className="roadmap-editor">
      <Typography.Title level={2}>
        {t(previous ? 'Edit study plan' : 'New study plan')}
      </Typography.Title>
      <form className="roadmap-form" onSubmit={submit} noValidate>
        <div>
          <label htmlFor={prefix + 'bankId'}>{t('Quiz bank')}</label>
          <select
            className="ant-input"
            {...attributes('bankId')}
            value={canonicalQuizId(form.bankId)}
            disabled={busy || !!previous}
            required
            onChange={(event) => set('bankId', event.target.value)}
          >
            <option value="">{t('Choose a quiz bank')}</option>
            {quizzes.map((quiz) => (
              <option key={quiz.id} value={quiz.id}>
                {quiz.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={prefix + 'targetDate'}>{t('Target exam date')}</label>
          <Input
            {...attributes('targetDate')}
            type="date"
            lang={language}
            required
            value={form.targetDate}
            min={minimum}
            max={maximum}
            disabled={busy}
            onChange={(event) => set('targetDate', event.target.value)}
          />
        </div>
        <div>
          <label htmlFor={prefix + 'timezone'}>{t('Time zone')}</label>
          <Input
            {...attributes('timezone')}
            required
            maxLength={64}
            disabled={busy}
            value={form.timezone}
            onChange={(event) => set('timezone', event.target.value)}
          />
          <Typography.Text type="secondary">
            {t('Use an IANA zone such as Asia/Ho_Chi_Minh.')}
          </Typography.Text>
        </div>
        <div>
          <label htmlFor={prefix + 'weeklyGoal'}>{t('Sessions per week')}</label>
          <select
            className="ant-input"
            {...attributes('weeklyGoal')}
            value={form.weeklyGoal}
            disabled={busy}
            onChange={(event) => set('weeklyGoal', event.target.value)}
          >
            {Array.from({ length: ROADMAP_GOAL_MAX + 1 }, (_, count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>
        {validation && (
          <Alert
            className="roadmap-form-wide"
            id={prefix + 'error'}
            type="error"
            showIcon
            message={t(validation.error)}
          />
        )}
        <div className="roadmap-actions roadmap-form-wide">
          <Button type="primary" htmlType="submit" loading={busy}>
            {t('Save study plan')}
          </Button>
          <Button onClick={onCancel} disabled={busy}>
            {t('Cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
