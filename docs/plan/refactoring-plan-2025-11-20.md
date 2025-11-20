# Refactoring Plan

## 1. Subscription System Refactoring (Immediate)

The subscription system was recently implemented to meet the deadline. Now we need to harden it and replace simulations with real logic.

### 1.1. Secure Edge Functions
- **Goal**: Prevent unauthorized execution of the `process-subscription-payments` function.
- **Action**:
  - Add a shared secret check (e.g., `CRON_SECRET`) in the Edge Function.
  - Update the Cron Job configuration to send this secret in the header.
  - Ensure CORS headers are correctly configured for client-side calls (if any).

### 1.2. Real Payment Integration for Upgrades
- **Goal**: Replace the simulated logic in `useUpgradeSubscription` with real Toss Payments integration.
- **Action**:
  - Create a new Edge Function `create-payment-intent` (or similar) to handle upgrade requests.
  - Implement the logic to calculate prorated amounts (if applicable) or immediate charge.
  - Update the frontend to call this function and handle the Toss Payments widget/window.

### 1.3. Unit Testing for Hooks
- **Goal**: Ensure the stability of the complex subscription hooks.
- **Action**:
  - Add unit tests for `useMySubscriptions`, `useCancelSubscription`, etc., using `vitest` and `react-hooks-testing-library`.
  - Mock Supabase client responses to test various states (loading, error, empty, active).

### 1.4. Error Handling & Logging
- **Goal**: Improve visibility into payment failures.
- **Action**:
  - Integrate a logging service (or create a `logs` table in Supabase) to track Edge Function execution details.
  - Improve frontend error messages to be more user-friendly (e.g., specific messages for "Card Declined" vs "Network Error").

## 2. General Codebase Improvements (Short-term)

### 2.1. Component Consolidation
- **Goal**: Reduce duplication and improve consistency.
- **Action**:
  - Review `PricingCard` and `SubscriptionCard` (in `Subscriptions.tsx`) for shared styles/logic.
  - Extract common UI patterns (e.g., "Status Badge" logic) into reusable components if they aren't already.

### 2.2. Type Safety Enhancements
- **Goal**: Eliminate `any` types and improve type inference.
- **Action**:
  - Review `supabase/functions/process-subscription-payments/index.ts` and replace `any` with proper types from the generated Supabase types.
  - Ensure all React Query hooks return strongly typed data.

## 3. Architecture & Performance (Long-term)

### 3.1. Feature-based Folder Structure
- **Goal**: Improve maintainability as the app grows.
- **Action**:
  - Consider moving related files (Page, Hooks, Components, Types) into feature folders (e.g., `src/features/subscription/`) instead of splitting them across `src/pages`, `src/hooks`, etc.

### 3.2. Bundle Size Optimization
- **Goal**: Keep the app fast.
- **Action**:
  - Analyze the bundle using `rollup-plugin-visualizer`.
  - Check if `date-fns` or `lucide-react` are being tree-shaken correctly.
  - Verify lazy loading effectiveness for the new `Subscriptions` route.

## 4. Documentation
- **Goal**: Keep docs up to date.
- **Action**:
  - Update `CLAUDE.md` with any new architectural decisions.
  - Document the Edge Function API and security mechanisms.
