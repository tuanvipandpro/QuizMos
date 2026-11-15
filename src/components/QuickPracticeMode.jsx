import React from 'react';
import { Spin } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { useQuickPractice } from '../hooks/useQuickPractice';
import PracticeMode from './PracticeMode';
import StudySetupError from './StudySetupError';

export default function QuickPracticeMode({ size, questionIdentities = null, ...props }) {
  const { user } = useAuth();
  const state = useQuickPractice({
    enabled: true,
    uid: user?.uid,
    sourceId: props.sessionId,
    questions: props.questions,
    size,
    fresh: props.fresh,
    identities: questionIdentities,
  });
  if (state.error)
    return (
      <StudySetupError
        error={state.error}
        onExit={props.onExit}
        onRestart={props.onRestart}
        exitLabel={props.revision ? 'Back to notebook' : 'Back to quiz overview'}
      />
    );
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
      sourceQuizzes={
        props.sourceQuizzes
          ? state.result.indices.map((index) => props.sourceQuizzes[index])
          : undefined
      }
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
