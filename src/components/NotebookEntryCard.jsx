import React, { useState } from 'react';
import { Button, Card, Checkbox, Space, Typography } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { findQuiz } from '../data/quizzes.js';
import { NOTEBOOK_SOURCE_LABELS } from '../data/studyNotebookMessages.js';

export default function NotebookEntryCard({ entry, source, selected, disabled, onSelect, onEdit }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const bank = entry.ref.kind === 'bank' ? findQuiz(entry.ref.quizId)?.name : source?.quiz?.name;
  const title = bank || t(entry.ref.kind === 'bank' ? 'Unavailable quiz' : 'Private quiz');
  const longNote = entry.note.length > 240;
  return (
    <Card className="notebook-entry">
      <div className="notebook-entry-heading">
        <Checkbox
          checked={selected}
          disabled={disabled || source?.state !== 'current'}
          aria-label={t('Select question {id} from {quiz}', {
            id: entry.ref.questionId,
            quiz: title,
          })}
          onChange={(event) => onSelect(event.target.checked)}
        />
        <div>
          <Typography.Title level={2}>{title}</Typography.Title>
          <Typography.Text type="secondary">
            {t('Question {id}', { id: entry.ref.questionId })}
          </Typography.Text>
        </div>
      </div>
      {source?.question && (
        <Typography.Paragraph className="notebook-question-preview">
          {source.question.question}
        </Typography.Paragraph>
      )}
      <Space wrap className="notebook-entry-status">
        <span>
          {t(
            entry.mistake
              ? entry.reviewed
                ? 'Mistake reviewed correctly'
                : 'Mistake to review'
              : entry.bookmarked
                ? 'Bookmarked'
                : 'Note only'
          )}
        </span>
        <span>{t(source ? NOTEBOOK_SOURCE_LABELS[source.state] : 'Checking source…')}</span>
      </Space>
      {entry.note && (
        <Typography.Paragraph
          className={'notebook-note-text' + (longNote && !expanded ? ' notebook-note-preview' : '')}
        >
          {entry.note}
        </Typography.Paragraph>
      )}
      <Space wrap>
        {longNote && (
          <Button aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {t(expanded ? 'Collapse note' : 'Read full note')}
          </Button>
        )}
        <Button icon={<EditOutlined aria-hidden="true" />} onClick={onEdit}>
          {t('Edit notebook entry')}
        </Button>
      </Space>
    </Card>
  );
}
