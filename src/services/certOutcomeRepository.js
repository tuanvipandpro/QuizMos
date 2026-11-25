import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  changedOutcomeClaim,
  isOutcomeId,
  matchingPlan,
  outcomeError,
  outcomeRecordEdit,
  OUTCOME_SLOTS,
  readOutcome,
  readOutcomeReport,
  sameOutcomeVersion,
  withdrawOutcomeReport,
} from '../utils/certificationOutcomes.js';

export function createCertOutcomeRepository(db) {
  const records = (uid) => {
    if (typeof uid !== 'string' || !uid || uid.includes('/')) throw outcomeError('denied');
    return collection(db, 'users', uid, 'certificationOutcomes');
  };
  const recordRef = (uid, slot) => {
    if (!OUTCOME_SLOTS.includes(slot)) throw outcomeError('invalid');
    return doc(records(uid), slot);
  };
  const reports = collection(db, 'outcomeSubmissions');
  const published = collection(db, 'publishedOutcomes');
  const reportRef = (id) => {
    if (!isOutcomeId(id)) throw outcomeError('invalid');
    return doc(reports, id);
  };
  const readRecord = (snap) => (snap.exists() ? readOutcome(snap.id, snap.data()) : null);
  const readReport = (snap) => (snap.exists() ? readOutcomeReport(snap.data()) : null);
  const updateReport = (tx, id, before, after) => {
    if (!after) return;
    const stamp = serverTimestamp();
    tx.set(reportRef(id), { ...after, updatedAt: stamp });
    if (before?.status === 'published') tx.delete(doc(published, id));
  };

  return {
    async list(uid, includeReports) {
      const rows = (await getDocsFromServer(records(uid))).docs.map(readRecord);
      return Promise.all(
        rows.map(async (row) => ({
          ...row,
          report: includeReports
            ? readReport(await getDocFromServer(reportRef(row.instanceId)))
            : null,
        }))
      );
    },
    async save(uid, command) {
      const target = recordRef(uid, command.slot);
      await runTransaction(db, async (tx) => {
        const current = readRecord(await tx.get(target));
        const candidate = outcomeRecordEdit(current, command);
        if (!candidate) return;
        if (
          candidate.planSlot &&
          (current?.planSlot !== candidate.planSlot ||
            current?.planId !== candidate.planId ||
            current.bankId !== candidate.bankId)
        ) {
          const selected = await tx.get(doc(db, 'users', uid, 'studyPlans', candidate.planSlot));
          if (
            !selected.exists() ||
            !matchingPlan({ ...selected.data(), slot: selected.id }, candidate)
          )
            throw outcomeError('plan');
        }
        if (current && changedOutcomeClaim(current, candidate)) {
          const before = readReport(await tx.get(reportRef(current.instanceId)));
          if (before && before.status !== 'removed')
            updateReport(
              tx,
              current.instanceId,
              before,
              withdrawOutcomeReport(before, before.revision)
            );
        }
        tx.set(target, candidate);
      });
    },
    async remove(uid, command) {
      const target = recordRef(uid, command.slot);
      await runTransaction(db, async (tx) => {
        const current = readRecord(await tx.get(target));
        if (!current) return;
        if (!sameOutcomeVersion(current, command)) throw outcomeError('conflict');
        const sub = reportRef(current.instanceId);
        const report = readReport(await tx.get(sub));
        if (report?.status === 'published') tx.delete(doc(published, current.instanceId));
        if (report) tx.delete(sub);
        tx.delete(target);
      });
    },
    async withdraw(uid, command) {
      await runTransaction(db, async (tx) => {
        const target = recordRef(uid, command.slot);
        const current = readRecord(await tx.get(target));
        if (!sameOutcomeVersion(current, command)) throw outcomeError('conflict');
        const sub = reportRef(current.instanceId);
        const before = readReport(await tx.get(sub));
        if (before && (before.owner !== uid || before.slot !== command.slot))
          throw outcomeError('denied');
        const next = withdrawOutcomeReport(before, command.reportRevision);
        updateReport(tx, current.instanceId, before, next);
      });
    },
  };
}
