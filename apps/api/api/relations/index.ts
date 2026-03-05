import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth, requireEditor } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { familyId } = req.query;
    if (!familyId) return res.status(400).json({ error: 'familyId required' });
    // Lấy tất cả relations của members trong family này
    const relations = await prisma.relationship.findMany({
      where: {
        fromMember: { familyId: familyId as string },
      },
      include: {
        fromMember: { select: { id: true, fullName: true } },
        toMember: { select: { id: true, fullName: true } },
      },
    });
    return res.json({ data: relations });
  }

  if (req.method === 'POST') {
    const { fromMemberId, toMemberId, type, marriageDate } = req.body;

    // Lấy family của member để check quyền
    const member = await prisma.member.findUnique({
      where: { id: fromMemberId },
    });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const canEdit = await requireEditor(member.familyId, user.id);
    if (!canEdit) return res.status(403).json({ error: 'Forbidden' });

    // Guard: không cho tự liên kết với chính mình
    if (fromMemberId === toMemberId)
      return res.status(400).json({ error: 'Cannot relate member to itself' });

    try {
      const relation = await prisma.relationship.create({
        data: {
          fromMemberId,
          toMemberId,
          type,
          marriageDate: marriageDate ? new Date(marriageDate) : undefined,
        },
      });
      return res.status(201).json({ data: relation });
    } catch (e: any) {
      // Prisma unique constraint error (P2002)
      if (e.code === 'P2002')
        return res.status(409).json({ error: 'Relation already exists' });
      throw e;
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await prisma.relationship.delete({ where: { id: id as string } });
    return res.status(204).end();
  }
}
