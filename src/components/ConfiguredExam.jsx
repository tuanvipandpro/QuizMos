import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useConfiguredExam } from '../hooks/useConfiguredExam';
import ExamMode from './ExamMode';
import StudySetupError from './StudySetupError';

export default function ConfiguredExam({ params, profileId, ...props }) {
  const { user } = useAuth();
  const startup = useConfiguredExam(user?.uid, props.quizId, profileId, props.questions, params);
  if (startup.error) return <StudySetupError error={startup.error} onExit={props.onExit} />;
  const plan = startup.plan;
  return (
    <ExamMode
      {...props}
      restoredSession={startup.restored}
      examQuestionCount={plan?.settings.count}
      examTimeMinutes={plan?.settings.minutes}
      feedbackMode={plan?.settings.feedbackMode}
      selectionQuestions={plan?.selectionQuestions}
      sessionSettings={plan?.settings}
    />
  );
}
