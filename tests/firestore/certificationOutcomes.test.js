import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { assertFails, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { createCertOutcomeRepository } from '../../src/services/certOutcomeRepository.js';

assert.equal(process.env.GCLOUD_PROJECT, 'demo-quiz-app');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
let environment;
const id = 'ee32e16c-94fe-4a0c-b606-5392713da865';
const planId = 'e332e16c-94fe-4a0c-b606-5392713da865';
const input = {
  slot: 'slot-1',
  instanceId: id,
  revision: 0,
  fields: {
    bankId: 'gcp-ace',
    examDate: '2026-11-21',
    result: 'passed',
    note: 'Private marker',
    score: 70.5,
    scoreMax: 100,
    planSlot: null,
    planId: null,
  },
};
const existing = { ...input, revision: 1 };
const privatePath = 'users/alice/certificationOutcomes/slot-1';
const reportPath = 'outcomeSubmissions/' + id;
const publicPath = 'publishedOutcomes/' + id;
const submit = {
  ...existing,
  action: 'submit',
  reportRevision: 0,
  experience: 'My public experience',
};
const context = (uid, moderator = false, provider = 'google.com') =>
  environment
    .authenticatedContext(uid, {
      certOutcomeModerator: moderator,
      firebase: { sign_in_provider: provider },
    })
    .firestore();
const repo = (uid, moderator) => createCertOutcomeRepository(context(uid, moderator));
before(async () => {
  environment = await initializeTestEnvironment({
    projectId: 'demo-quiz-app',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await fs.readFile(new URL('../../firebase/firestore.rules', import.meta.url), 'utf8'),
    },
  });
});
beforeEach(() => environment.clearFirestore());
after(() => environment?.cleanup());

test('owner writes are bounded, preserve explicit plan links and replay without duplicates', async () => {
  const service = repo('alice');
  const plan = {
    schemaVersion: 1,
    instanceId: planId,
    revision: 1,
    bankId: 'gcp-ace',
    startDate: '2026-11-01',
    targetDate: '2026-12-20',
    timezone: 'UTC',
    weeklyGoal: 3,
    archived: false,
    overrides: '{}',
  };
  const db = context('alice');
  await setDoc(doc(db, 'users/alice/studyPlans/slot-1'), plan);
  const linked = { ...input, fields: { ...input.fields, planSlot: 'slot-1', planId } };
  await service.save('alice', linked);
  await service.save('alice', linked);
  const [one] = await service.list('alice', true);
  assert.equal(one.revision, 1);
  assert.equal(one.planId, planId);
  assert.equal(one.report, null);
  assert.equal(one.score, 70.5);
  assert.deepEqual((await getDoc(doc(db, 'users/alice/studyPlans/slot-1'))).data(), plan);
  const guest = environment.unauthenticatedContext().firestore();
  for (const reader of [
    guest,
    context('bob'),
    context('moderator', true),
    context('alice', false, 'anonymous'),
  ])
    await assertFails(getDoc(doc(reader, privatePath)));
  const privateData = (await getDoc(doc(db, privatePath))).data();
  await assertFails(setDoc(doc(db, 'users/alice/certificationOutcomes/slot-7'), privateData));
  await assert.rejects(
    () =>
      service.save('alice', {
        ...existing,
        fields: { ...input.fields, planSlot: 'slot-2', planId },
      }),
    /plan/
  );
  await service.save('alice', { ...existing, fields: { ...input.fields, note: 'Edited' } });
  await assert.rejects(() => service.remove('alice', existing), /conflict/);
});

