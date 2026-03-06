// apps/api/api/public/families/[id].ts  →  /api/public/families/:id
// KHÔNG cần Bearer token — trả về gia phả nếu isPublic = true
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

  const { id } = req.query as { id: string };
  const segment = req.url?.split('/').slice(-1)[0]; // members | relations | (empty)

  try {
    // 1. Kiểm tra gia phả có isPublic = true không
    const family = await prisma.family.findUnique({ where: { id } });
    if (!family)
      return res.status(404).json({ error: 'Không tìm thấy gia phả' });
    if (!family.isPublic)
      return res.status(403).json({ error: 'Gia phả này không công khai' });

    // 2. Trả về dữ liệu theo segment
    if (segment === 'members') {
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

    if (segment === 'relations') {
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

    // Default: trả về thông tin family
    return res.json({ data: family });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
}
