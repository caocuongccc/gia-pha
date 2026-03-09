// apps/api/api/families/[id]/tree.ts
// GET /api/families/:id/tree
//
// Trả về đủ data để frontend vẽ cây theo 2 trục:
//   - Huyết thống: dùng relationships PARENT + generation
//   - Tổ chức:     dùng chiId, phaiId, coupleGroupId

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from '../../../src/_lib/prisma';
import { requireAuth } from '../../../src/_lib/auth';
import { setCorsHeaders, handleOptions } from '../../../src/_lib/cors';
import type { Member, FamilyTreeNode } from '@gia-pha/shared-types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return handleOptions(req, res);

  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') return res.status(405).end();

  const { id: familyId } = req.query as { id: string };

  // 1. Lấy tất cả members
  const members = await prisma.member.findMany({
    where: { familyId },
    include: {
      chi: { select: { id: true, name: true } },
      phai: { select: { id: true, name: true } },
    },
    orderBy: [{ generation: 'asc' }, { childOrder: 'asc' }],
  });

  // 2. Lấy tất cả relationships
  const relationships = await prisma.relationship.findMany({
    where: {
      fromMember: { familyId },
    },
  });

  // 3. Lấy danh sách chi/phái
  const chiList = await prisma.chi.findMany({
    where: { familyId },
    include: {
      phaiList: { orderBy: { orderIndex: 'asc' } },
    },
    orderBy: { orderIndex: 'asc' },
  });

  // 4. Build FamilyTreeNode[] từ coupleGroupId
  //    Mỗi node = 1 ô gia đình trên cây
  const nodeMap = new Map<string, FamilyTreeNode>();

  for (const m of members) {
    if (!m.coupleGroupId) continue;

    if (!nodeMap.has(m.coupleGroupId)) {
      nodeMap.set(m.coupleGroupId, {
        coupleGroupId: m.coupleGroupId,
        husband: null,
        wives: [],
        children: [],
        generation: m.generation,
        chiId: m.chiId,
        phaiId: m.phaiId,
        parentGroupId: null,
      });
    }

    const node = nodeMap.get(m.coupleGroupId)!;

    if (m.isOutPerson) {
      // Vợ (người ngoại tộc lấy vào)
      node.wives.push(m as any);
    } else if (m.childOrder !== null && m.generation > node.generation) {
      // Con trong nhóm này
      node.children.push(m as any);
    } else {
      // Người đàn ông chính của nhóm
      node.husband = m as any;
      node.generation = m.generation;
      node.chiId = m.chiId;
      node.phaiId = m.phaiId;
    }
  }

  // 5. Gán parentGroupId: tìm coupleGroupId của cha
  //    Cha = fromMember trong relationship PARENT của husband
  const parentRels = relationships.filter((r) => r.type === 'PARENT');
  const memberById = new Map(members.map((m) => [m.id, m]));

  for (const [groupId, node] of nodeMap) {
    if (!node.husband) continue;

    // Tìm cha của husband
    const parentRel = parentRels.find((r) => r.toMemberId === node.husband!.id);
    if (!parentRel) continue;

    const father = memberById.get(parentRel.fromMemberId);
    if (father?.coupleGroupId) {
      node.parentGroupId = father.coupleGroupId;
    }
  }

  // 6. Members không có coupleGroupId — vẫn trả về để hiển thị
  const ungrouped = members.filter((m) => !m.coupleGroupId);

  return res.json({
    data: {
      // Trục huyết thống
      members,
      relationships,
      // Trục tổ chức
      chiList,
      // Ô gia đình cho D3
      treeNodes: Array.from(nodeMap.values()),
      ungrouped,
      // Stats
      stats: {
        totalMembers: members.length,
        totalGenerations: Math.max(...members.map((m) => m.generation), 0),
        chiCount: chiList.length,
        phaiCount: chiList.reduce((s, c) => s + c.phaiList.length, 0),
      },
    },
  });
}
