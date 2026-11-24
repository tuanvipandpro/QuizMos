import { canonicalQuizId } from '../data/quizAliases.js';
import { findQuiz } from '../data/quizzes.js';
import { UUID_PATTERN } from './secureId.js';

export const ROADMAP_SLOTS = ['slot-1', 'slot-2', 'slot-3'];
export const ROADMAP_GOAL_MAX = 7;
export const ROADMAP_TARGET_MIN = 7;
export const ROADMAP_TARGET_MAX = 180;
export const ROADMAP_OVERRIDES_MAX = 12000;
const dayMs = 86400000;
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const bankPattern = /^[a-z0-9-]{1,120}$/;
const taskPattern = /^(\d{4}-\d{2}-\d{2}):([0-6])$/;

function ordinal(day) {
  return Date.parse(day + 'T00:00:00Z') / dayMs;
}
const calendarDay = (number) => new Date(number * dayMs).toISOString().slice(0, 10);
export const addRoadmapDays = (day, count) => calendarDay(ordinal(day) + count);
export const isRoadmapDay = (day) =>
  typeof day === 'string' &&
  dayPattern.test(day) &&
  Number.isFinite(ordinal(day)) &&
  calendarDay(ordinal(day)) === day;
export const roadmapMonday = (day) => addRoadmapDays(day, -(((ordinal(day) + 3) % 7) + 7) % 7);

export function roadmapDayInZone(epoch, timezone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    calendar: 'iso8601',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(epoch).map(({ type, value }) => [type, value])
  );
  return parts.year + '-' + parts.month + '-' + parts.day;
}

export function roadmapZone(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_+/-]{1,64}$/.test(value)) return null;
  try {
    return new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export function roadmapFields(form, previous, now) {
  const timezone = roadmapZone(form.timezone.trim());
  if (!timezone)
    return { field: 'timezone', error: 'Enter a valid time zone, such as Asia/Ho_Chi_Minh.' };
  const today = roadmapDayInZone(now, timezone);
  const bankId = canonicalQuizId(form.bankId);
  if (!findQuiz(bankId)) return { field: 'bankId', error: 'Choose an available quiz bank.' };
  if (
    !isRoadmapDay(form.targetDate) ||
    (form.targetDate !== previous?.targetDate &&
      (form.targetDate < addRoadmapDays(today, ROADMAP_TARGET_MIN) ||
        form.targetDate > addRoadmapDays(today, ROADMAP_TARGET_MAX)))
  )
    return { field: 'targetDate', error: 'Choose an exam date 7 to 180 days from today.' };
  // Review history is anchored to a bank. A new bank gets an independent plan.
  if (previous && bankId !== canonicalQuizId(previous.bankId))
    return { field: 'bankId', error: 'Create a separate plan for another quiz bank.' };
  const weeklyGoal = Number(form.weeklyGoal);
  if (!Number.isInteger(weeklyGoal) || weeklyGoal < 0 || weeklyGoal > ROADMAP_GOAL_MAX)
    return { field: 'weeklyGoal', error: 'Choose zero to seven study sessions per week.' };
  return {
    value: {
      bankId: previous?.bankId || bankId,
      targetDate: form.targetDate,
      timezone,
      weeklyGoal,
      startDate: previous?.startDate || today,
    },
  };
}

export function readRoadmapPlan(slot, data) {
  const fields = [
    'schemaVersion',
    'instanceId',
    'revision',
    'bankId',
    'startDate',
    'targetDate',
    'timezone',
    'weeklyGoal',
    'archived',
    'overrides',
  ];
  if (
    !ROADMAP_SLOTS.includes(slot) ||
    !data ||
    Object.keys(data).length !== fields.length ||
    !fields.every((field) => Object.hasOwn(data, field)) ||
    data.schemaVersion !== 1 ||
    typeof data.instanceId !== 'string' ||
    !UUID_PATTERN.test(data.instanceId) ||
    !Number.isSafeInteger(data.revision) ||
    data.revision < 1 ||
    typeof data.bankId !== 'string' ||
    !bankPattern.test(data.bankId) ||
    !isRoadmapDay(data.startDate) ||
    !isRoadmapDay(data.targetDate) ||
    data.targetDate <= data.startDate ||
    !roadmapZone(data.timezone) ||
    !Number.isSafeInteger(data.weeklyGoal) ||
    data.weeklyGoal < 0 ||
    data.weeklyGoal > ROADMAP_GOAL_MAX ||
    typeof data.archived !== 'boolean' ||
    typeof data.overrides !== 'string' ||
    data.overrides.length > ROADMAP_OVERRIDES_MAX
  )
    throw new Error('invalid');
  const overrides = JSON.parse(data.overrides);
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
    throw new Error('invalid');
  for (const [key, value] of Object.entries(overrides)) {
    const match = taskPattern.exec(key);
    if (
      !match ||
      !isRoadmapDay(match[1]) ||
      roadmapMonday(match[1]) !== match[1] ||
      !value ||
      typeof value !== 'object' ||
      Object.keys(value).length !== 2 ||
      !Object.hasOwn(value, 'date') ||
      !Object.hasOwn(value, 'done') ||
      !isRoadmapDay(value.date) ||
      typeof value.done !== 'boolean'
    )
      throw new Error('invalid');
  }
  return { ...data, overrides, slot };
}

export function roadmapWeekTasks(plan, week, evidence = []) {
  const start = week < plan.startDate ? plan.startDate : week;
  const nextWeek = addRoadmapDays(week, 7);
  const end = nextWeek < plan.targetDate ? nextWeek : plan.targetDate;
  const days = ordinal(end) - ordinal(start);
  const count = Math.max(0, Math.min(days, plan.weeklyGoal));
  const scheduled = new Map();
  for (let index = 0; index < count; index++) {
    const id = week + ':' + index;
    if (!Object.hasOwn(plan.overrides, id))
      scheduled.set(id, {
        date: addRoadmapDays(start, Math.floor((index * days) / count)),
        done: false,
      });
  }
  for (const [id, task] of Object.entries(plan.overrides)) {
    if (
      task.date >= week &&
      task.date < nextWeek &&
      task.date >= plan.startDate &&
      task.date < plan.targetDate
    )
      scheduled.set(id, task);
  }
  const attempts = evidence
    .filter(
      (item) =>
        item.source.kind === 'bank' &&
        canonicalQuizId(item.source.id) === canonicalQuizId(plan.bankId) &&
        item.endReason === 'submitted' &&
        item.questionCount > item.unanswered
    )
    .map((item) => ({ id: item.attemptId, day: roadmapDayInZone(item.endedAt, plan.timezone) }))
    .filter((item) => item.day >= start && item.day < end)
    .sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id));
  const unique = [...new Map(attempts.map((item) => [item.id, item])).values()];
  return [...scheduled]
    .map(([id, task]) => ({ id, ...task, kind: roadmapTaskKind(id) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    .map((task) => ({
      ...task,
      attemptId: task.kind === 'exam' ? unique.shift()?.id : undefined,
    }));
}

export const roadmapTaskKind = (id) => ['practice', 'exam', 'summary'][Number(id.at(-1)) % 3];

export function roadmapOutsideTasks(plan) {
  return Object.entries(plan.overrides)
    .filter(([, task]) => task.date < plan.startDate || task.date >= plan.targetDate)
    .map(([id, task]) => ({ id, ...task, kind: roadmapTaskKind(id) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
