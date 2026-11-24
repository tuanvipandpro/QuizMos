import React from 'react';
import { Alert, Radio, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { TRAINING_QUESTION_PRESETS, TRAINING_TIME_PRESETS } from '../data/studySettingsLimits';
import CertificationProfileInfo from './CertificationProfileInfo';
import { studyErrorMessage } from './StudySetupError';

export default function ExamSettingsFields({ state }) {
  const { t } = useLanguage();
  const { setup, changeCount, changeMinutes, changeKind, profile, status, error, eligible } = state;
  const certification = setup.kind === 'cert';
  const eligibleCount = eligible.items.length;
  const minimumPreset = TRAINING_QUESTION_PRESETS[0];
  const fixedCount = eligibleCount < minimumPreset;
  const describedBy = 'study-settings-hint study-settings-error';
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
          {certification ? (
            <input
              id="study-count"
              inputMode="numeric"
              value={setup.count}
              onChange={(event) => changeCount(event.target.value)}
              readOnly={profile.count.kind === 'exact'}
              aria-invalid={error?.field === 'count' || undefined}
              aria-describedby={describedBy}
            />
          ) : (
            <select
              id="study-count"
              value={setup.count ?? ''}
              onChange={(event) => changeCount(event.target.value)}
              disabled={fixedCount}
              aria-invalid={error?.field === 'count' || undefined}
              aria-describedby={describedBy}
            >
              {fixedCount && (
                <option disabled value={setup.count ?? ''}>
                  {eligibleCount
                    ? t('All {count} eligible questions', { count: eligibleCount })
                    : t('No eligible questions')}
                </option>
              )}
              {TRAINING_QUESTION_PRESETS.map((count) => (
                <option key={count} value={count} disabled={count > eligibleCount}>
                  {t('{count} questions', { count })}
                </option>
              ))}
            </select>
          )}
        </label>
        <label htmlFor="study-time">
          {t('Time limit')}
          {certification ? (
            <input id="study-time" value={setup.minutes} readOnly aria-describedby={describedBy} />
          ) : (
            <select
              id="study-time"
              value={setup.minutes}
              onChange={(event) => changeMinutes(event.target.value)}
              aria-describedby={describedBy}
            >
              {TRAINING_TIME_PRESETS.map((count) => (
                <option key={count} value={count}>
                  {t('{count} minutes', { count })}
                </option>
              ))}
            </select>
          )}
        </label>
      </div>
      <Typography.Paragraph id="study-settings-hint" type="secondary">
        {certification && (
          <>
            {t(
              'Choose {min}–{max} questions within the published range. Answering time is fixed.',
              {
                min: profile.count.min,
                max: profile.count.max,
              }
            )}{' '}
          </>
        )}
        {!certification && eligibleCount > 0 && (
          <>
            {fixedCount
              ? t('This quiz uses all eligible questions because presets start at {count}.', {
                  count: minimumPreset,
                })
              : TRAINING_QUESTION_PRESETS.some((count) => count > eligibleCount) &&
                t('Larger presets require more eligible questions.')}{' '}
          </>
        )}
        {t('{count} eligible; {excluded} excluded because questions are retired or incompatible.', {
          count: eligibleCount,
          excluded: eligible.excluded.length,
        })}
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
