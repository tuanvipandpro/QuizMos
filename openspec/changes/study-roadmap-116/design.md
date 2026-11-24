## Calendar and tasks

Store date-only values as ISO calendar days with an IANA time zone. Derive today's day in that zone. Use Monday through Sunday weeks and spread the selected zero to seven sessions over the available days in each week, ending the day before the target. Limit new or changed targets to 7–180 days ahead. The existing target can be retained when it approaches or passes. The timer and study drafts live outside this feature.

A task is keyed by the ISO week start and a slot ordinal. Recalculating the schedule retains manually completed and moved tasks. When shrinking the plan, preserve those tasks and show out-of-range items separately. Past incomplete tasks are shown as missed and can be moved to another valid day. Practice and Mock Exam use the bank's existing entry links. Summary is offered when the catalog has a guide. The future #85 queue will supply due items separately.

Explicit manual completion is stored in the plan. Compatible submitted public-bank attempts can complete at most one same-bank Mock task per attempt in the relevant local week. The evidence is read-only, per plan, and recomputed from the retained pages of Exam History. Manual completion and links to saved results remain identifiable.

## Storage

Store three fixed owner-scoped slots under `users/{uid}/studyPlans`. Archived plans count toward the limit and can be restored or deleted. Each record carries an instance ID and revision. Every edit or deletion requires the matching version in a Firestore transaction. Duplicate creates and retried commands cannot silently overwrite another instance. A bounded JSON field stores the sparse overrides and is validated on read. Parent profile authorization does not authorize subcollection access.

Each plan's bank stays fixed. Catalog aliases resolve current links and history while preserving the stored key across Rules-checked edits. If a bank is removed, the plan remains available for archive or deletion.

Use the public build flag `VITE_STUDY_ROADMAP_ENABLED` after Rules smoke. Enable in browser fixtures. Rollback hides entry points and leaves plans intact.

## Verification matrix

- Calendar, recalculation, protected overrides, and attempt evidence — domain tests.
- Owner reads, write validation, quotas, stale edits and deletion — repository and Rules tests.
- Create, edit, reschedule, archive, restore, delete, reload and account switches — browser fixtures and responsive checks.
