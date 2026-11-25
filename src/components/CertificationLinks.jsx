import React, { useEffect, useId, useRef, useState } from 'react';
import { Alert, Button, Card, Empty, Input, Modal, Spin, Typography } from 'antd';
import { useLanguage } from '../contexts/LanguageContext';
import {
  certificationLinkMessage,
  useCertificationLinks,
  useCertificationLinkWrite,
} from '../hooks/useCertificationLinks';
import {
  CERTIFICATION_LINK_MAX,
  CERTIFICATION_LINK_SLOTS,
  certificationLinkUrl,
} from '../utils/certificationLinks';
import { secureId } from '../utils/secureId';

const { Paragraph, Title } = Typography;
function freeSlot(rows) {
  const slot = CERTIFICATION_LINK_SLOTS.find(
    (slot) => !rows.some((row) => row.slot === slot && row.url)
  );
  return slot && { slot, revision: rows.find((row) => row.slot === slot)?.revision || 0 };
}
const newLink = (position, url = '') => ({
  ...position,
  id: position.slot + '_' + secureId(),
  adding: true,
  url,
});

function ExternalCredential({ url }) {
  const href = certificationLinkUrl(url);
  if (!href) return null;
  return (
    <a
      className="credential-link"
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
    >
      <strong>{new URL(href).hostname}</strong>
      <span>{href}</span>
    </a>
  );
}

function LoadingLinks() {
  const { t } = useLanguage();
  return (
    <div className="inline-status" role="status">
      <Spin size="small" /> {t('Loading certificate links…')}
    </div>
  );
}

