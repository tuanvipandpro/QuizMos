import React from 'react';
import { Button, Card, Spin, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { useSpacedRevision } from '../hooks/useSpacedRevision';
import { addRoadmapDays, roadmapDayInZone } from '../utils/studyRoadmap.js';
import { canonicalQuizId } from '../data/quizAliases.js';
import { revisionDate, spacedRevisionUrl } from '../utils/spacedRevision.js';

export default function SpacedRevisionSummary({ uid, bankId, zone, week, onNavigate }) {
  const { t, language } = useLanguage();
  const bank = canonicalQuizId(bankId);
  const { queue, now, loading, error, reload } = useSpacedRevision(uid, bank);
  const date = (epoch) => roadmapDayInZone(epoch, zone);
  const nextWeek = addRoadmapDays(week, 7);
  const today = date(now);
  const inWeek = queue
    ? [...queue.due, ...queue.upcoming].filter(({ dueAt }) => {
        const day = date(dueAt);
        return day >= week && day < nextWeek;
      }).length
    : 0;
  const overdue = queue?.due.filter(({ dueAt }) => date(dueAt) < today).length || 0;
  return (
    <Card size="small" className="spaced-roadmap">
      <div className="spaced-summary">
        <div>
          <Typography.Title level={4}>{t('Spaced review')}</Typography.Title>
          {loading && (
            <Typography.Text role="status">
              <Spin size="small" /> {t('Loading reviews…')}
            </Typography.Text>
          )}
          {error && <Typography.Text role="status">{t('Could not load reviews.')}</Typography.Text>}
          {queue && (
            <>
              <Typography.Paragraph>
                {t('{count} reviews this week', { count: inWeek })} ·{' '}
                {t('{count} overdue', { count: overdue })}
              </Typography.Paragraph>
              {!!queue.upcoming.length && (
                <Typography.Paragraph>
                  {t('Next review {date}', {
                    date: revisionDate(queue.upcoming[0].dueAt, language, zone),
                  })}
                </Typography.Paragraph>
              )}
            </>
          )}
        </div>
        <div className="spaced-actions">
          {error && <Button onClick={reload}>{t('Retry')}</Button>}
          <Button onClick={() => onNavigate(spacedRevisionUrl(bank, zone))}>
            {t('Open spaced review')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
