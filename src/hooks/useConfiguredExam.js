import { useState } from 'react';
import { examStartup } from '../utils/examStartup';
import { sessionKey } from '../utils/studySession';

export function useConfiguredExam(uid, quizId, profileId, questions, params) {
  return useState(() => {
    try {
      let storage;
      try {
        storage = sessionStorage;
      } catch {
        storage = { getItem: () => null };
      }
      return examStartup(storage, sessionKey(uid, quizId, 'exam'), questions, profileId, params);
    } catch (error) {
      return { error };
    }
  })[0];
}
