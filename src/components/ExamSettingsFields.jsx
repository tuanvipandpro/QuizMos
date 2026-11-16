import React from 'react';
import { Alert, Radio, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import {
  CUSTOM_EXAM_MAX_QUESTIONS,
  CUSTOM_EXAM_MAX_MINUTES,
  TRAINING_QUESTION_PRESETS,
  TRAINING_TIME_PRESETS,
} from '../data/studySettingsLimits';
import CertificationProfileInfo from './CertificationProfileInfo';
import { studyErrorMessage } from './StudySetupError';

export default function ExamSettingsFields({ state }) {
  const { t } = useLanguage();
  const { setup, change, changeKind, profile, status, error, eligible } = state;
  return (
    <div className="exam-settings">
      <fieldset className="exam-feedback-picker">
        <legend>{t('Session format')}</legend>
        <Radio.Group
          value={setup.kind}
          onChange={(event) => changeKind(event.target.value)}
          aria-label={t('Session format')}
        >
          <Radio value="cert" disabled={status !== 'verified'}>
            {t('Certification format')}
          </Radio>
          <Radio value="custom">{t('Custom timed training')}</Radio>
        </Radio.Group>
      </fieldset>
      <CertificationProfileInfo profile={profile} />
      {status !== 'verified' && (
        <Typography.Paragraph>
          {t(
            status === 'legacy'
              ? 'This certification format is unverified or retired. Choose custom training.'
              : 'Some certification facts are unverified. This session is custom training.'
          )}
        </Typography.Paragraph>
      )}
      <Typography.Paragraph type="secondary">
        {t(
          'Format practice only. Random selection does not reproduce official domains, labs, case studies or unscored questions. Extra time is not inferred from your language.'
        )}
      </Typography.Paragraph>
      <div className="quiz-exam-fields">
        <label htmlFor="study-count">
          {t('Questions')}
          <input
            id="study-count"
            inputMode="numeric"
            value={setup.count ?? ''}
            onChange={(event) => change('count', event.target.value)}
            readOnly={setup.kind === 'cert' && profile.count.kind === 'exact'}
            list="study-count-presets"
            aria-invalid={error?.field === 'count' || undefined}
            aria-describedby="study-settings-hint study-settings-error"
          />
        </label>
        <label htmlFor="study-time">
          {t('Time limit')}
          <input
            id="study-time"
            inputMode="numeric"
            value={setup.minutes}
            onChange={(event) => change('minutes', event.target.value)}
            readOnly={setup.kind === 'cert'}
            list="study-time-presets"
            aria-invalid={error?.field === 'minutes' || undefined}
            aria-describedby="study-settings-hint study-settings-error"
          />
        </label>
        <datalist id="study-count-presets">
          {TRAINING_QUESTION_PRESETS.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <datalist id="study-time-presets">
          {TRAINING_TIME_PRESETS.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>
      <Typography.Paragraph id="study-settings-hint" type="secondary">
        {setup.kind === 'cert'
          ? t('Choose {min}–{max} questions within the published range. Answering time is fixed.', {
              min: profile.count.min,
              max: profile.count.max,
            })
          : t('Training limits: 1–{count} questions and 1–{minutes} minutes.', {
              count: Math.min(CUSTOM_EXAM_MAX_QUESTIONS, eligible.items.length),
              minutes: CUSTOM_EXAM_MAX_MINUTES,
            })}{' '}
        {t(
          '{count} eligible; {excluded} excluded because answers or certification formats are incompatible.',
          { count: eligible.items.length, excluded: eligible.excluded.length }
        )}
      </Typography.Paragraph>
      <div id="study-settings-error" aria-live="polite">
        {error && (
          <Alert
            type="warning"
            showIcon
            message={t(
              eligible.items.length
                ? studyErrorMessage(error)
                : 'No eligible questions are available for this session.'
            )}
          />
        )}
      </div>
      {setup.feedbackMode === 'learning' && (
        <Typography.Paragraph>
          {t(
            'Learning mode is custom training with feedback, even when it uses the certification count and time.'
          )}
        </Typography.Paragraph>
      )}
    </div>
  );
}
