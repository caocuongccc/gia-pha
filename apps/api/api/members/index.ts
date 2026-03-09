// apps/api/api/members/index.ts
// GET  /api/members?familyId=xxx[&generation=N][&chiId=xxx][&phaiId=xxx]
// POST /api/members

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return;

  // ── GET ──────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { familyId, generation, chiId, phaiId, coupleGroupId } = req.query;
    if (!familyId) return res.status(400).json({ error: 'familyId required' });

    const members = await prisma.member.findMany({
      where: {
        familyId: familyId as string,
        ...(generation && { generation: Number(generation) }),
        ...(chiId && { chiId: chiId as string }),
        ...(phaiId && { phaiId: phaiId as string }),
        ...(coupleGroupId && { coupleGroupId: coupleGroupId as string }),
      },
      include: {
        chi: { select: { id: true, name: true } },
        phai: { select: { id: true, name: true } },
      },
      orderBy: [
        { generation: 'asc' },
        { childOrder: 'asc' },
        { fullName: 'asc' },
      ],
    });

    return res.json({ data: members });
  }

  // ── POST ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      familyId,
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

    if (!familyId || !fullName || !gender) {
      return res
        .status(400)
        .json({ error: 'familyId, fullName, gender required' });
    }

    const member = await prisma.member.create({
      data: {
        familyId,
        fullName,
        gender,
        generation: generation ?? 1,
        birthDate: birthDate ? new Date(birthDate) : null,
        deathDate: deathDate ? new Date(deathDate) : null,
        photoUrl: photoUrl ?? null,
        biography: biography ?? null,
        alias: alias ?? null,
        childOrder: childOrder ? Number(childOrder) : null,
        burialPlace: burialPlace ?? null,
        isOutPerson: isOutPerson ?? false,
        deathYearAm: deathYearAm ?? null,
        coupleGroupId: coupleGroupId ?? null,
        chiId: chiId ?? null,
        phaiId: phaiId ?? null,
      },
      include: {
        chi: { select: { id: true, name: true } },
        phai: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json({ data: member });
  }

  return res.status(405).end();
}
