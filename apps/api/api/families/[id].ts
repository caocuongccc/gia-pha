// apps/api/api/families/[id].ts
// GET    /api/families/:id  — lấy thông tin gia phả
// PATCH  /api/families/:id  — cập nhật (isPublic, name, description, coverUrl...)
// DELETE /api/families/:id  — xoá gia phả (chỉ OWNER)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query as { id: string };

  // Kiểm tra user có thuộc gia phả này không
  const access = await prisma.familyMember.findFirst({
    where: { familyId: id, userId: user.id },
  });
  if (!access) {
    return res
      .status(403)
      .json({ error: 'Forbidden: not a member of this family' });
  }

  // ── GET /api/families/:id ────────────────────────────────────
  if (req.method === 'GET') {
    const family = await prisma.family.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!family)
      return res.status(404).json({ error: 'Không tìm thấy gia phả' });
    return res.json({ data: family });
  }

  // ── PATCH /api/families/:id ──────────────────────────────────
  // Chỉ OWNER hoặc ADMIN mới được sửa
  if (req.method === 'PATCH') {
    const isAdmin = access.role === 'OWNER' || access.role === 'EDITOR';
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: 'Forbidden: need OWNER or ADMIN role' });
    }

    const { name, description, coverUrl, isPublic } = req.body ?? {};

    const updated = await prisma.family.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
      },
    });

    return res.json({ data: updated });
  }

  // ── DELETE /api/families/:id ─────────────────────────────────
  // Chỉ OWNER mới được xoá
  if (req.method === 'DELETE') {
    if (access.role !== 'OWNER') {
      return res
        .status(403)
        .json({ error: 'Forbidden: only OWNER can delete' });
    }
    await prisma.family.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
