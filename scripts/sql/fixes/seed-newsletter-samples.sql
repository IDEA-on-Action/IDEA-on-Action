-- Newsletter 샘플 데이터 추가
-- Version 2.0 Sprint 3.2: Status 페이지 메트릭스 연결

INSERT INTO public.newsletter_subscriptions (email, status, confirmed_at, metadata) VALUES
  ('alice@example.com', 'confirmed', NOW() - INTERVAL '30 days', '{"source": "website", "subscribed_from": "/", "user_agent": "Mozilla/5.0"}'::jsonb),
  ('bob@example.com', 'confirmed', NOW() - INTERVAL '25 days', '{"source": "website", "subscribed_from": "/blog", "user_agent": "Mozilla/5.0"}'::jsonb),
  ('charlie@example.com', 'confirmed', NOW() - INTERVAL '20 days', '{"source": "website", "subscribed_from": "/portfolio", "user_agent": "Mozilla/5.0"}'::jsonb),
  ('diana@example.com', 'confirmed', NOW() - INTERVAL '15 days', '{"source": "website", "subscribed_from": "/", "user_agent": "Mozilla/5.0"}'::jsonb),
  ('eve@example.com', 'confirmed', NOW() - INTERVAL '10 days', '{"source": "website", "subscribed_from": "/lab", "user_agent": "Mozilla/5.0"}'::jsonb),
  ('frank@example.com', 'pending', NULL, '{"source": "website", "subscribed_from": "/", "user_agent": "Mozilla/5.0"}'::jsonb),
  ('grace@example.com', 'pending', NULL, '{"source": "website", "subscribed_from": "/about", "user_agent": "Mozilla/5.0"}'::jsonb),
  ('henry@example.com', 'confirmed', NOW() - INTERVAL '5 days', '{"source": "website", "subscribed_from": "/", "user_agent": "Mozilla/5.0"}'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- 확인 쿼리
SELECT
  status,
  COUNT(*) as count
FROM public.newsletter_subscriptions
GROUP BY status;
