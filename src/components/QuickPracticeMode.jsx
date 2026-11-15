import React from 'react';
import { Spin } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { useQuickPractice } from '../hooks/useQuickPractice';
import PracticeMode from './PracticeMode';
import StudySetupError from './StudySetupError';

export default function QuickPracticeMode({ size, ...props }) {
  const { user } = useAuth();
  const state = useQuickPractice({
    enabled: true,
    uid: user?.uid,
    sourceId: props.sessionId,
    questions: props.questions,
    size,
    fresh: props.fresh,
  });
  if (state.error) return <StudySetupError error={state.error} onExit={props.onExit} />;
  if (state.loading)
    return (
      <div className="load-state" role="status">
        <Spin />
      </div>
    );
  return (
    <PracticeMode
      {...props}
      key={state.result.manifest.runId}
      questions={state.result.questions}
      draftKey={state.result.draftKey}
      fresh={state.result.fresh}
      shortPractice
      subsetPersisted={state.result.persisted}
      quizId={null}
      initialQuestionIndex={null}
      adjustedCheckpoint={false}
    />
  );
}
