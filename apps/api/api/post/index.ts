// apps/api/api/post/index.ts
// GET  /api/post?familyId=  — danh sách bài (MEMBER hoặc public nếu isPublic)
// POST /api/post             — tạo bài mới (OWNER hoặc EDITOR)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const familyId = (req.query['familyId'] ?? req.body?.familyId) as string;
  if (!familyId) return res.status(400).json({ error: 'Thiếu familyId' });

  // ── GET ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    // Cho phép public nếu gia phả isPublic
    const family = await prisma.family.findUnique({ where: { id: familyId } });
    if (!family)
      return res.status(404).json({ error: 'Không tìm thấy gia phả' });

    let authed = false;
    try {
      const user = await requireAuth(req, res, true); // silent
      if (user) {
        const access = await prisma.familyMember.findFirst({
          where: { familyId, userId: user.id },
        });
        if (access) authed = true;
      }
    } catch {}

    if (!family.isPublic && !authed) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const posts = await prisma.post.findMany({
      where: { familyId },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        photos: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ data: posts });
  }

  // ── POST ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;

    const access = await prisma.familyMember.findFirst({
      where: { familyId, userId: user.id },
    });
    if (!access || access.role === 'VIEWER')
      return res
        .status(403)
        .json({ error: 'Chỉ OWNER/EDITOR mới được đăng bài' });

    const { type, title, content, photos } = req.body ?? {};
    if (!type || !['TEXT', 'ALBUM'].includes(type))
      return res.status(400).json({ error: 'type phải là TEXT hoặc ALBUM' });

    // Upsert author
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

    const post = await prisma.post.create({
      data: {
        familyId,
        authorId: user.id,
        type,
        title: title ?? null,
        content: content ?? null,
        photos: photos?.length
          ? {
              create: photos.map((p: any, i: number) => ({
                url: p.url,
                caption: p.caption ?? null,
                order: i,
              })),
            }
          : undefined,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        photos: { orderBy: { order: 'asc' } },
      },
    });
    return res.status(201).json({ data: post });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
