import { doc, getDocFromServer } from 'firebase/firestore';
import { db } from '../config/firebase';
import { readCustomQuiz } from '../utils/customQuizModel.js';
import { createNotebookSourceResolver } from './studyNotebookSources.js';

export function notebookSourceResolver() {
  return createNotebookSourceResolver({
    async loadBank(bank) {
      const response = await fetch(import.meta.env.BASE_URL + bank.file, { cache: 'no-store' });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Notebook source unavailable');
      return response.json();
    },
    async loadPrivate(uid, slotId) {
      const snapshot = await getDocFromServer(doc(db, 'users', uid, 'customQuizzes', slotId));
      return snapshot.exists() ? readCustomQuiz(slotId, snapshot.data(), uid) : null;
    },
  });
}
