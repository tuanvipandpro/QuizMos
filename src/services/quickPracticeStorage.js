import { canonicalQuizId } from '../data/quizAliases.js';
import { secureId, UUID_PATTERN } from '../utils/secureId.js';
import { questionFingerprint, SESSION_PREFIX } from '../utils/studySession.js';
import {
  eligibleStudyPool,
  practiceSize,
  sampleStudyPool,
  studyInteger,
} from '../utils/studySettings.js';
import { sessionSettingsError } from '../utils/certificationProfile.js';

const fields = [
  'schemaVersion',
  'owner',
  'sourceId',
  'signature',
  'size',
  'runId',
  'freshToken',
  'indices',
  'keys',
];
const exact = (value) =>
  value &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.keys(value).length === fields.length &&
  fields.every((key) => Object.hasOwn(value, key));
const ownerKey = (uid) => {
  if (uid == null) return 'guest';
  if (typeof uid !== 'string' || !uid || uid.includes('/')) throw sessionSettingsError('AUTH');
  return uid;
};
export function quickPracticeSlot(uid, sourceId, size) {
  const owner = ownerKey(uid),
    count = practiceSize(size);
  if (count === 'all' || typeof sourceId !== 'string' || !sourceId)
    throw sessionSettingsError('INVALID_SUBSET');
  return `${SESSION_PREFIX}${owner}:quick:${encodeURIComponent(canonicalQuizId(sourceId))}:${count}`;
}

function validManifest(manifest, { owner, source, count, pool }) {
  const eligible = new Map(pool.items.map((item) => [item.index, item.key]));
  return (
    exact(manifest) &&
    manifest.schemaVersion === 1 &&
    manifest.owner === owner &&
    manifest.sourceId === source &&
    manifest.size === count &&
    typeof manifest.runId === 'string' &&
    UUID_PATTERN.test(manifest.runId) &&
    typeof manifest.freshToken === 'string' &&
    /^[0-9]+$/.test(manifest.freshToken) &&
    Number.isSafeInteger(Number(manifest.freshToken)) &&
    Number(manifest.freshToken) > 0 &&
    Array.isArray(manifest.indices) &&
    Array.isArray(manifest.keys) &&
    manifest.indices.length === count &&
    manifest.keys.length === count &&
    new Set(manifest.indices).size === count &&
    new Set(manifest.keys).size === count &&
    manifest.indices.every(
      (index, position) =>
        Number.isSafeInteger(index) && eligible.get(index) === manifest.keys[position]
    )
  );
}

export function readQuickPracticeManifest(storage, uid, sourceId, questions, size) {
  try {
    const manifest = JSON.parse(
      storage.getItem(quickPracticeSlot(uid, sourceId, size) + ':manifest')
    );
    return validManifest(manifest, {
      owner: ownerKey(uid),
      source: canonicalQuizId(sourceId),
      count: practiceSize(size),
      pool: eligibleStudyPool(questions),
    }) && manifest.signature === questionFingerprint(questions)
      ? manifest
      : null;
  } catch {
    return null;
  }
}

/** One manifest/draft slot per owner + source/version + preset. No source copy. */
export function createQuickPracticeStorage({
  storage = () => globalThis.sessionStorage,
  random = Math.random,
  idFactory = secureId,
  now = Date.now,
} = {}) {
  const memory = new Map();
  return {
    resolve({ uid = null, sourceId, questions, size, fresh = null, identities = null }) {
      const slot = quickPracticeSlot(uid, sourceId, size),
        owner = ownerKey(uid),
        count = practiceSize(size);
      const source = canonicalQuizId(sourceId),
        signature = questionFingerprint(questions);
      const pool = eligibleStudyPool(questions, { identities });
      if (count > pool.items.length) throw sessionSettingsError('INSUFFICIENT', 'count');
      if (fresh !== null) fresh = String(studyInteger(fresh, 'fresh'));
      let value = null,
        readable = true,
        target;
      try {
        target = storage();
        if (!target) readable = false;
        else value = target.getItem(slot + ':manifest');
      } catch {
        readable = false;
      }
      const cached = memory.get(slot);
      // A failed replacement may leave the old manifest on disk. The current
      // in-memory run still wins, including the StrictMode effect replay.
      if (!readable || (cached && !cached.persisted)) value = cached?.manifest || null;
      let manifest = null,
        malformed = false;
      try {
        manifest = typeof value === 'string' ? JSON.parse(value) : value;
      } catch {
        malformed = true;
      }
      const valid = validManifest(manifest, { owner, source, count, pool });
      const sameSource = valid && manifest.signature === signature;
      const older = valid && fresh && Number(fresh) < Number(manifest.freshToken);
      const reuse = sameSource && (!fresh || fresh === manifest.freshToken || older);
      let priorToken =
        /^[0-9]+$/.test(manifest?.freshToken || '') &&
        Number.isSafeInteger(Number(manifest.freshToken))
          ? Number(manifest.freshToken)
          : null;
      if (priorToken === null && (manifest || malformed) && target) {
        try {
          const token = JSON.parse(target.getItem(slot + ':practice'))?.freshToken;
          if (/^[0-9]+$/.test(token || '') && Number.isSafeInteger(Number(token)))
            priorToken = Number(token);
        } catch {
          /* An unreadable answer draft supplies no generation evidence. */
        }
      }
      const restart = fresh && (priorToken === null || Number(fresh) > priorToken);
      if (!reuse && !restart && (manifest || malformed))
        throw sessionSettingsError(valid ? 'SOURCE_CHANGED' : 'INVALID_SUBSET');
      let persisted =
        readable && !!value && !(cached && !cached.persisted && value === cached.manifest);
      if (!reuse) {
        const selected = sampleStudyPool(pool.items, count, random),
          runId = idFactory();
        if (typeof runId !== 'string' || !UUID_PATTERN.test(runId))
          throw sessionSettingsError('INVALID_SUBSET');
        manifest = {
          schemaVersion: 1,
          owner,
          sourceId: source,
          signature,
          size: count,
          runId,
          freshToken: fresh || String(studyInteger(now(), 'fresh')),
          indices: selected.map((item) => item.index),
          keys: selected.map((item) => item.key),
        };
        persisted = false;
        if (target)
          try {
            target.setItem(slot + ':manifest', JSON.stringify(manifest));
            persisted = true;
          } catch {
            /* in-memory run remains usable */
          }
      }
      memory.set(slot, { manifest, persisted });
      return {
        manifest,
        questions: manifest.indices.map((index) => questions[index]),
        indices: [...manifest.indices],
        draftKey: slot + ':practice',
        fresh: manifest.freshToken,
        restored: !!reuse,
        persisted,
        excluded: pool.excluded,
      };
    },
  };
}
