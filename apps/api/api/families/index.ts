import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return; // 401 đã được gửi bởi requireAuth

  // ── GET: Lấy danh sách gia phả user có quyền truy cập ──
  if (req.method === 'GET') {
    const families = await prisma.family.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { accessList: { some: { userId: user.id } } },
        ],
      },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ data: families });
  }

  // ── POST: Tạo gia phả mới ──
  if (req.method === 'POST') {
    const { name, description, isPublic = false } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    // Transaction: tạo family + gắn owner vào FamilyMember cùng lúc
    const family = await prisma.$transaction(async (tx) => {
      const f = await tx.family.create({
        data: { name, description, isPublic, ownerId: user.id },
      });
      await tx.familyMember.create({
        data: { familyId: f.id, userId: user.id, role: 'OWNER' },
      });
      return f;
    });
    return res.status(201).json({ data: family });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
