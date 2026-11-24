## Private journal

Store at most six entries in fixed owner slots. Validate a public bank, a real date through today, passed or not passed, and optional private notes and numeric score with its supplied maximum. Use ISO date-only values. Linking a matching plan is explicit. Store the plan slot and instance ID and never mutate the plan, learning progress or archived attempts.

## Sharing and moderation

The exact preview includes the bank, outcome and optional separate public experience. No identity, exam date, private notes, scores or roadmap information is in the public projection. A submission starts pending. A moderator with the server-provisioned Firebase `certOutcomeModerator` claim can publish or reject pending submissions and remove published ones. Moderators cannot review their own submissions. Owners may withdraw at any step and submit again explicitly. Withdrawal clears the preview and removes a published document atomically; deletion removes all linked documents. Changing the bank or result automatically withdraws a prior share. Public records are labeled self-reported. Moderation for #83 is a separate workflow.

## Concurrency and release

Use instance IDs and expected revisions for private and moderation changes. Compare exact successful writes on retry. Candidate Rules couple all state changes to the public projection and enforce owner-only private reads. Collection queries are bounded. Private and public UI flags default off. Deploy Rules and verify owner behavior before enabling the private journal. The separate sharing flag requires configured moderators and verified public/private smoke. Disable flags to restrict new work while keeping data. See the rollout docs for moderator access and public-feed behavior.

## Verification

Model tests cover dates, scores, plan identity and replay. Emulator tests cover document read/write separation, moderation transitions and atomic deletion. Browser fixtures cover owner flows, preview, moderation, guest feed, account switches, input recovery and responsive states.
