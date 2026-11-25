## Context

The private journal is active in production. The separate sharing flag is off. The existing moderated records and Rules are coupled to private journal edits and deletion.

## Decisions

- Reuse the community route and sharing flag. Place a URL form and link management on the community page for a signed-in owner, above a paginated guest listing. Use the existing account layout, translations and dialog conventions.
- Use a separate owner collection with six fixed slots, independent of the six journal slots. Use a stable public document ID made from the slot and a random instance ID. Store the URL and the original publication timestamp in the public document. Keep owner identity and revision in the private path and record.
- Use Firestore transactions and paired write rules. The server binds public writes to the authenticated owner's before and after slot state. Stable IDs and exact command replay protect retries. Removal clears the URL from the owner slot and deletes the public document. A retained slot revision blocks late retries from republishing a removed link. Account-keyed UI state discards a previous account's editor. A failed write keeps the URL in the form.
- Accept HTTPS URLs with a public-style DNS hostname. Parse and normalize in the client and enforce the protocol, hostname shape and bounds in Rules. Render links with the destination host visible and use an isolated external tab. This feature stores and displays links supplied by users.
- Preserve the legacy private journal schema and owner cleanup paths. Retire legacy public reads and new submissions in the candidate Rules. Existing legacy documents remain available for owner cleanup. The new feed uses its own collection and never converts legacy text into public links.

## Verification and rollout

Check URL validation, retries, concurrency and the public field boundary with Node and the Firestore emulator. Use browser fixtures to check publishing, editing, removal and journal behavior across desktop and phone, both locales and themes, including narrow and landscape layouts. Reconcile and verify production Rules before enabling the shipping flag. Turning off the flag hides the community UI. For a rollback requiring public links to become unreadable, also disable the public Rules read path as a separate authorized change.
