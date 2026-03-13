// apps/api/api/families/[id].ts
// GET    /api/families/:id  — mọi member đều xem được
// PATCH  /api/families/:id  — chỉ OWNER
// DELETE /api/families/:id  — chỉ OWNER
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

  const access = await prisma.familyMember.findFirst({
    where: { familyId: id, userId: user.id },
  });
  if (!access) {
    return res
      .status(403)
      .json({ error: 'Forbidden: not a member of this family' });
  }

  const isOwner = access.role === 'OWNER';

  // ── GET ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const family = await prisma.family.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!family)
      return res.status(404).json({ error: 'Không tìm thấy gia phả' });
    // Trả về cả role để frontend biết quyền
    return res.json({ data: { ...family, myRole: access.role } });
  }

  // ── PATCH ─────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    if (!isOwner)
      return res.status(403).json({ error: 'Chỉ OWNER mới được sửa' });
    const {
      name,
      description,
      coverUrl,
      isPublic,
      slug: rawSlug,
    } = req.body ?? {};

    // Validate slug nếu có update
    let slugUpdate: string | null | undefined = undefined;
    if (rawSlug !== undefined) {
      if (rawSlug === null || rawSlug === '') {
        slugUpdate = null; // xoá slug
      } else {
        const slug = rawSlug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        if (slug.length < 2)
          return res.status(400).json({ error: 'Slug quá ngắn' });
        const conflict = await prisma.family.findFirst({
          where: { slug, NOT: { id: id } },
        });
        if (conflict)
          return res.status(409).json({ error: `Slug "${slug}" đã được dùng` });
        slugUpdate = slug;
      }
    }
    const updated = await prisma.family.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
      },
    });
    return res.json({ data: updated });
  }

  // ── DELETE ────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!isOwner)
      return res.status(403).json({ error: 'Chỉ OWNER mới được xoá' });
    await prisma.family.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
