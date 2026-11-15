import React, { useRef } from 'react';
import { Button, Layout, Spin } from 'antd';
import { HeartOutlined, LoginOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { appBrand } from '../data/appBrand';
import AccountMenu from './AccountMenu';
import QuizUpdateNotifications from './QuizUpdateNotifications';
import HeaderPreferences from './HeaderPreferences';
import CompactHeaderMenu from './CompactHeaderMenu';
import { useCompactStudyLayout as useCompactHeader } from '../hooks/useCompactStudyLayout';
const { Header } = Layout;
export default function AppHeader({
  headerRef,
  page,
  onNavigate,
  isDarkMode,
  onToggleTheme,
  authLoading,
  user,
  onSettings,
  onSignOut,
  onSignIn,
}) {
  const { language, t } = useLanguage();
  const compact = useCompactHeader(),
    brandRef = useRef(null);
  return (
    <Header ref={headerRef} className={'app-header' + (compact ? ' is-compact' : '')}>
      <div className="app-header-inner">
        <button
          ref={brandRef}
          className="app-brand"
          aria-label={appBrand.name}
          onClick={() => onNavigate('#/')}
          aria-current={page === 'home' ? 'page' : undefined}
        >
          <img
            className="app-brand-logo"
            src={import.meta.env.BASE_URL + appBrand.logo}
            alt=""
            aria-hidden="true"
            width="32"
            height="32"
          />
          <span>{appBrand.name}</span>
        </button>
        <nav
          className="app-nav"
          aria-label={language === 'vi' ? 'Điều hướng chính' : 'Main navigation'}
        >
          {compact ? (
            <CompactHeaderMenu {...{ page, onNavigate, isDarkMode, onToggleTheme, brandRef }} />
          ) : (
            <>
              <Button
                type="text"
                aria-current={['library', 'quiz'].includes(page) ? 'page' : undefined}
                onClick={() => onNavigate('#/library')}
              >
                {t('Quiz Bank')}
              </Button>
              <Button
                type="text"
                aria-current={page === 'my-quizzes' ? 'page' : undefined}
                onClick={() => onNavigate('#/my-quizzes')}
              >
                {t('My quizzes')}
              </Button>
              <Button
                type="text"
                className="header-donate"
                aria-current={page === 'donate' ? 'page' : undefined}
                onClick={() => onNavigate('#/donate')}
                icon={<HeartOutlined aria-hidden="true" />}
              >
                {t('Donate')}
              </Button>
            </>
          )}
        </nav>
        <div className="header-actions">
          <QuizUpdateNotifications key={page} onNavigate={onNavigate} />
          {!compact && <HeaderPreferences {...{ isDarkMode, onToggleTheme }} />}
          {authLoading ? (
            <span className="header-auth-loading" role="status" aria-label={t('Loading account…')}>
              <Spin size="small" />
            </span>
          ) : user ? (
            <AccountMenu
              key={user.uid}
              user={user}
              onSettings={onSettings}
              onSignOut={onSignOut}
              onNavigate={onNavigate}
            />
          ) : (
            <Button
              type="text"
              aria-label={t('Sign in')}
              icon={<LoginOutlined aria-hidden="true" />}
              className="header-login"
              onClick={onSignIn}
            >
              <span>{t('Sign in')}</span>
            </Button>
          )}
        </div>
      </div>
    </Header>
  );
}
