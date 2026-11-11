import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkBrowserImage(workflow, packageVersion) {
  const match = workflow.match(
    /^\s*image:\s*(mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-noble@sha256:[a-f0-9]{64})\s*$/m
  );
  if (!match) throw new Error('Browser CI requires a digest-pinned official Playwright image.');
  if (match[2] !== packageVersion)
    throw new Error(
      'Playwright package/image version mismatch; review and update the pinned image with the lockfile.'
    );
  return match[1];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const workflow = fs.readFileSync('.github/workflows/frontend.yml', 'utf8');
  const { version } = JSON.parse(
    fs.readFileSync('node_modules/@playwright/test/package.json', 'utf8')
  );
  console.log(
    `Browser image matches Playwright ${version}: ${checkBrowserImage(workflow, version)}`
  );
}
