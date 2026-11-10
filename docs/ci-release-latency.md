# Production release latency

Tracking: [#109](https://github.com/tuanvipandpro/QuizMos/issues/109). Chore/CI; medium risk. No required validation, production-only release check or same-run artifact provenance is removed.

## Observed M1 release

[Master run 42742378639](https://github.com/tuanvipandpro/QuizMos/actions/runs/42742378639) took 647 seconds. Browser shards took 453/472 seconds, with 375/356 seconds inside tests. Repeated locked setup took 49–70 seconds per job; browser installation took 20–52 seconds. Backend publication took 82 seconds and frontend publication 58 seconds; backend-before-frontend remains deliberate compatibility ordering.

The subsequent [legacy Pages run 42743622410](https://github.com/tuanvipandpro/QuizMos/actions/runs/42743622410) took 603 seconds: build 24, deploy 569 (566 inside the deployment action). The observed combined path was about 20m50s. This sample locates a large external publication wait; it does not establish that source compilation caused the wait or that changing workflows removes it.

## Bounded changes

- Four standard hosted E2E shard jobs replace two, keeping two workers per runner, all tests, fail-fast:false and the unchanged gate. The denominator comes from the actual matrix job total; smoke-only asset checks stay single-job.
- Cache only node_modules with an exact OS/architecture/Node-major/lockfile/package/nvmrc key. Always run frozen installation with file checks, even on a hit. Keep the existing download cache for misses. No env, credentials, Firebase/Worker state or cross-key module fallback is cached. GitHub cache ref isolation remains the trust boundary; see [cache restrictions](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching).
- Keep browser/OS-dependency installation. [Playwright](https://playwright.dev/docs/ci#caching-browsers) does not generally recommend caching browser binaries; this change adds no such cache.

Measure actual cold and warm job steps before claiming a speedup. Four jobs add setup overhead and aggregate runner work; this public repository uses the existing standard runner class, not paid/larger runners. No promise is made about total production latency until a real subsequent release is observed.

## Separate Pages follow-up

Official [Pages artifact workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) can publish the verified static artifact without installing application dependencies solely to push gh-pages. Migrating from legacy branch publication requires an explicitly reviewed repository publishing-source/environment/permissions change and retained rollback. It may remove duplicate setup/build overhead; the observed external deploy wait may still occur. Do not change Pages source or bypass verified artifacts as part of this bounded CI improvement.
