import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' });

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

  const action = Array.isArray(req.query.action)
    ? req.query.action[0]
    : req.query.action;

  if (!id) {
    return res.status(400).json({ error: 'Missing family id' });
  }

  try {
    const family = await prisma.family.findUnique({ where: { id } });

    if (!family)
      return res.status(404).json({ error: 'Không tìm thấy gia phả' });

    if (!family.isPublic)
      return res.status(403).json({ error: 'Gia phả này không công khai' });

    // /members
    if (action === 'members') {
      const members = await prisma.member.findMany({
        where: { familyId: id },
        include: {
          chi: { select: { id: true, name: true } },
          phai: { select: { id: true, name: true } },
        },
        orderBy: { generation: 'asc' },
      });

      return res.json({ data: members });
    }

    // /relations
    if (action === 'relations') {
      const relations = await prisma.relationship.findMany({
        where: {
          OR: [
            { fromMember: { familyId: id } },
            { toMember: { familyId: id } },
          ],
        },
      });

      return res.json({ data: relations });
    }

    return res.json({ data: family });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
