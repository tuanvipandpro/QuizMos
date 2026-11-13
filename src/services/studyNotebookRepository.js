import {
  collection,
  doc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  getDocsFromServer,
  query,
  where,
  orderBy,
  documentId,
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { NOTEBOOK_ENTRY_LIMIT } from '../data/studyNotebookLimits.js';
import {
  notebookError,
  notebookSourceGroup,
  notebookStateFromEntry,
  transitionNotebookState,
  validateNotebookEntry,
  notebookQuestionFingerprint,
} from '../utils/studyNotebook.js';
import { normalizeNotebookError, validateNotebookCommand } from '../utils/studyNotebookCommand.js';
import { UUID_PATTERN } from '../utils/secureId.js';
import { notebookQueryPlan } from '../utils/studyNotebookQuery.js';

const hash = (value) => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const whole = (value) => Number.isSafeInteger(value) && value >= 0;
const STATE_FIELDS = [
  'count',
  'revision',
  'generation',
  'lastEntryKey',
  'lastOperationId',
  'lastOperationFingerprint',
  'updatedAt',
];
export function readNotebookQuota(snapshot) {
  if (!snapshot.exists()) return { count: 0, revision: 0, generation: 0 };
  const data = snapshot.data();
  if (
    Object.keys(data).length !== STATE_FIELDS.length ||
    !STATE_FIELDS.every((field) => Object.hasOwn(data, field)) ||
    !whole(data.count) ||
    data.count > NOTEBOOK_ENTRY_LIMIT ||
    !whole(data.revision) ||
    !data.revision ||
    !whole(data.generation) ||
    data.generation > data.revision ||
    !hash(data.lastEntryKey) ||
    typeof data.lastOperationId !== 'string' ||
    !UUID_PATTERN.test(data.lastOperationId) ||
    !hash(data.lastOperationFingerprint) ||
    typeof data.updatedAt?.toMillis !== 'function'
  )
    throw notebookError('INVALID');
  return { ...data, updatedAt: Math.floor(data.updatedAt.toMillis()) };
}

export async function readNotebookEntry(snapshot) {
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  for (const field of ['createdAt', 'updatedAt', 'lastWrongAt', 'lastReviewedAt']) {
    if (data[field] === null && ['lastWrongAt', 'lastReviewedAt'].includes(field)) continue;
    if (typeof data[field]?.toMillis !== 'function') throw notebookError('INVALID');
    data[field] = Math.floor(data[field].toMillis());
  }
  if (data.entryKey !== snapshot.id) throw notebookError('INVALID');
  return validateNotebookEntry(data);
}

/** All reads are online. The caller retains commands across response loss. */
export function createStudyNotebookRepository(db, { transact = runTransaction } = {}) {
  const root = (uid) => {
    if (typeof uid !== 'string' || !uid || uid.includes('/')) throw notebookError('AUTH');
    return doc(db, 'users', uid);
  };
  const refs = (uid, key) => {
    if (!hash(key)) throw notebookError('INVALID');
    const owner = root(uid);
    return {
      entry: doc(collection(owner, 'notebookEntries'), key),
      quota: doc(collection(owner, 'notebookState'), 'quota'),
    };
  };
  const safe =
    (operation) =>
    async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        throw normalizeNotebookError(error);
      }
    };
  const read = async (tx, target) => {
    const [row, quota] = await Promise.all([tx.get(target.entry), tx.get(target.quota)]);
    return {
      entry: await readNotebookEntry(row),
      state: readNotebookQuota(quota),
      wire: row.data(),
    };
  };
  return {
    listPage: safe(async (uid, filters = {}, after = null) => {
      const plan = notebookQueryPlan(filters, after);
      const constraints = [
        ...plan.equalities.map(([field, value]) => where(field, '==', value)),
        ...plan.order.map(([field, direction]) =>
          orderBy(field === '__name__' ? documentId() : field, direction)
        ),
      ];
      if (plan.after)
        constraints.push(
          startAfter(new Timestamp(after.seconds, after.nanoseconds), after.entryKey)
        );
      constraints.push(limit(plan.limit));
      const result = await getDocsFromServer(
        query(collection(root(uid), 'notebookEntries'), ...constraints)
      );
      const entries = await Promise.all(result.docs.map(readNotebookEntry)),
        last = result.docs.at(-1);
      return {
        entries,
        next:
          entries.length === plan.limit
            ? {
                seconds: last.data().updatedAt.seconds,
                nanoseconds: last.data().updatedAt.nanoseconds,
                entryKey: last.id,
              }
            : null,
      };
    }),
    state: safe(async (uid) =>
      readNotebookQuota(
        await getDocFromServer(doc(collection(root(uid), 'notebookState'), 'quota'))
      )
    ),
    get: safe(async (uid, key) => {
      const target = refs(uid, key);
      // A read-only transaction supplies a coherent editor base across deletion.
      return transact(db, async (tx) => {
        const { entry, state } = await read(tx, target);
        return { entry, state };
      });
    }),
    mutate: safe(async (uid, command) => {
      await validateNotebookCommand(command, uid);
      const target = refs(uid, command.entryKey);
      // Rules can observe a concurrent quota winner before the SDK's version
      // check. Re-enter with the SAME command, never with refreshed expectations.
      for (let retry = 0; retry < 3; retry++) {
        let observedRevision = null;
        try {
          return await transact(db, async (tx) => {
            const { entry, state, wire } = await read(tx, target);
            observedRevision = state.revision;
            const marker = entry || state;
            if (marker.lastOperationId === command.operationId) {
              if (
                marker.lastOperationFingerprint !== command.fingerprint ||
                (!entry && state.lastEntryKey !== command.entryKey)
              )
                throw notebookError('CONFLICT');
              return { entry, state, replayed: true };
            }
            if (
              state.generation !== command.expectedGeneration ||
              (entry?.revision || 0) !== command.expectedRevision
            )
              throw notebookError('CONFLICT');
            const next = transitionNotebookState(
              entry && notebookStateFromEntry(entry),
              command.change,
              Math.max(Date.now(), entry?.updatedAt || 0)
            );
            if (!entry && !next) return { entry: null, state, noop: true };
            if (!entry && state.count >= NOTEBOOK_ENTRY_LIMIT) throw notebookError('QUOTA');
            // Retained notes may be edited/deleted after source removal. New rows
            // and outcome capture must still point to the current private source.
            if (command.ref.kind === 'custom' && (!entry || command.change.kind === 'outcome')) {
              const source = await tx.get(
                doc(collection(root(uid), 'customQuizzes'), command.ref.slotId)
              );
              const data = source.data();
              const question = data?.questions?.find(
                (q) => String(q.id) === command.ref.questionId
              );
              if (
                !source.exists() ||
                data.instanceId !== command.ref.instanceId ||
                data.contentVersion !== command.ref.contentVersion ||
                !question ||
                (await notebookQuestionFingerprint(question)) !== command.ref.fingerprint
              )
                throw notebookError('SOURCE_CHANGED');
            }
            const nextState = {
              count: state.count + (next ? (entry ? 0 : 1) : -1),
              revision: state.revision + 1,
              generation: state.generation + (next ? 0 : 1),
              lastEntryKey: command.entryKey,
              lastOperationId: command.operationId,
              lastOperationFingerprint: command.fingerprint,
              updatedAt: serverTimestamp(),
            };
            if (next) {
              const stamp = serverTimestamp();
              const row = {
                schemaVersion: 1,
                entryKey: command.entryKey,
                ref: command.ref,
                sourceGroup: notebookSourceGroup(command.ref),
                ...next,
                revision: (entry?.revision || 0) + 1,
                lastOperationId: command.operationId,
                lastOperationFingerprint: command.fingerprint,
                createdAt: entry ? wire.createdAt : stamp,
                updatedAt: stamp,
                lastWrongAt:
                  command.change.kind === 'outcome' && !command.change.correct
                    ? stamp
                    : entry?.lastWrongAt != null
                      ? wire.lastWrongAt
                      : null,
                lastReviewedAt:
                  command.change.kind === 'outcome' && command.change.correct && next.reviewed
                    ? stamp
                    : entry?.lastReviewedAt != null
                      ? wire.lastReviewedAt
                      : null,
              };
              // Validate the exact normalized envelope before using transforms.
              await validateNotebookEntry({
                ...row,
                ...Object.fromEntries(
                  ['createdAt', 'updatedAt', 'lastWrongAt', 'lastReviewedAt'].map((field) => [
                    field,
                    row[field] === null ? null : 0,
                  ])
                ),
              });
              tx.set(target.entry, row);
            } else tx.delete(target.entry);
            tx.set(target.quota, nextState);
            return { committed: true };
          });
        } catch (error) {
          if (
            observedRevision !== null &&
            ['permission-denied', 'firestore/permission-denied'].includes(error?.code)
          ) {
            const latest = readNotebookQuota(await getDocFromServer(target.quota));
            if (latest.revision !== observedRevision) continue;
          }
          throw error;
        }
      }
      throw notebookError('NETWORK');
    }),
  };
}
