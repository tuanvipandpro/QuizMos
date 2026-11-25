import {
  certificationLinkEdit,
  certificationLinkError,
  certificationLinkRemoval,
} from '../../src/utils/certificationLinks.js';

const key = 'quiz-e2e-certification-links';
const read = () => JSON.parse(localStorage.getItem(key) || '{}');
const store = (state) => localStorage.setItem(key, JSON.stringify(state));
const requireOwner = (uid) => {
  if (JSON.parse(localStorage.getItem('quiz-e2e-auth') || 'null')?.uid !== uid)
    throw certificationLinkError('denied');
};

export default {
  async list(uid) {
    requireOwner(uid);
    return Object.entries(read()[uid] || {}).map(([slot, row]) => ({ ...row, slot }));
  },
  async publicPage() {
    return {
      rows: Object.values(read()).flatMap((owner) =>
        Object.values(owner)
          .filter(({ url }) => url)
          .map(({ id, url }) => ({ id, url }))
      ),
      next: null,
    };
  },
  async save(uid, command) {
    requireOwner(uid);
    const state = read();
    const slots = (state[uid] ||= {});
    const next = certificationLinkEdit(slots[command.slot], command);
    if (next) {
      slots[command.slot] = next;
      store(state);
    }
    if (sessionStorage.getItem('quiz-e2e-credential-drop-response') === '1') {
      sessionStorage.removeItem('quiz-e2e-credential-drop-response');
      throw certificationLinkError('network');
    }
  },
  async remove(uid, command) {
    requireOwner(uid);
    const state = read();
    const next = certificationLinkRemoval(state[uid]?.[command.slot], command);
    if (!next) return;
    state[uid][command.slot] = next;
    store(state);
  },
};
