// apps/api/api/relations/[id].ts
// DELETE /api/relations/:id

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const user = await requireAuth(req, res);
  if (!user) return;

  //   const { id } = req.query as { id: string };
  //   const id = (req.params?.id ?? req.query?.id) as string;
  const id = req.url?.split('/').pop()?.split('?')[0] as string;

  if (req.method === 'DELETE') {
    const rel = await prisma.relationship.findUnique({ where: { id } });
    if (!rel) return res.status(404).json({ error: 'Không tìm thấy quan hệ' });

    await prisma.relationship.delete({ where: { id } });
    return res.status(204).end();
  }

  return res.status(405).end();
}
