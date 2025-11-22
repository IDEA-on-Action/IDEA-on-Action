import { useCallback, useRef, useEffect } from 'react';

type AriaLive = 'polite' | 'assertive' | 'off';

interface AnnounceOptions {
  /**
   * The politeness level for the announcement
   * - 'polite': Announces after current speech finishes (default)
   * - 'assertive': Interrupts current speech immediately
   * @default 'polite'
   */
  politeness?: AriaLive;
  /**
   * Delay in ms before announcing (useful for preventing rapid updates)
   * @default 100
   */
  delay?: number;
  /**
   * Whether to clear the announcement after a timeout
   * @default 5000
   */
  clearAfter?: number;
}

/**
 * useAnnounce Hook
 *
 * WCAG 2.1 Guideline 4.1.3 - Status Messages
 * Provides a way to announce messages to screen readers using aria-live regions.
 * This is essential for dynamic content updates that don't receive focus.
 *
 * Common use cases:
 * - Form submission success/error messages
 * - Loading state changes
 * - Search results count
 * - Cart updates
 * - Notification toasts
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { announce, Announcer } = useAnnounce();
 *
 *   const handleSubmit = async () => {
 *     try {
 *       await submitForm();
 *       announce('폼이 성공적으로 제출되었습니다', { politeness: 'assertive' });
 *     } catch (error) {
 *       announce('폼 제출에 실패했습니다. 다시 시도해주세요.', { politeness: 'assertive' });
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <form onSubmit={handleSubmit}>...</form>
 *       <Announcer />
 *     </>
 *   );
 * }
 * ```
 *
 * @see https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html
 */
export function useAnnounce() {
  const politeRef = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clearTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  const announce = useCallback((
    message: string,
    options: AnnounceOptions = {}
  ) => {
    const {
      politeness = 'polite',
      delay = 100,
      clearAfter = 5000
    } = options;

    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }

    // Delay the announcement to prevent rapid updates
    timeoutRef.current = setTimeout(() => {
      const targetRef = politeness === 'assertive' ? assertiveRef : politeRef;

      if (targetRef.current) {
        // Clear first to ensure the message is announced even if it's the same
        targetRef.current.textContent = '';

        // Use requestAnimationFrame to ensure the DOM update is processed
        requestAnimationFrame(() => {
          if (targetRef.current) {
            targetRef.current.textContent = message;
          }
        });
      }

      // Clear the announcement after the specified time
      if (clearAfter > 0) {
        clearTimeoutRef.current = setTimeout(() => {
          if (politeRef.current) {
            politeRef.current.textContent = '';
          }
          if (assertiveRef.current) {
            assertiveRef.current.textContent = '';
          }
        }, clearAfter);
      }
    }, delay);
  }, []);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current);
    }
    if (politeRef.current) {
      politeRef.current.textContent = '';
    }
    if (assertiveRef.current) {
      assertiveRef.current.textContent = '';
    }
  }, []);

  /**
   * Announcer component - renders the aria-live regions
   * Place this once in your component tree (e.g., at the root)
   */
  const Announcer = useCallback(() => (
    <>
      {/* Polite announcements - waits for current speech to finish */}
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      {/* Assertive announcements - interrupts current speech */}
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  ), []);

  return {
    announce,
    clear,
    Announcer
  };
}

export type { AnnounceOptions, AriaLive };
