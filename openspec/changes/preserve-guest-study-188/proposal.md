# Proposal

## Why

Signing in can clear the guest draft before the account study view starts. [#188](https://github.com/tuanvipandpro/QuizMos/issues/188) asks for continuity through that transition.

## What Changes

Keep the active public-bank or tab-upload session during a successful sign-in from that tab. Resolve conflicts with an existing account draft explicitly. Preserve the original deadline, study settings, answers, and completed result review.

## Capabilities

### Modified Capabilities

- `study-session-configuration` gains a guest-to-account continuation.

## Impact

The transfer is tab-local. Existing account ownership, Firestore Rules, checkpoints, and archived History remain in force.