test('a separate moderator is required and withdrawal atomically removes the public projection', async () => {
  const author = repo('alice', true),
    moderator = repo('moderator', true),
    foreign = repo('bob');
  const guestDb = environment.unauthenticatedContext().firestore();
  const guest = createCertOutcomeRepository(guestDb);
  await author.save('alice', input);
  await author.share('alice', submit);
  await author.share('alice', submit);
  await assertFails(getDoc(doc(guestDb, reportPath)));
  await assertFails(getDoc(doc(context('bob'), reportPath)));
  await assertFails(getDocs(query(collection(context('bob'), 'outcomeSubmissions'), limit(20))));
  assert.deepEqual((await guest.publicPage()).rows, []);
  await assert.rejects(
    () => author.moderate('alice', { id, action: 'publish', revision: 1 }),
    /denied/
  );
  await assertFails(foreign.moderationPage('pending'));
  const [pending] = (await moderator.moderationPage('pending')).rows;
  assert.equal(pending.experience, submit.experience);
  assert.equal(Object.hasOwn(pending, 'note'), false);
  await assertFails(
    setDoc(doc(context('moderator', true), publicPath), {
      bankId: 'gcp-ace',
      result: 'passed',
      experience: submit.experience,
      publishedAt: serverTimestamp(),
    })
  );
  for (const [actor, append] of [
    [context('alice', true), {}],
    [context('moderator', true), { note: input.fields.note }],
  ]) {
    const forged = writeBatch(actor);
    forged.update(doc(actor, reportPath), {
      status: 'published',
      revision: 2,
      updatedAt: serverTimestamp(),
    });
    forged.set(doc(actor, publicPath), {
      bankId: 'gcp-ace',
      result: 'passed',
      experience: submit.experience,
      publishedAt: serverTimestamp(),
      ...append,
    });
    await assertFails(forged.commit());
  }
  await moderator.moderate('moderator', { id, action: 'publish', revision: 1 });
  const projection = (await getDoc(doc(guestDb, publicPath))).data();
  assert.deepEqual(Object.keys(projection).sort(), [
    'bankId',
    'experience',
    'publishedAt',
    'result',
  ]);
  assert.equal(projection.experience, submit.experience);
  assert.equal((await guest.publicPage()).rows.length, 1);
  await author.share('alice', { ...existing, action: 'remove', reportRevision: 2 });
  assert.equal((await getDoc(doc(guestDb, publicPath))).exists(), false);
  const [record] = await author.list('alice', true);
  assert.equal(record.note, input.fields.note);
  assert.equal(record.report.experience, '');
  assert.equal(record.report.status, 'removed');
});

test('reject, resubmit, moderator remove, material correction and deletion stay consistent', async () => {
  const author = repo('alice'),
    moderator = repo('moderator', true);
  const guest = createCertOutcomeRepository(environment.unauthenticatedContext().firestore());
  await author.save('alice', input);
  await author.share('alice', submit);
  await moderator.moderate('moderator', { id, action: 'reject', revision: 1 });
  assert.equal((await author.list('alice', true))[0].report.status, 'rejected');
  await author.share('alice', { ...submit, reportRevision: 2 });
  await moderator.moderate('moderator', { id, action: 'publish', revision: 3 });
  await moderator.moderate('moderator', { id, action: 'remove', revision: 4 });
  assert.deepEqual((await guest.publicPage()).rows, []);
  await author.share('alice', { ...submit, reportRevision: 5 });
  await moderator.moderate('moderator', { id, action: 'publish', revision: 6 });
  await author.save('alice', { ...existing, fields: { ...input.fields, result: 'not-passed' } });
  assert.deepEqual((await guest.publicPage()).rows, []);
  const [corrected] = await author.list('alice', true);
  assert.equal(corrected.report.status, 'removed');
  await author.share('alice', {
    ...corrected,
    action: 'submit',
    reportRevision: 8,
    experience: '',
  });
  await moderator.moderate('moderator', { id, action: 'publish', revision: 9 });
  await author.remove('alice', corrected);
  await author.remove('alice', corrected);
  assert.deepEqual(await author.list('alice', true), []);
  assert.deepEqual((await guest.publicPage()).rows, []);
  assert.equal((await getDoc(doc(context('alice'), reportPath))).exists(), false);
});
