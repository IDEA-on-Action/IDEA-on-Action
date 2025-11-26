/**
 * Announcer Types
 * Separated from Announcer.tsx for Fast Refresh compatibility
 */

export type AriaLive = 'polite' | 'assertive';

export interface AnnounceOptions {
  politeness?: AriaLive;
  delay?: number;
  clearAfter?: number;
}

export interface AnnouncerContextType {
  announce: (message: string, options?: AnnounceOptions) => void;
}
