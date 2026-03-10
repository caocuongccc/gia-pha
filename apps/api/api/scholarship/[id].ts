// apps/api/api/scholarship/[id].ts
// PATCH  /api/scholarship/:id — sửa (OWNER)
// DELETE /api/scholarship/:id — xoá (OWNER)
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
  const record = await prisma.scholarshipRecord.findUnique({ where: { id } });
  if (!record) return res.status(404).json({ error: 'Không tìm thấy' });

  const access = await prisma.familyMember.findFirst({
    where: { familyId: record.familyId, userId: user.id, role: 'OWNER' },
  });
  if (!access) return res.status(403).json({ error: 'Chỉ OWNER' });

  if (req.method === 'PATCH') {
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
    const updated = await prisma.scholarshipRecord.update({
      where: { id },
      data: {
        ...(studentName !== undefined && { studentName }),
        ...(year !== undefined && { year: Number(year) }),
        ...(school !== undefined && { school }),
        ...(grade !== undefined && { grade }),
        ...(achievement !== undefined && { achievement }),
        ...(rewardAmount !== undefined && {
          rewardAmount: rewardAmount ? Number(rewardAmount) : null,
        }),
        ...(awardedBy !== undefined && { awardedBy }),
        ...(notes !== undefined && { notes }),
        ...(memberId !== undefined && { memberId: memberId || null }),
      },
    });
    return res.json({ data: updated });
  }

  if (req.method === 'DELETE') {
    await prisma.scholarshipRecord.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
