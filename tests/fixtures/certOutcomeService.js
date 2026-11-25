import {
  changedOutcomeClaim,
  outcomeError,
  outcomeRecordEdit,
  sameOutcomeVersion,
  withdrawOutcomeReport,
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
  delete data.public[id];
};
export default {
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
        setReport(data, current.instanceId, withdrawOutcomeReport(report, report.revision));
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
  async withdraw(uid, command) {
    requireOwner(uid);
    const data = read();
    const row = data.records[uid]?.[command.slot];
    if (!sameOutcomeVersion(row, command)) throw outcomeError('conflict');
    setReport(
      data,
      row.instanceId,
      withdrawOutcomeReport(data.reports[row.instanceId], command.reportRevision)
    );
    store(data);
  },
};
