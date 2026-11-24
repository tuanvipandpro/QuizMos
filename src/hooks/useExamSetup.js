import { useState } from 'react';
import { eligibleStudyPool, resolveExamSettings } from '../utils/studySettings';
import { getCertificationProfile } from '../data/certificationProfiles';
import { certificationProfileStatus } from '../utils/certificationProfile';
import { DEFAULT_TRAINING_MINUTES, TRAINING_QUESTION_PRESETS } from '../data/studySettingsLimits';

export function useExamSetup(quizId, questions) {
  const profile = getCertificationProfile(quizId);
  const status = certificationProfileStatus(profile);
  const [selectedKind, changeKind] = useState(() => (status === 'verified' ? 'cert' : 'custom'));
  const [certCount, setCertCount] = useState(null);
  const [trainingCount, setTrainingCount] = useState(TRAINING_QUESTION_PRESETS[0]);
  const [trainingMinutes, changeMinutes] = useState(DEFAULT_TRAINING_MINUTES);
  const [feedbackMode, changeFeedback] = useState('standard');
  const kind = status === 'verified' ? selectedKind : 'custom';
  const certification = kind === 'cert';
  const eligible = eligibleStudyPool(questions, {
    formats: certification ? profile.formats : null,
    excludeRetired: true,
  });
  const count = certification
    ? (certCount ?? profile.count.min)
    : eligible.items.length < TRAINING_QUESTION_PRESETS[0]
      ? eligible.items.length || null
      : trainingCount;
  const setup = {
    kind,
    count,
    minutes: certification ? profile.minutes : trainingMinutes,
    feedbackMode,
  };
  let error;
  try {
    resolveExamSettings({ quizId, questions, ...setup });
  } catch (caught) {
    error = caught;
  }
  return {
    setup,
    changeCount: certification ? setCertCount : setTrainingCount,
    changeMinutes,
    changeFeedback,
    changeKind,
    profile,
    status,
    error,
    eligible,
  };
}
