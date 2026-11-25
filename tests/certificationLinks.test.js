import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  certificationLinkEdit,
  certificationLinkRemoval,
  certificationLinkUrl,
} from '../src/utils/certificationLinks.js';

const command = {
  slot: 'slot-1',
  id: 'slot-1_ee32e16c-94fe-4a0c-b606-5392713da865',
  revision: 0,
  url: 'https://www.credly.com/badges/example/public_url',
};

test('accepts issuer and badge links and keeps verification query and fragment data', () => {
  assert.equal(certificationLinkUrl('  ' + command.url + '  '), command.url);
  assert.equal(
    certificationLinkUrl('HTTPS://learn.microsoft.com:443/en-us/credentials?id=demo#verify'),
    'https://learn.microsoft.com/en-us/credentials?id=demo#verify'
  );
  for (const value of [
    '',
    'http://example.com',
    'javascript:alert(1)',
    'https:///example.com',
    'https://user:pass@example.com/',
    'https://@example.com/',
    'https://example.com@evil.example/',
    'https://localhost/certificate',
    'https://127.0.0.1/certificate',
    'https://example.com:444/',
    'https://example.com/contains whitespace',
    'https://example.com/evil\\path',
    'https://example.com/' + 'a'.repeat(2048),
  ])
    assert.equal(certificationLinkUrl(value), null, value);
});

test('exact retries are idempotent and stale replacements and removals fail', () => {
  const first = certificationLinkEdit(null, command);
  assert.equal(first.revision, 1);
  assert.equal(certificationLinkEdit(first, command), null);
  const edit = { ...command, revision: 1, url: 'https://example.com/credential' };
  const second = certificationLinkEdit(first, edit);
  assert.equal(second.revision, 2);
  assert.equal(certificationLinkEdit(second, edit), null);
  assert.throws(() => certificationLinkEdit(second, command), /conflict/);
  assert.throws(() => certificationLinkEdit(null, edit), /conflict/);
  assert.throws(() => certificationLinkEdit(null, { ...command, slot: 'slot-2' }), /invalid/);
  assert.throws(() => certificationLinkRemoval(second, edit), /conflict/);
  const removed = certificationLinkRemoval(second, second);
  assert.deepEqual(removed, { id: command.id, revision: 3, url: null });
  assert.equal(certificationLinkRemoval(removed, second), null);
  assert.throws(() => certificationLinkEdit(removed, command), /conflict/);
  assert.throws(() => certificationLinkEdit(removed, { ...command, revision: 3 }), /conflict/);
  const replacement = {
    ...command,
    id: 'slot-1_3bc1e16c-94fe-4a0c-b606-5392713da865',
    revision: 3,
  };
  assert.equal(certificationLinkEdit(removed, replacement).revision, 4);
});
