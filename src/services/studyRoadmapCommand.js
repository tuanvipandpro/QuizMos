import { readRoadmapPlan } from '../utils/studyRoadmap.js';

export function roadmapCommand(slot, instanceId, revision, plan) {
  const { bankId, startDate, targetDate, timezone, weeklyGoal, archived, overrides } = plan;
  const data = {
    schemaVersion: 1,
    instanceId,
    revision: revision + 1,
    bankId,
    startDate,
    targetDate,
    timezone,
    weeklyGoal,
    archived,
    overrides: JSON.stringify(overrides),
  };
  readRoadmapPlan(slot, data);
  return { slot, instanceId, revision, data };
}

export function roadmapWrite(previous, { instanceId, revision, data }) {
  if (!previous) {
    if (!data || revision === 0) return data;
    throw new Error('conflict');
  }
  if (previous.instanceId === instanceId) {
    if (previous.revision === revision) return data;
    if (
      data &&
      previous.revision === data.revision &&
      Object.keys(data).every((key) => previous[key] === data[key])
    )
      return undefined;
  }
  throw new Error('conflict');
}
