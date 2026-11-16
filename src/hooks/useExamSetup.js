import { useState } from 'react';
import { defaultExamSetup, eligibleStudyPool, resolveExamSettings } from '../utils/studySettings';
import { getCertificationProfile } from '../data/certificationProfiles';
import { certificationProfileStatus } from '../utils/certificationProfile';

export function useExamSetup(quizId, questions) {
  const [setup, setSetup] = useState(() => defaultExamSetup(quizId, questions));
  const profile = getCertificationProfile(quizId);
  const status = certificationProfileStatus(profile);
  const change = (field, value) => setSetup((previous) => ({ ...previous, [field]: value }));
  const changeKind = (kind) =>
    setSetup((previous) => ({
      ...previous,
      kind,
      count:
        kind === 'cert'
          ? profile.count.min
          : Math.min(50, eligibleStudyPool(questions, { excludeRetired: true }).items.length) || '',
      minutes: kind === 'cert' ? profile.minutes : profile?.minutes || 60,
    }));
  let plan, error;
  try {
    plan = resolveExamSettings({ quizId, questions, ...setup });
  } catch (caught) {
    error = caught;
  }
  const eligible = eligibleStudyPool(questions, {
    formats: setup.kind === 'cert' ? profile?.formats : null,
    excludeRetired: true,
  });
  return { setup, change, changeKind, profile, status, plan, error, eligible };
}
