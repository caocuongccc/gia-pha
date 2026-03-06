// ── FILE 2: api/chi/[id].ts ──────────────────────────────────
// PATCH /api/chi/:id
// DELETE /api/chi/:id

import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCorsHeaders } from '../../src/_lib/cors';
import { requireAuth } from '../../src/_lib/auth';
import { prisma } from '../../src/_lib/prisma';

// ────────────────────────────────────────────────────────────────
export async function chiIdandler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  const user = await requireAuth(req, res);
  if (!user) return;
  //   const { id } = req.query as { id: string };
  //   const id = (req.params?.id ?? req.query?.id) as string;
  const id = req.url?.split('/').pop()?.split('?')[0] as string;

  if (req.method === 'PATCH') {
    const data = await prisma.chi.update({
      where: { id },
      data: req.body,
    });
    return res.json({ data });
  }

  if (req.method === 'DELETE') {
    await prisma.chi.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).end();
}

export default chiIdandler;
