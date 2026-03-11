// apps/api/api/post/[id].ts
// GET    /api/post/:id
// PATCH  /api/post/:id  — OWNER/EDITOR hoặc chính tác giả
// DELETE /api/post/:id  — OWNER hoặc chính tác giả
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

  const post = await prisma.post.findUnique({
    where: { id },
    include: { photos: { orderBy: { order: 'asc' } } },
  });
  if (!post) return res.status(404).json({ error: 'Không tìm thấy bài' });

  const access = await prisma.familyMember.findFirst({
    where: { familyId: post.familyId, userId: user.id },
  });
  const isOwner = access?.role === 'OWNER';
  const isEditor = access?.role === 'EDITOR';
  const isAuthor = post.authorId === user.id;

  if (req.method === 'GET') {
    return res.json({ data: post });
  }

  if (req.method === 'PATCH') {
    if (!isOwner && !isEditor && !isAuthor)
      return res.status(403).json({ error: 'Không có quyền sửa' });

    const { title, content, photos } = req.body ?? {};

    const updated = await prisma.post.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(photos !== undefined && {
          photos: {
            deleteMany: {},
            create: photos.map((p: any, i: number) => ({
              url: p.url,
              caption: p.caption ?? null,
              order: i,
            })),
          },
        }),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        photos: { orderBy: { order: 'asc' } },
      },
    });
    return res.json({ data: updated });
  }

  if (req.method === 'DELETE') {
    if (!isOwner && !isAuthor)
      return res
        .status(403)
        .json({ error: 'Chỉ OWNER hoặc tác giả mới được xoá' });

    await prisma.post.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
