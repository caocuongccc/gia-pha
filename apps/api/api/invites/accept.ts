import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (req.method !== 'POST') return res.status(405).end();

  const user = await requireAuth(req, res);
  if (!user) return;

  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'token required' });

  // Tìm và validate token
  const invite = await prisma.inviteToken.findUnique({ where: { token } });

  if (!invite) return res.status(404).json({ error: 'Invite not found' });
  if (invite.usedAt)
    return res.status(410).json({ error: 'Invite already used' });
  if (invite.expiresAt < new Date())
    return res.status(410).json({ error: 'Invite expired' });

  // Transaction: đánh dấu đã dùng + tạo FamilyMember
  const membership = await prisma.$transaction(async (tx) => {
    await tx.inviteToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });
    return tx.familyMember.upsert({
      where: {
        familyId_userId: { familyId: invite.familyId, userId: user.id },
      },
      create: { familyId: invite.familyId, userId: user.id, role: invite.role },
      update: { role: invite.role }, // Nếu đã là member, update role
    });
  });

  return res.json({
    data: { familyId: membership.familyId, role: membership.role },
  });
}
