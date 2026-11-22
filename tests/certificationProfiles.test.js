import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quizzes } from '../src/data/quizzes.js';
import {
  certificationProfiles,
  CERTIFICATION_SOURCES,
  getCertificationProfile,
} from '../src/data/certificationProfiles.js';
import {
  validateCertificationProfile,
  certificationProfileStatus,
} from '../src/utils/certificationProfile.js';

test('all catalog identities have a validated dated profile, official sources and no guessed unknowns', () => {
  assert.deepEqual(
    new Set(certificationProfiles.map((p) => p.quizId)),
    new Set(quizzes.map((q) => q.id))
  );
  for (const p of certificationProfiles) {
    assert.equal(validateCertificationProfile(p), p);
    for (const key of p.sources)
      assert.equal(new URL(CERTIFICATION_SOURCES[key]).protocol, 'https:');
  }
  assert.equal(getCertificationProfile('aws-ace'), getCertificationProfile('gcp-ace'));
  for (const id of [
    'anthropic-ccar-p',
    'anthropic-ccdv-f',
    'az-900',
    'gh-300',
    'gh-600',
    'ab-100',
    'ai-103',
  ])
    assert.equal(getCertificationProfile(id).count.kind, 'unknown');
  assert.equal(getCertificationProfile('ab-100').minutes, null);
  assert.equal(certificationProfileStatus(getCertificationProfile('istqb-ct-ai')), 'partial');
});

test('published exact/range values, answering time and scaled/weighted bases remain distinct', () => {
  assert.deepEqual(getCertificationProfile('aws-aip-c01').count, {
    kind: 'exact',
    min: 75,
    max: 75,
  });
  assert.equal(getCertificationProfile('aws-aip-c01').minutes, 180);
  assert.equal(getCertificationProfile('aws-aip-c01').score.threshold, 750);
  assert.equal(getCertificationProfile('aws-saa').minutes, 130);
  assert.equal(getCertificationProfile('aws-saa').count.min, 65);
  assert.deepEqual(getCertificationProfile('gcp-ace').count, { kind: 'range', min: 50, max: 60 });
  assert.equal(getCertificationProfile('gcp-pcde').count.min, 40);
  assert.equal(getCertificationProfile('gcp-gal').minutes, 90);
  assert.equal(getCertificationProfile('gcp-ace').score.kind, 'undisclosed');
  assert.equal(getCertificationProfile('anthropic-cca-f').minutes, 120);
  assert.equal(getCertificationProfile('anthropic-cca-f').seatMinutes, 135);
  const ccdvp = getCertificationProfile('anthropic-ccdv-p');
  assert.deepEqual(ccdvp.count, { kind: 'exact', min: 70, max: 70 });
  assert.equal(ccdvp.minutes, 120);
  assert.equal(ccdvp.score.threshold, 720);
  assert.deepEqual(getCertificationProfile('istqb-ctal-ta-v4-0').score, {
    kind: 'points',
    threshold: 51,
    minimum: 0,
    maximum: 78,
  });
});

test('announced sunset does not migrate bank identity and malformed facts are rejected', () => {
  const p = getCertificationProfile('aws-dva');
  assert.equal(certificationProfileStatus(p, '2026-11-15'), 'verified');
  assert.equal(certificationProfileStatus(p, '2026-11-30'), 'verified');
  assert.equal(certificationProfileStatus(p, '2026-12-01'), 'legacy');
  assert.equal(p.code, 'DVA-C02');
  for (const patch of [
    { extra: true },
    { minutes: -1 },
    { reviewedAt: '2026-02-30' },
    { sources: ['unreviewed'] },
    { count: { kind: 'unknown', min: 50, max: 60 } },
    { score: { kind: 'undisclosed', threshold: 80, minimum: 0, maximum: 100 } },
    { count: { kind: 'exact', min: 65, max: 75 } },
  ])
    assert.throws(() => validateCertificationProfile({ ...p, ...patch }), {
      code: 'SESSION_INVALID_PROFILE',
    });
});
