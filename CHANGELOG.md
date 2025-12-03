# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Security
- Fixed Supabase linter warnings for `auth_users_exposed` and `security_definer_view`.
- Refactored `minu_integration_view` and `compass_integration_view` to use secure functions with `SECURITY DEFINER` and `search_path = public`.
- Refactored `health_metrics_*` views to use secure functions, preventing potential search path hijacking and unauthorized access.
