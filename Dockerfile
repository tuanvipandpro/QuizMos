FROM docker.io/library/node:24.22.3-bookworm-slim@sha256:873f586f3794f52281bd039bf02c048a0be08fde619338f9941bad1eb6b34530 AS build
WORKDIR /app

COPY package.json yarn.lock ./
RUN test "$(yarn --version)" = 1.22.22 && yarn install --frozen-lockfile --non-interactive --production=false

COPY index.html vite.config.js ./
COPY src/ src/
COPY public/ public/
COPY scripts/check-build.mjs scripts/check-build.mjs

# Vite embeds these public values in the browser bundle at build time.
ARG VITE_BASE=/
ARG VITE_APP_AI_URL
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_MEASUREMENT_ID
ARG VITE_EXAM_HISTORY_ENABLED=false
ARG VITE_STUDY_NOTEBOOK_ENABLED=false
ARG VITE_STUDY_ROADMAP_ENABLED=false
ARG VITE_SPACED_REVISION_ENABLED=false
ARG VITE_CERT_OUTCOMES_ENABLED=false
ARG VITE_CERT_OUTCOME_SHARING_ENABLED=false

RUN if ! printf '%s' "$VITE_BASE" | grep -zEq '^/([A-Za-z0-9][A-Za-z0-9_-]*/)*$'; then \
      echo 'VITE_BASE must be / or a slash-delimited path such as /quiz-app/.' >&2; exit 1; \
    fi \
    && case "$VITE_BASE" in /healthz/*) echo 'The /healthz path is reserved.' >&2; exit 1;; esac \
    && yarn build \
    && yarn check:build \
    && mkdir -p "/site$VITE_BASE" \
    && cp -R dist/. "/site$VITE_BASE"

FROM ghcr.io/nginx/nginx-unprivileged:1.30.7-alpine@sha256:0c53a1f2890c3526bfd201440f0fd3970e5b78f80630f58284aad0d34b5ec7bd
COPY docker/quizmos.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site/ /opt/quizmos/

USER 101:101
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# Run the static server without entrypoint scripts that rewrite configuration.
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
