import React, { useState } from 'react';
import { Alert, Button } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { createNotebookReference, notebookEntryKey } from '../utils/studyNotebook.js';
import { notebookMessage } from '../data/studyNotebookMessages.js';
import NotebookEntryEditor from './NotebookEntryEditor';

export default function NotebookQuestionTools({ question, quiz, notebook, onSignIn }) {
  const { t } = useLanguage();
  const [target, setTarget] = useState(null),
    [error, setError] = useState(null),
    [loading, setLoading] = useState(false);
  if (!notebook?.enabled) return null;
  if (!notebook.uid)
    return <Button onClick={onSignIn}>{t('Sign in for bookmarks and notes')}</Button>;
  if (!quiz || quiz.kind === 'tab-upload')
    return (
      <span className="notebook-hint">
        {t('Save this quiz to your account before adding notebook entries.')}
      </span>
    );
  return (
    <>
      <Button
        icon={<StarOutlined aria-hidden="true" />}
        disabled={!notebook.ready}
        loading={loading}
        onClick={async () => {
          const owner = notebook.uid;
          setLoading(true);
          setError(null);
          try {
            const ref = await createNotebookReference(quiz, question, owner),
              entryKey = await notebookEntryKey(ref);
            if (notebook.getSnapshot().uid === owner) setTarget({ ref, entryKey });
          } catch (failure) {
            setError(failure);
          } finally {
            setLoading(false);
          }
        }}
      >
        {t('Bookmark and note')}
      </Button>
      {error && <Alert type="warning" showIcon message={t(notebookMessage(error))} />}
      {target && (
        <NotebookEntryEditor
          key={target.entryKey}
          target={target}
          notebook={notebook}
          onClose={() => setTarget(null)}
        />
      )}
    </>
  );
}
