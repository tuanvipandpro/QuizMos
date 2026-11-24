import { canonicalQuizId, legacyQuizIds } from '../../src/data/quizAliases.js';
import { normalizeProgress } from '../../src/utils/quizProgress.js';

const key = (uid) => 'quiz-e2e-profile:' + uid;
const read = (uid) =>
  JSON.parse(localStorage.getItem(key(uid)) || '{"llmProviders":{},"quizProgress":{}}');
const write = (uid, profile) => localStorage.setItem(key(uid), JSON.stringify(profile));
const waitForRead = async (name) => {
  if (!sessionStorage.getItem('quiz-e2e-defer-' + name)) return;
  await new Promise((resolve) =>
    window.addEventListener('quiz-e2e-resolve-' + name, resolve, { once: true })
  );
};

export default {
  async initializeUser(user) {
    await waitForRead('user-profile');
    return { success: true, user: { ...read(user.uid), ...user } };
  },
  async getUserProfile(uid) {
    return { success: true, user: read(uid) };
  },
  async saveLlmApiKey(uid, provider, apiKey) {
    if (sessionStorage.getItem('quiz-e2e-fail-key-save')) return { success: false };
    const profile = read(uid);
    profile.llmProviders[provider] = { apiKey };
    write(uid, profile);
    return { success: true };
  },
  async getAllQuizProgress(uid) {
    await waitForRead('quiz-progress');
    return normalizeProgress(read(uid).quizProgress);
  },
  async saveQuizProgress(uid, id, questionIndex, questionId) {
    id = canonicalQuizId(id);
    const profile = read(uid);
    profile.quizProgress[id] = { quizId: id, questionIndex, questionId, savedAt: Date.now() };
    for (const old of legacyQuizIds(id)) delete profile.quizProgress[old];
    write(uid, profile);
    return { success: true };
  },
  async clearQuizProgress(uid, id) {
    const profile = read(uid);
    for (const quizId of [canonicalQuizId(id), ...legacyQuizIds(id)])
      delete profile.quizProgress[quizId];
    write(uid, profile);
    return { success: true };
  },
};
