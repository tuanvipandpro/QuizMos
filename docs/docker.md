# Run QuizMos with Docker

QuizMos can run as a standalone static frontend on Docker Engine or Docker Desktop with Linux containers. Docker packages the Vite site and serves it with unprivileged NGINX. The GitHub Actions production publishing path continues to serve the hosted app.

## Start locally

From the repository root, with Docker Compose available:

```sh
docker compose up --build -d --wait
```

Open [http://localhost:8080/](http://localhost:8080/). Compose publishes container port 8080 on host loopback. For a self-hosted domain, put an HTTPS reverse proxy in front of that port. The container uses UID 101, a read-only root filesystem and a 16 MiB `/tmp` filesystem. The health endpoint is [http://localhost:8080/healthz](http://localhost:8080/healthz).

The same image works with Docker directly:

```sh
docker build -t quizmos:local .
docker run --rm --name quizmos --read-only --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777 --cap-drop ALL --security-opt=no-new-privileges -p 127.0.0.1:8080:8080 quizmos:local
```

Use Compose or the direct command for a given port. The direct command runs in the foreground.

## Serve a subpath

For a second location, create a local `.env.docker` Compose environment file:

```dotenv
VITE_BASE=/quiz-app/
QUIZMOS_PORT=8081
QUIZMOS_IMAGE=quizmos:subpath
```

```sh
docker compose --env-file .env.docker up --build -d --wait
```

Open [http://localhost:8081/quiz-app/](http://localhost:8081/quiz-app/). Use a leading and trailing slash and plain path segments. Forward the prefix unchanged through your reverse proxy. Public app routes retain their hash format, for example [the quiz library](http://localhost:8081/quiz-app/#/library). The health probe stays at `/healthz`. Requests outside the configured site or for missing assets return 404.

## Public build configuration

Vite embeds config in the JavaScript bundle. Supply these values while building and rebuild to change them. Runtime port mapping and NGINX process options are separate. Use public web configuration only for all build arguments. [Docker build variables](https://docs.docker.com/build/building/variables/)

| Argument                                                                                                                                                                                                      | Default and purpose                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_BASE`                                                                                                                                                                                                   | `/`. Use `/quiz-app/` for a prefixed mount. The `/healthz/` prefix is reserved.                                                         |
| `VITE_APP_AI_URL`                                                                                                                                                                                             | Empty. Point to an approved HTTPS App AI Worker if the origin and backend are ready.                                                    |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID` | Empty overrides use the public Firebase configuration in the repository. Provide matching identifiers for a different Firebase project. |
| `VITE_EXAM_HISTORY_ENABLED`, `VITE_STUDY_NOTEBOOK_ENABLED`, `VITE_STUDY_ROADMAP_ENABLED`, `VITE_SPACED_REVISION_ENABLED`, `VITE_CERT_OUTCOMES_ENABLED`, `VITE_CERT_OUTCOME_SHARING_ENABLED`                   | `false`. Enable features against verified compatible policies and backend configuration.                                                |

Compose reads `VITE_BASE` and `VITE_APP_AI_URL` for its build args. Pass individual additional public arguments via `docker compose build --build-arg NAME=value`, followed by `docker compose up -d --no-build --wait`. For example, set a public Firebase project override through the build command and provide the rest of that project's web identifiers with additional `--build-arg` flags. Keep credentials and provider secrets in their existing authorized stores. [Credential handling](contributing.md#credentials-and-secrets)

Docker's build check may flag the Firebase browser-key and auth-domain argument names. Those two values are public web identifiers for the Firebase client. [Firebase web configuration](https://firebase.google.com/docs/auth/faq-and-troubleshooting)

For Google sign-in, authorize the self-hosted hostname in the Firebase project's **Authorized domains** and configure the Google provider. With a custom Firebase Auth domain, its OAuth callback is `https://<auth-domain>/__/auth/handler`. Plan the Firebase domain and callback together. [Firebase Google sign-in](https://firebase.google.com/docs/auth/web/google-signin) · [Firebase authorized domains](https://firebase.google.com/docs/auth/faq-and-troubleshooting)

To enable App AI, the existing Worker needs the exact browser origin, including scheme and a nondefault port, in `ALLOWED_ORIGINS`. For example, a path-mounted deployment on `https://study.example.org/quiz-app/` has origin `https://study.example.org`. The Worker, Firebase, and their credentials remain external services. [App AI configuration and rollout](../worker/README.md)

## Health, updates and rollback

- Use `docker compose ps` for health and `docker compose logs quizmos` for startup failures. Verify `/healthz`, the configured base and a reloaded hash route after a change.
- Stop the Compose service with `docker compose down`. When using the direct command, stop it with `docker stop quizmos`.
- For updates, build a new checkout under a new `QUIZMOS_IMAGE` tag and recreate the service. Keep the previous verified image and the public build settings. For rollback, set `QUIZMOS_IMAGE` to the previous tag and run `docker compose up -d --no-build --force-recreate --wait` with the same Compose env file.
- Build from a clean checkout. Use the tracked Yarn lockfile and digest-pinned image indexes. Review upstream security updates and refresh the patch tag and digest together, then rerun root/subpath and health checks. Local build and runtime verification covers Linux amd64. [Official Node image](https://hub.docker.com/_/node/) · [NGINX unprivileged image](https://github.com/nginx/docker-nginx-unprivileged)
