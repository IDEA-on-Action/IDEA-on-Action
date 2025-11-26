import { useContext, createContext } from 'react';
import type { AnnouncerContextType } from './announcer.types';

export const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

/**
 * Hook to access the global announcer
 *
 * @example
 * ```tsx
 * const { announce } = useAnnouncerContext();
 * announce('Form submitted successfully', { politeness: 'assertive' });
 * ```
 */
export function useAnnouncerContext() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnouncerContext must be used within an AnnouncerProvider');
  }
  return context;
}
