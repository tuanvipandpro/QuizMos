import React from 'react';
import { Alert, Button, Empty, Space, Spin, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotebookRevision } from '../hooks/useNotebookSources';
import { notebookMessage, NOTEBOOK_SOURCE_LABELS } from '../data/studyNotebookMessages.js';
import StudyNotebookPage from './StudyNotebookPage';
import PracticeMode from './PracticeMode';
import QuickPracticeMode from './QuickPracticeMode';
import PracticeSizeSelect from './PracticeSizeSelect';
import StudySetupError from './StudySetupError';
import { eligibleStudyPool, practiceSize } from '../utils/studySettings';

function Revision({ notebook, selectionId, params, onNavigate, progressState, onSignIn }) {
  const { t } = useLanguage();
  const state = useNotebookRevision(notebook.uid, selectionId, notebook.enabled);
  const back = () => onNavigate('#/notebook');
  if (state.loading)
    return (
      <div className="load-state" role="status">
        <Spin />
        {t('Checking selected sources…')}
      </div>
    );
  if (state.error)
    return (
      <div className="load-state">
        <Alert type="error" showIcon message={t(notebookMessage(state.error))} />
        <Space wrap>
          <Button onClick={state.reload}>{t('Retry')}</Button>
          <Button onClick={back}>{t('Back to notebook')}</Button>
        </Space>
      </div>
    );
  let size;
  try {
    size = practiceSize(params.get('size'));
  } catch (error) {
    return <StudySetupError error={error} onExit={back} exitLabel="Back to notebook" />;
  }
  const identities = state.pool.current.map((item) => item.entryKey);
  const eligible = eligibleStudyPool(state.pool.questions, { identities }).items.length;
  const studyUrl = (next, fresh = null) =>
    `#/notebook/study/${selectionId}` +
    (next === 'all' ? '' : `?size=${next}${fresh ? `&fresh=${fresh}` : ''}`);
  const Practice = size === 'all' ? PracticeMode : QuickPracticeMode;
  return (
    <>
      <div className="practice-size-picker">
        <PracticeSizeSelect
          id="notebook-practice-size"
          value={size}
          onChange={(value) => onNavigate(studyUrl(value))}
        />
        <Typography.Paragraph type="secondary">
          {t(
            '{count} questions available for short Practice. Notes and full-bank sessions are kept.',
            { count: eligible }
          )}
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary">
          {t('Notebook revision is untimed Practice. Each question keeps its original source.')}
        </Typography.Paragraph>
      </div>
      {!!state.pool.excluded.length && (
        <Alert
          type="warning"
          showIcon
          className="notebook-exclusions"
          message={t('{count} selected questions are unavailable and excluded.', {
            count: state.pool.excluded.length,
          })}
          description={
            <ul>
              {state.pool.excluded.map((entry) => (
                <li key={entry.entryKey}>
                  {t('Question {id}', { id: entry.ref.questionId })}:{' '}
                  {t(NOTEBOOK_SOURCE_LABELS[entry.state])}
                </li>
              ))}
            </ul>
          }
        />
      )}
      {state.pool.current.length ? (
        <Practice
          key={`${notebook.uid}:${selectionId}:${size}:${params.get('fresh') || ''}`}
          size={size}
          questionIdentities={identities}
          fresh={size === 'all' ? null : params.get('fresh')}
          onRestart={() => onNavigate(studyUrl(size, String(Date.now())))}
          questions={state.pool.questions}
          quizId={null}
          sessionId={state.selection.sessionId}
          quizName={t('Notebook revision')}
          sourceQuizzes={state.pool.sources}
          notebook={notebook}
          progressState={progressState}
          revision
          entryToken={`#/notebook/study/${selectionId}`}
          onSignIn={onSignIn}
          onExit={back}
        />
      ) : (
        <section className="notebook-page">
          <Typography.Title level={1}>{t('Notebook revision')}</Typography.Title>
          <Empty
            description={t(
              'No current questions are available in this selection. Your notes are kept.'
            )}
          />
          <Button onClick={back}>{t('Back to notebook')}</Button>
        </section>
      )}
    </>
  );
}

export default function StudyNotebookWorkspace({
  notebook,
  authLoading,
  selectionId,
  params = new URLSearchParams(),
  onNavigate,
  onSignIn,
  progressState,
}) {
  const { t } = useLanguage();
  if (!notebook.enabled)
    return <Alert type="info" showIcon message={t('Study notebook is not enabled yet.')} />;
  if (authLoading)
    return (
      <div className="load-state" role="status">
        <Spin />
        {t('Loading account…')}
      </div>
    );
  if (!notebook.uid)
    return (
      <div className="load-state">
        <Alert type="info" showIcon message={t('Sign in to use your private study notebook.')} />
        <Button onClick={onSignIn}>{t('Sign in')}</Button>
      </div>
    );
  if (!notebook.ready)
    return (
      <div className="load-state" role="status">
        <Spin />
        {t('Loading notebook…')}
      </div>
    );
  return selectionId ? (
    <Revision {...{ notebook, selectionId, params, onNavigate, onSignIn, progressState }} />
  ) : (
    <StudyNotebookPage notebook={notebook} onNavigate={onNavigate} />
  );
}
