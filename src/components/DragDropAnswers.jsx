import React, { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from 'antd';
import { CheckOutlined, CloseOutlined, HolderOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useDragDropPointer } from '../hooks/useDragDropPointer.js';
import {
  dragDropChoices,
  placeDragChoice,
  clearDragSlot,
  canPlaceDragChoice,
} from '../utils/dragDropModel.js';
import { dragDropTemplateParts } from '../utils/dragDropTemplate.js';
import { partLabel, partOptions, questionParts } from '../utils/questionModel.js';
import './DragDropAnswers.css';

export default function DragDropAnswers({
  data,
  answer,
  onSelectAnswer,
  readOnly,
  reveal,
  feedback,
}) {
  const { t } = useLanguage();
  const instructions = useId();
  const rootRef = useRef(null),
    targets = useRef(new Map());
  const [selection, setSelection] = useState(null),
    [notice, setNotice] = useState({ id: 0, key: '', params: {} });
  const selected = !readOnly && selection?.context === data ? selection : null;
  const choices = dragDropChoices(data),
    parts = questionParts(data);
  const say = (key, params = {}) =>
    setNotice((old) => ({ id: old.id + 1, key, params, context: data }));
  const choose = (payload, node) => {
    if (readOnly) return;
    setSelection({ ...payload, context: data, node });
    say('Choice {key} selected. Choose a slot.', { key: payload.choice.key });
  };
  const cancel = () => {
    const node = selected?.node;
    setSelection(null);
    say('Placement cancelled. Answers kept.');
    if (node?.isConnected) {
      node.focus({ preventScroll: true });
      node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  };
  const place = (payload, slotId) => {
    if (readOnly) return;
    const next = placeDragChoice(data, answer, payload, slotId);
    setSelection(null);
    if (!next) {
      say('This choice cannot be placed here. Answers kept.');
      return;
    }
    onSelectAnswer(next);
    const part = parts.find((item) => item.id === slotId);
    say('Choice {key} placed in {part}.', {
      key: payload.choice.key,
      part: partLabel(part, parts.indexOf(part)),
    });
    targets.current.get(slotId)?.focus({ preventScroll: true });
  };
  const pointer = useDragDropPointer({
    context: data,
    readOnly,
    rootRef,
    onStart: () => setSelection(null),
    onTap: choose,
    onDrop: place,
    onCancel: cancel,
  });
  const clear = (part, index) => {
    if (readOnly) return;
    pointer.cancel();
    setSelection(null);
    onSelectAnswer(clearDragSlot(data, answer, part.id));
    say('Answer cleared for {part}.', { part: partLabel(part, index) });
    targets.current.get(part.id)?.focus({ preventScroll: true });
  };
  const handle = (payload) => (
    <button
      type="button"
      className="dd-handle"
      tabIndex={-1}
      aria-label={t('Drag choice {key}', { key: payload.choice.key })}
      {...pointer.handleProps(payload)}
      onClick={(event) => {
        if (event.detail === 0) choose(payload, event.currentTarget);
      }}
    >
      <HolderOutlined aria-hidden="true" />
    </button>
  );
  const slot = (part, index, inline = false) => {
    const key = answer?.[part.id],
      options = partOptions(data, part.id),
      text = typeof key === 'string' && Object.hasOwn(options, key) ? options[key] : null;
    const value = text ? `${key}. ${text}` : t(readOnly ? 'Not answered' : 'Drop or place here');
    const payload = text ? { choice: { key, text }, fromSlot: part.id } : null;
    const hovered = pointer.visual?.target === part.id;
    const compatible = hovered && canPlaceDragChoice(data, pointer.visual.choice, part.id);
    const className =
      'dd-slot' +
      (inline ? ' dd-slot-inline' : '') +
      (hovered ? (compatible ? ' dd-drop-active' : ' dd-drop-invalid') : '') +
      (reveal ? (key === data.answer[part.id] ? ' dd-correct' : ' dd-incorrect') : '');
    const contents = (
      <>
        {inline && <span className="dd-inline-label">{partLabel(part, index)}</span>}
        <span className="dd-slot-controls">
          {!readOnly && payload && handle(payload)}
          {readOnly ? (
            <span className="dd-readonly-value">{value}</span>
          ) : (
            <button
              type="button"
              className="dd-target"
              data-dd-slot={part.id}
              ref={(node) => {
                if (node) targets.current.set(part.id, node);
                else targets.current.delete(part.id);
              }}
              aria-label={`${partLabel(part, index)}: ${value}`}
              aria-pressed={selected?.fromSlot === part.id}
              onClick={(event) => {
                if (selected) place(selected, part.id);
                else if (payload) choose(payload, event.currentTarget);
                else say('Select a choice first.');
              }}
              onKeyDown={(event) => {
                if ((event.key === 'Delete' || event.key === 'Backspace') && text) {
                  event.preventDefault();
                  clear(part, index);
                }
              }}
            >
              {value}
            </button>
          )}
          {!readOnly && text && (
            <Button
              className="dd-clear"
              aria-label={t('Clear {part}', { part: partLabel(part, index) })}
              icon={<CloseOutlined aria-hidden="true" />}
              onClick={() => clear(part, index)}
            />
          )}
        </span>
        {!readOnly && (
          <span className="dd-target-hint" aria-hidden={!hovered}>
            {hovered ? t(compatible ? 'Release to place' : 'Choose another slot') : ''}
          </span>
        )}
      </>
    );
    return inline ? (
      <span key={part.id} className={className} role="group" aria-label={partLabel(part, index)}>
        {contents}
      </span>
    ) : (
      <fieldset key={part.id} className={className}>
        <legend>{partLabel(part, index)}</legend>
        {contents}
        {feedback(part, index)}
      </fieldset>
    );
  };
  return (
    <div
      className="drag-drop-answers"
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && (selected || pointer.active())) {
          event.preventDefault();
          event.stopPropagation();
          const old = pointer.cancel();
          if (!old) cancel();
          else if (old.node?.isConnected) {
            old.node.focus({ preventScroll: true });
            old.node.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          }
        }
      }}
    >
      <p id={instructions} className="dd-instructions">
        {t(
          readOnly
            ? 'Recorded placements'
            : 'Drag a handle, or select a choice and then a slot. Escape cancels; Delete clears a focused slot.'
        )}
      </p>
      <div
        className="dd-choice-bank"
        role="group"
        aria-label={t('Choice bank')}
        aria-describedby={instructions}
      >
        {choices.map((choice) => (
          <div
            key={choice.id}
            className={
              'dd-choice' + (selected?.choice.id === choice.id ? ' dd-choice-selected' : '')
            }
          >
            {!readOnly && handle({ choice, fromSlot: null })}
            {readOnly ? (
              <span className="dd-choice-text">
                {choice.key}. {choice.text}
              </span>
            ) : (
              <button
                type="button"
                className="dd-choice-text"
                aria-pressed={selected?.choice.id === choice.id && selected.fromSlot == null}
                onClick={(event) => choose({ choice, fromSlot: null }, event.currentTarget)}
              >
                <span className="dd-choice-key">{choice.key}.</span> {choice.text}
                <CheckOutlined
                  className="dd-selection-indicator"
                  aria-hidden="true"
                  style={{ visibility: selected?.choice.id === choice.id ? 'visible' : 'hidden' }}
                />
              </button>
            )}
          </div>
        ))}
      </div>
      {data.layout === 'inline' ? (
        <>
          <div className="dd-template">
            {dragDropTemplateParts(data.template).map((piece, index) => {
              if (piece.slotId != null) {
                const i = parts.findIndex((part) => part.id === piece.slotId);
                return slot(parts[i], i, true);
              }
              return <React.Fragment key={'text-' + index}>{piece.text}</React.Fragment>;
            })}
          </div>
          {parts.map((part, index) => (
            <React.Fragment key={part.id}>{feedback(part, index, true)}</React.Fragment>
          ))}
        </>
      ) : (
        <div className="dd-slots">{parts.map((part, index) => slot(part, index))}</div>
      )}
      <div className="dd-status" role="status" aria-live="polite" aria-atomic="true">
        <span key={notice.id}>
          {!readOnly && notice.context === data ? t(notice.key, notice.params) : ''}
        </span>
      </div>
      {pointer.visual &&
        createPortal(
          <div
            className="dd-ghost"
            aria-hidden="true"
            style={{
              width: Math.min(280, innerWidth - 24),
              left: Math.max(
                12,
                Math.min(
                  pointer.visual.point.x + 12,
                  innerWidth - Math.min(280, innerWidth - 24) - 12
                )
              ),
              top: Math.max(12, Math.min(pointer.visual.point.y + 12, innerHeight - 110)),
            }}
          >
            {pointer.visual.choice.key}. {pointer.visual.choice.text}
          </div>,
          document.body
        )}
    </div>
  );
}
