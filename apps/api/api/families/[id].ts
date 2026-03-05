import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../src/_lib/prisma';
import { requireAuth } from '../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(res);

  const user = await requireAuth(req, res);
  if (!user) return;
  const { id } = req.query as { id: string };

  if (req.method === 'GET') {
    const family = await prisma.family.findFirst({
      where: {
        id,
        OR: [
          { ownerId: user.id },
          { accessList: { some: { userId: user.id } } },
          { isPublic: true },
        ],
      },
      include: {
        members: { orderBy: { generation: 'asc' } },
        _count: { select: { members: true } },
      },
    });
    if (!family) return res.status(404).json({ error: 'Not found' });
    return res.json({ data: family });
  }

  if (req.method === 'PATCH') {
    const access = await prisma.familyMember.findFirst({
      where: { familyId: id, userId: user.id, role: 'OWNER' },
    });
    if (!access) return res.status(403).json({ error: 'Forbidden' });

    const { name, description, isPublic } = req.body;
    const updated = await prisma.family.update({
      where: { id },
      data: { name, description, isPublic },
    });
    return res.json({ data: updated });
  }

  if (req.method === 'DELETE') {
    const family = await prisma.family.findFirst({
      where: { id, ownerId: user.id },
    });
    if (!family) return res.status(403).json({ error: 'Forbidden' });

    await prisma.family.delete({ where: { id } }); // Cascade xóa members
    return res.status(204).end();
  }
}
