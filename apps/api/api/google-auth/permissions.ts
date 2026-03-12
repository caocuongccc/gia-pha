// apps/api/api/google-auth/permissions.ts
// GET    /api/google-auth/permissions?familyId=xxx
// POST   /api/google-auth/permissions?familyId=xxx  { userId }
// DELETE /api/google-auth/permissions?familyId=xxx  { userId }
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';
import { prisma } from '../../src/_lib/prisma';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return;

  // Lấy familyId từ query HOẶC body (hỗ trợ cả GET và POST/DELETE)
  const familyId = (req.query?.familyId ??
    req.body?.familyId ??
    req.url?.split('familyId=')[1]?.split('&')[0]) as string; // fallback parse manual

  console.log(
    '[perms]',
    req.method,
    '| user:',
    user.id,
    '| familyId:',
    familyId,
  );

  if (!familyId) return res.status(400).json({ error: 'Thiếu familyId' });

  // Chỉ OWNER mới quản lý permissions
  const isOwner = await prisma.familyMember
    .findFirst({
      where: { familyId, userId: user.id, role: 'OWNER' },
    })
    .catch((e: any) => {
      throw new Error('familyMember query: ' + e.message);
    });

  if (!isOwner)
    return res
      .status(403)
      .json({ error: 'Chỉ OWNER mới được quản lý quyền Drive' });

  const driveAccount = await prisma.familyDriveAccount
    .findUnique({
      where: { familyId },
    })
    .catch((e: any) => {
      console.error('[perms] familyDriveAccount error:', e.message);
      // Trả 500 rõ ràng thay vì để throw
      res.status(500).json({ error: 'DB lỗi: ' + e.message });
      return null;
    });

  // Nếu res đã được gửi (do catch trên), dừng lại
  if (res.headersSent) return;

  console.log(
    '[perms] driveAccount:',
    driveAccount ? driveAccount.email : 'NONE',
  );

  // ── GET: trả về danh sách dù chưa có drive ────────────────
  if (req.method === 'GET') {
    if (!driveAccount) {
      // Không có drive → trả mảng rỗng, KHÔNG trả 404
      return res.json({ data: [] });
    }

    const [editors, perms] = await Promise.all([
      prisma.familyMember.findMany({
        where: { familyId, role: { in: ['EDITOR', 'OWNER'] } },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      prisma.familyDrivePermission.findMany({
        where: { driveAccountId: driveAccount.id },
        select: { userId: true },
      }),
    ]);

    const permSet = new Set(perms.map((p: any) => p.userId));
    return res.json({
      data: editors.map((e: any) => ({
        userId: e.user.id,
        name: e.user.name,
        email: e.user.email,
        avatarUrl: e.user.avatarUrl,
        role: e.role,
        hasAccess:
          e.user.id === driveAccount.connectedBy || permSet.has(e.user.id),
        isConnector: e.user.id === driveAccount.connectedBy,
      })),
    });
  }

  // POST / DELETE cần có drive account
  if (!driveAccount) {
    return res.status(400).json({
      error: 'Chưa kết nối Drive. Kết nối Drive trước rồi mới cấp quyền được.',
    });
  }

  // ── POST: cấp quyền ───────────────────────────────────────
  if (req.method === 'POST') {
    const targetUserId = req.body?.userId as string;
    console.log('[perms] POST grant to:', targetUserId);
    if (!targetUserId) return res.status(400).json({ error: 'Thiếu userId' });

    const isEditor = await prisma.familyMember.findFirst({
      where: {
        familyId,
        userId: targetUserId,
        role: { in: ['EDITOR', 'OWNER'] },
      },
    });
    if (!isEditor)
      return res
        .status(400)
        .json({ error: 'User không phải Editor/Owner của gia phả này' });

    await prisma.familyDrivePermission
      .upsert({
        where: {
          driveAccountId_userId: {
            driveAccountId: driveAccount.id,
            userId: targetUserId,
          },
        },
        update: {},
        create: {
          driveAccountId: driveAccount.id,
          userId: targetUserId,
          grantedBy: user.id,
        },
      })
      .catch((e: any) => {
        throw new Error('upsert permission: ' + e.message);
      });

    console.log('[perms] granted ok');
    return res.json({ ok: true });
  }

  // ── DELETE: thu hồi ───────────────────────────────────────
  if (req.method === 'DELETE') {
    const targetUserId = req.body?.userId as string;
    if (!targetUserId) return res.status(400).json({ error: 'Thiếu userId' });

    await prisma.familyDrivePermission.deleteMany({
      where: { driveAccountId: driveAccount.id, userId: targetUserId },
    });

    console.log('[perms] revoked ok');
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
