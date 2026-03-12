// apps/api/api/google-auth/index.ts
// GET  /api/google-auth?familyId=xxx  → trả URL để OWNER mở popup kết nối Drive
// DELETE /api/google-auth?familyId=xxx → ngắt kết nối Drive
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';
import { getGoogleAuthUrl } from '../../src/_lib/google-oauth';
import { prisma } from '../../src/_lib/prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return;

  const familyId = (req.query.familyId ?? req.body?.familyId) as string;
  if (!familyId) return res.status(400).json({ error: 'Thiếu familyId' });

  // Chỉ OWNER mới được kết nối/ngắt Drive
  const member = await prisma.familyMember.findFirst({
    where: { familyId, userId: user.id, role: 'OWNER' },
  });
  if (!member)
    return res.status(403).json({ error: 'Chỉ OWNER mới được quản lý Drive' });

  // ── GET: trả auth URL để mở popup ─────────────────────────
  if (req.method === 'GET') {
    // Trả luôn trạng thái hiện tại + URL kết nối mới
    const existing = await prisma.familyDriveAccount.findUnique({
      where: { familyId },
      select: {
        email: true,
        createdAt: true,
        connectedBy: true,
        permissions: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    const authUrl = getGoogleAuthUrl(familyId, user.id);
    return res.json({
      data: { connected: !!existing, account: existing, authUrl },
    });
  }

  // ── DELETE: ngắt kết nối ──────────────────────────────────
  if (req.method === 'DELETE') {
    await prisma.familyDriveAccount.deleteMany({ where: { familyId } });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
