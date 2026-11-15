import React, { useEffect, useId, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Drawer, Input, Space, Spin, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import { notebookMessage } from '../data/studyNotebookMessages.js';
import NotebookConfirmDialog from './NotebookConfirmDialog';

export default function NotebookEntryEditor({ target, notebook, onClose }) {
  const { t } = useLanguage();
  const [confirmation, setConfirmation] = useState(null);
  const input = useRef(null),
    focused = useRef(false),
    returnFocus = useRef(document.activeElement),
    id = useId();
  const editor = notebook.editors[target.entryKey];
  useEffect(() => {
    notebook.open(target.ref).catch(() => {});
  }, [notebook.open, notebook.uid, target.entryKey]);
  useEffect(() => {
    if (editor && !editor.loading && !focused.current) {
      focused.current = true;
      input.current?.focus({ preventScroll: true });
    }
  }, [editor?.loading]);
  const run = (operation) =>
    operation().catch(() => {
      input.current?.focus();
    });
  const finishClose = () => {
    onClose();
    requestAnimationFrame(() => {
      const target = returnFocus.current;
      if (target?.isConnected) target.focus();
      else document.getElementById('main-content')?.focus();
    });
  };
  const close = () => {
    if (!editor?.dirty && !editor?.command) {
      finishClose();
      return;
    }
    setConfirmation({
      title: t('Keep your note draft and close?'),
      content: t(
        notebook.draftsSaved
          ? 'Unsaved text stays in this account and tab. It is not synchronized yet.'
          : 'Tab recovery is unavailable. Keep this editor open to avoid losing unsaved text.'
      ),
      okText: t('Close editor'),
      cancelText: t('Keep editing'),
      autoFocusButton: 'cancel',
      onOk: finishClose,
    });
  };
  const blocked = !editor?.base || editor.loading || editor.saving || !!editor.command;
  return (
    <>
      {confirmation && (
        <NotebookConfirmDialog config={confirmation} onClose={() => setConfirmation(null)} />
      )}
      <Drawer
        rootClassName="notebook-editor"
        aria-label={t('Question notebook')}
        open
        title={t('Question notebook')}
        width="min(560px, 100vw)"
        onClose={close}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">
          {t('Bookmarks and notes are separate from Save position and Exam Flag.')}
        </Typography.Paragraph>
        {!editor || editor.loading ? (
          <div role="status">
            <Spin /> {t('Loading notebook entry…')}
          </div>
        ) : (
          <>
            {editor.entry?.mistake && (
              <Typography.Paragraph>
                {t(editor.entry.reviewed ? 'Mistake reviewed correctly' : 'Mistake to review')}
              </Typography.Paragraph>
            )}
            <Checkbox
              checked={!!editor.entry?.bookmarked}
              disabled={blocked}
              onChange={(event) =>
                run(() =>
                  notebook.change(target.entryKey, {
                    kind: 'bookmark',
                    value: event.target.checked,
                  })
                )
              }
            >
              {t('Bookmark this question')}
            </Checkbox>
            <div className="notebook-note-field">
              <label htmlFor={id}>{t('Private note')}</label>
              <Input.TextArea
                ref={input}
                id={id}
                rows={6}
                disabled={!editor.base}
                value={editor.input}
                aria-describedby={id + '-help ' + id + '-error'}
                aria-invalid={editor.error?.code === 'NOTEBOOK_SIZE'}
                onChange={(event) => notebook.input(target.entryKey, event.target.value)}
              />
              <Typography.Paragraph id={id + '-help'} type="secondary">
                {t(
                  'Plain text, up to 2,000 characters and 8,000 UTF-8 bytes. Your note is not sent to AI.'
                )}
              </Typography.Paragraph>
            </div>
            <div id={id + '-error'}>
              {editor.error && (
                <Alert type="error" showIcon message={t(notebookMessage(editor.error))} />
              )}
            </div>
            {!notebook.draftsSaved && (
              <Alert
                type="warning"
                showIcon
                message={t(
                  'Tab recovery is unavailable. Keep this editor open to avoid losing unsaved text.'
                )}
              />
            )}
            {editor.dirty && editor.entry?.note && editor.entry.note !== editor.input && (
              <details className="notebook-latest-note">
                <summary>{t('Latest saved note')}</summary>
                <p>{editor.entry.note}</p>
              </details>
            )}
            <div role="status" className="notebook-editor-status">
              {t(
                editor.saving
                  ? 'Saving notebook entry…'
                  : editor.dirty || editor.command || editor.error
                    ? 'Not synchronized yet'
                    : editor.status === 'saved'
                      ? 'Study notebook synchronized'
                      : 'Notebook entry loaded'
              )}
            </div>
            <Space wrap className="notebook-editor-actions">
              <Button
                type="primary"
                disabled={blocked || !editor.dirty}
                loading={editor.saving}
                onClick={() =>
                  run(() => notebook.change(target.entryKey, { kind: 'note', value: editor.input }))
                }
              >
                {t('Save note')}
              </Button>
              {editor.command &&
                ['NOTEBOOK_NETWORK', 'NOTEBOOK_DENIED'].includes(editor.error?.code) && (
                  <Button
                    disabled={editor.saving}
                    onClick={() => run(() => notebook.retry(target.entryKey))}
                  >
                    {t('Retry original save')}
                  </Button>
                )}
              <Button
                disabled={editor.saving}
                onClick={() =>
                  setConfirmation({
                    title: t('Refresh this notebook entry?'),
                    content: t(
                      'Your text is kept. Read the latest saved state, then choose Save note to apply your edit.'
                    ),
                    okText: t('Refresh entry'),
                    cancelText: t('Cancel'),
                    onOk: () => run(() => notebook.refreshEditor(target.ref)),
                  })
                }
              >
                {t('Refresh entry')}
              </Button>
              <Button
                danger
                disabled={blocked || !editor.entry}
                onClick={() =>
                  setConfirmation({
                    title: t('Remove this notebook entry?'),
                    content: t(
                      'This removes its mistake, bookmark and note. Your answers and saved position are kept.'
                    ),
                    okText: t('Remove entry'),
                    cancelText: t('Cancel'),
                    okButtonProps: { danger: true },
                    autoFocusButton: 'cancel',
                    onOk: async () => {
                      await notebook.change(target.entryKey, { kind: 'remove' });
                      finishClose();
                    },
                  })
                }
              >
                {t('Remove entry')}
              </Button>
            </Space>
          </>
        )}
      </Drawer>
    </>
  );
}
