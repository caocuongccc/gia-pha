// apps/api/api/fund/[id].ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query as { id: string };
  const record = await prisma.fundRecord.findUnique({ where: { id } });
  if (!record) return res.status(404).json({ error: 'Không tìm thấy' });

  const access = await prisma.familyMember.findFirst({
    where: { familyId: record.familyId, userId: user.id, role: 'OWNER' },
  });
  if (!access) return res.status(403).json({ error: 'Chỉ OWNER' });

  if (req.method === 'PATCH') {
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
    const updated = await prisma.fundRecord.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(year !== undefined && { year: Number(year) }),
        ...(eventName !== undefined && { eventName }),
        ...(contributorName !== undefined && { contributorName }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(description !== undefined && { description }),
        ...(recordedBy !== undefined && { recordedBy }),
        ...(memberId !== undefined && { memberId: memberId || null }),
      },
    });
    return res.json({ data: updated });
  }

  if (req.method === 'DELETE') {
    await prisma.fundRecord.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
