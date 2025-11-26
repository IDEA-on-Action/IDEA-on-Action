// WCAG 2.1 Accessibility Components
// See: https://www.w3.org/WAI/WCAG21/

// Bypass Blocks (2.4.1) - Skip navigation
export { SkipToContent } from "./SkipToContent";

// Info and Relationships (1.3.1) - Screen reader only content
export { ScreenReaderOnly } from "./ScreenReaderOnly";

// Keyboard Accessible (2.1.1) - Keyboard shortcuts help
export { KeyboardShortcuts } from "./KeyboardShortcuts";

// Status Messages (4.1.3) - Live regions for announcements
export { LiveRegion } from "./LiveRegion";
export { AnnouncerProvider } from "./Announcer";
export { useAnnouncerContext } from "./useAnnouncerContext";
export type { AriaLive, AnnounceOptions, AnnouncerContextType } from "./announcer.types";

// Focus Management (2.4.3, 2.1.2) - Focus trap for modals
export { FocusTrap } from "./FocusTrap";
