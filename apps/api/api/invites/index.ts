import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { ownerOnly } from '../../src/_lib/rbac';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';
import { sendInviteEmail } from '../../src/_lib/email';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { familyId } = req.query;
    const ok = await ownerOnly(req, res, familyId as string, user.id);
    if (!ok) return;

    const invites = await prisma.inviteToken.findMany({
      where: {
        familyId: familyId as string,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ data: invites });
  }

  if (req.method === 'POST') {
    const { familyId, email, role = 'VIEWER' } = req.body;
    if (!familyId || !email)
      return res.status(400).json({ error: 'familyId, email required' });

    const ok = await ownerOnly(req, res, familyId, user.id);
    if (!ok) return;

    // Kiểm tra user đã là thành viên chưa
    const existing = await prisma.familyMember.findFirst({
      where: { familyId /* would need to resolve email to userId */ },
    });

    // Tạo token hết hạn sau 7 ngày
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await prisma.inviteToken.create({
      data: { familyId, email, role, invitedBy: user.id, expiresAt },
    });

    // Lấy tên gia phả để hiển thị trong email
    const family = await prisma.family.findUnique({ where: { id: familyId } });
    const inviteUrl = `${process.env.FRONTEND_URL}/invite/accept?token=${invite.token}`;

    await sendInviteEmail({
      to: email,
      inviterName: user.email!,
      familyName: family!.name,
      inviteUrl,
      role,
    });

    return res
      .status(201)
      .json({ data: { id: invite.id, email, role, expiresAt } });
  }
}
