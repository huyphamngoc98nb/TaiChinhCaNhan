import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const FOCUSABLE_INPUT_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

function isEditableElement(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.matches(FOCUSABLE_INPUT_SELECTOR);
}

function scrollElementIntoKeyboardSafeView(element: HTMLElement) {
  element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
}

export function useKeyboardSafeFocus() {
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;

    const viewport = window.visualViewport;
    let activeEditable: HTMLElement | null = null;
    let cleanupTimers: number[] = [];

    const updateViewportMetrics = () => {
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const viewportOffsetTop = viewport?.offsetTop ?? 0;
      const keyboardInset = Math.max(0, window.innerHeight - viewportHeight - viewportOffsetTop);

      document.documentElement.style.setProperty('--visual-viewport-height', `${viewportHeight}px`);
      document.documentElement.style.setProperty('--keyboard-inset-bottom', `${keyboardInset}px`);
      document.body.classList.toggle('keyboard-open', keyboardInset > 80);
    };

    const clearScheduledScrolls = () => {
      cleanupTimers.forEach(timer => window.clearTimeout(timer));
      cleanupTimers = [];
    };

    const scheduleKeyboardSafeScroll = (element: HTMLElement) => {
      clearScheduledScrolls();
      [0, 120, 300, 520].forEach((delay) => {
        cleanupTimers.push(window.setTimeout(() => {
          if (document.activeElement === element) {
            scrollElementIntoKeyboardSafeView(element);
          }
        }, delay));
      });
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isEditableElement(event.target)) return;
      activeEditable = event.target;
      updateViewportMetrics();
      scheduleKeyboardSafeScroll(activeEditable);
    };

    const handleFocusOut = () => {
      activeEditable = null;
      clearScheduledScrolls();
      window.setTimeout(updateViewportMetrics, 100);
    };

    const handleViewportChange = () => {
      updateViewportMetrics();
      if (activeEditable && document.activeElement === activeEditable) {
        scheduleKeyboardSafeScroll(activeEditable);
      }
    };

    updateViewportMetrics();
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    window.addEventListener('resize', handleViewportChange);
    viewport?.addEventListener('resize', handleViewportChange);
    viewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      clearScheduledScrolls();
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('resize', handleViewportChange);
      viewport?.removeEventListener('resize', handleViewportChange);
      viewport?.removeEventListener('scroll', handleViewportChange);
      document.documentElement.style.removeProperty('--visual-viewport-height');
      document.documentElement.style.removeProperty('--keyboard-inset-bottom');
      document.body.classList.remove('keyboard-open');
    };
  }, []);
}
