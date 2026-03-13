// apps/api/api/public/families/[id].ts
// GET /api/public/families/:id           → thông tin family (public)
// GET /api/public/families/:id/members   → danh sách thành viên
// GET /api/public/families/:id/relations → danh sách quan hệ
// Không cần auth — public route
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../src/_lib/prisma';
import { setCorsHeaders, handleOptions } from '../../../src/_lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ─────────────────────────────────────────────────────
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' });

  const { id, action } = req.query as { id: string; action?: string };
  if (!id) return res.status(400).json({ error: 'Thiếu id' });

  // ── Kiểm tra family tồn tại và public ────────────────────────
  let family: any;
  try {
    family = await prisma.family.findUnique({ where: { id } });
  } catch (e: any) {
    console.error(
      '[public/families] prisma.family.findUnique error:',
      e.message,
    );
    return res.status(500).json({ error: 'DB error: ' + e.message });
  }

  if (!family) return res.status(404).json({ error: 'Không tìm thấy gia phả' });
  if (!family.isPublic)
    return res.status(403).json({ error: 'Gia phả này không công khai' });

  // ── /members ─────────────────────────────────────────────────
  if (action === 'members') {
    try {
      const members = await prisma.member.findMany({
        where: { familyId: id },
        include: {
          chi: { select: { id: true, name: true } },
          phai: { select: { id: true, name: true } },
        },
        orderBy: { generation: 'asc' },
      });
      return res.json({ data: members });
    } catch (e: any) {
      console.error('[public/families] members error:', e.message);
      return res
        .status(500)
        .json({ error: 'DB error (members): ' + e.message });
    }
  }

  // ── /relations ───────────────────────────────────────────────
  if (action === 'relations') {
    try {
      const relations = await prisma.relationship.findMany({
        where: { fromMember: { familyId: id } },
      });
      return res.json({ data: relations });
    } catch (e: any) {
      console.error('[public/families] relations error:', e.message);
      return res
        .status(500)
        .json({ error: 'DB error (relations): ' + e.message });
    }
  }

  // ── GET family info (no action) ──────────────────────────────
  return res.json({ data: family });
}
