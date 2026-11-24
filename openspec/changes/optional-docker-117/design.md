## Build

Pin the official Node 24 and NGINX unprivileged image indexes by digest. Install the frontend dependencies with Yarn 1.22.22 and the frozen lockfile. Build and validate the Vite output in the builder. Copy only that output into the selected base directory in the runtime. The build context explicitly allows frontend build inputs and excludes local config, credentials and test fixtures. The build accepts explicit public Vite values and safe slash-delimited base paths.

## Serve

Serve the bundle with NGINX on 8080 as UID 101. The default Compose service binds to loopback and uses a read-only root with a bounded temporary filesystem. Health is checked at `/healthz`. Hash deep links load the configured base document, while missing paths return 404.

## Configure and verify

Use the existing Firebase and App AI client configuration contract. Document authorized domains, the auth callback and exact Worker origins for optional self-hosting. Verify build context, image metadata, startup, health, static assets, hash reloads and failures locally on Linux amd64. CI and production infrastructure retain the established publishing path.
