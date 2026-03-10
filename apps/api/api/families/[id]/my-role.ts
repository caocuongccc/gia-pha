// apps/api/api/families/[id]/my-role.ts
// GET /api/families/:id/my-role  — trả về role của user trong gia phả
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../src/_lib/prisma';
import { requireAuth } from '../../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id: familyId } = req.query as { id: string };

  const access = await prisma.familyMember.findFirst({
    where: { familyId, userId: user.id },
  });

  // Chưa join → upsert User trước, rồi mới join VIEWER
  if (!access) {
    // Đảm bảo user tồn tại trong bảng users
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email,
        name: user.name ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
      },
      create: {
        id: user.id,
        email: user.email,
        name: user.name ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
      },
    });

    await prisma.familyMember.create({
      data: { familyId, userId: user.id, role: 'VIEWER' },
    });
    return res.json({ data: { role: 'VIEWER', userId: user.id } });
  }

  return res.json({ data: { role: access.role, userId: user.id } });
}
