import { collection, doc, getDocsFromServer, runTransaction } from 'firebase/firestore';
import { readRoadmapPlan, ROADMAP_SLOTS } from '../utils/studyRoadmap.js';
import { roadmapWrite } from './studyRoadmapCommand.js';

export function createStudyRoadmapRepository(db) {
  const plans = (uid) => {
    if (typeof uid !== 'string' || !uid || uid.includes('/')) throw new Error('auth');
    return collection(db, 'users', uid, 'studyPlans');
  };
  return {
    async list(uid) {
      const snapshot = await getDocsFromServer(plans(uid));
      return snapshot.docs.map((record) => readRoadmapPlan(record.id, record.data()));
    },
    async mutate(uid, command) {
      if (!ROADMAP_SLOTS.includes(command.slot)) throw new Error('invalid');
      if (command.data) readRoadmapPlan(command.slot, command.data);
      const target = doc(plans(uid), command.slot);
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(target);
        const next = roadmapWrite(snapshot.data(), command);
        if (next === null) {
          if (snapshot.exists()) tx.delete(target);
        } else if (next) tx.set(target, next);
      });
    },
  };
}
