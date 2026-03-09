    // apps/api/api/families/[id]/join.ts
// POST /api/families/:id/join  — user tự join gia phả với role VIEWER
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../src/_lib/prisma';
import { requireAuth } from '../../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id: familyId } = req.query as { id: string };

  // Kiểm tra gia phả tồn tại
  const family = await prisma.family.findUnique({ where: { id: familyId } });
  if (!family) return res.status(404).json({ error: 'Không tìm thấy gia phả' });

  // Nếu đã là thành viên → trả về role hiện tại
  const existing = await prisma.familyMember.findFirst({
    where: { familyId, userId: user.id },
  });
  if (existing) {
    return res.json({ data: { role: existing.role, alreadyMember: true } });
  }

  // Join với role VIEWER
  const member = await prisma.familyMember.create({
    data: { familyId, userId: user.id, role: 'VIEWER' },
  });

  return res.status(201).json({ data: { role: member.role } });
}