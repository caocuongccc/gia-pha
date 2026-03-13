// apps/api/api/families/index.ts
// GET  — danh sách gia phả (mọi user đăng nhập)
// POST — tạo gia phả mới (chỉ OWNER của ít nhất 1 gia phả, hoặc chưa có gia phả nào)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return;

  // ── GET /api/families ────────────────────────────────────────
  if (req.method === 'GET') {
    const families = await prisma.family.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    });

    // Auto-join VIEWER nếu chưa là thành viên
    for (const family of families) {
      const existing = await prisma.familyMember.findFirst({
        where: { familyId: family.id, userId: user.id },
      });
      if (!existing) {
        // Đảm bảo user tồn tại trước
        await prisma.user.upsert({
          where: { id: user.id },
          update: {
            email: user.email,
            name: user.name ?? undefined,
            avatarUrl: user.avatarUrl ?? undefined,
          },
          create: {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            avatarUrl: user.avatarUrl ?? undefined,
          },
        });
        await prisma.familyMember.create({
          data: { familyId: family.id, userId: user.id, role: 'VIEWER' },
        });
      }
    }

    // Kèm role của user vào mỗi family
    const myAccess = await prisma.familyMember.findMany({
      where: { userId: user.id },
    });
    const roleMap = new Map(myAccess.map((a) => [a.familyId, a.role]));

    return res.json({
      data: families.map((f) => ({
        ...f,
        myRole: roleMap.get(f.id) ?? 'VIEWER',
      })),
    });
  }

  // ── POST /api/families ───────────────────────────────────────
  // Chỉ user đã là OWNER của ít nhất 1 gia phả mới được tạo thêm
  // (hoặc sửa thẳng trong DB để set OWNER đầu tiên)
  if (req.method === 'POST') {
    const isOwnerSomewhere = await prisma.familyMember.findFirst({
      where: { userId: user.id, role: 'OWNER' },
    });
    if (!isOwnerSomewhere) {
      return res
        .status(403)
        .json({ error: 'Chỉ OWNER mới được tạo gia phả mới' });
    }

    const { name, description, slug: rawSlug } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'Thiếu tên gia phả' });

    // Validate + normalize slug
    let slug: string | null = null;
    if (rawSlug) {
      slug = rawSlug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-') // chỉ cho a-z, 0-9, dấu -
        .replace(/-+/g, '-') // gộp nhiều dấu - liên tiếp
        .replace(/^-|-$/g, ''); // bỏ dấu - đầu/cuối
      if (slug.length < 2)
        return res
          .status(400)
          .json({ error: 'Slug quá ngắn (tối thiểu 2 ký tự)' });
      // Check unique
      const existing = await prisma.family.findUnique({ where: { slug } });
      if (existing)
        return res
          .status(409)
          .json({ error: `Slug "${slug}" đã được dùng, hãy chọn tên khác` });
    }

    const family = await prisma.family.create({
      data: {
        name,
        slug: slug || null,
        description,
        ownerId: user.id,
        accessList: {
          create: { userId: user.id, role: 'OWNER' },
        },
      },
    });

    return res.status(201).json({ data: family });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
