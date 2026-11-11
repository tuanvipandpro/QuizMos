import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { checkBrowserImage } from '../scripts/check-browser-image.mjs';

const workflow = fs.readFileSync('.github/workflows/frontend.yml', 'utf8');
const version = JSON.parse(
  fs.readFileSync('node_modules/@playwright/test/package.json', 'utf8')
).version;

test('the reviewed official browser image matches the installed locked package', () => {
  assert.match(checkBrowserImage(workflow, version), /^mcr\.microsoft\.com\/playwright:/);
  assert.ok(!workflow.includes('playwright install --with-deps'));
  assert.ok(workflow.includes('SHARD_TOTAL: ${{ strategy.job-total }}'));
});
test('a package upgrade cannot silently use incompatible browser binaries', () => {
  assert.throws(() => checkBrowserImage(workflow, '0.0.0'), /version mismatch/);
});
test('an unpinned tag or third-party image is rejected', () => {
  assert.throws(
    () => checkBrowserImage(workflow.replace(/@sha256:[a-f0-9]{64}/, ''), version),
    /digest-pinned official/
  );
  assert.throws(
    () =>
      checkBrowserImage(
        workflow.replace('mcr.microsoft.com/playwright:', 'example.com/playwright:'),
        version
      ),
    /digest-pinned official/
  );
});
