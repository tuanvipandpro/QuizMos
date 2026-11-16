import React, { useEffect, useId, useRef, useState } from 'react';
import { Badge, Button, Dropdown, Empty, Tag, Typography } from 'antd';
import { BellOutlined, CloseOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useQuizUpdateNotifications } from '../hooks/useQuizUpdateNotifications.js';
import { findQuiz } from '../data/quizzes.js';
import { quizUrl } from '../utils/navigation.js';
import './QuizUpdateNotifications.css';
export default function QuizUpdateNotifications({ onNavigate }) {
  const { t, language } = useLanguage();
  const { entries, unread, markSeen } = useQuizUpdateNotifications();
  const [open, setOpen] = useState(false);
  const trigger = useRef(null),
    close = useRef(null);
  const describedBy = useId();
  const formatter = new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  });
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => close.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const dismiss = () => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  const navigate = (hash) => {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
    onNavigate(hash);
  };
  const panel = (
    <section
      className="quiz-notification-panel"
      role="dialog"
      aria-label={t('Quiz updates')}
      aria-modal="false"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          dismiss();
        }
      }}
    >
      <div className="quiz-notification-heading">
        <Typography.Title level={2}>{t('Quiz updates')}</Typography.Title>
        <Button
          ref={close}
          type="text"
          icon={<CloseOutlined aria-hidden="true" />}
          aria-label={t('Close quiz updates')}
          onClick={dismiss}
        />
      </div>
      {entries.length ? (
        <ul className="quiz-notification-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <div className="quiz-notification-date">
                <Tag>{t(entry.kind === 'added' ? 'Added' : 'Updated')}</Tag>
                <time dateTime={entry.date}>
                  {formatter.format(new Date(entry.date + 'T00:00:00Z'))}
                </time>
              </div>
              <Typography.Title level={3}>{findQuiz(entry.bankId).name}</Typography.Title>
              <p>{t(entry.summary)}</p>
              <Button
                type="text"
                icon={<ArrowRightOutlined aria-hidden="true" />}
                onClick={() => navigate(quizUrl(entry.bankId))}
              >
                {t('Open quiz')}
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          description={t(
            'No reviewed quiz updates yet. Explore the Quiz Bank while new changes are reviewed.'
          )}
        />
      )}
      <div className="quiz-notification-footer">
        <Button block onClick={() => navigate('#/updates')}>
          {t('View all updates')}
        </Button>
      </div>
    </section>
  );
  return (
    <Dropdown
      menu={{ items: [] }}
      popupRender={() => panel}
      trigger={['click']}
      placement="bottomRight"
      align={{ overflow: { adjustX: true, adjustY: true, shiftX: true, shiftY: true } }}
      overlayClassName="quiz-updates-dropdown"
      open={open}
      destroyOnHidden
      onOpenChange={(next) => {
        setOpen(next);
        if (next) markSeen();
      }}
    >
      <span className="quiz-notification-trigger">
        <Badge count={unread} size="small" offset={[-3, 4]}>
          <Button
            ref={trigger}
            type="text"
            className="quiz-notification-button"
            icon={<BellOutlined aria-hidden="true" />}
            aria-label={t('Quiz updates')}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-describedby={describedBy}
          />
        </Badge>
        <span id={describedBy} className="sr-only">
          {t('{count} new quiz updates', { count: unread })}
        </span>
      </span>
    </Dropdown>
  );
}
