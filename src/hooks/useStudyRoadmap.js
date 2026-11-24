import { useEffect, useRef, useState } from 'react';
import studyRoadmapService from '../services/studyRoadmapService';

export function useStudyRoadmap(uid) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [writeError, setWriteError] = useState(null);
  const active = useRef(false);
  const lastRead = useRef(0);
  const pending = useRef(false);

  async function reload() {
    const version = ++lastRead.current;
    setLoading(true);
    setReadError(false);
    try {
      const rows = await studyRoadmapService.list(uid);
      if (active.current && lastRead.current === version) {
        setPlans(rows);
        return rows;
      }
    } catch {
      if (active.current && lastRead.current === version) setReadError(true);
    } finally {
      if (active.current && lastRead.current === version) setLoading(false);
    }
  }
  useEffect(() => {
    active.current = true;
    reload();
    return () => {
      active.current = false;
      lastRead.current++;
    };
    // The workspace is keyed by uid, so identity changes always remount it.
  }, [uid]);

  async function save(command) {
    if (!active.current || pending.current || loading || readError) return false;
    pending.current = true;
    setSaving(true);
    setWriteError(null);
    try {
      await studyRoadmapService.mutate(uid, command);
      if (!active.current) return false;
      setPlans((current) => {
        const rest = current.filter(({ slot }) => slot !== command.slot);
        return command.data
          ? [
              ...rest,
              {
                ...command.data,
                slot: command.slot,
                overrides: JSON.parse(command.data.overrides),
              },
            ].sort((a, b) => a.slot.localeCompare(b.slot))
          : rest;
      });
      return true;
    } catch (error) {
      if (active.current) setWriteError(error.message === 'conflict' ? 'conflict' : 'network');
      return false;
    } finally {
      pending.current = false;
      if (active.current) setSaving(false);
    }
  }
  return {
    plans,
    loading,
    readError,
    saving,
    writeError,
    clearWriteError: () => setWriteError(null),
    reload,
    save,
  };
}
