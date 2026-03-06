// ── FILE 4: api/phai/[id].ts ─────────────────────────────────
// PATCH /api/phai/:id
// DELETE /api/phai/:id

import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleOptions, setCorsHeaders } from '../../src/_lib/cors';
import { requireAuth } from '../../src/_lib/auth';
import { prisma } from '../../src/_lib/prisma';

// ────────────────────────────────────────────────────────────────
export async function phaiIdHandler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);
  const user = await requireAuth(req, res);
  if (!user) return;
  //   const { id } = req.query as { id: string };
  //   const id = (req.params?.id ?? req.query?.id) as string;
  const id = req.url?.split('/').pop()?.split('?')[0] as string;

  if (req.method === 'PATCH') {
    const data = await prisma.phai.update({ where: { id }, data: req.body });
    return res.json({ data });
  }

  if (req.method === 'DELETE') {
    await prisma.phai.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).end();
}

export default phaiIdHandler;
