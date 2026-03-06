// apps/api/api/members/[id].ts
// GET    /api/members/:id
// PATCH  /api/members/:id
// DELETE /api/members/:id

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.query as { id: string };

  // ── GET ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        chi: { select: { id: true, name: true } },
        phai: { select: { id: true, name: true } },
        fromRelations: {
          include: {
            toMember: {
              select: {
                id: true,
                fullName: true,
                gender: true,
                generation: true,
              },
            },
          },
        },
        toRelations: {
          include: {
            fromMember: {
              select: {
                id: true,
                fullName: true,
                gender: true,
                generation: true,
              },
            },
          },
        },
      },
    });

    if (!member) return res.status(404).json({ error: 'Not found' });
    return res.json({ data: member });
  }

  // ── PATCH ────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) return res.status(404).json({ error: 'Not found' });

    const {
      fullName,
      gender,
      generation,
      birthDate,
      deathDate,
      photoUrl,
      biography,
      alias,
      childOrder,
      burialPlace,
      isOutPerson,
      deathYearAm,
      coupleGroupId,
      chiId,
      phaiId,
    } = req.body;

    const updated = await prisma.member.update({
      where: { id },
      data: {
        ...(fullName !== undefined && { fullName }),
        ...(gender !== undefined && { gender }),
        ...(generation !== undefined && { generation: Number(generation) }),
        ...(biography !== undefined && { biography }),
        ...(photoUrl !== undefined && { photoUrl }),
        ...(alias !== undefined && { alias }),
        ...(childOrder !== undefined && {
          childOrder: childOrder ? Number(childOrder) : null,
        }),
        ...(burialPlace !== undefined && { burialPlace }),
        ...(isOutPerson !== undefined && { isOutPerson }),
        ...(deathYearAm !== undefined && { deathYearAm }),
        ...(coupleGroupId !== undefined && {
          coupleGroupId: coupleGroupId || null,
        }),
        ...(chiId !== undefined && { chiId: chiId || null }),
        ...(phaiId !== undefined && { phaiId: phaiId || null }),
        ...(birthDate !== undefined && {
          birthDate: birthDate ? new Date(birthDate) : null,
        }),
        ...(deathDate !== undefined && {
          deathDate: deathDate ? new Date(deathDate) : null,
        }),
      },
      include: {
        chi: { select: { id: true, name: true } },
        phai: { select: { id: true, name: true } },
      },
    });

    return res.json({ data: updated });
  }

  // ── DELETE ───────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) return res.status(404).json({ error: 'Not found' });

    // Xoá relationships trước (tránh FK constraint)
    await prisma.relationship.deleteMany({
      where: { OR: [{ fromMemberId: id }, { toMemberId: id }] },
    });
    await prisma.member.delete({ where: { id } });

    return res.status(204).end();
  }

  return res.status(405).end();
}
