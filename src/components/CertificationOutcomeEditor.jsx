import React, { useId, useState } from 'react';
import { Alert, Button, Card, Input, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { quizzes } from '../data/quizzes.js';
import { canonicalQuizId } from '../data/quizAliases.js';
import { roadmapDayInZone } from '../utils/studyRoadmap.js';
import {
  matchingPlan,
  normalizeOutcome,
  OUTCOME_NOTE_MAX,
  OUTCOME_SCORE_MAX,
} from '../utils/certificationOutcomes.js';
import { STUDY_ROADMAP_ENABLED } from '../config/studyRoadmapConfig';

const blank = { bankId: '', examDate: '', result: '', note: '', score: '', scoreMax: '' };
export default function CertificationOutcomeEditor({
  record,
  plans,
  planError,
  busy,
  blocked,
  onSave,
  onCancel,
}) {
  const { t, language } = useLanguage();
  const prefix = useId();
  const [changes, setChanges] = useState({});
  const [error, setError] = useState(null);
  const current = record
    ? {
        ...record,
        bankId: canonicalQuizId(record.bankId),
        score: record.score ?? '',
        scoreMax: record.scoreMax ?? '',
      }
    : blank;
  const fields = { ...current, ...changes };
  const bankChanged = record && fields.bankId !== canonicalQuizId(record.bankId);
  const plan = changes.plan ?? (!bankChanged ? record?.planId || '' : '');
  const options = plans.filter((item) => canonicalQuizId(item.bankId) === fields.bankId);
  const orphaned = !!plan && !options.some((item) => item.instanceId === plan);
  const today = roadmapDayInZone(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone);
  const props = (field) => ({
    id: prefix + field,
    'aria-invalid': error?.field === field || undefined,
    'aria-describedby': error?.field === field ? prefix + 'error' : undefined,
  });
  const change = (field, value) => {
    setChanges((old) => ({ ...old, [field]: value, ...(field === 'bankId' ? { plan: '' } : {}) }));
    if (error?.field === field) setError(null);
  };
  const submit = (event) => {
    event.preventDefault();
    if (busy || blocked) return;
    const normalized = normalizeOutcome(fields, today);
    if (normalized.error) {
      setError(normalized);
      document.getElementById(prefix + normalized.field)?.focus();
      return;
    }
    const selected = options.find((item) => item.instanceId === plan);
    const keep = orphaned && record?.planId === plan && !bankChanged;
    onSave({
      ...normalized.value,
      bankId: record && !bankChanged ? record.bankId : normalized.value.bankId,
      planSlot: selected?.slot || (keep ? record.planSlot : null),
      planId: selected?.instanceId || (keep ? record.planId : null),
    });
  };
  return (
    <Card>
      <Typography.Title level={2}>
        {t(record ? 'Edit certification outcome' : 'New certification outcome')}
      </Typography.Title>
      <form className="outcome-form" onSubmit={submit} noValidate>
        <div>
          <label htmlFor={prefix + 'bankId'}>{t('Quiz bank')}</label>
          <select
            {...props('bankId')}
            value={fields.bankId}
            disabled={busy}
            required
            onChange={(event) => change('bankId', event.target.value)}
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
          <label htmlFor={prefix + 'examDate'}>{t('Exam date')}</label>
          <Input
            {...props('examDate')}
            type="date"
            lang={language}
            max={today}
            min="1900-01-01"
            required
            value={fields.examDate}
            disabled={busy}
            onChange={(event) => change('examDate', event.target.value)}
          />
        </div>
        <div>
          <label htmlFor={prefix + 'result'}>{t('Exam outcome')}</label>
          <select
            {...props('result')}
            value={fields.result}
            disabled={busy}
            required
            onChange={(event) => change('result', event.target.value)}
          >
            <option value="">{t('Choose an exam outcome.')}</option>
            <option value="passed">{t('Passed')}</option>
            <option value="not-passed">{t('Did not pass')}</option>
          </select>
        </div>
        {STUDY_ROADMAP_ENABLED && (
          <div>
            <label htmlFor={prefix + 'plan'}>{t('Study target (optional)')}</label>
            <select
              id={prefix + 'plan'}
              value={plan}
              disabled={busy || planError}
              onChange={(event) => change('plan', event.target.value)}
            >
              <option value="">{t('No linked study target')}</option>
              {orphaned && (
                <option value={plan}>{t('Current linked target is unavailable')}</option>
              )}
              {options.map((item) => (
                <option key={item.instanceId} value={item.instanceId}>
                  {item.targetDate}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="outcome-score-group outcome-form-wide">
          <div>
            <label htmlFor={prefix + 'score'}>{t('Reported score (optional)')}</label>
            <Input
              {...props('score')}
              type="number"
              inputMode="decimal"
              min={0}
              max={OUTCOME_SCORE_MAX}
              step="any"
              value={fields.score}
              disabled={busy}
              onChange={(event) => change('score', event.target.value)}
            />
          </div>
          <div>
            <label htmlFor={prefix + 'scoreMax'}>{t('Maximum score (optional)')}</label>
            <Input
              id={prefix + 'scoreMax'}
              type="number"
              inputMode="decimal"
              min={0}
              max={OUTCOME_SCORE_MAX}
              step="any"
              value={fields.scoreMax}
              disabled={busy}
              onChange={(event) => change('scoreMax', event.target.value)}
            />
          </div>
        </div>
        <div className="outcome-form-wide">
          <label htmlFor={prefix + 'note'}>{t('Private preparation note (optional)')}</label>
          <Input.TextArea
            {...props('note')}
            rows={3}
            maxLength={OUTCOME_NOTE_MAX}
            value={fields.note}
            disabled={busy}
            onChange={(event) => change('note', event.target.value)}
          />
        </div>
        {record?.report && ['pending', 'published', 'rejected'].includes(record.report.status) && (
          <Typography.Paragraph className="outcome-form-wide" type="secondary">
            {t('Changing the quiz bank or result withdraws the shared report.')}
          </Typography.Paragraph>
        )}
        {error && (
          <Alert
            id={prefix + 'error'}
            className="outcome-form-wide"
            type="error"
            showIcon
            message={t(error.error)}
          />
        )}
        <div className="outcome-actions outcome-form-wide">
          <Button type="primary" htmlType="submit" loading={busy} disabled={blocked}>
            {t('Save private outcome')}
          </Button>
          <Button disabled={busy} onClick={onCancel}>
            {t('Cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export const planForOutcome = (plans, record) => plans.find((plan) => matchingPlan(plan, record));
