import React, { useEffect, useId, useRef, useState } from 'react';
import { Button, Dropdown } from 'antd';
import { DownOutlined, HeartOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import HeaderPreferences from './HeaderPreferences';
const destinations = [
  ['Quiz Bank', '#/library', ['library', 'quiz']],
  ['My quizzes', '#/my-quizzes', ['my-quizzes']],
  ['Donate', '#/donate', ['donate']],
];
const labels = {
  home: 'Home',
  profile: 'Profile',
  history: 'Exam history',
  notebook: 'Study notebook',
  updates: 'Quiz updates',
};
export default function CompactHeaderMenu({
  page,
  onNavigate,
  isDarkMode,
  onToggleTheme,
  brandRef,
}) {
  const { t } = useLanguage(),
    [open, setOpen] = useState(false),
    trigger = useRef(null),
    panel = useRef(null),
    opened = useRef(false),
    id = useId();
  opened.current = open;
  useEffect(
    () => () => {
      if (opened.current) brandRef.current?.focus();
    },
    [brandRef]
  );
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => panel.current?.querySelector('button')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const active =
    destinations.find(([, , pages]) => pages.includes(page))?.[0] || labels[page] || 'Menu';
  const popup = (
    <section
      ref={panel}
      id={id}
      className="compact-header-popup"
      hidden={!open}
      aria-hidden={!open}
      role="dialog"
      aria-label={t('Navigation and preferences')}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <nav aria-label={t('Navigate')} className="compact-nav-list">
        {destinations.map(([label, url, pages]) => (
          <Button
            key={url}
            type="text"
            aria-current={pages.includes(page) ? 'page' : undefined}
            icon={label === 'Donate' ? <HeartOutlined aria-hidden="true" /> : undefined}
            onClick={() => {
              close();
              onNavigate(url);
            }}
          >
            {t(label)}
          </Button>
        ))}
      </nav>
      <div className="compact-header-preferences">
        <HeaderPreferences
          isDarkMode={isDarkMode}
          onToggleTheme={onToggleTheme}
          onApplied={close}
        />
      </div>
    </section>
  );
  return (
    <Dropdown
      trigger={['click']}
      placement="bottomLeft"
      open={open}
      onOpenChange={setOpen}
      menu={{ items: [] }}
      popupRender={() => popup}
      destroyOnHidden
      align={{ overflow: { adjustX: true, adjustY: true, shiftX: true, shiftY: true } }}
    >
      <Button
        ref={trigger}
        type="text"
        className="compact-nav-trigger"
        aria-label={t('Navigation and preferences')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        title={t(active)}
      >
        <span>{t(active)}</span>
        <DownOutlined aria-hidden="true" />
      </Button>
    </Dropdown>
  );
}
