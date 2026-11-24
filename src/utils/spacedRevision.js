const elapsedDay = 86400000;
const revisionDays = [0, 1, 3, 7, 14, 30];
export const REVISION_SESSION_LIMIT = 20;
export const spacedRevisionUrl = (bankId, zone) =>
  '#/notebook?' +
  new URLSearchParams({
    view: 'revision',
    ...(bankId ? { bank: bankId } : {}),
    ...(zone ? { zone } : {}),
  });

export const revisionDate = (epoch, language, timeZone) =>
  new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(epoch);

export function validRevisionSchedule(value) {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === 2 &&
    Number.isSafeInteger(value.level) &&
    value.level >= -1 &&
    value.level < revisionDays.length &&
    Number.isSafeInteger(value.anchor) &&
    value.anchor >= 0
  );
}

export function getRevisionSchedule(entry) {
  if (!entry?.mistake) return null;
  const { level, anchor } =
    entry.reviewSchedule ||
    (entry.reviewed
      ? { level: 1, anchor: entry.lastReviewedAt }
      : { level: 0, anchor: entry.lastWrongAt });
  return { level, dueAt: level < 0 ? null : anchor + revisionDays[level] * elapsedDay };
}

// Undefined leaves the current interval intact. The repository stamps new anchors with server time.
export function nextRevisionSchedule(state, correct, spaced, now) {
  const previous = getRevisionSchedule(state);
  if (!previous || previous.level < 0) return undefined;
  if (!correct) return spaced || state.reviewSchedule ? { level: 0, anchor: now } : undefined;
  if (previous.level === 0 && (spaced || state.reviewSchedule)) return { level: 1, anchor: now };
  if (!spaced || now < previous.dueAt) return undefined;
  return { level: Math.min(previous.level + 1, revisionDays.length - 1), anchor: now };
}

export function classifyRevisions(entries, sources, now) {
  const due = [],
    upcoming = [],
    paused = [],
    excluded = [];
  for (const entry of entries) {
    const schedule = getRevisionSchedule(entry);
    if (!schedule) continue;
    const source = sources[entry.entryKey];
    const row = { entry, ...schedule, source };
    if (schedule.dueAt === null) paused.push(row);
    else if (source?.state !== 'current') excluded.push(row);
    else if (schedule.level === 0 || schedule.dueAt <= now) due.push(row);
    else upcoming.push(row);
  }
  const byDate = (a, b) => a.dueAt - b.dueAt || a.entry.entryKey.localeCompare(b.entry.entryKey);
  return { due: due.sort(byDate), upcoming: upcoming.sort(byDate), paused, excluded };
}
