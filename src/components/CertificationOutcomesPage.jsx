import React, { useEffect, useId, useState } from 'react';
import { Alert, Button, Card, Checkbox, Empty, Input, Modal, Spin, Tag, Typography } from 'antd';
import CertificationOutcomeEditor, { planForOutcome } from './CertificationOutcomeEditor';
import CertificationOutcomeFeed, {
  outcomeResultLabel,
  PublicOutcomeCard,
} from './CertificationOutcomeFeed';
import { useOutcomeRecords, useOutcomeWrite, outcomeMessage } from '../hooks/useCertOutcomes';
import { useLanguage } from '../contexts/LanguageContext';
import { CERT_OUTCOMES_ENABLED, CERT_OUTCOME_SHARING_ENABLED } from '../config/certOutcomeConfig';
import { STUDY_ROADMAP_ENABLED } from '../config/studyRoadmapConfig';
import { findQuiz } from '../data/quizzes.js';
import { secureId } from '../utils/secureId.js';
import service from '../services/certOutcomeService';
import { OUTCOME_EXPERIENCE_MAX, OUTCOME_SLOTS } from '../utils/certificationOutcomes.js';

const { Title, Paragraph, Text } = Typography;
const statusText = {
  pending: 'Pending moderation',
  published: 'Published',
  rejected: 'Rejected',
  removed: 'Removed',
};
const labels = {
  submit: ['Preview public report', 'Submit for moderation'],
  withdraw: ['Withdraw this public report?', 'Withdraw report'],
  delete: ['Delete this certification outcome?', 'Delete outcome'],
};

function OutcomeDialog({ operation, busy, failure, onCancel, onConfirm }) {
  const { t } = useLanguage();
  const id = useId();
  const [experience, setExperience] = useState('');
  const [agreed, setAgreed] = useState(false);
  const { action, record } = operation;
  const preview = action === 'submit';
  return (
    <Modal
      className="app-danger-dialog outcome-dialog"
      open
      title={t(labels[action][0])}
      okText={t(labels[action][1])}
      cancelText={t('Cancel')}
      confirmLoading={busy}
      cancelButtonProps={{ autoFocus: true }}
      okButtonProps={{
        danger: !preview,
        disabled: (preview && !agreed) || failure?.outcomeCode === 'conflict',
      }}
      onCancel={() => !busy && onCancel()}
      onOk={() => onConfirm(experience.trim())}
    >
      {preview ? (
        <>
          <label htmlFor={id}>{t('Public study experience (optional)')}</label>
          <Input.TextArea
            id={id}
            rows={3}
            maxLength={OUTCOME_EXPERIENCE_MAX}
            value={experience}
            disabled={busy}
            onChange={(event) => {
              setExperience(event.target.value);
              setAgreed(false);
            }}
          />
          <Paragraph type="secondary">
            {t(
              'Share only what you want everyone to see. Leave out names, contact details and credential IDs.'
            )}
          </Paragraph>
          <Card size="small" aria-label={t('Public preview')}>
            <PublicOutcomeCard
              report={{
                bankId: record.bankId,
                result: record.result,
                experience: experience.trim(),
              }}
            />
          </Card>
          <Checkbox
            checked={agreed}
            disabled={busy}
            onChange={(event) => setAgreed(event.target.checked)}
          >
            {t('I want to submit these fields for public sharing.')}
          </Checkbox>
        </>
      ) : (
        <Paragraph>
          {t(
            action === 'delete'
              ? 'This deletes the private record and any shared report.'
              : 'This removes the shared report. Your private record stays saved.'
          )}
        </Paragraph>
      )}
      {failure && <Alert type="error" showIcon message={t(outcomeMessage(failure))} />}
    </Modal>
  );
}

