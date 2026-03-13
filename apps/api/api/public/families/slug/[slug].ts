// apps/api/api/public/families/slug/[slug].ts
// GET /api/public/families/slug/:slug  → tìm gia phả theo slug, trả public tree data
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../../src/_lib/prisma';
import { setCorsHeaders, handleOptions } from '../../../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' });

  const slug = (req.query.slug ?? req.query.id) as string;
  if (!slug) return res.status(400).json({ error: 'Thiếu slug' });

  const family = await prisma.family.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isPublic: true,
    },
  });

  if (!family)
    return res
      .status(404)
      .json({ error: 'Không tìm thấy gia phả với slug này' });
  if (!family.isPublic)
    return res.status(403).json({ error: 'Gia phả này không công khai' });

  // Trả familyId để frontend dùng load cây — reuse public tree logic
  return res.json({
    data: {
      familyId: family.id,
      name: family.name,
      slug: family.slug,
      description: family.description,
    },
  });
}
