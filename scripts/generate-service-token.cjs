/**
 * Minu Find 서비스 토큰 발급 스크립트
 *
 * mcp-auth Edge Function을 호출하여 서비스 토큰을 발급받습니다.
 */

const crypto = require('crypto');

const SUPABASE_URL = 'https://zykjdneewbzyazfukzyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5a2pkbmVld2J6eWF6ZnVrenlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0Mjc4MTUsImV4cCI6MjA3MTAwMzgxNX0.Lgnm2-NpoDVMLgb3qUK9xgrE2k1S-_eORbG-5RyGST8';
const SERVICE_ID = 'minu-find';
const CLIENT_ID = 'minu-find-prod';
const WEBHOOK_SECRET = '350591dc924e8251a16b6b879f32b2018e0545df756a14bf160a20bc1bbe870b';

async function generateSignature(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return 'sha256=' + hmac.digest('hex');
}

async function issueToken() {
  const timestamp = new Date().toISOString();
  const body = JSON.stringify({
    grant_type: 'service_credentials',
    client_id: CLIENT_ID,
    scope: ['events:read', 'events:write', 'health:read', 'health:write']
  });

  const signature = await generateSignature(body, WEBHOOK_SECRET);

  console.log('=== 토큰 발급 요청 ===');
  console.log('URL:', `${SUPABASE_URL}/functions/v1/mcp-auth/token`);
  console.log('Service ID:', SERVICE_ID);
  console.log('Client ID:', CLIENT_ID);
  console.log('Timestamp:', timestamp);
  console.log('Body:', body);
  console.log('Signature:', signature);
  console.log('');

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mcp-auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'X-Service-Id': SERVICE_ID,
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
      body: body
    });

    const result = await response.json();

    if (response.ok) {
      console.log('=== 토큰 발급 성공 ===');
      console.log('Access Token:', result.access_token);
      console.log('Refresh Token:', result.refresh_token);
      console.log('Expires In:', result.expires_in, '초');
      console.log('Scope:', result.scope);
      console.log('Issued At:', result.issued_at);
      console.log('');
      console.log('=== Vercel 환경 변수 설정 ===');
      console.log('IDEAONACTION_EVENTS_ENDPOINT=' + SUPABASE_URL + '/functions/v1/receive-service-event');
      console.log('IDEAONACTION_SERVICE_TOKEN=' + result.access_token);
      console.log('IDEAONACTION_REFRESH_TOKEN=' + result.refresh_token);
    } else {
      console.log('=== 토큰 발급 실패 ===');
      console.log('Status:', response.status);
      console.log('Error:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('요청 실패:', error.message);
  }
}

issueToken();
