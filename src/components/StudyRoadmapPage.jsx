import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Modal,
  Progress,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { STUDY_ROADMAP_ENABLED } from '../config/studyRoadmapConfig';
import { STUDY_NOTEBOOK_ENABLED } from '../config/studyNotebookConfig';
import { useStudyRoadmap } from '../hooks/useStudyRoadmap';
import { useExamHistory } from '../hooks/useExamHistory';
import { findQuiz } from '../data/quizzes.js';
import { getQuickSummary } from '../data/quickSummaries.js';
import { quizUrl } from '../utils/navigation.js';
import { secureId } from '../utils/secureId.js';
import { roadmapCommand } from '../services/studyRoadmapCommand.js';
import {
  addRoadmapDays,
  isRoadmapDay,
  roadmapDayInZone,
  roadmapMonday,
  roadmapOutsideTasks,
  roadmapWeekTasks,
  ROADMAP_SLOTS,
} from '../utils/studyRoadmap.js';
import StudyPlanEditor from './StudyPlanEditor';

const { Title, Paragraph, Text } = Typography;
const writeMessages = {
  conflict: 'This plan changed on another device. Reload the saved version before trying again.',
  network: 'Could not save the change. Try again when you are online.',
  invalid: 'This change exceeds the supported plan limits.',
};
const dateLabel = (day, language) =>
  new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(day + 'T00:00:00Z'));
const sameInstance = (a, b) => a?.instanceId === b?.instanceId && a?.slot === b?.slot;

