import {
  changedOutcomeClaim,
  outcomeError,
  outcomeRecordEdit,
  outcomeReportEdit,
  publicOutcome,
  sameOutcomeVersion,
} from '../../src/utils/certificationOutcomes.js';

const storageName = 'quiz-e2e-outcomes-fixture';
const read = () =>
  JSON.parse(localStorage.getItem(storageName) || '{"records":{},"reports":{},"public":{}}');
const store = (data) => localStorage.setItem(storageName, JSON.stringify(data));
const account = () => JSON.parse(localStorage.getItem('quiz-e2e-auth') || 'null');
const requireOwner = (uid) => {
  if (account()?.uid !== uid) throw outcomeError('denied');
};
const setReport = (data, id, next) => {
  if (!next) return;
  data.reports[id] = next;
  if (next.status === 'published') data.public[id] = publicOutcome(next);
  else delete data.public[id];
};
export default {
  async canModerate(uid) {
    return account()?.uid === uid && account()?.moderator === true;
  },
  async list(uid, report) {
    requireOwner(uid);
    const data = read();
    return Object.entries(data.records[uid] || {}).map(([slot, row]) => ({
      ...row,
      slot,
      report: report ? data.reports[row.instanceId] || null : null,
    }));
  },
  async save(uid, command) {
    requireOwner(uid);
    const data = read();
    const records = (data.records[uid] ||= {});
    const current = records[command.slot];
    const next = outcomeRecordEdit(current, command);
    if (next) {
      const report = current && data.reports[current.instanceId];
      if (report && report.status !== 'removed' && changedOutcomeClaim(current, next))
        setReport(
          data,
          current.instanceId,
          outcomeReportEdit(report, { action: 'remove', revision: report.revision })
        );
      records[command.slot] = next;
      store(data);
    }
    if (sessionStorage.getItem('quiz-e2e-outcomes-drop-response') === '1') {
      sessionStorage.removeItem('quiz-e2e-outcomes-drop-response');
      throw outcomeError('network');
    }
  },
  async remove(uid, command) {
    requireOwner(uid);
    const data = read();
    const current = data.records[uid]?.[command.slot];
    if (!current) return;
    if (!sameOutcomeVersion(current, command)) throw outcomeError('conflict');
    delete data.records[uid][command.slot];
    delete data.reports[current.instanceId];
    delete data.public[current.instanceId];
    store(data);
  },
  async share(uid, command) {
    requireOwner(uid);
    const data = read();
    const row = data.records[uid]?.[command.slot];
    if (!sameOutcomeVersion(row, command)) throw outcomeError('conflict');
    setReport(
      data,
      row.instanceId,
      outcomeReportEdit(data.reports[row.instanceId], {
        uid,
        slot: command.slot,
        bankId: row.bankId,
        result: row.result,
        action: command.action,
        revision: command.reportRevision,
        experience: command.experience,
      })
    );
    store(data);
  },
  async publicPage() {
    return {
      rows: Object.entries(read().public).map(([id, value]) => ({ id, ...value })),
      next: null,
    };
  },
  async moderationPage(status) {
    if (!account()?.moderator) throw outcomeError('denied');
    return {
      rows: Object.entries(read().reports)
        .filter(([, value]) => value.status === status)
        .map(([id, value]) => ({ id, ...value })),
      next: null,
    };
  },
  async moderate(uid, { id, action, revision }) {
    if (!(await this.canModerate(uid))) throw outcomeError('denied');
    const data = read();
    const before = data.reports[id];
    if (before?.owner === uid) throw outcomeError('denied');
    setReport(data, id, outcomeReportEdit(before, { action, revision }));
    store(data);
  },
};
