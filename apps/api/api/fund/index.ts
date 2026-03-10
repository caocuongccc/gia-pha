// apps/api/api/fund/index.ts
// GET  /api/fund?familyId=  — danh sách (public nếu isPublic)
// POST /api/fund            — thêm mới (OWNER only)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const familyId =
    ((req.query['familyId'] ?? req.body?.familyId) as string) ?? '';
  if (!familyId) return res.status(400).json({ error: 'Thiếu familyId' });

  // ── GET ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const family = await prisma.family.findUnique({ where: { id: familyId } });
    if (!family)
      return res.status(404).json({ error: 'Không tìm thấy gia phả' });

    if (!family.isPublic) {
      const { requireAuth } = await import('../../src/_lib/auth');
      const user = await requireAuth(req, res);
      if (!user) return;
      const access = await prisma.familyMember.findFirst({
        where: { familyId, userId: user.id },
      });
      if (!access) return res.status(403).json({ error: 'Forbidden' });
    }

    const year = req.query['year'] ? Number(req.query['year']) : undefined;
    const type = req.query['type'] as string | undefined;

    const records = await prisma.fundRecord.findMany({
      where: {
        familyId,
        ...(year ? { year } : {}),
        ...(type ? { type: type as any } : {}),
      },
      include: { member: { select: { id: true, fullName: true } } },
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });

    // Tính tổng thu/chi
    const totalIn = records
      .filter((r) => r.type !== 'CHI')
      .reduce((s, r) => s + r.amount, 0);
    const totalOut = records
      .filter((r) => r.type === 'CHI')
      .reduce((s, r) => s + r.amount, 0);

    return res.json({
      data: records,
      summary: { totalIn, totalOut, balance: totalIn - totalOut },
    });
  }

  // ── POST — OWNER only ─────────────────────────────────────────
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
      type,
      year,
      eventName,
      contributorName,
      amount,
      description,
      recordedBy,
      memberId,
    } = req.body ?? {};
    if (!type || !year || amount === undefined)
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });

    const record = await prisma.fundRecord.create({
      data: {
        familyId,
        type,
        year: Number(year),
        eventName,
        contributorName,
        amount: Number(amount),
        description,
        recordedBy,
        memberId: memberId || null,
      },
    });
    return res.status(201).json({ data: record });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
