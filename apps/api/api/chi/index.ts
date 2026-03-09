// ── FILE 1: api/chi/index.ts ─────────────────────────────────
// GET  /api/chi?familyId=xxx
// POST /api/chi
// ────────────────────────────────────────────────────────────────
import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export async function chiIndexHandler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { familyId } = req.query;
    if (!familyId) return res.status(400).json({ error: 'familyId required' });
    const data = await prisma.chi.findMany({
      where: { familyId: familyId as string },
      include: {
        phaiList: {
          orderBy: { orderIndex: 'asc' },
          include: { _count: { select: { members: true } } },
        },
        _count: { select: { members: true } },
      },
      orderBy: { orderIndex: 'asc' },
    });
    return res.json({ data });
  }

  if (req.method === 'POST') {
    const { familyId, name, description, founderNote, orderIndex } = req.body;
    if (!familyId || !name)
      return res.status(400).json({ error: 'familyId, name required' });
    const data = await prisma.chi.create({
      data: {
        familyId,
        name,
        description,
        founderNote,
        orderIndex: orderIndex ?? 0,
      },
    });
    return res.status(201).json({ data });
  }

  return res.status(405).end();
}

export default chiIndexHandler;
