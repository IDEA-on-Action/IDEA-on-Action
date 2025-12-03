# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Security
- **Fixed Supabase Linter Warnings**:
    - Resolved `auth_users_exposed` and `security_definer_view` issues by refactoring `minu_integration_view` and `compass_integration_view` to use secure `SECURITY DEFINER` functions with `search_path = public`.
    - Resolved `security_definer_view` issues for `health_metrics_*` views by implementing secure wrapper functions.
    - Fixed `function_search_path_mutable` warnings for multiple functions (e.g., `get_user_audit_logs`, `get_sandbox_config`) by explicitly setting `search_path = public`.
    - Addressed `extension_in_public` by moving `vector` extension to `extensions` schema (requires manual execution if migration fails).
- **Hardening**:
    - Enforced `search_path` on all `SECURITY DEFINER` functions to prevent search path hijacking.
    - Added `security_invoker = true` to views to ensure proper permission handling.
