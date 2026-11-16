import React, { useEffect, useId, useRef, useState } from 'react';
import { Button, Drawer } from 'antd';
import { MenuOutlined, HeartOutlined } from '@ant-design/icons';
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
  renderUtilities,
}) {
  const { t } = useLanguage(),
    [open, setOpen] = useState(false),
    trigger = useRef(null),
    panel = useRef(null),
    opened = useRef(false),
    id = useId(),
    pending = useRef(null),
    mounted = useRef(true);
  opened.current = open;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current = null;
    };
  }, []);
  useEffect(
    () => () => {
      if (opened.current) brandRef.current?.focus();
    },
    [brandRef]
  );
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const activate = (action) => {
    pending.current = action;
    close();
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
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      {renderUtilities(activate)}
      <nav aria-label={t('Navigate')} className="compact-nav-list">
        {destinations.map(([label, url, pages]) => (
          <Button
            key={url}
            type="text"
            aria-current={pages.includes(page) ? 'page' : undefined}
            icon={label === 'Donate' ? <HeartOutlined aria-hidden="true" /> : undefined}
            onClick={() => activate(() => onNavigate(url))}
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
    <>
      <Button
        ref={trigger}
        type="text"
        className="compact-nav-trigger"
        aria-label={t('Navigation and preferences')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        title={t(active)}
        onClick={() => setOpen(true)}
      >
        <MenuOutlined aria-hidden="true" />
        <span>{t(active)}</span>
      </Button>
      <Drawer
        rootClassName="compact-header-drawer"
        title={t('Navigation and preferences')}
        aria-label={t('Navigation and preferences')}
        aria-hidden={!open}
        placement="left"
        width="min(320px, calc(100vw - 48px))"
        open={open}
        onClose={close}
        keyboard
        maskClosable
        destroyOnHidden
        afterOpenChange={(next) => {
          if (next) panel.current?.querySelector('button')?.focus();
          else {
            const action = pending.current;
            pending.current = null;
            if (action)
              queueMicrotask(() => {
                if (mounted.current) action();
              });
          }
        }}
      >
        {popup}
      </Drawer>
    </>
  );
}
