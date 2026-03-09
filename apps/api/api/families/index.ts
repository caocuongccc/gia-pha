// apps/api/api/families/index.ts
// GET  /api/families  — danh sách gia phả (mọi user đăng nhập đều xem được)
// POST /api/families  — tạo gia phả mới (chỉ ADMIN)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

const ADMIN_EMAILS = ['caocuongccc@gmail.com']; // ← đổi email thực

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return;

  // ── GET /api/families ────────────────────────────────────────
  if (req.method === 'GET') {
    // Lấy tất cả gia phả
    const families = await prisma.family.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });

    // Auto-join VIEWER nếu user chưa là thành viên của gia phả nào
    const isAdmin = ADMIN_EMAILS.includes(user.email ?? '');
    if (!isAdmin) {
      for (const family of families) {
        const existing = await prisma.familyMember.findFirst({
          where: { familyId: family.id, userId: user.id },
        });
        if (!existing) {
          await prisma.familyMember.create({
            data: { familyId: family.id, userId: user.id, role: 'VIEWER' },
          });
        }
      }
    }

    return res.json({ data: families });
  }

  // ── POST /api/families ───────────────────────────────────────
  // Chỉ admin mới tạo được gia phả
  if (req.method === 'POST') {
    const isAdmin = ADMIN_EMAILS.includes(user.email ?? '');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Chỉ admin mới được tạo gia phả' });
    }

    const { name, description } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'Thiếu tên gia phả' });

    const family = await prisma.family.create({
      data: {
        name,
        description,
        members: {
          create: { userId: user.id, role: 'OWNER' },
        },
      },
    });

    return res.status(201).json({ data: family });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
