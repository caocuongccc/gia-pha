// apps/api/api/upload/index.ts
// POST /api/upload
// Body: { familyId, postId?, files: [{ name, mimeType, base64, width?, height? }] }
// - Kiểm tra user có quyền upload vào Family Drive không
// - Dùng token của Family Drive Account (không phải token của user)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';
import { canUserUploadToDrive } from '../../src/_lib/google-oauth';
import { uploadFileToDrive } from '../../src/_lib/google-drive';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { familyId, postId, files } = req.body ?? {};
  if (!familyId || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'Thiếu familyId hoặc files' });
  }

  // Kiểm tra quyền upload (connector hoặc editor được cấp quyền)
  const hasAccess = await canUserUploadToDrive(familyId, user.id);
  if (!hasAccess) {
    return res.status(403).json({
      error:
        'Bạn chưa được cấp quyền upload Drive cho gia phả này. Liên hệ OWNER để được cấp quyền.',
      code: 'NO_DRIVE_PERMISSION',
    });
  }

  const subFolder = postId ?? `upload-${Date.now()}`;
  const results: {
    url: string;
    driveFileId: string;
    name: string;
    width?: number;
    height?: number;
  }[] = [];

  for (const file of files as {
    name: string;
    mimeType: string;
    base64: string;
    width?: number;
    height?: number;
  }[]) {
    try {
      const buffer = Buffer.from(file.base64, 'base64');
      const ext = file.name.split('.').pop() ?? 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { fileId, url } = await uploadFileToDrive(
        familyId,
        fileName,
        buffer,
        file.mimeType,
        subFolder,
      );
      results.push({
        url,
        driveFileId: fileId,
        name: file.name,
        width: file.width,
        height: file.height,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message, code: 'UPLOAD_ERROR' });
    }
  }

  return res.json({ data: results });
}
