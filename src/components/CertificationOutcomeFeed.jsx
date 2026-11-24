import React, { useState } from 'react';
import { Alert, Button, Card, Empty, Modal, Spin, Tag, Typography } from 'antd';
import { useOutcomeFeed, useOutcomeWrite, outcomeMessage } from '../hooks/useCertOutcomes';
import { useLanguage } from '../contexts/LanguageContext';
import { findQuiz } from '../data/quizzes.js';

export const outcomeResultLabel = (value) => (value === 'passed' ? 'Passed' : 'Did not pass');

export function PublicOutcomeCard({ report }) {
  const { t } = useLanguage();
  return (
    <>
      <Typography.Title level={3}>
        {findQuiz(report.bankId)?.name || report.bankId}
      </Typography.Title>
      <div className="outcome-actions">
        <Typography.Text strong>{t(outcomeResultLabel(report.result))}</Typography.Text>
        <Tag>{t('Self-reported')}</Tag>
      </div>
      {report.experience && (
        <Typography.Paragraph className="outcome-note">{report.experience}</Typography.Paragraph>
      )}
    </>
  );
}

const decisions = {
  publish: ['Publish this report?', 'Publish report'],
  reject: ['Reject this report?', 'Reject report'],
  remove: ['Remove this public report?', 'Remove public report'],
};
export default function CertificationOutcomeFeed({ moderator }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState('pending');
  const state = useOutcomeFeed(moderator ? status : null);
  const mutation = useOutcomeWrite(moderator);
  const [selected, setSelected] = useState(null);
  const review = (report, action) => {
    mutation.clear();
    setSelected({ report, action });
  };
  return (
    <>
      <div className="outcome-actions">
        {moderator && (
          <>
            <Button
              aria-pressed={status === 'pending'}
              type={status === 'pending' ? 'primary' : 'default'}
              onClick={() => setStatus('pending')}
            >
              {t('Pending reports')}
            </Button>
            <Button
              aria-pressed={status === 'published'}
              type={status === 'published' ? 'primary' : 'default'}
              onClick={() => setStatus('published')}
            >
              {t('Published reports')}
            </Button>
          </>
        )}
        <Button loading={state.loading} onClick={() => state.load()}>
          {t('Refresh outcomes')}
        </Button>
      </div>
      {moderator && (
        <Alert
          type="info"
          showIcon
          message={t('Review public fields for personal information before publishing.')}
        />
      )}
      {state.error && <Alert type="error" showIcon message={t(outcomeMessage(state.error))} />}
      {state.loading && (
        <div className="inline-status" role="status">
          <Spin size="small" />
          {t('Loading certification outcomes…')}
        </div>
      )}
      {!state.loading && !state.error && !state.rows.length && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t(moderator ? 'No reports in this queue.' : 'No public outcomes yet.')}
        />
      )}
      <div className="outcome-list">
        {state.rows.map((report) => (
          <Card key={report.id}>
            <PublicOutcomeCard report={report} />
            {moderator && report.owner !== moderator && (
              <div className="outcome-actions">
                {status === 'pending' ? (
                  <>
                    <Button type="primary" onClick={() => review(report, 'publish')}>
                      {t('Publish report')}
                    </Button>
                    <Button onClick={() => review(report, 'reject')}>{t('Reject report')}</Button>
                  </>
                ) : (
                  <Button danger onClick={() => review(report, 'remove')}>
                    {t('Remove public report')}
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
      {!!state.next && (
        <Button disabled={state.loading} onClick={() => state.load(state.next)}>
          {t('Show more')}
        </Button>
      )}
      {moderator && (
        <Modal
          className="app-danger-dialog outcome-dialog"
          open={!!selected}
          title={selected && t(decisions[selected.action][0])}
          okText={selected && t(decisions[selected.action][1])}
          cancelText={t('Cancel')}
          confirmLoading={mutation.busy}
          destroyOnHidden
          okButtonProps={{
            danger: selected?.action === 'remove',
            disabled: mutation.error?.outcomeCode === 'conflict',
          }}
          cancelButtonProps={{ autoFocus: true }}
          onCancel={() => {
            if (mutation.busy) return;
            if (mutation.error) state.load();
            setSelected(null);
          }}
          onOk={async () => {
            if (!selected) return;
            if (
              await mutation.write('moderate', {
                id: selected.report.id,
                revision: selected.report.revision,
                action: selected.action,
              })
            ) {
              setSelected(null);
              state.load();
            }
          }}
        >
          {selected && <PublicOutcomeCard report={selected.report} />}
          {mutation.error && (
            <Alert type="error" showIcon message={t(outcomeMessage(mutation.error))} />
          )}
        </Modal>
      )}
    </>
  );
}
