import React from 'react';
import { Button } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
export default function HeaderPreferences({ isDarkMode, onToggleTheme, onApplied }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <>
      <Button
        type="text"
        className="theme-toggle"
        icon={isDarkMode ? <SunOutlined aria-hidden="true" /> : <MoonOutlined aria-hidden="true" />}
        aria-label={t(isDarkMode ? 'Switch to light mode' : 'Switch to dark mode')}
        onClick={() => {
          onToggleTheme();
          onApplied?.();
        }}
      />
      <div className="language-toggle" role="group" aria-label={t('Language')}>
        <button
          aria-label="Tiếng Việt"
          aria-pressed={language === 'vi'}
          onClick={() => {
            setLanguage('vi');
            onApplied?.();
          }}
        >
          VN
        </button>
        <button
          aria-label="English"
          aria-pressed={language === 'en'}
          onClick={() => {
            setLanguage('en');
            onApplied?.();
          }}
        >
          EN
        </button>
      </div>
    </>
  );
}
