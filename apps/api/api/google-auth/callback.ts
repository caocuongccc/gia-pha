// apps/api/api/google-auth/callback.ts
// GET /api/google-auth/callback?code=...&state=familyId:userId
// Được Google redirect về sau khi OWNER authorize
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';
import { exchangeCodeAndSaveFamilyDrive } from '../../src/_lib/google-oauth';

const FRONTEND = process.env.FRONTEND_URL ?? 'https://leduy-daitoc.vercel.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' });

  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    return res.redirect(
      `${FRONTEND}/families?driveError=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !state || !state.includes(':')) {
    return res.status(400).send('Thiếu code hoặc state');
  }

  const [familyId, userId] = state.split(':');

  try {
    await exchangeCodeAndSaveFamilyDrive(familyId, userId, code);
    // Đóng popup và thông báo cho parent window
    return res.send(`
      <html><body>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'DRIVE_CONNECTED', familyId: '${familyId}' }, '*');
            window.close();
          } else {
            window.location.href = '${FRONTEND}/families/${familyId}?driveConnected=1';
          }
        </script>
        <p>Kết nối thành công! Cửa sổ này sẽ tự đóng...</p>
      </body></html>
    `);
  } catch (err: any) {
    console.error('Drive callback error:', err);
    return res.redirect(
      `${FRONTEND}/families/${familyId}?driveError=exchange_failed`,
    );
  }
}
