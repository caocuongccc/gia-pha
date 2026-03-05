import { VercelRequest, VercelResponse } from '@vercel/node';
import multiparty from 'multiparty';
import { readFileSync } from 'fs';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';
import { uploadToDrive } from '../../src/_lib/google-drive';

// Cần tắt body parser mặc định của Vercel để multiparty parse được
export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  if (req.method !== 'POST') return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  // Parse multipart form (chứa file + accessToken)
  const { fields, files } = await new Promise<any>((resolve, reject) => {
    const form = new multiparty.Form();
    form.parse(req as any, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

  const accessToken = fields?.accessToken?.[0];
  const file = files?.photo?.[0];

  if (!accessToken || !file)
    return res.status(400).json({ error: 'accessToken and photo required' });

  // Validate: chỉ cho phép image file
  if (!file.headers['content-type']?.startsWith('image/'))
    return res.status(400).json({ error: 'Only image files allowed' });

  // Validate: max 5MB
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE)
    return res.status(400).json({ error: 'File too large. Max 5MB.' });

  const fileBuffer = readFileSync(file.path);
  const ext = file.originalFilename.split('.').pop();
  const filename = `member-${user.id.slice(0, 8)}-${Date.now()}.${ext}`;

  const publicUrl = await uploadToDrive(
    accessToken,
    fileBuffer,
    filename,
    file.headers['content-type'],
  );

  res.json({ data: { url: publicUrl } });
}
