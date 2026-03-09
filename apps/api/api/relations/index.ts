// ================================================================
// apps/api/api/relations/index.ts
// GET  /api/relations?familyId=xxx
// POST /api/relations
// ================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return;

  // ── GET ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { familyId } = req.query;
    if (!familyId) return res.status(400).json({ error: 'familyId required' });

    const relations = await prisma.relationship.findMany({
      where: {
        fromMember: { familyId: familyId as string },
      },
      include: {
        fromMember: {
          select: { id: true, fullName: true, gender: true, generation: true },
        },
        toMember: {
          select: { id: true, fullName: true, gender: true, generation: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ data: relations });
  }

  // ── POST ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { fromMemberId, toMemberId, type, marriageDate } = req.body;

    if (!fromMemberId || !toMemberId || !type) {
      return res
        .status(400)
        .json({ error: 'fromMemberId, toMemberId, type required' });
    }

    // Kiểm tra 2 member có cùng family không
    const [from, to] = await Promise.all([
      prisma.member.findUnique({
        where: { id: fromMemberId },
        select: { familyId: true },
      }),
      prisma.member.findUnique({
        where: { id: toMemberId },
        select: { familyId: true },
      }),
    ]);

    if (!from || !to) {
      return res.status(404).json({ error: 'Member không tồn tại' });
    }
    if (from.familyId !== to.familyId) {
      return res
        .status(400)
        .json({ error: 'Hai thành viên phải cùng gia phả' });
    }
    if (fromMemberId === toMemberId) {
      return res
        .status(400)
        .json({ error: 'Không thể tạo quan hệ với chính mình' });
    }

    const relation = await prisma.relationship.create({
      data: {
        fromMemberId,
        toMemberId,
        type,
        marriageDate: marriageDate ? new Date(marriageDate) : null,
      },
      include: {
        fromMember: {
          select: { id: true, fullName: true, gender: true, generation: true },
        },
        toMember: {
          select: { id: true, fullName: true, gender: true, generation: true },
        },
      },
    });

    return res.status(201).json({ data: relation });
  }

  return res.status(405).end();
}
