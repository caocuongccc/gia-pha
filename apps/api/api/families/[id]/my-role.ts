// apps/api/api/families/[id]/my-role.ts
// GET /api/families/:id/my-role  — trả về role của user đang đăng nhập
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../src/_lib/prisma';
import { requireAuth } from '../../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../../src/_lib/cors';

// Email admin cứng — đổi thành email thực của bạn
const ADMIN_EMAILS = ['your-admin@email.com'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' });

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id: familyId } = req.query as { id: string };

  // Super admin → luôn là OWNER
  if (ADMIN_EMAILS.includes(user.email ?? '')) {
    return res.json({ data: { role: 'OWNER', isAdmin: true } });
  }

  const access = await prisma.familyMember.findFirst({
    where: { familyId, userId: user.id },
  });

  if (!access) {
    return res.json({ data: { role: null } }); // chưa join
  }

  return res.json({ data: { role: access.role } });
}
