import React, { useRef, useState } from 'react';
import { Alert, Button, Modal } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { useLanguage } from '../contexts/LanguageContext';
import './QuestionImage.css';

const FIT_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.5;

export default function QuestionImage({
  src,
  className = 'question-image',
  unavailableMessage = 'Question illustration is unavailable.',
}) {
  const { t } = useLanguage();
  const trigger = useRef(null);
  const [aspect, setAspect] = useState(0);
  const [failed, setFailed] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(FIT_SCALE);
  const alt = t('Question illustration');

  if (failed) return <Alert type="info" message={t(unavailableMessage)} />;

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`${className} question-image-trigger`}
        aria-label={t('Open question illustration')}
        aria-haspopup="dialog"
        disabled={!aspect}
        onClick={() => {
          setScale(FIT_SCALE);
          setPreviewFailed(false);
          setOpen(true);
        }}
      >
        <img
          src={src}
          alt={alt}
          onLoad={({ currentTarget }) =>
            setAspect(currentTarget.naturalWidth / currentTarget.naturalHeight || 0)
          }
          onError={() => setFailed(true)}
        />
        <span className="question-image-zoom-indicator" aria-hidden="true">
          <ZoomInOutlined />
        </span>
      </button>
      <Modal
        className="question-image-modal"
        title={alt}
        open={open}
        centered
        width={900}
        footer={null}
        onCancel={() => setOpen(false)}
        focusTriggerAfterClose={false}
        afterClose={() => trigger.current?.focus({ preventScroll: true })}
        destroyOnHidden
      >
        {previewFailed ? (
          <Alert type="info" message={t(unavailableMessage)} />
        ) : (
          <>
            <div className="question-image-zoom-controls">
              <Button
                icon={<ZoomOutOutlined aria-hidden="true" />}
                aria-disabled={scale <= FIT_SCALE}
                onClick={() => setScale((value) => Math.max(FIT_SCALE, value - ZOOM_STEP))}
              >
                {t('Zoom out')}
              </Button>
              <Button
                icon={<ZoomInOutlined aria-hidden="true" />}
                aria-disabled={scale >= MAX_SCALE}
                onClick={() => setScale((value) => Math.min(MAX_SCALE, value + ZOOM_STEP))}
              >
                {t('Zoom in')}
              </Button>
            </div>
            <div className="question-image-scroll" role="region" aria-label={alt} tabIndex={0}>
              <img
                className="question-image-preview"
                src={src}
                alt={alt}
                style={{ '--question-image-aspect': aspect, '--question-image-scale': scale }}
                onError={() => setPreviewFailed(true)}
              />
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
