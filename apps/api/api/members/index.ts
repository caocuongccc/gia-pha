import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth, requireEditor } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { familyId, search, generation } = req.query;
    if (!familyId) return res.status(400).json({ error: 'familyId required' });

    const members = await prisma.member.findMany({
      where: {
        familyId: familyId as string,
        // Full-text search trên tên
        ...(search && {
          fullName: { contains: search as string, mode: 'insensitive' },
        }),
        ...(generation && { generation: Number(generation) }),
      },
      orderBy: [{ generation: 'asc' }, { fullName: 'asc' }],
    });
    return res.json({ data: members });
  }

  if (req.method === 'POST') {
    const {
      familyId,
      fullName,
      gender,
      birthDate,
      deathDate,
      generation = 1,
      biography,
    } = req.body;
    if (!familyId || !fullName || !gender)
      return res
        .status(400)
        .json({ error: 'familyId, fullName, gender required' });

    const canEdit = await requireEditor(familyId, user.id);
    if (!canEdit) return res.status(403).json({ error: 'Forbidden' });

    const member = await prisma.member.create({
      data: {
        familyId,
        fullName,
        gender,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        deathDate: deathDate ? new Date(deathDate) : undefined,
        generation: Number(generation),
        biography,
      },
    });
    return res.status(201).json({ data: member });
  }

  res.status(405).end();
}
