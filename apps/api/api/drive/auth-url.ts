import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';
import { getAuthUrl } from '../../src/_lib/google-drive';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return;

  // Trả về URL để Angular redirect user đến Google login
  const url = getAuthUrl();
  res.json({ data: { url } });
}
