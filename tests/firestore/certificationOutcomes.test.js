import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { assertFails, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, limit, query, setDoc } from 'firebase/firestore';
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

const legacyReport = {
  owner: 'alice',
  slot: 'slot-1',
  bankId: 'gcp-ace',
  result: 'passed',
  experience: 'Legacy public experience',
  status: 'published',
  revision: 2,
  updatedAt: new Date('2026-11-24T12:00:00Z'),
};
const legacyPublic = {
  bankId: legacyReport.bankId,
  result: legacyReport.result,
  experience: legacyReport.experience,
  publishedAt: legacyReport.updatedAt,
};
const seedLegacy = () =>
  environment.withSecurityRulesDisabled(async (unrestricted) => {
    const db = unrestricted.firestore();
    await setDoc(doc(db, reportPath), legacyReport);
    await setDoc(doc(db, publicPath), legacyPublic);
  });

test('legacy public access and submissions are retired while owners can withdraw old reports', async () => {
  const author = repo('alice');
  const ownerDb = context('alice');
  const moderatorDb = context('moderator', true);
  const guestDb = environment.unauthenticatedContext().firestore();
  await author.save('alice', input);
  await assertFails(setDoc(doc(ownerDb, reportPath), { ...legacyReport, status: 'pending' }));
  await assertFails(setDoc(doc(moderatorDb, publicPath), legacyPublic));
  await seedLegacy();
  await assertFails(getDoc(doc(guestDb, publicPath)));
  await assertFails(getDocs(query(collection(guestDb, 'publishedOutcomes'), limit(20))));
  await assertFails(getDoc(doc(moderatorDb, reportPath)));
  await assertFails(getDoc(doc(context('bob'), reportPath)));
  await author.withdraw('alice', { ...existing, reportRevision: 2 });
  await author.withdraw('alice', { ...existing, reportRevision: 2 });
  const [record] = await author.list('alice', true);
  assert.equal(record.note, input.fields.note);
  assert.equal(record.report.status, 'removed');
  assert.equal(record.report.experience, '');
  await environment.withSecurityRulesDisabled(async (unrestricted) => {
    assert.equal((await getDoc(doc(unrestricted.firestore(), publicPath))).exists(), false);
  });
});

test('private correction and deletion clean up a pre-existing legacy publication', async () => {
  const author = repo('alice');
  await author.save('alice', input);
  await seedLegacy();
  await author.save('alice', { ...existing, fields: { ...input.fields, result: 'not-passed' } });
  const [record] = await author.list('alice', true);
  assert.equal(record.report.status, 'removed');
  await seedLegacy();
  await author.remove('alice', record);
  await author.remove('alice', record);
  assert.deepEqual(await author.list('alice', true), []);
  await environment.withSecurityRulesDisabled(async (unrestricted) => {
    for (const path of [privatePath, reportPath, publicPath]) {
      assert.equal((await getDoc(doc(unrestricted.firestore(), path))).exists(), false);
    }
  });
});
