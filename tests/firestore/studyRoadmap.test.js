import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { createStudyRoadmapRepository } from '../../src/services/studyRoadmapRepository.js';
import { roadmapCommand } from '../../src/services/studyRoadmapCommand.js';

assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
assert.equal(process.env.GCLOUD_PROJECT, 'demo-quiz-app');
let env;
const plan = {
  bankId: 'gcp-ace',
  startDate: '2026-11-24',
  targetDate: '2026-12-18',
  timezone: 'Asia/Ho_Chi_Minh',
  weeklyGoal: 3,
  archived: false,
  overrides: {},
};
const id = '7d252eb6-571d-4a0b-9214-2106b5d29dee';
const slot = 'slot-1';
const path = (name = slot) => 'users/alice/studyPlans/' + name;
before(async () => {
  const rules = await fs.readFile(
    new URL('../../firebase/firestore.rules', import.meta.url),
    'utf8'
  );
  env = await initializeTestEnvironment({
    projectId: 'demo-quiz-app',
    firestore: { host: '127.0.0.1', port: 8080, rules },
  });
});
after(async () => env?.cleanup());

test('only an authenticated owner can access bounded valid plans', async () => {
  await env.clearFirestore();
  const alice = env.authenticatedContext('alice').firestore();
  const repository = createStudyRoadmapRepository(alice);
  const create = roadmapCommand(slot, id, 0, plan);
  await assertSucceeds(repository.mutate('alice', create));
  await assertSucceeds(repository.mutate('alice', create));
  for (const client of [
    env.unauthenticatedContext().firestore(),
    env.authenticatedContext('bob').firestore(),
    env.authenticatedContext('alice', { firebase: { sign_in_provider: 'anonymous' } }).firestore(),
  ]) {
    await assertFails(getDoc(doc(client, path())));
    await assertFails(getDocs(collection(client, 'users/alice/studyPlans')));
    await assertFails(setDoc(doc(client, path('slot-2')), create.data));
  }
  await assertFails(setDoc(doc(alice, path('slot-4')), create.data));
  await assertFails(setDoc(doc(alice, path('slot-2')), { ...create.data, weeklyGoal: 8 }));
  await assertFails(
    setDoc(doc(alice, path('slot-2')), { ...create.data, targetDate: '2026-11-13' })
  );
  await assertFails(
    setDoc(doc(alice, path('slot-2')), { ...create.data, overrides: 'x'.repeat(12001) })
  );
  await assertFails(updateDoc(doc(alice, path()), { revision: 2, bankId: 'aws-aip-c01' }));
  await assertFails(updateDoc(doc(alice, path()), { revision: 3 }));
  await assertSucceeds(
    repository.mutate('alice', roadmapCommand(slot, id, 1, { ...plan, archived: true }))
  );
  await assert.rejects(
    () => repository.mutate('alice', { slot, instanceId: id, revision: 1, data: null }),
    /conflict/
  );
  assert.equal((await repository.list('alice'))[0].archived, true);
  await assertSucceeds(
    repository.mutate('alice', { slot, instanceId: id, revision: 2, data: null })
  );
  assert.deepEqual(await repository.list('alice'), []);
});
