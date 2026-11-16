import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useLanguage } from '../contexts/LanguageContext';
import { quizPdfAccess } from '../utils/quizPdf.js';
import { questionFingerprint } from '../utils/studySession.js';
export function useQuizPdfExport(quiz) {
  const { user } = useAuth(),
    { t } = useLanguage(),
    [state, setState] = useState({ status: 'idle' }),
    job = useRef(null),
    mounted = useRef(true);
  const fingerprint = useMemo(() => questionFingerprint(quiz.questions), [quiz.questions]);
  const key = JSON.stringify([
      user?.uid || null,
      quiz.id,
      quiz.name,
      quiz.contentVersion,
      fingerprint,
    ]),
    current = useRef(key);
  current.current = key;
  const cancel = () => {
    job.current?.controller.abort();
    job.current = null;
  };
  useEffect(() => {
    mounted.current = true;
    setState({ status: 'idle' });
    return () => {
      mounted.current = false;
      cancel();
    };
  }, [key]);
  return {
    ...state,
    sourceKey: key,
    allowed: quizPdfAccess(quiz, user?.uid || null).read,
    cancel() {
      const hadJob = !!job.current;
      cancel();
      if (mounted.current && hadJob) setState({ status: 'cancelled' });
    },
    async start() {
      if (job.current) return;
      const controller = new AbortController(),
        token = { controller, key };
      job.current = token;
      const isCurrent = () => mounted.current && job.current === token && current.current === key;
      setState({ status: 'working', progress: null });
      try {
        const { generateQuizPdf, downloadQuizPdf } = await import('../services/quizPdfExport');
        if (!isCurrent()) return;
        const file = await generateQuizPdf(quiz, user?.uid || null, {
          access: quizPdfAccess(quiz, user?.uid || null),
          signal: controller.signal,
          isCurrent,
          t,
          onProgress: (progress) => {
            if (isCurrent()) setState({ status: 'working', progress });
          },
        });
        if (isCurrent()) {
          downloadQuizPdf(file);
          setState({ status: 'done' });
        }
      } catch (error) {
        if (isCurrent())
          setState({
            status: error.code === 'PDF_CANCELLED' ? 'cancelled' : 'error',
            error: error.code || 'PDF_GENERATE',
          });
      } finally {
        if (job.current === token) job.current = null;
      }
    },
  };
}
