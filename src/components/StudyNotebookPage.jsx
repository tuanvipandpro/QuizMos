import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Select, Spin, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { quizzes } from '../data/quizzes.js';
import { NOTEBOOK_PAGE_SIZE, NOTEBOOK_ENTRY_LIMIT } from '../data/studyNotebookLimits.js';
import { notebookMessage } from '../data/studyNotebookMessages.js';
import { useNotebookSelection } from '../hooks/useNotebookSelection';
import { useNotebookEntrySources } from '../hooks/useNotebookSources';
import NotebookEntryEditor from './NotebookEntryEditor';
import NotebookEntryCard from './NotebookEntryCard';
import { useCompactStudyLayout } from '../hooks/useCompactStudyLayout';

export default function StudyNotebookPage({ notebook, onNavigate }) {
  const { t } = useLanguage();
  const compact = useCompactStudyLayout();
  const [filtersOpen, setFiltersOpen] = useState(() => !compact);
  useEffect(() => setFiltersOpen(!compact), [compact]);
  const [page, setPage] = useState(0),
    [selected, setSelected] = useState({}),
    [target, setTarget] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const selection = useNotebookSelection(notebook, onNavigate);
  const visible = useMemo(
    () => notebook.entries.slice(page * NOTEBOOK_PAGE_SIZE, (page + 1) * NOTEBOOK_PAGE_SIZE),
    [notebook.entries, page]
  );
  const sources = useNotebookEntrySources(notebook.uid, visible, refresh);
  useEffect(() => {
    if (notebook.ready) notebook.loadPage();
  }, [notebook.ready, notebook.loadPage]);
  const filters = notebook.filters;
  const activeFilters =
    Number(!!filters.sourceGroup) +
    Number(filters.mistakes) +
    Number(filters.bookmarks) +
    Number(filters.review !== 'all');
  const apply = (patch) => {
    setPage(0);
    setSelected({});
    selection.clearError();
    notebook.loadPage({ ...filters, ...patch });
  };
  const reload = () => {
    setPage(0);
    setSelected({});
    setRefresh((value) => value + 1);
    notebook.loadPage();
  };
  const next = async () => {
    if ((page + 1) * NOTEBOOK_PAGE_SIZE < notebook.entries.length) {
      setPage(page + 1);
      return;
    }
    await notebook.loadPage(filters, { append: true });
    if (
      !notebook.getSnapshot().error &&
      notebook.getSnapshot().entries.length > (page + 1) * NOTEBOOK_PAGE_SIZE
    )
      setPage(page + 1);
  };
  const count = Object.keys(selected).length;
  return (
    <section className="notebook-page">
      <div className="notebook-heading">
        <div>
          <Typography.Title level={1}>{t('Study notebook')}</Typography.Title>
          <Typography.Paragraph type="secondary">
            {t('Your mistakes, review progress, bookmarks and private notes.')}
          </Typography.Paragraph>
        </div>
        <Button
          icon={<ReloadOutlined aria-hidden="true" />}
          loading={notebook.loading}
          onClick={reload}
        >
          {t('Refresh notebook')}
        </Button>
      </div>
      <details
        className="notebook-filter-panel"
        open={filtersOpen}
        onToggle={(event) => {
          if (event.currentTarget.open !== filtersOpen) setFiltersOpen(event.currentTarget.open);
        }}
      >
        <summary>
          {t('Notebook filters')}
          {activeFilters ? ' · ' + t('{count} active filters', { count: activeFilters }) : ''}
        </summary>
        <div className="notebook-filters" role="group" aria-label={t('Notebook filters')}>
          <div>
            <label htmlFor="notebook-bank-filter">{t('Quiz bank')}</label>
            <Select
              id="notebook-bank-filter"
              virtual={false}
              value={filters.sourceGroup || 'all'}
              options={[
                { value: 'all', label: t('All quiz banks') },
                ...quizzes.map((quiz) => ({ value: 'bank:' + quiz.id, label: quiz.name })),
              ]}
              onChange={(value) => apply({ sourceGroup: value === 'all' ? null : value })}
            />
          </div>
          <Checkbox
            checked={filters.mistakes}
            onChange={(event) =>
              apply({
                mistakes: event.target.checked,
                ...(!event.target.checked ? { review: 'all' } : {}),
              })
            }
          >
            {t('Mistakes only')}
          </Checkbox>
          <Checkbox
            checked={filters.bookmarks}
            onChange={(event) => apply({ bookmarks: event.target.checked })}
          >
            {t('Bookmarks only')}
          </Checkbox>
          <div>
            <label htmlFor="notebook-review-filter">{t('Review status')}</label>
            <Select
              id="notebook-review-filter"
              virtual={false}
              disabled={!filters.mistakes}
              value={filters.review}
              options={[
                ['all', 'All review states'],
                ['pending', 'To review'],
                ['reviewed', 'Reviewed correctly'],
              ].map(([value, label]) => ({ value, label: t(label) }))}
              onChange={(review) => apply({ review })}
            />
          </div>
        </div>
      </details>
      {notebook.error && (
        <Alert
          type="error"
          showIcon
          message={t(notebookMessage(notebook.error))}
          action={<Button onClick={reload}>{t('Retry')}</Button>}
        />
      )}
      {notebook.stale && (
        <Alert
          type="info"
          showIcon
          message={t('Your notebook changed. Refresh the list before selecting more questions.')}
          action={<Button onClick={reload}>{t('Refresh notebook')}</Button>}
        />
      )}
      {notebook.quota && (
        <Typography.Paragraph type="secondary">
          {t('{count} of {limit} notebook entries', {
            count: notebook.quota.count,
            limit: NOTEBOOK_ENTRY_LIMIT,
          })}
        </Typography.Paragraph>
      )}
      <div className="notebook-selection-actions">
        <Typography.Text role="status">
          {t('{count} questions selected', { count })}
        </Typography.Text>
        <Button
          type="primary"
          disabled={!count || notebook.loading || !!notebook.error || notebook.stale}
          loading={selection.preparing}
          onClick={() => selection.study(Object.values(selected))}
        >
          {t('Study selected questions')}
        </Button>
        {!!count && <Button onClick={() => setSelected({})}>{t('Clear selection')}</Button>}
      </div>
      {selection.error && (
        <Alert type="error" showIcon message={t(notebookMessage(selection.error))} />
      )}
      {notebook.loading && (
        <div role="status">
          <Spin /> {t('Loading notebook…')}
        </div>
      )}
      {!notebook.loading && !notebook.error && !notebook.stale && !visible.length && (
        <Empty
          description={t(
            notebook.quota?.count
              ? 'No entries match these filters.'
              : 'Your notebook is empty. Add a bookmark, a note or complete a practice answer.'
          )}
        />
      )}
      <div className="notebook-entries">
        {visible.map((entry) => (
          <NotebookEntryCard
            key={entry.entryKey}
            entry={entry}
            source={sources[entry.entryKey]}
            selected={!!selected[entry.entryKey]}
            disabled={notebook.loading || !!notebook.error || notebook.stale}
            onSelect={(checked) =>
              setSelected((previous) => {
                const next = { ...previous };
                if (checked) next[entry.entryKey] = entry;
                else delete next[entry.entryKey];
                return next;
              })
            }
            onEdit={() => setTarget({ ref: entry.ref, entryKey: entry.entryKey })}
          />
        ))}
      </div>
      <div className="notebook-pagination">
        <Button disabled={page === 0 || notebook.loading} onClick={() => setPage(page - 1)}>
          {t('Previous page')}
        </Button>
        <Typography.Text>{t('Page {number}', { number: page + 1 })}</Typography.Text>
        <Button
          disabled={
            notebook.loading ||
            !!notebook.error ||
            notebook.stale ||
            (!notebook.next && (page + 1) * NOTEBOOK_PAGE_SIZE >= notebook.entries.length)
          }
          onClick={next}
        >
          {t('Next page')}
        </Button>
      </div>
      {target && (
        <NotebookEntryEditor
          key={target.entryKey}
          target={target}
          notebook={notebook}
          onClose={() => setTarget(null)}
        />
      )}
    </section>
  );
}
