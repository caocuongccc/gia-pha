// apps/api/api/families/[id]/access.ts
// GET   /api/families/:id/access  — danh sách user + role (OWNER only)
// PATCH /api/families/:id/access  — đổi role user (OWNER only)
// DELETE /api/families/:id/access?userId= — xoá user khỏi gia phả (OWNER only)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../src/_lib/prisma';
import { requireAuth } from '../../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id: familyId } = req.query as { id: string };

  // Chỉ OWNER mới được quản lý
  const myAccess = await prisma.familyMember.findFirst({
    where: { familyId, userId: user.id, role: 'OWNER' },
  });
  if (!myAccess)
    return res
      .status(403)
      .json({ error: 'Chỉ OWNER mới được quản lý thành viên' });

  // ── GET — danh sách user + role ──────────────────────────────
  if (req.method === 'GET') {
    const [accessList, family] = await Promise.all([
      prisma.familyMember.findMany({
        where: { familyId },
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { joinedAt: 'asc' },
      }),
      prisma.family.findUnique({
        where: { id: familyId },
        select: { name: true },
      }),
    ]);
    return res.json({
      data: accessList,
      myUserId: user.id,
      familyName: family?.name ?? '',
    });
  }

  // ── PATCH — đổi role ─────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { userId, role } = req.body ?? {};
    if (!userId || !role)
      return res.status(400).json({ error: 'Thiếu userId hoặc role' });
    if (!['OWNER', 'EDITOR', 'VIEWER'].includes(role))
      return res.status(400).json({ error: 'Role không hợp lệ' });
    // Không tự hạ mình
    if (userId === user.id)
      return res.status(400).json({ error: 'Không thể tự đổi role của mình' });

    const updated = await prisma.familyMember.updateMany({
      where: { familyId, userId },
      data: { role },
    });
    if (updated.count === 0)
      return res
        .status(404)
        .json({ error: 'Không tìm thấy user trong gia phả' });
    return res.json({ ok: true });
  }

  // ── DELETE — xoá user khỏi gia phả ──────────────────────────
  if (req.method === 'DELETE') {
    const userId = req.query['userId'] as string;
    if (!userId) return res.status(400).json({ error: 'Thiếu userId' });
    if (userId === user.id)
      return res.status(400).json({ error: 'Không thể tự xoá mình' });

    await prisma.familyMember.deleteMany({ where: { familyId, userId } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