function PrivateOutcomes({ uid, onNavigate }) {
  const { t, language } = useLanguage();
  const state = useOutcomeRecords(uid);
  const mutation = useOutcomeWrite(uid);
  const [editor, setEditor] = useState(null);
  const [operation, setOperation] = useState(null);
  const [gone, setGone] = useState(false);
  const [notice, setNotice] = useState(null);
  const freeSlot = (rows) => OUTCOME_SLOTS.find((slot) => !rows.some((row) => row.slot === slot));
  const format = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  const dayLabel = (value) => format.format(new Date(value + 'T00:00:00Z'));
  const score = new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en', {
    maximumFractionDigits: 12,
  });
  const clear = () => {
    mutation.clear();
    setNotice(null);
    setGone(false);
  };
  const reload = async () => {
    const rows = await state.reload();
    if (!rows) return;
    mutation.clear();
    if (editor) {
      const latest = rows.find(
        ({ instanceId, slot }) => instanceId === editor.instanceId && slot === editor.slot
      );
      if (latest) setEditor({ ...latest, record: latest });
      else if (!editor.revision && freeSlot(rows)) setEditor({ ...editor, slot: freeSlot(rows) });
      else setGone(true);
    }
  };
  const start = (row) => {
    clear();
    setEditor(
      row
        ? { ...row, record: row }
        : { slot: freeSlot(state.rows), instanceId: secureId(), revision: 0, record: null }
    );
  };
  const save = async (fields) => {
    if (!editor) return;
    if (
      await mutation.write('save', {
        slot: editor.slot,
        instanceId: editor.instanceId,
        revision: editor.revision,
        fields,
      })
    ) {
      setEditor(null);
      setNotice('Private outcome saved.');
      state.reload();
    }
  };
  const decide = async (experience) => {
    if (!operation) return;
    const { action, record } = operation;
    const ok =
      action === 'delete'
        ? await mutation.write('remove', record)
        : await mutation.write('share', {
            ...record,
            action: action === 'withdraw' ? 'remove' : 'submit',
            reportRevision: record.report?.revision || 0,
            experience,
          });
    if (ok) {
      setOperation(null);
      setNotice(
        {
          delete: 'Certification outcome deleted.',
          withdraw: 'Report withdrawn.',
          submit: 'Report submitted for moderation.',
        }[action]
      );
      state.reload();
    }
  };
  const action = (record, next) => {
    clear();
    setOperation({ record, action: next });
  };
  const busy = state.loading || mutation.busy;
  return (
    <>
      <div className="outcome-actions">
        <Button
          type="primary"
          disabled={busy || !!state.error || !!editor || !freeSlot(state.rows)}
          onClick={() => start(null)}
        >
          {t('New certification outcome')}
        </Button>
        <Button loading={state.loading} disabled={mutation.busy} onClick={reload}>
          {t('Refresh outcomes')}
        </Button>
      </div>
      {state.loading && (
        <div className="inline-status" role="status">
          <Spin size="small" />
          {t('Loading certification outcomes…')}
        </div>
      )}
      {state.error && <Alert type="error" showIcon message={t(outcomeMessage(state.error))} />}
      {mutation.error && !operation && (
        <Alert type="error" showIcon message={t(outcomeMessage(mutation.error))} />
      )}
      {gone && (
        <Alert
          type="warning"
          showIcon
          message={t('This record is no longer available. Your form input is still here.')}
        />
      )}
      {notice && <Alert role="status" type="success" showIcon message={t(notice)} />}
      {state.rows.length >= OUTCOME_SLOTS.length && (
        <Text type="secondary">{t('You can keep up to six certification outcomes.')}</Text>
      )}
      {editor && (
        <>
          {state.planError && (
            <Alert
              type="warning"
              showIcon
              message={t('Could not load study targets. You can still save the outcome.')}
            />
          )}
          <CertificationOutcomeEditor
            key={editor.instanceId}
            record={editor.record}
            plans={state.plans}
            planError={state.planError}
            busy={busy}
            blocked={gone || !!state.error || mutation.error?.outcomeCode === 'conflict'}
            onSave={save}
            onCancel={() => {
              clear();
              setEditor(null);
            }}
          />
        </>
      )}
      {!editor && !state.loading && !state.error && !state.rows.length && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('Record your first actual certification exam outcome.')}
        />
      )}
      {!editor && (
        <div className="outcome-list">
          {state.rows.map((record) => {
            const plan = planForOutcome(state.plans, record);
            return (
              <Card key={record.instanceId}>
                <div className="outcome-card-heading">
                  <Title level={2}>{findQuiz(record.bankId)?.name || record.bankId}</Title>
                  <Tag>{t('Private record')}</Tag>
                </div>
                <dl className="outcome-details">
                  <dt>{t('Exam date')}</dt>
                  <dd>
                    <time dateTime={record.examDate}>{dayLabel(record.examDate)}</time>
                  </dd>
                  <dt>{t('Exam outcome')}</dt>
                  <dd>{t(outcomeResultLabel(record.result))}</dd>
                  {record.score !== null && (
                    <>
                      <dt>{t('Reported score')}</dt>
                      <dd>
                        {score.format(record.score)} / {score.format(record.scoreMax)}
                      </dd>
                    </>
                  )}
                  {record.note && (
                    <>
                      <dt>{t('Private preparation note')}</dt>
                      <dd className="outcome-note">{record.note}</dd>
                    </>
                  )}
                  {STUDY_ROADMAP_ENABLED && record.planId && (
                    <>
                      <dt>{t('Study target')}</dt>
                      <dd>
                        {plan ? (
                          <Button
                            type="link"
                            onClick={() =>
                              onNavigate('#/roadmap?plan=' + encodeURIComponent(plan.instanceId))
                            }
                          >
                            {dayLabel(plan.targetDate)}
                          </Button>
                        ) : (
                          t('Current linked target is unavailable')
                        )}
                      </dd>
                    </>
                  )}
                  {record.report && (
                    <>
                      <dt>{t('Sharing status')}</dt>
                      <dd>{t(statusText[record.report.status])}</dd>
                    </>
                  )}
                </dl>
                <div className="outcome-actions">
                  <Button disabled={busy} onClick={() => start(record)}>
                    {t('Edit outcome')}
                  </Button>
                  {CERT_OUTCOME_SHARING_ENABLED &&
                    !['pending', 'published'].includes(record.report?.status) && (
                      <Button disabled={busy} onClick={() => action(record, 'submit')}>
                        {t('Preview public report')}
                      </Button>
                    )}
                  {record.report && record.report.status !== 'removed' && (
                    <Button disabled={busy} onClick={() => action(record, 'withdraw')}>
                      {t('Withdraw report')}
                    </Button>
                  )}
                  <Button danger disabled={busy} onClick={() => action(record, 'delete')}>
                    {t('Delete outcome')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {operation && (
        <OutcomeDialog
          operation={operation}
          busy={mutation.busy}
          failure={mutation.error}
          onConfirm={decide}
          onCancel={() => {
            if (mutation.error) state.reload();
            mutation.clear();
            setOperation(null);
          }}
        />
      )}
    </>
  );
}

export default function CertificationOutcomesPage({
  user,
  authLoading,
  params,
  onSignIn,
  onNavigate,
}) {
  const { t } = useLanguage();
  const [moderation, setModeration] = useState(null);
  const uid = user?.uid || null;
  const view = params.get('view');
  const mode = ['public', 'moderation'].includes(view) ? view : null;
  const canModerate = !!uid && moderation?.uid === uid && moderation.allowed;
  useEffect(() => {
    let current = true;
    if (!uid || !CERT_OUTCOME_SHARING_ENABLED) return;
    service.canModerate(uid).then(
      (allowed) => {
        if (current) setModeration({ uid, allowed });
      },
      () => {
        if (current) setModeration({ uid, allowed: false });
      }
    );
    return () => {
      current = false;
    };
  }, [uid]);
  return (
    <section className="account-page certification-outcomes">
      <div className="page-heading">
        <Title level={1}>
          {t(
            mode === 'public'
              ? 'Community outcomes'
              : mode === 'moderation'
                ? 'Outcome moderation'
                : 'Certification outcomes'
          )}
        </Title>
        <Paragraph type="secondary">
          {t('Self-reported results from actual certification exams.')}
        </Paragraph>
      </div>
      {CERT_OUTCOMES_ENABLED && (
        <nav className="outcome-actions" aria-label={t('Certification outcomes')}>
          {mode ? (
            <Button onClick={() => onNavigate('#/outcomes')}>
              {t('My certification outcomes')}
            </Button>
          ) : (
            <Button onClick={() => onNavigate('#/profile')}>{t('Back to profile')}</Button>
          )}
          {CERT_OUTCOME_SHARING_ENABLED && mode !== 'public' && (
            <Button onClick={() => onNavigate('#/outcomes?view=public')}>
              {t('Community outcomes')}
            </Button>
          )}
          {canModerate && mode !== 'moderation' && (
            <Button onClick={() => onNavigate('#/outcomes?view=moderation')}>
              {t('Outcome moderation')}
            </Button>
          )}
        </nav>
      )}
      {!CERT_OUTCOMES_ENABLED || (mode && !CERT_OUTCOME_SHARING_ENABLED) ? (
        <Alert type="info" showIcon message={t('Certification outcomes are not enabled here.')} />
      ) : mode === 'public' ? (
        <CertificationOutcomeFeed key="public" />
      ) : authLoading || (mode === 'moderation' && uid && moderation?.uid !== uid) ? (
        <div className="inline-status" role="status">
          <Spin size="small" />
          {t('Loading account…')}
        </div>
      ) : !uid || user?.isAnonymous ? (
        <Card>
          <Paragraph>{t('Sign in to manage your private certification outcomes.')}</Paragraph>
          <Button type="primary" onClick={onSignIn}>
            {t('Sign in')}
          </Button>
        </Card>
      ) : mode === 'moderation' ? (
        canModerate ? (
          <CertificationOutcomeFeed key={uid} moderator={uid} />
        ) : (
          <Alert type="error" showIcon message={t('You do not have permission for this action.')} />
        )
      ) : (
        <PrivateOutcomes key={uid} uid={uid} onNavigate={onNavigate} />
      )}
    </section>
  );
}
