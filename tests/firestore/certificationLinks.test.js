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
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { createCertificationLinkRepository } from '../../src/services/certificationLinkRepository.js';

assert.equal(process.env.GCLOUD_PROJECT, 'demo-quiz-app');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080');
let environment;
const slot = 'slot-1';
const id = 'slot-1_ee32e16c-94fe-4a0c-b606-5392713da865';
const url = 'https://www.credly.com/badges/example/public_url?example=1#badge';
const command = { slot, id, url, revision: 0 };
const publicPath = 'publishedCertificationLinks/' + id;
const privatePath = 'users/alice/certificationLinks/' + slot;
const account = (uid, sign_in_provider = 'google.com') =>
  environment.authenticatedContext(uid, { firebase: { sign_in_provider } }).firestore();
const guest = () => environment.unauthenticatedContext().firestore();

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

test('publish, edit and remove commit atomically with immediate guest visibility', async () => {
  const db = account('alice');
  const reader = guest();
  const owner = createCertificationLinkRepository(db);
  const live = createCertificationLinkRepository(reader);
  await owner.save('alice', command);
  await owner.save('alice', command);
  assert.deepEqual(await owner.list('alice'), [{ ...command, revision: 1 }]);
  const published = (await getDoc(doc(reader, publicPath))).data();
  assert.deepEqual(Object.keys(published).sort(), ['publishedAt', 'url']);
  assert.deepEqual((await live.publicPage()).rows, [{ id, url }]);
  await assertFails(getDoc(doc(reader, privatePath)));
  await assertFails(getDoc(doc(account('bob'), privatePath)));
  await assertFails(getDocs(collection(reader, 'publishedCertificationLinks')));
  await assertFails(getDocs(query(collection(reader, 'publishedCertificationLinks'), limit(21))));

  const edit = { ...command, revision: 1, url: 'https://issuer.example.org/cert/new' };
  await owner.save('alice', edit);
  await owner.save('alice', edit);
  assert.equal((await live.publicPage()).rows[0].url, edit.url);
  const edited = (await getDoc(doc(reader, publicPath))).data();
  assert.equal(edited.publishedAt.isEqual(published.publishedAt), true);
  await assert.rejects(() => owner.remove('alice', edit), /conflict/);
  await assert.rejects(() => owner.save('alice', { ...edit, url }), /conflict/);
  await owner.remove('alice', { ...edit, revision: 2 });
  await owner.remove('alice', { ...edit, revision: 2 });
  assert.equal((await getDoc(doc(reader, publicPath))).exists(), false);
  assert.deepEqual((await live.publicPage()).rows, []);
  const [receipt] = await owner.list('alice');
  assert.deepEqual(receipt, { id, slot, revision: 3, url: null });
  await assert.rejects(() => owner.save('alice', command), /conflict/);
  const replacement = {
    ...command,
    id: 'slot-1_3bc1e16c-94fe-4a0c-b606-5392713da865',
    revision: receipt.revision,
  };
  await owner.save('alice', replacement);
  await assert.rejects(() => owner.remove('alice', { ...edit, revision: 2 }), /conflict/);
  assert.deepEqual((await live.publicPage()).rows, [{ id: replacement.id, url }]);
});

test('rules reject unsafe or extra public fields, orphan projections, and cross-account writes', async () => {
  const alice = account('alice');
  const bob = account('bob');
  const pair = (db, uid, nextUrl, extra = {}) => {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'certificationLinks', slot), { id, url: nextUrl, revision: 1 });
    batch.set(doc(db, publicPath), { url: nextUrl, publishedAt: serverTimestamp(), ...extra });
    return batch;
  };
  for (const invalid of [
    'http://example.org/a',
    'javascript:alert(1)',
    'https://user@example.org/a',
    'https://example.org/a b',
    'https://example.org/a\\b',
    'https://127.0.0.1/a',
  ])
    await assertFails(pair(alice, 'alice', invalid).commit());
  await assertFails(pair(alice, 'alice', url, { note: 'private text' }).commit());
  await assertFails(pair(account('alice', 'anonymous'), 'alice', url).commit());
  const orphan = writeBatch(alice);
  orphan.set(doc(alice, publicPath), { url, publishedAt: serverTimestamp() });
  await assertFails(orphan.commit());

  await createCertificationLinkRepository(alice).save('alice', command);
  await assertFails(pair(bob, 'bob', url).commit());
  await assertFails(
    createCertificationLinkRepository(bob).remove('alice', { ...command, revision: 1 })
  );
  for (const db of [alice, bob, guest()]) {
    const deletion = writeBatch(db);
    deletion.delete(doc(db, publicPath));
    await assertFails(deletion.commit());
  }
});
