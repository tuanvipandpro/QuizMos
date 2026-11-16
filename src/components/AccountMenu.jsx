import React, { useEffect, useId, useRef, useState } from 'react';
import { Avatar, Button, Dropdown, Menu } from 'antd';
import {
  HistoryOutlined,
  FolderOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
  ReadOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { EXAM_HISTORY_ENABLED } from '../config/examHistoryConfig';
import { STUDY_NOTEBOOK_ENABLED } from '../config/studyNotebookConfig';

export default function AccountMenu({ user, onSettings, onSignOut, onNavigate, inline = false }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  useEffect(() => {
    if (!inline || !open) return;
    const frame = requestAnimationFrame(() => menuRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [inline, open]);
  const name = user.displayName || user.email || t('Account');
  const activate = ({ domEvent }, action) => {
    // Enter is handled by the menu on keydown. Prevent a native click from
    // reaching the trigger after focus moves back and reopening the menu.
    domEvent.preventDefault();
    setOpen(false);
    // Dialogs opened by the action should return focus to this persistent button.
    trigger.current?.focus();
    action();
  };

  const menu = {
    id: menuId,
    'aria-label': t('Account'),
    className: 'account-menu',
    items: [
      { key: 'name', label: name, disabled: true },
      {
        key: 'profile',
        label: t('Profile'),
        icon: <UserOutlined aria-hidden="true" />,
        onClick: (event) => activate(event, () => onNavigate('#/profile')),
      },
      {
        key: 'quizzes',
        label: t('Manage quizzes'),
        icon: <FolderOutlined aria-hidden="true" />,
        onClick: (event) => activate(event, () => onNavigate('#/my-quizzes')),
      },
      {
        key: 'settings',
        label: t('AI Settings'),
        icon: <SettingOutlined aria-hidden="true" />,
        onClick: (event) => activate(event, onSettings),
      },
      { type: 'divider' },
      ...(STUDY_NOTEBOOK_ENABLED
        ? [
            {
              key: 'notebook',
              label: t('Study notebook'),
              icon: <ReadOutlined aria-hidden="true" />,
              onClick: (event) => activate(event, () => onNavigate('#/notebook')),
            },
          ]
        : []),
      ...(EXAM_HISTORY_ENABLED
        ? [
            {
              key: 'history',
              label: t('Exam history'),
              icon: <HistoryOutlined aria-hidden="true" />,
              onClick: (event) => activate(event, () => onNavigate('#/history')),
            },
          ]
        : []),
      {
        key: 'logout',
        label: t('Sign out'),
        icon: <LogoutOutlined aria-hidden="true" />,
        onClick: (event) => activate(event, onSignOut),
        danger: true,
      },
    ],
  };
  const button = (
    <Button
      ref={trigger}
      type="text"
      className="profile-button"
      aria-label={name}
      title={inline ? name : undefined}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      onClick={inline ? () => setOpen((value) => !value) : undefined}
    >
      <Avatar size={28} src={user.photoURL} icon={<UserOutlined aria-hidden="true" />} />
      {inline && <span className="compact-account-name">{name}</span>}
      {inline && <DownOutlined aria-hidden="true" />}
    </Button>
  );
  if (inline)
    return (
      <section
        className="compact-account"
        aria-label={t('Account')}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            trigger.current?.focus();
          }
        }}
      >
        {button}
        {open && (
          <Menu
            ref={menuRef}
            {...menu}
            items={menu.items.filter((item) => item.key !== 'name')}
            selectable={false}
          />
        )}
      </section>
    );
  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      autoFocus
      open={open}
      onOpenChange={setOpen}
      menu={menu}
    >
      {button}
    </Dropdown>
  );
}
