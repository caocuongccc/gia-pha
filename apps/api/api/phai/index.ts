// ── FILE 3: api/phai/index.ts ────────────────────────────────
// POST /api/phai

import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCorsHeaders } from '../../src/_lib/cors';
import { requireAuth } from '../../src/_lib/auth';
import { prisma } from '../../src/_lib/prisma';

// ────────────────────────────────────────────────────────────────
export async function phaiIndexHandler(
  req: VercelRequest,
  res: VercelResponse,
) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'POST') {
    const { chiId, name, description, founderNote, orderIndex } = req.body;
    if (!chiId || !name)
      return res.status(400).json({ error: 'chiId, name required' });
    const data = await prisma.phai.create({
      data: {
        chiId,
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
export default phaiIndexHandler;
