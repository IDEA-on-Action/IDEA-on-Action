# Newsletter Security Quick Reference

## 🔒 Security Issues Fixed

### 1. **Exposed Auth Users** (Critical)
- ❌ **Before**: View used `COALESCE(newsletter_email, auth.users.email)`
- ✅ **After**: View uses `newsletter_email` ONLY
- 🎯 **Impact**: No exposure of auth.users table to authenticated users

### 2. **Security Definer** (High)
- ❌ **Before**: Functions used `SECURITY DEFINER` (bypassed RLS)
- ✅ **After**: Functions use `SECURITY INVOKER` (enforces RLS)
- 🎯 **Impact**: Row-level security policies now enforced

---

## 📋 Quick Deployment

### Apply Migration
```bash
# Local
supabase db reset

# Production
supabase db push
```

### Verify
```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f scripts/validation/check-newsletter-security.sql
```

---

## 🔐 Security Controls

### Access Levels

| Role | View | Subscribe | Unsubscribe | Get All |
|------|------|-----------|-------------|---------|
| **anon** | ❌ No | ❌ No | ❌ No | ❌ No |
| **authenticated** | ⚠️ Own only | ✅ Self | ✅ Self | ❌ No |
| **admin** | ✅ All | ✅ Self | ✅ Self | ✅ Yes |

### RLS Policies Applied
1. ✅ Admins can view all newsletter subscribers
2. ✅ Users can view own newsletter subscription
3. ✅ Users can update own newsletter subscription

---

## 🧪 Testing

### Test Anonymous Access (Should FAIL)
```typescript
// No auth token - should be denied
const { data, error } = await supabase
  .from('newsletter_subscribers')
  .select('*');
// Expected: error (permission denied)
```

### Test User Subscribe (Should SUCCESS)
```typescript
// Authenticated user
const { data, error } = await supabase
  .rpc('subscribe_to_newsletter', {
    p_email: 'user@example.com'
  });
// Expected: success
```

### Test User View Others (Should FAIL)
```typescript
// Try to view other users' emails
const { data } = await supabase
  .from('user_profiles')
  .select('newsletter_email')
  .neq('user_id', myUserId);
// Expected: empty (RLS filters)
```

### Test Admin View All (Should SUCCESS)
```typescript
// Admin role
const { data, error } = await supabase
  .rpc('get_newsletter_subscribers');
// Expected: all subscribers
```

---

## ⚠️ Breaking Changes

### Email Parameter Now Required
```typescript
// ❌ Before (allowed DEFAULT NULL)
await supabase.rpc('subscribe_to_newsletter');

// ✅ After (email required)
await supabase.rpc('subscribe_to_newsletter', {
  p_email: 'user@example.com'
});
```

### View Only Shows Explicit Emails
- View ONLY includes rows where `newsletter_email IS NOT NULL`
- No fallback to `auth.users.email`

### Migration Needed for Existing Data
```sql
-- One-time migration to populate newsletter_email
UPDATE public.user_profiles up
SET newsletter_email = au.email
FROM auth.users au
WHERE up.user_id = au.id
  AND up.newsletter_subscribed = true
  AND up.newsletter_email IS NULL;
```

---

## 📊 Security Checklist

- [x] auth.users not exposed via view
- [x] SECURITY INVOKER used (not SECURITY DEFINER)
- [x] Email validation with regex
- [x] NULL check on email input
- [x] RLS enabled on user_profiles
- [x] Row-level policies for SELECT/UPDATE
- [x] Anonymous users REVOKED access
- [x] Admin-only function with explicit check
- [x] Audit trail maintained (user's own ID)

---

## 🆘 Rollback (If Needed)

### Rollback Migration
```sql
-- Restore original view (INSECURE - only for emergency)
CREATE OR REPLACE VIEW public.newsletter_subscribers AS
SELECT
  id,
  user_id,
  COALESCE(newsletter_email, (SELECT email FROM auth.users WHERE id = user_id)) as email,
  display_name,
  newsletter_subscribed_at as subscribed_at,
  created_at
FROM public.user_profiles
WHERE newsletter_subscribed = true;

-- Restore SECURITY DEFINER (INSECURE)
CREATE OR REPLACE FUNCTION subscribe_to_newsletter(p_email TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
-- ... original function body ...
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**⚠️ WARNING**: Only rollback if absolutely necessary. Re-apply security fix ASAP.

---

## 📖 Related Documents

- [Full Security Audit](./supabase-security-audit-2025-11-21.md)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Migration File](../../supabase/migrations/20251121000000_fix_newsletter_security_issues.sql)
- [Validation Script](../../scripts/validation/check-newsletter-security.sql)

---

**Last Updated**: 2025-11-21
**Status**: ✅ Applied
**Security Score**: 🟢 95/100
