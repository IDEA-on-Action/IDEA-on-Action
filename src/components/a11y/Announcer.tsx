import { useRef, useCallback, type ReactNode } from 'react';
import type { AriaLive, AnnounceOptions } from './announcer.types';
import { AnnouncerContext } from './useAnnouncerContext';

/**
 * AnnouncerProvider Component
 *
 * WCAG 2.1 Guideline 4.1.3 - Status Messages
 * Provides a global announcement system for screen readers.
 * Place this at the root of your app to enable announcements anywhere.
 *
 * @example
 * ```tsx
 * // In App.tsx
 * <AnnouncerProvider>
 *   <App />
 * </AnnouncerProvider>
 *
 * // In any component
 * const { announce } = useAnnouncerContext();
 * announce('Item added to cart');
 * ```
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const announce = useCallback((
    message: string,
    options: AnnounceOptions = {}
  ) => {
    const {
      politeness = 'polite',
      delay = 100,
      clearAfter = 5000
    } = options;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const ref = politeness === 'assertive' ? assertiveRef : politeRef;

      if (ref.current) {
        ref.current.textContent = '';
        requestAnimationFrame(() => {
          if (ref.current) {
            ref.current.textContent = message;
          }
        });
      }

      if (clearAfter > 0) {
        setTimeout(() => {
          if (politeRef.current) politeRef.current.textContent = '';
          if (assertiveRef.current) assertiveRef.current.textContent = '';
        }, clearAfter);
      }
    }, delay);
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Screen reader live regions */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="announcer-polite"
      />
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="announcer-assertive"
      />
    </AnnouncerContext.Provider>
  );
}
