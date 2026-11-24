import React, { useRef, useState } from 'react';
import { Alert, Button, Card, Empty, Modal, Spin, Tag, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { useSpacedRevision } from '../hooks/useSpacedRevision';
import { useRevisionScheduleAction } from '../hooks/useRevisionScheduleAction';
import { useNotebookSelection } from '../hooks/useNotebookSelection';
import { notebookMessage, NOTEBOOK_SOURCE_LABELS } from '../data/studyNotebookMessages.js';
import { findQuiz } from '../data/quizzes.js';
import { roadmapDayInZone, roadmapZone } from '../utils/studyRoadmap.js';
import {
  revisionDate,
  spacedRevisionUrl,
  REVISION_SESSION_LIMIT,
} from '../utils/spacedRevision.js';

const labels = {
  reset: ['Reset review schedule?', 'Reset schedule'],
  pause: ['Remove this question from review?', 'Remove from review'],
  restore: ['Restore this question to review?', 'Restore review'],
};

export default function SpacedRevisionQueue({ notebook, params, onNavigate }) {
  const { t, language } = useLanguage();
  const bank = findQuiz(params.get('bank'));
  const zone = roadmapZone(params.get('zone')) || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const state = useSpacedRevision(notebook.uid, bank?.id);
  const selection = useNotebookSelection(notebook, onNavigate);
  const scheduleAction = useRevisionScheduleAction(notebook.uid, state.reload);
  const [confirm, setConfirm] = useState(null);
  const cancelButton = useRef(null);
  const [counts, setCounts] = useState({});
  const queue = state.queue;
  const today = roadmapDayInZone(state.now, zone);
  const overdue =
    queue?.due.filter(({ dueAt }) => roadmapDayInZone(dueAt, zone) < today).length || 0;
  const start = () =>
    selection.study(
      queue.due.slice(0, REVISION_SESSION_LIMIT).map(({ entry }) => entry),
      {
        review: 'spaced',
        fresh: String(Date.now()),
        ...(bank ? { bank: bank.id } : {}),
        zone,
      }
    );
  const ask = (entry, action) => {
    scheduleAction.clear();
    setConfirm({ entry, action });
  };
  const cancel = () => {
    if (scheduleAction.saving) return;
    if (scheduleAction.error) state.reload();
    scheduleAction.clear();
    setConfirm(null);
  };
  const lists = [
    ['due', 'Due questions'],
    ['upcoming', 'Upcoming reviews'],
    ['excluded', 'Unavailable questions'],
    ['paused', 'Removed from review'],
  ];
  return (
    <section className="notebook-page spaced-revision">
      <div className="notebook-heading">
        <div>
          <Typography.Title level={1}>{t('Spaced review')}</Typography.Title>
          <Typography.Paragraph type="secondary">
            {bank ? bank.name + ' · ' : ''}
            {t('Times in {zone}', { zone })}
          </Typography.Paragraph>
        </div>
        <div className="spaced-actions">
          <Button onClick={() => onNavigate('#/notebook')}>{t('Back to notebook')}</Button>
          {bank && (
            <Button onClick={() => onNavigate(spacedRevisionUrl(null, zone))}>
              {t('All review sources')}
            </Button>
          )}
          <Button loading={state.loading} disabled={scheduleAction.saving} onClick={state.reload}>
            {t('Refresh reviews')}
          </Button>
        </div>
      </div>
      {state.loading && (
        <div className="inline-status" role="status">
          <Spin size="small" />
          {t('Loading reviews…')}
        </div>
      )}
      {(state.error || selection.error) && (
        <Alert type="error" showIcon message={t(notebookMessage(state.error || selection.error))} />
      )}
      {queue && (
        <>
          <Card>
            <div className="spaced-summary">
              <div>
                <Typography.Text strong>
                  {t('{count} due for review', { count: queue.due.length })}
                </Typography.Text>
                <Typography.Paragraph type="secondary">
                  {t('{count} overdue', { count: overdue })}
                </Typography.Paragraph>
                {!!queue.upcoming.length && (
                  <Typography.Paragraph>
                    {t('Next review {date}', {
                      date: revisionDate(queue.upcoming[0].dueAt, language, zone),
                    })}
                  </Typography.Paragraph>
                )}
              </div>
              <Button
                type="primary"
                loading={selection.preparing}
                onClick={start}
                disabled={!queue.due.length}
              >
                {t('Start due review')}
              </Button>
            </div>
            {!queue.due.length && (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t(
                  queue.upcoming.length
                    ? 'You are caught up. Your next review is shown above.'
                    : 'No questions are due. Practice or take a Mock exam to build a review queue.'
                )}
              />
            )}
          </Card>
          {lists.map(([kind, label]) => {
            const rows = queue[kind];
            const count = counts[kind] || 10;
            if (!rows.length) return null;
            return (
              <section key={kind} className="spaced-list">
                <Typography.Title level={2}>{t(label)}</Typography.Title>
                <ul>
                  {rows.slice(0, count).map(({ entry, source, dueAt }) => (
                    <li key={entry.entryKey}>
                      <Card>
                        <div className="spaced-summary">
                          <div>
                            <Typography.Text strong>
                              {source?.quiz?.name ||
                                findQuiz(entry.ref.quizId)?.name ||
                                t('Private quiz')}
                            </Typography.Text>
                            <div>{t('Question {id}', { id: entry.ref.questionId })}</div>
                            {source?.state === 'current' && (
                              <Typography.Paragraph ellipsis={{ rows: 2 }}>
                                {source.question.question}
                              </Typography.Paragraph>
                            )}
                            {kind === 'excluded' && (
                              <Tag>{t(NOTEBOOK_SOURCE_LABELS[source?.state || 'unavailable'])}</Tag>
                            )}
                            {(kind === 'due' || kind === 'upcoming') && (
                              <time dateTime={new Date(dueAt).toISOString()}>
                                {revisionDate(dueAt, language, zone)}
                              </time>
                            )}
                            {kind === 'due' && roadmapDayInZone(dueAt, zone) < today && (
                              <Tag className="spaced-overdue">{t('Overdue')}</Tag>
                            )}
                          </div>
                          <div className="spaced-actions">
                            {kind === 'paused' ? (
                              <Button onClick={() => ask(entry, 'restore')}>
                                {t('Restore review')}
                              </Button>
                            ) : (
                              <>
                                {kind !== 'excluded' && (
                                  <Button onClick={() => ask(entry, 'reset')}>
                                    {t('Reset schedule')}
                                  </Button>
                                )}
                                <Button onClick={() => ask(entry, 'pause')}>
                                  {t('Remove from review')}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
                {rows.length > count && (
                  <Button onClick={() => setCounts({ ...counts, [kind]: count + 10 })}>
                    {t('Show more')}
                  </Button>
                )}
              </section>
            );
          })}
        </>
      )}
      <Modal
        className="app-danger-dialog"
        open={!!confirm}
        title={confirm && t(labels[confirm.action][0])}
        okText={confirm && t(labels[confirm.action][1])}
        okButtonProps={{
          danger: confirm?.action === 'pause',
          disabled: scheduleAction.error?.code === 'NOTEBOOK_CONFLICT',
        }}
        cancelText={t('Cancel')}
        cancelButtonProps={{ autoFocus: true, ref: cancelButton }}
        afterOpenChange={(open) => {
          if (open) cancelButton.current?.focus();
        }}
        confirmLoading={scheduleAction.saving}
        onCancel={cancel}
        onOk={async () => {
          if (
            confirm &&
            (await scheduleAction.save(
              confirm.entry,
              confirm.action === 'pause' ? 'pause' : 'reset'
            ))
          )
            setConfirm(null);
        }}
      >
        <Typography.Paragraph>
          {t('Your notes, bookmarks and past answers are kept.')}
        </Typography.Paragraph>
        {scheduleAction.error && (
          <Alert type="error" showIcon message={t(notebookMessage(scheduleAction.error))} />
        )}
        {scheduleAction.error?.code === 'NOTEBOOK_CONFLICT' && (
          <Button onClick={cancel}>{t('Refresh reviews')}</Button>
        )}
      </Modal>
    </section>
  );
}
