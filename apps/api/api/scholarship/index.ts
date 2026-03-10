// apps/api/api/scholarship/index.ts
// GET  /api/scholarship?familyId=  — danh sách (public nếu family isPublic)
// POST /api/scholarship            — thêm mới (OWNER only)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const familyId =
    ((req.query['familyId'] ?? req.body?.familyId) as string) ?? '';
  if (!familyId) return res.status(400).json({ error: 'Thiếu familyId' });

  // ── GET — public nếu family isPublic, else cần auth ──────────
  if (req.method === 'GET') {
    const family = await prisma.family.findUnique({ where: { id: familyId } });
    if (!family)
      return res.status(404).json({ error: 'Không tìm thấy gia phả' });

    if (!family.isPublic) {
      // Kiểm tra auth
      const { requireAuth } = await import('../../src/_lib/auth');
      const user = await requireAuth(req, res);
      if (!user) return;
      const access = await prisma.familyMember.findFirst({
        where: { familyId, userId: user.id },
      });
      if (!access) return res.status(403).json({ error: 'Forbidden' });
    }

    const year = req.query['year'] ? Number(req.query['year']) : undefined;
    const records = await prisma.scholarshipRecord.findMany({
      where: { familyId, ...(year ? { year } : {}) },
      include: {
        member: { select: { id: true, fullName: true, generation: true } },
      },
      orderBy: [{ year: 'desc' }, { achievement: 'asc' }],
    });
    return res.json({ data: records });
  }

  // ── POST — chỉ OWNER ─────────────────────────────────────────
  if (req.method === 'POST') {
    const { requireAuth } = await import('../../src/_lib/auth');
    const user = await requireAuth(req, res);
    if (!user) return;

    const access = await prisma.familyMember.findFirst({
      where: { familyId, userId: user.id, role: 'OWNER' },
    });
    if (!access)
      return res.status(403).json({ error: 'Chỉ OWNER mới được thêm' });

    const {
      studentName,
      year,
      school,
      grade,
      achievement,
      rewardAmount,
      awardedBy,
      notes,
      memberId,
    } = req.body ?? {};
    if (!studentName || !year || !achievement)
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });

    const record = await prisma.scholarshipRecord.create({
      data: {
        familyId,
        studentName,
        year: Number(year),
        school,
        grade,
        achievement,
        rewardAmount: rewardAmount ? Number(rewardAmount) : null,
        awardedBy,
        notes,
        memberId: memberId || null,
      },
    });
    return res.status(201).json({ data: record });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
