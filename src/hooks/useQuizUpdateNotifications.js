import { useState } from 'react';
import { quizUpdates } from '../data/quizUpdates.js';
import { quizzes } from '../data/quizzes.js';
import { validateQuizUpdates } from '../utils/quizUpdates.js';
import {
  quizUpdateStorage,
  readSeenQuizUpdates,
  saveSeenQuizUpdates,
} from '../services/quizUpdatePreferences.js';
const entries = validateQuizUpdates(quizUpdates, quizzes);
export function useQuizUpdateNotifications() {
  const [seen, setSeen] = useState(() => readSeenQuizUpdates(quizUpdateStorage()));
  const unread = entries.filter((entry) => !seen.includes(entry.id)).length;
  const markSeen = () => {
    const next = [...new Set([...seen, ...entries.map((entry) => entry.id)])].slice(-1000);
    setSeen(next);
    saveSeenQuizUpdates(next, quizUpdateStorage());
  };
  return { entries, unread, markSeen };
}
