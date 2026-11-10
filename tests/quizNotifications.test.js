import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readSeenQuizUpdates,
  saveSeenQuizUpdates,
  QUIZ_UPDATES_SEEN_KEY,
} from '../src/services/quizUpdatePreferences.js';
import { publicQuizRefreshUrl, probePublicQuizRefresh } from '../src/services/publicQuizRefresh.js';
test('public read preferences are bounded, validated and do not require storage', () => {
  for (const value of [
    '{}',
    'invalid',
    '[null]',
    '[1]',
    JSON.stringify(Array.from({ length: 1001 }, (_, i) => String(i))),
  ])
    assert.deepEqual(readSeenQuizUpdates({ getItem: () => value }), []);
  assert.deepEqual(readSeenQuizUpdates({ getItem: () => '["a","a","b"]' }), ['a', 'b']);
  assert.deepEqual(
    readSeenQuizUpdates({
      getItem() {
        throw new Error('blocked');
      },
    }),
    []
  );
  assert.equal(saveSeenQuizUpdates(['a'], null), false);
  assert.equal(saveSeenQuizUpdates({}, null), false);
  assert.equal(
    saveSeenQuizUpdates(['a'], {
      setItem() {
        throw new Error('blocked');
      },
    }),
    false
  );
  const values = new Map();
  assert.equal(saveSeenQuizUpdates(['a', 'a', 'b'], { setItem: (k, v) => values.set(k, v) }), true);
  assert.equal(values.get(QUIZ_UPDATES_SEEN_KEY), '["a","b"]');
});
test('public refresh URLs preserve origin/base and filter without starting fresh study sessions', () => {
  for (const base of ['https://example.test/', 'http://127.0.0.1:5174/quiz-app/']) {
    const url = new URL(
      publicQuizRefreshUrl(base + '?keep=1#/library?view=bank', 'GH-600 & AI', 123)
    );
    assert.equal(url.origin, new URL(base).origin);
    assert.equal(url.pathname, new URL(base).pathname);
    assert.equal(url.searchParams.get('keep'), '1');
    assert.equal(new URLSearchParams(url.hash.split('?')[1]).get('view'), 'bank');
    assert.equal(url.searchParams.get('quizmos-refresh'), '123');
    assert.equal(new URLSearchParams(url.hash.split('?')[1]).get('search'), 'GH-600 & AI');
    assert.equal(url.searchParams.has('fresh'), false);
    assert.equal(new URLSearchParams(url.hash.split('?')[1]).has('fresh'), false);
  }
  assert.throws(() => publicQuizRefreshUrl('https://example.test/#/quiz/gh-600/exam', '', 1));
  assert.throws(() => publicQuizRefreshUrl('file:///app/#/library', '', 1));
});
test('refresh probe is read-only/no-store and rejects invalid/redirected documents without navigation', async () => {
  const url = 'https://example.test/?quizmos-refresh=1#/library';
  let call;
  const response = () => ({
    ok: true,
    url,
    headers: { get: () => 'text/html; charset=utf-8' },
    text: async () => '<div id="app"></div>',
  });
  assert.equal(
    await probePublicQuizRefresh(url, {
      fetcher: async (...args) => {
        call = args;
        return response();
      },
    }),
    url
  );
  assert.equal(call[1].cache, 'no-store');
  assert.equal(call[1].credentials, 'same-origin');
  assert.equal(call[1].method, undefined);
  for (const patch of [
    { ok: false },
    { url: 'https://other.test/' },
    { headers: { get: () => 'application/json' } },
    { text: async () => '<html>Gateway error</html>' },
  ])
    await assert.rejects(
      probePublicQuizRefresh(url, { fetcher: async () => ({ ...response(), ...patch }) })
    );
  await assert.rejects(
    probePublicQuizRefresh(url, {
      fetcher: async () => {
        throw new Error('offline');
      },
    })
  );
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    probePublicQuizRefresh(url, {
      signal: controller.signal,
      fetcher: async () => {
        calls++;
        return response();
      },
    }),
    { name: 'AbortError' }
  );
  assert.equal(calls, 0);
  const late = new AbortController();
  await assert.rejects(
    probePublicQuizRefresh(url, {
      signal: late.signal,
      fetcher: async () => ({
        ...response(),
        text: async () => {
          late.abort();
          return '<div id="app"></div>';
        },
      }),
    }),
    { name: 'AbortError' }
  );
});
