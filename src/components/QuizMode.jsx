import React, { useEffect, useState } from 'react';
import { Alert, Button, Card, Radio, Typography } from 'antd';
import { PlayCircleOutlined, FormOutlined, ReadOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { EXAM_FEEDBACK_MODES, getExamFeedbackMode } from '../data/examModes';

import { useExamSetup } from '../hooks/useExamSetup';
import PracticeSizeSelect from './PracticeSizeSelect';
import ExamSettingsFields from './ExamSettingsFields';
import { eligibleStudyPool } from '../utils/studySettings';

const { Title, Text, Paragraph } = Typography;

export default function QuizMode({
  onSelectMode,
  onModeChange,
  totalQuestions,
  quizId,
  questions,
  quickSummary = null,
  initialMode = 'practice',
  hasExamDraft = false,
  examDraftCount = null,
  examDraftFeedbackMode,
}) {
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState(initialMode);
  useEffect(() => {
    setSelectedMode(initialMode === 'summary' && !quickSummary ? 'practice' : initialMode);
  }, [initialMode, quickSummary]);
  const exam = useExamSetup(quizId, questions);
  const { count, minutes: time, kind, feedbackMode } = exam.setup;
  const [size, setSize] = useState('all');
  const practicePool = eligibleStudyPool(questions);
  const eligibleCount = practicePool.items.length;
  const noExamQuestions = questions.length > 0 && questions.every((item) => item.retired === true);
  const practiceInvalid = size !== 'all' && size > eligibleCount;
  const modes = [
    {
      id: 'practice',
      label: 'Practice',
      description: 'Learn with instant feedback.',
      icon: <PlayCircleOutlined aria-hidden="true" />,
    },
    {
      id: 'exam',
      label: 'Mock exam',
      description: 'Answer random questions against the clock.',
      icon: <FormOutlined aria-hidden="true" />,
    },
    ...(quickSummary
      ? [
          {
            id: 'summary',
            label: 'Quick Summary',
            description: 'Review key concepts and common traps.',
            icon: <ReadOutlined aria-hidden="true" />,
          },
        ]
      : []),
  ];
  return (
    <Card className="quiz-mode-picker">
      <Title level={2}>{t('Choose how to study')}</Title>
      <Radio.Group
        role="radiogroup"
        value={selectedMode}
        onChange={(event) => {
          setSelectedMode(event.target.value);
          onModeChange?.(event.target.value);
        }}
        className="mode-options"
        aria-label={t('Choose how to study')}
      >
        {modes.map((mode) => (
          <Radio.Button key={mode.id} value={mode.id}>
            {mode.icon}
            <span>
              <strong>{t(mode.label)}</strong>
              <small>{t(mode.description)}</small>
            </span>
          </Radio.Button>
        ))}
      </Radio.Group>
      {selectedMode === 'practice' && (
        <div className="practice-size-picker">
          <PracticeSizeSelect value={size} onChange={setSize} />
          <Paragraph type="secondary">
            {t(
              'Short Practice is random, untimed and saved separately from full-bank answers and checkpoints.'
            )}
          </Paragraph>
          {size !== 'all' && (
            <Paragraph type="secondary">
              {t(
                '{count} eligible; {excluded} excluded because answers or certification formats are incompatible.',
                { count: eligibleCount, excluded: practicePool.excluded.length }
              )}
            </Paragraph>
          )}
          {practiceInvalid && (
            <Alert
              type="warning"
              showIcon
              message={t('Not enough eligible questions. Choose a smaller training session.')}
            />
          )}
        </div>
      )}
      {selectedMode === 'exam' && (
        <>
          {noExamQuestions && (
            <Alert
              type="info"
              showIcon
              message={t('No questions are available for a new mock exam.')}
            />
          )}
          {!noExamQuestions && <ExamSettingsFields state={exam} />}
          {!noExamQuestions && (
            <fieldset
              className="exam-feedback-picker"
              role="radiogroup"
              aria-labelledby="exam-feedback-label"
            >
              <legend id="exam-feedback-label">{t('Exam mode')}</legend>
              <div className="exam-feedback-options">
                {EXAM_FEEDBACK_MODES.map((mode) => (
                  <label
                    key={mode.id}
                    className={
                      'exam-feedback-option' + (feedbackMode === mode.id ? ' is-selected' : '')
                    }
                  >
                    <input
                      type="radio"
                      name="exam-feedback"
                      value={mode.id}
                      checked={feedbackMode === mode.id}
                      onChange={() => exam.changeFeedback(mode.id)}
                      aria-labelledby={`exam-feedback-${mode.id}-label`}
                      aria-describedby={`exam-feedback-${mode.id}-hint`}
                    />
                    <span>
                      <strong id={`exam-feedback-${mode.id}-label`}>{t(mode.label)}</strong>
                      <small id={`exam-feedback-${mode.id}-hint`}>{t(mode.description)}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {hasExamDraft && (
            <Alert
              type="info"
              showIcon
              message={t('Saved exam: {mode} · {count} questions. The timer keeps running.', {
                mode: t(getExamFeedbackMode(examDraftFeedbackMode).label),
                count: examDraftCount,
              })}
              description={t(
                'Resume keeps your saved settings. These choices apply to a new exam.'
              )}
            />
          )}
        </>
      )}
      <div className="quiz-mode-start">
        {!(selectedMode === 'exam' && (noExamQuestions || count === null)) && (
          <Text type="secondary">
            {selectedMode === 'exam'
              ? t('{count} questions', { count }) + ' · ' + t('{count} minutes', { count: time })
              : t('{count} questions', {
                  count: selectedMode === 'practice' && size !== 'all' ? size : totalQuestions,
                })}
          </Text>
        )}
        <div className="quiz-action-group">
          {selectedMode === 'practice' && size !== 'all' && (
            <Button
              disabled={practiceInvalid}
              onClick={() => onSelectMode('practice', { size, fresh: true })}
            >
              {t('Start a new practice session')}
            </Button>
          )}
          {selectedMode === 'exam' && hasExamDraft && (
            <Button
              disabled={!!exam.error}
              onClick={() => onSelectMode('exam', { time, count, kind, feedbackMode, fresh: true })}
            >
              {t('Start a new exam')}
            </Button>
          )}
          <Button
            type="primary"
            size="large"
            disabled={
              selectedMode === 'exam'
                ? !hasExamDraft && !!exam.error
                : selectedMode === 'practice' && practiceInvalid
            }
            onClick={() => onSelectMode(selectedMode, { time, count, kind, feedbackMode, size })}
          >
            {t(
              selectedMode === 'summary'
                ? 'Read Quick Summary'
                : selectedMode === 'exam'
                  ? hasExamDraft
                    ? 'Resume'
                    : 'Start mock exam'
                  : 'Start practice'
            )}
          </Button>
        </div>
      </div>
      {!quickSummary && (
        <Paragraph type="secondary" className="mode-guide-notice">
          {t('No guide published yet')}
        </Paragraph>
      )}
    </Card>
  );
}
