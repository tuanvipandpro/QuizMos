import { readRoadmapPlan } from '../../src/utils/studyRoadmap.js';
import { roadmapWrite } from '../../src/services/studyRoadmapCommand.js';

const key = (uid) => 'quiz-e2e-roadmap:' + uid;
const read = (uid) => JSON.parse(localStorage.getItem(key(uid)) || '{}');

export default {
  async list(uid) {
    if (sessionStorage.getItem('quiz-e2e-roadmap-read-error') === '1') throw Error('unavailable');
    return Object.entries(read(uid)).map(([slot, data]) => readRoadmapPlan(slot, data));
  },
  async mutate(uid, command) {
    if (sessionStorage.getItem('quiz-e2e-roadmap-write-error') === '1') throw Error('unavailable');
    const records = read(uid);
    const next = roadmapWrite(records[command.slot], command);
    if (next === null) delete records[command.slot];
    else if (next) records[command.slot] = next;
    localStorage.setItem(key(uid), JSON.stringify(records));
  },
};
