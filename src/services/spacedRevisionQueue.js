import { NOTEBOOK_ENTRY_LIMIT, NOTEBOOK_PAGE_SIZE } from '../data/studyNotebookLimits.js';
import { notebookError } from '../utils/studyNotebook.js';

/** Read only mistake pages under one Notebook revision. No new query indexes. */
export async function loadSpacedRevision(service, resolve, uid, bankId, active) {
  const before = await service.state(uid);
  const entries = [];
  const seen = new Set();
  const filters = { mistakes: true, ...(bankId ? { sourceGroup: 'bank:' + bankId } : {}) };
  let after = null;
  do {
    if (!active()) return null;
    const page = await service.listPage(uid, filters, after);
    if (
      !Array.isArray(page.entries) ||
      page.entries.length > NOTEBOOK_PAGE_SIZE ||
      (page.next && page.entries.length !== NOTEBOOK_PAGE_SIZE)
    )
      throw notebookError('INVALID');
    for (const entry of page.entries) {
      if (!entry.mistake || seen.has(entry.entryKey) || seen.size >= NOTEBOOK_ENTRY_LIMIT)
        throw notebookError('INVALID');
      seen.add(entry.entryKey);
      entries.push(entry);
    }
    after = page.next;
  } while (after);
  if (!active()) return null;
  const latest = await service.state(uid);
  if (before.revision !== latest.revision) throw notebookError('CONFLICT');
  if (!active()) return null;
  const sources = await Promise.all(
    entries
      .filter((entry) => entry.reviewSchedule?.level !== -1)
      .map(async (entry) => [entry.entryKey, await resolve(uid, entry.ref)])
  );
  return { entries, sources: Object.fromEntries(sources) };
}