function RoadmapTasks({ tasks, plan, today, modifiable, saving, onMove, onToggle, onNavigate }) {
  const { t, language } = useLanguage();
  return (
    <ul className="roadmap-tasks">
      {tasks.map((task) => {
        const kind =
          task.kind === 'summary' && !getQuickSummary(findQuiz(plan.bankId)?.id)
            ? 'practice'
            : task.kind;
        const label = { practice: 'Practice', summary: 'Quick Summary', exam: 'Mock exam' }[kind];
        const path =
          kind === 'exam'
            ? quizUrl(plan.bankId, 'overview', { mode: 'exam' })
            : quizUrl(plan.bankId, kind);
        return (
          <li key={task.id} className="roadmap-task">
            <div className="roadmap-task-label">
              <Text strong>{t(label)}</Text>
              <time dateTime={task.date}>{dateLabel(task.date, language)}</time>
              {task.done && <Tag color="success">{t('Completed manually')}</Tag>}
              {task.attemptId && <Tag color="processing">{t('Archived exam')}</Tag>}
              {!task.done && !task.attemptId && task.date < today && (
                <Tag color="warning">{t('Missed session')}</Tag>
              )}
            </div>
            <div className="roadmap-actions">
              <Button onClick={() => onNavigate(path)}>
                {t('Open {task}', { task: t(label) })}
              </Button>
              {task.attemptId && (
                <Button type="link" onClick={() => onNavigate('#/history/' + task.attemptId)}>
                  {t('View saved result')}
                </Button>
              )}
              {modifiable && (
                <>
                  <Button
                    onClick={() => onMove(task)}
                    disabled={saving || today >= plan.targetDate}
                  >
                    {t('Reschedule')}
                  </Button>
                  <Checkbox
                    checked={task.done}
                    disabled={saving}
                    onChange={(event) => onToggle(task, event.target.checked)}
                  >
                    {t('Mark complete manually')}
                  </Checkbox>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RoadmapWeek({
  plan,
  summaries,
  saving,
  locked,
  error,
  conflict,
  onRefresh,
  onMutate,
  onNavigate,
}) {
  const { t, language } = useLanguage();
  const [clock, setClock] = useState(Date.now);
  const [chosenWeek, setChosenWeek] = useState(null);
  const [moving, setMoving] = useState(null);
  const [moveDate, setMoveDate] = useState('');
  const [moveError, setMoveError] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const today = roadmapDayInZone(clock, plan.timezone);
  const first = roadmapMonday(plan.startDate);
  const last = roadmapMonday(addRoadmapDays(plan.targetDate, -1));
  const candidate = chosenWeek || roadmapMonday(today);
  const week = candidate < first ? first : candidate > last ? last : candidate;
  const tasks = roadmapWeekTasks(plan, week, summaries);
  const outside = roadmapOutsideTasks(plan);
  const completed = tasks.filter((task) => task.done || task.attemptId).length;
  const canEdit = !plan.archived;
  const updateTask = (task, patch) =>
    onMutate(plan, {
      overrides: {
        ...plan.overrides,
        [task.id]: { date: task.date, done: task.done, ...plan.overrides[task.id], ...patch },
      },
    });
  const listProps = {
    plan,
    today,
    modifiable: canEdit,
    saving: locked,
    onNavigate,
    onMove: (task) => {
      setMoving(task);
      const horizon = addRoadmapDays(plan.targetDate, -1);
      setMoveDate(task.date < today ? today : task.date > horizon ? horizon : task.date);
      setMoveError(false);
    },
    onToggle: (task, done) => updateTask(task, { done }),
  };
  return (
    <Card className="roadmap-week">
      <div className="roadmap-week-heading">
        <div>
          <Title level={3}>{t('Weekly checklist')}</Title>
          <Text>
            {dateLabel(week, language)} – {dateLabel(addRoadmapDays(week, 6), language)}
          </Text>
        </div>
        <div className="roadmap-actions">
          <Button disabled={week <= first} onClick={() => setChosenWeek(addRoadmapDays(week, -7))}>
            {t('Previous week')}
          </Button>
          <Button disabled={week >= last} onClick={() => setChosenWeek(addRoadmapDays(week, 7))}>
            {t('Next week')}
          </Button>
          {chosenWeek && (
            <Button type="text" onClick={() => setChosenWeek(null)}>
              {t('This week')}
            </Button>
          )}
        </div>
      </div>
      {today >= plan.targetDate && (
        <Paragraph type="secondary">
          {t('The target date has passed. You can set a new one.')}
        </Paragraph>
      )}
      {tasks.length ? (
        <>
          <Progress
            percent={Math.round((completed * 100) / tasks.length)}
            size="small"
            showInfo={false}
          />
          <Paragraph aria-live="polite">
            {t('{done} of {total} sessions complete', { done: completed, total: tasks.length })}
          </Paragraph>
          <RoadmapTasks {...listProps} tasks={tasks} />
        </>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t(
            plan.weeklyGoal === 0
              ? 'No weekly sessions planned. Edit the plan to add availability.'
              : 'No tasks scheduled for this week.'
          )}
        />
      )}
      {outside.length > 0 && (
        <div className="roadmap-outside">
          <Title level={3}>{t('Tasks outside the current schedule')}</Title>
          <RoadmapTasks {...listProps} tasks={outside} />
        </div>
      )}
      <Modal
        className="roadmap-move-dialog"
        open={!!moving}
        title={t('Reschedule session')}
        okText={t('Reschedule')}
        confirmLoading={saving}
        okButtonProps={{ disabled: !canEdit || locked }}
        cancelText={t('Cancel')}
        onCancel={() => !saving && setMoving(null)}
        onOk={async () => {
          if (
            !moving ||
            !isRoadmapDay(moveDate) ||
            moveDate < today ||
            moveDate < plan.startDate ||
            moveDate >= plan.targetDate
          ) {
            setMoveError(true);
            return;
          }
          if (await updateTask(moving, { date: moveDate })) {
            setChosenWeek(roadmapMonday(moveDate));
            setMoving(null);
          }
        }}
      >
        <label className="roadmap-date-label" htmlFor="roadmap-move-date">
          {t('New session date')}
        </label>
        <Input
          id="roadmap-move-date"
          type="date"
          value={moveDate}
          min={today}
          max={addRoadmapDays(plan.targetDate, -1)}
          aria-invalid={moveError || undefined}
          aria-describedby={moveError ? 'roadmap-move-error' : undefined}
          onChange={(event) => {
            setMoveDate(event.target.value);
            setMoveError(false);
          }}
        />
        {moveError && (
          <Alert
            id="roadmap-move-error"
            type="error"
            showIcon
            message={t('Choose a day from today up to the day before the exam.')}
          />
        )}
        {error && <Alert type="error" showIcon message={t(error)} />}
        {conflict && (
          <Button onClick={onRefresh} disabled={saving}>
            {t('Refresh plans')}
          </Button>
        )}
      </Modal>
    </Card>
  );
}

function RoadmapWorkspace({ uid, onNavigate }) {
  const { t, language } = useLanguage();
  const state = useStudyRoadmap(uid);
  const { plans, loading, readError, saving, writeError } = state;
  const [selected, setSelected] = useState(null);
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [localError, setLocalError] = useState(null);
  const history = useExamHistory(plans.length ? uid : null);
  const plan =
    plans.find((item) => item.instanceId === selected) ||
    plans.find((item) => !item.archived) ||
    plans[0];
  const busy = saving || loading || readError;
  const error = writeMessages[localError || writeError];
  const emptySlot = (rows) =>
    ROADMAP_SLOTS.find((slot) => !rows.some((item) => item.slot === slot));
  const openEditor = (item) => {
    state.clearWriteError();
    setLocalError(null);
    setEditor({
      slot: item?.slot || emptySlot(plans),
      instanceId: item?.instanceId || secureId(),
      previous: item || null,
      initial: item || {
        bankId: '',
        targetDate: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        weeklyGoal: 3,
      },
    });
  };
  const reload = async () => {
    setLocalError(null);
    const rows = await state.reload();
    if (!rows) return;
    state.clearWriteError();
    if (editor) {
      const latest = rows.find((item) => sameInstance(item, editor));
      if (editor.previous || latest) {
        if (!latest) setLocalError('conflict');
        else setEditor({ ...editor, previous: latest });
      } else setEditor({ ...editor, slot: emptySlot(rows) || editor.slot });
    }
    if (deleting) setDeleting(null);
  };
  const mutate = async (item, patch) => {
    if (busy || writeError === 'conflict') return false;
    setLocalError(null);
    try {
      return await state.save(
        roadmapCommand(item.slot, item.instanceId, item.revision, { ...item, ...patch })
      );
    } catch {
      setLocalError('invalid');
      return false;
    }
  };
  const submit = async (fields) => {
    if (busy || localError === 'conflict' || writeError === 'conflict') return;
    setLocalError(null);
    try {
      const current = editor.previous;
      const command = roadmapCommand(editor.slot, editor.instanceId, current?.revision || 0, {
        ...fields,
        archived: current?.archived || false,
        overrides: current?.overrides || {},
      });
      if (await state.save(command)) {
        setSelected(editor.instanceId);
        setEditor(null);
      }
    } catch {
      setLocalError('invalid');
    }
  };
  return (
    <>
      <div className="roadmap-actions">
        <Button
          type="primary"
          icon={<PlusOutlined aria-hidden="true" />}
          disabled={busy || !!editor || !emptySlot(plans)}
          onClick={() => openEditor(null)}
        >
          {t('New study plan')}
        </Button>
        <Button disabled={saving} loading={loading} onClick={reload}>
          {t('Refresh plans')}
        </Button>
      </div>
      {!loading && !readError && plans.length >= ROADMAP_SLOTS.length && (
        <Text type="secondary">{t('Three plans maximum, including archived plans.')}</Text>
      )}
      {loading && (
        <div className="inline-status" role="status">
          <Spin size="small" />
          {t('Loading study plans…')}
        </div>
      )}
      {readError && (
        <Alert
          type="error"
          showIcon
          message={t('Could not load your study plans. Try refreshing.')}
        />
      )}
      {error && <Alert type="error" showIcon message={t(error)} />}
      {editor && (
        <StudyPlanEditor
          key={editor.instanceId}
          initial={editor.initial}
          previous={editor.previous}
          busy={busy}
          onCancel={() => {
            setEditor(null);
            state.clearWriteError();
            setLocalError(null);
          }}
          onSave={submit}
        />
      )}
      {!loading && !readError && !plans.length && !editor && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('Create a plan to schedule your study sessions.')}
        />
      )}
      {!!plans.length && (
        <div className="roadmap-plan-list" role="group" aria-label={t('Study plans')}>
          {plans.map((item) => (
            <Button
              key={item.instanceId}
              type={plan?.instanceId === item.instanceId ? 'primary' : 'default'}
              aria-pressed={plan?.instanceId === item.instanceId}
              disabled={busy || !!editor}
              onClick={() => {
                setSelected(item.instanceId);
                state.clearWriteError();
                setLocalError(null);
              }}
            >
              {findQuiz(item.bankId)?.code || item.bankId} · {dateLabel(item.targetDate, language)}
              {item.archived && ' · ' + t('Archived')}
            </Button>
          ))}
        </div>
      )}
      {plan && !editor && (
        <Card className="roadmap-plan">
          <div className="roadmap-week-heading">
            <div>
              <Title level={2}>{findQuiz(plan.bankId)?.name || plan.bankId}</Title>
              <Paragraph type="secondary">
                {t('Target {date} · {zone}', {
                  date: dateLabel(plan.targetDate, language),
                  zone: plan.timezone,
                })}
              </Paragraph>
              {plan.archived && <Tag>{t('Archived')}</Tag>}
            </div>
            <div className="roadmap-actions">
              {STUDY_NOTEBOOK_ENABLED && (
                <Button onClick={() => onNavigate('#/notebook')}>{t('Study notebook')}</Button>
              )}
              <Button disabled={busy || !findQuiz(plan.bankId)} onClick={() => openEditor(plan)}>
                {t('Edit study plan')}
              </Button>
              <Button disabled={busy} onClick={() => mutate(plan, { archived: !plan.archived })}>
                {t(plan.archived ? 'Restore plan' : 'Archive plan')}
              </Button>
              <Button danger disabled={busy} onClick={() => setDeleting(plan)}>
                {t('Delete plan')}
              </Button>
            </div>
          </div>
          {findQuiz(plan.bankId) ? (
            <RoadmapWeek
              key={plan.instanceId}
              plan={plan}
              summaries={history.summaries}
              onMutate={mutate}
              saving={saving}
              locked={busy || writeError === 'conflict'}
              error={readError ? 'Could not load your study plans. Try refreshing.' : error}
              conflict={writeError === 'conflict'}
              onRefresh={reload}
              onNavigate={onNavigate}
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              message={t(
                'This quiz bank is no longer available. You can archive or delete this plan.'
              )}
            />
          )}
          {history.error && (
            <Alert
              type="warning"
              showIcon
              message={t('Exam History evidence is temporarily unavailable.')}
              action={<Button onClick={history.reload}>{t('Retry')}</Button>}
            />
          )}
        </Card>
      )}
      <Modal
        className="app-danger-dialog"
        open={!!deleting}
        title={t('Delete this study plan?')}
        okText={t('Delete plan')}
        okButtonProps={{ danger: true }}
        confirmLoading={saving}
        cancelText={t('Cancel')}
        cancelButtonProps={{ autoFocus: true }}
        onCancel={() => !saving && setDeleting(null)}
        onOk={async () => {
          if (deleting && (await state.save({ ...deleting, data: null }))) setDeleting(null);
        }}
      >
        <Paragraph>
          {t('This removes the plan and its checklist. Your saved study sessions stay available.')}
        </Paragraph>
        {error && <Alert type="error" showIcon message={t(error)} />}
        {writeError === 'conflict' && (
          <Button disabled={saving} onClick={reload}>
            {t('Refresh plans')}
          </Button>
        )}
      </Modal>
    </>
  );
}

export default function StudyRoadmapPage({ user, authLoading, onSignIn, onNavigate }) {
  const { t } = useLanguage();
  return (
    <section className="study-roadmap-page">
      <Button
        type="text"
        icon={<ArrowLeftOutlined aria-hidden="true" />}
        onClick={() => onNavigate('#/profile')}
      >
        {t('Back to profile')}
      </Button>
      <div className="page-heading">
        <Title level={1}>
          <CalendarOutlined aria-hidden="true" /> {t('Study roadmap')}
        </Title>
        <Paragraph type="secondary">
          {t('Plan weekly study sessions around your target exam date.')}
        </Paragraph>
      </div>
      {!STUDY_ROADMAP_ENABLED ? (
        <Alert type="info" showIcon message={t('Study roadmap is not enabled yet.')} />
      ) : authLoading ? (
        <div className="inline-status" role="status">
          <Spin />
          {t('Loading account…')}
        </div>
      ) : !user || user.isAnonymous ? (
        <Card>
          <Title level={2}>{t('Sign in to use your private study roadmap')}</Title>
          <Button type="primary" onClick={onSignIn}>
            {t('Sign in')}
          </Button>
        </Card>
      ) : (
        <RoadmapWorkspace key={user.uid} uid={user.uid} onNavigate={onNavigate} />
      )}
    </section>
  );
}
