## Schedule

Use these elapsed intervals after each successful review: 1, 3, 7, 14 and 30 days. The first unresolved mistake is due immediately. A wrong answer resets the interval to due now. A correct answer advances when due, with a maximum interval of 30 days. A correct correction at the initial step starts the one-day interval. Correct repeats during an existing interval keep that interval. An ordinary study outcome seeds an existing Notebook entry and resets an active schedule on a wrong answer.

An optional Notebook field stores the step and a Firestore server anchor in the existing owner-scoped transaction. Old rows derive their start from the recorded wrong or reviewed timestamp. Explicit reset starts a new due-now interval. Remove from review pauses the row until it is restored by the learner. These operations keep notes, bookmarks and mistake status. The branch flag is off until the additive Rules are verified. Compatible clients are required before switching it on.

## Queue and session

Read the bounded mistake pages (500 maximum) with the existing indexes and reject inconsistent revisions. Use the current bank or private quiz version and question fingerprint resolver. Show changed or missing sources separately and exclude them from sessions. A review includes up to 20 eligible due questions and uses separate, account-bound Practice state and the existing replay-safe capture journal. It updates existing mistake entries only. Prior submitted exams are represented by the Notebook outcomes captured at the time. Visiting archived results does not backfill or rewrite them.

Intervals are absolute. Format due dates in the selected plan's time zone when opening from a roadmap. A local day before today is overdue. The roadmap shows in-week and overdue counts for the selected bank without changing planned tasks, exam drafts or target dates.

## Verification

Test time boundaries, repeat/corrected answers, scheduling transitions, Rules ownership and stale writes with pure and emulator tests. Verify due, future, excluded, reset/restore, scoped calendar links and responsive layouts with local browser fixtures.
