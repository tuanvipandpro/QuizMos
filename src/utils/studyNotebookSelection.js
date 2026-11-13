import { contentHash } from './contentHash.js';
import { notebookEntryKey, notebookError, validateNotebookReference } from './studyNotebook.js';
import { orderObjectKeys } from './questionFingerprint.js';
import { NOTEBOOK_ENTRY_LIMIT } from '../data/studyNotebookLimits.js';

/** Reference-only manifest, stored under an account key by the selection service. */
export async function notebookSelection(entries) {
  if (!Array.isArray(entries) || !entries.length || entries.length > NOTEBOOK_ENTRY_LIMIT)
    throw notebookError('INVALID');
  const manifest = [];
  for (const entry of entries) {
    const ref = { ...validateNotebookReference(entry.ref) },
      entryKey = await notebookEntryKey(ref);
    if (entryKey !== entry.entryKey) throw notebookError('INVALID');
    manifest.push({ entryKey, ref });
  }
  manifest.sort((a, b) => (a.entryKey < b.entryKey ? -1 : a.entryKey > b.entryKey ? 1 : 0));
  if (new Set(manifest.map((item) => item.entryKey)).size !== manifest.length)
    throw notebookError('INVALID');
  const id = await contentHash(JSON.stringify(orderObjectKeys(manifest)));
  return { id, manifest, sessionId: `notebook:${id}` };
}
