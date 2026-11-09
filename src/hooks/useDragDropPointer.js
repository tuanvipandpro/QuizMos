import { useEffect, useRef, useState } from 'react';
import { getScrollTarget } from '../utils/scroll.js';

export function useDragDropPointer(options) {
  const current = useRef(options);
  current.current = options;
  const gesture = useRef(null),
    frameId = useRef(null),
    mounted = useRef(true);
  const [visual, setVisual] = useState(null);
  const targetAt = (point) => {
    const node = document.elementFromPoint(point.x, point.y)?.closest('[data-dd-slot]');
    return node && current.current.rootRef.current?.contains(node) ? node.dataset.ddSlot : null;
  };
  const stop = (notify = false) => {
    const old = gesture.current;
    gesture.current = null;
    if (frameId.current != null) cancelAnimationFrame(frameId.current);
    frameId.current = null;
    if (old) {
      try {
        if (old.node.hasPointerCapture(old.pointerId))
          old.node.releasePointerCapture(old.pointerId);
      } catch {
        /* A removed element already lost capture. */
      }
    }
    if (mounted.current) setVisual(null);
    if (notify && old && mounted.current) current.current.onCancel();
    return old;
  };
  const live = (item) =>
    mounted.current &&
    item &&
    !current.current.readOnly &&
    item.context === current.current.context;
  const frame = () => {
    frameId.current = null;
    const item = gesture.current;
    if (!live(item)) {
      stop(true);
      return;
    }
    if (item.dragged) {
      const target = targetAt(item.point);
      const header =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--app-header-height')
        ) || 70;
      const top = Math.min(header + 48, innerHeight / 2),
        bottom = innerHeight - 64;
      const delta = item.point.y < top ? -12 : item.point.y > bottom ? 12 : 0;
      setVisual({ choice: item.payload.choice, point: item.point, target });
      if (delta) {
        const scrollTarget = getScrollTarget();
        const before = scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
        scrollTarget.scrollBy({ top: delta, behavior: 'instant' });
        // A viewport-sized body can overflow visibly without being scrollable.
        if (scrollTarget !== window && scrollTarget.scrollTop === before)
          window.scrollBy({ top: delta, behavior: 'instant' });
      }
    }
    frameId.current = requestAnimationFrame(frame);
  };
  const move = (event) => {
    const item = gesture.current;
    if (!item || event.pointerId !== item.pointerId) return;
    if (!live(item)) {
      stop(true);
      return;
    }
    item.point = { x: event.clientX, y: event.clientY };
    if (Math.hypot(item.point.x - item.start.x, item.point.y - item.start.y) >= 6)
      item.dragged = true;
    if (item.dragged) event.preventDefault();
  };
  const end = (event) => {
    const item = gesture.current;
    if (!item || event.pointerId !== item.pointerId) return;
    const eligible = live(item);
    const target = targetAt({ x: event.clientX, y: event.clientY });
    stop();
    if (!eligible) return;
    if (!item.dragged) current.current.onTap(item.payload, item.node);
    else if (target) current.current.onDrop(item.payload, target);
    else current.current.onCancel();
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
    // Imperative resource cleanup uses refs; gesture events are not effects.
  }, []);
  useEffect(() => {
    if (gesture.current && !live(gesture.current)) stop(true);
  }, [options.context, options.readOnly]);
  return {
    visual,
    active: () => gesture.current != null,
    cancel: () => stop(true),
    handleProps: (payload) => ({
      onPointerDown(event) {
        if (event.button !== 0 || event.isPrimary === false || current.current.readOnly) return;
        stop();
        const node = event.currentTarget;
        try {
          node.setPointerCapture(event.pointerId);
        } catch {
          return;
        }
        const point = { x: event.clientX, y: event.clientY };
        gesture.current = {
          pointerId: event.pointerId,
          node,
          payload,
          context: current.current.context,
          point,
          start: point,
          dragged: false,
        };
        event.preventDefault();
        node.focus({ preventScroll: true });
        current.current.onStart();
        frameId.current = requestAnimationFrame(frame);
      },
      onPointerMove: move,
      onPointerUp: end,
      onPointerCancel: () => stop(true),
      onLostPointerCapture: () => {
        if (gesture.current) stop(true);
      },
    }),
  };
}
