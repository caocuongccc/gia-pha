import { VercelRequest, VercelResponse } from '@vercel/node';
import { createOAuth2Client } from '../../src/_lib/google-drive';
import { setCorsHeaders } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  const { code, state } = req.query;

  if (!code) {
    return res.redirect(
      `${process.env.FRONTEND_URL}/error?msg=google_auth_failed`,
    );
  }

  try {
    const oauth2 = createOAuth2Client();
    const { tokens } = await oauth2.getToken(code as string);

    // Redirect về Angular kèm token trong URL fragment (#)
    // Fragment không bị gửi lên server — an toàn hơn query param
    const params = new URLSearchParams({
      access_token: tokens.access_token || '',
      refresh_token: tokens.refresh_token || '',
      expiry_date: String(tokens.expiry_date || ''),
    });

    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/google/callback?${params}`,
    );
  } catch (e) {
    console.error('Google OAuth error', e);
    return res.redirect(
      `${process.env.FRONTEND_URL}/error?msg=token_exchange_failed`,
    );
  }
}
