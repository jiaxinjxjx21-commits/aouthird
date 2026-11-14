import React, { useRef, useState } from 'react';
import { ViewMode } from '../types';

export const VIEW_ORDER: ViewMode[] = ['calendar', 'matcher', 'groups'];

const SWIPE_MIN_DISTANCE = 55; // px
const SWIPE_MAX_DURATION = 600; // ms
const INTERACTIVE_SELECTOR = 'input, button, textarea, select, a, [role="button"], [contenteditable="true"]';

interface SwipeStart {
  x: number;
  y: number;
  time: number;
}

/** Current view, slide direction for transitions, and horizontal-swipe handlers. */
export function useViewNavigation(initialView: ViewMode = 'calendar') {
  const [currentView, setCurrentView] = useState<ViewMode>(initialView);
  const [slideDirection, setSlideDirection] = useState<number>(1);
  const pointerStart = useRef<SwipeStart | null>(null);
  const touchStart = useRef<SwipeStart | null>(null);

  const selectView = (newView: ViewMode) => {
    const currentIdx = Math.max(VIEW_ORDER.indexOf(currentView), 0);
    const newIdx = Math.max(VIEW_ORDER.indexOf(newView), 0);
    setSlideDirection(newIdx >= currentIdx ? 1 : -1);
    setCurrentView(newView);
  };

  // Swipe left -> next view, swipe right -> previous view
  const finishSwipe = (start: SwipeStart | null, endX: number, endY: number, ratio: number) => {
    if (!start) return;
    const deltaX = endX - start.x;
    const deltaY = endY - start.y;
    const duration = Date.now() - start.time;

    if (Math.abs(deltaX) > SWIPE_MIN_DISTANCE && Math.abs(deltaX) > Math.abs(deltaY) * ratio && duration < SWIPE_MAX_DURATION) {
      const idx = VIEW_ORDER.indexOf(currentView);
      if (deltaX < 0 && idx < VIEW_ORDER.length - 1) selectView(VIEW_ORDER[idx + 1]);
      else if (deltaX > 0 && idx > 0) selectView(VIEW_ORDER[idx - 1]);
    }
  };

  const swipeHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return; // primary button / touch only
      const target = e.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) return; // don't hijack controls
      pointerStart.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      finishSwipe(pointerStart.current, e.clientX, e.clientY, 1.3);
      pointerStart.current = null;
    },
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
      if (e.touches.length !== 1) return;
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    },
    onTouchEnd: (e: React.TouchEvent<HTMLElement>) => {
      const touch = e.changedTouches[0];
      finishSwipe(touchStart.current, touch.clientX, touch.clientY, 1.4);
      touchStart.current = null;
    },
  };

  return { currentView, slideDirection, selectView, swipeHandlers };
}
