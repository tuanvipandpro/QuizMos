## Why

QuizMos needs an optional self-hosted frontend package. Refs #117.

## What changes

- Build a static frontend image from Node 24 and the tracked Yarn lockfile.
- Serve the verified bundle with a non-root NGINX runtime and offer a Compose example.
- Document public build arguments, base paths, smoke checks and rollback.

## Capabilities

- `optional-docker`

## Impact

Local and self-hosted packaging. The GitHub Actions production release workflow retains its current behavior.
