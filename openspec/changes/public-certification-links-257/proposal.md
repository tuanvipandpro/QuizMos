## Why

Learners want to share links to certificates and badges they already earned. The public outcome flow from #115 was designed around moderation of self-reported text and has remained disabled in production. Refs [#257](https://github.com/tuanvipandpro/QuizMos/issues/257) and [#115](https://github.com/tuanvipandpro/QuizMos/issues/115).

## What Changes

- Let signed-in learners paste and explicitly publish an HTTPS credential link, then edit or remove it.
- Show published links immediately to guests on the existing community route.
- Retire the moderated public outcome UI. Keep the private certification journal and existing data compatible.

## Capabilities

### New Capabilities

- `public-certification-links` covers self-service publication, editing, removal and guest listing.

### Modified Capabilities

The public requirements in the historical `certification-outcomes-115` change are superseded by this change. Its private journal contract still applies.

## Impact

The community route, account navigation, localized UI, Firebase Rules and the sharing rollout flag are affected. The scope covers outbound URLs. Issuer verification and file uploads are outside scope.