function OwnedLinks({ uid, onChanged }) {
  const { t } = useLanguage();
  const list = useCertificationLinks(uid);
  const mutation = useCertificationLinkWrite(uid);
  const inputId = useId();
  const input = useRef(null);
  const [editor, setEditor] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [gone, setGone] = useState(false);
  const busy = list.loading || mutation.busy;
  const conflict = mutation.error?.certificationLinkCode === 'conflict';
  const nextSlot = freeSlot(list.rows);
  const published = list.rows.filter(({ url }) => url);
  const editing = !!editor;
  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);

  const start = (entry) => {
    mutation.clear();
    setNotice(null);
    setInvalid(false);
    setGone(false);
    setEditor(entry);
  };
  const refresh = async () => {
    const rows = await list.load();
    if (!rows) return;
    mutation.clear();
    setRemoving(null);
    if (!editor) return;
    const current = rows.find(({ id }) => id === editor.id);
    const next = freeSlot(rows);
    if (current?.url) setEditor({ ...current, url: editor.url });
    else if (!current && editor.adding && next)
      setEditor(
        editor.slot === next.slot && editor.revision === next.revision
          ? editor
          : newLink(next, editor.url)
      );
    else setGone(true);
  };
  const save = async (event) => {
    event.preventDefault();
    if (busy || gone || conflict || list.error) return;
    const url = certificationLinkUrl(editor.url);
    setInvalid(!url);
    if (!url) {
      input.current?.focus();
      return;
    }
    if (await mutation.write('save', { ...editor, url })) {
      setEditor(null);
      setNotice(editor.adding ? 'Certificate link published.' : 'Public link updated.');
      list.load();
      onChanged();
    }
  };
  const remove = async () => {
    if (await mutation.write('remove', removing)) {
      setRemoving(null);
      setNotice('Public link removed.');
      list.load();
      onChanged();
    }
  };
  return (
    <Card className="credential-panel">
      <div className="outcome-card-heading">
        <Title level={2}>{t('My public links')}</Title>
        <Button loading={list.loading} disabled={mutation.busy} onClick={refresh}>
          {t('Refresh my links')}
        </Button>
      </div>
      {list.error && (
        <Alert type="error" showIcon message={t(certificationLinkMessage(list.error))} />
      )}
      {notice && <Alert role="status" type="success" showIcon message={t(notice)} />}
      {gone && (
        <Alert
          type="warning"
          showIcon
          message={t('This record is no longer available. Your form input is still here.')}
        />
      )}
      {mutation.error && !removing && (
        <Alert type="error" showIcon message={t(certificationLinkMessage(mutation.error))} />
      )}
      {!editor && (
        <Button
          type="primary"
          disabled={busy || !!list.error || !nextSlot}
          onClick={() => start(newLink(nextSlot))}
        >
          {t('Add certificate link')}
        </Button>
      )}
      {!nextSlot && <Paragraph>{t('You can publish up to six certificate links.')}</Paragraph>}
      {editor && (
        <form onSubmit={save} className="outcome-form credential-form" noValidate>
          <div className="outcome-form-wide">
            <label htmlFor={inputId}>{t('Certificate or badge URL')}</label>
            <Input
              ref={input}
              id={inputId}
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://"
              maxLength={CERTIFICATION_LINK_MAX}
              value={editor.url}
              disabled={busy}
              aria-invalid={invalid || undefined}
              aria-describedby={inputId + (invalid ? '-error' : '-help')}
              onChange={(event) => {
                setInvalid(false);
                setEditor({ ...editor, url: event.target.value });
              }}
            />
            <Paragraph type="secondary" id={inputId + '-help'}>
              {t('The full link will be visible to everyone.')}
            </Paragraph>
            {invalid && (
              <Alert
                id={inputId + '-error'}
                type="error"
                showIcon
                message={t('Enter a valid HTTPS certificate or badge link.')}
              />
            )}
          </div>
          <div className="outcome-actions outcome-form-wide">
            <Button
              type="primary"
              htmlType="submit"
              loading={mutation.busy}
              disabled={busy || gone || conflict || !!list.error}
            >
              {t(editor.adding ? 'Publish link' : 'Save public link')}
            </Button>
            <Button disabled={mutation.busy} onClick={() => start(null)}>
              {t('Cancel')}
            </Button>
          </div>
        </form>
      )}
      {!!published.length && (
        <ul className="credential-list">
          {published.map((entry) => (
            <li key={entry.id}>
              <ExternalCredential url={entry.url} />
              <div className="outcome-actions">
                <Button disabled={busy || !!editor || !!list.error} onClick={() => start(entry)}>
                  {t('Edit link')}
                </Button>
                <Button
                  danger
                  disabled={busy || !!editor || !!list.error}
                  onClick={() => {
                    mutation.clear();
                    setNotice(null);
                    setRemoving(entry);
                  }}
                >
                  {t('Remove link')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {removing && (
        <Modal
          className="app-danger-dialog outcome-dialog"
          open
          title={t('Remove this public link?')}
          okText={t('Remove link')}
          cancelText={t('Cancel')}
          cancelButtonProps={{ autoFocus: true, disabled: mutation.busy }}
          okButtonProps={{ danger: true, disabled: conflict }}
          confirmLoading={mutation.busy}
          onOk={remove}
          onCancel={() => {
            if (mutation.busy) return;
            setRemoving(null);
            if (conflict) list.load();
            mutation.clear();
          }}
        >
          <Paragraph>{t('Guests will no longer see this link in QuizMos.')}</Paragraph>
          {mutation.error && (
            <Alert type="error" showIcon message={t(certificationLinkMessage(mutation.error))} />
          )}
        </Modal>
      )}
    </Card>
  );
}

export default function CertificationLinks({ user, authLoading, onSignIn }) {
  const { t } = useLanguage();
  const feed = useCertificationLinks();
  return (
    <>
      {authLoading ? (
        <LoadingLinks />
      ) : user?.uid && !user.isAnonymous ? (
        <OwnedLinks key={user.uid} uid={user.uid} onChanged={feed.load} />
      ) : (
        <div className="outcome-actions">
          <Button type="primary" onClick={onSignIn}>
            {t('Sign in to publish a link')}
          </Button>
        </div>
      )}
      <Card className="credential-panel">
        <div className="outcome-card-heading">
          <Title level={2}>{t('Community certificate links')}</Title>
          <Button disabled={feed.loading} onClick={() => feed.load()}>
            {t('Refresh public links')}
          </Button>
        </div>
        {feed.error && (
          <Alert
            type="error"
            showIcon
            message={t(certificationLinkMessage(feed.error))}
            action={<Button onClick={() => feed.load(feed.retry)}>{t('Retry')}</Button>}
          />
        )}
        {feed.loading && <LoadingLinks />}
        {!feed.loading && !feed.error && !feed.rows.length && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('No public certificate links yet.')}
          />
        )}
        {!!feed.rows.length && (
          <ul className="credential-list">
            {feed.rows.map((entry) => (
              <li key={entry.id}>
                <ExternalCredential url={entry.url} />
              </li>
            ))}
          </ul>
        )}
        {feed.next && !feed.error && (
          <Button disabled={feed.loading} onClick={() => feed.load(feed.next)}>
            {t('Load more')}
          </Button>
        )}
      </Card>
    </>
  );
}
