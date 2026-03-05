// apps/api/src/_lib/rbac.ts

import { VercelRequest, VercelResponse } from '@vercel/node';
import { prisma } from './prisma';

export type FamilyRole = 'OWNER' | 'EDITOR' | 'VIEWER';

// Return type rõ ràng — không dùng object { status, error } nữa
// Thay vào đó: trả về role nếu pass, null nếu fail (đã tự write response)
export async function requireRole(
  req: VercelRequest,
  res: VercelResponse,
  familyId: string,
  userId: string,
  allowedRoles: FamilyRole[],
): Promise<FamilyRole | null> {
  const access = await prisma.familyMember.findUnique({
    where: { familyId_userId: { familyId, userId } },
  });

  if (!access) {
    res.status(403).json({ error: 'Không có quyền truy cập họ này' });
    return null;
  }

  if (!allowedRoles.includes(access.role as FamilyRole)) {
    res.status(403).json({ error: 'Không đủ quyền thực hiện thao tác này' });
    return null;
  }

  return access.role as FamilyRole;
}

// Helpers gọn hơn — dùng trực tiếp trong handler
export async function ownerOnly(
  req: VercelRequest,
  res: VercelResponse,
  familyId: string,
  userId: string,
) {
  return requireRole(req, res, familyId, userId, ['OWNER']);
}

export async function editorOrOwner(
  req: VercelRequest,
  res: VercelResponse,
  familyId: string,
  userId: string,
) {
  return requireRole(req, res, familyId, userId, ['OWNER', 'EDITOR']);
}

export async function anyMember(
  req: VercelRequest,
  res: VercelResponse,
  familyId: string,
  userId: string,
) {
  return requireRole(req, res, familyId, userId, ['OWNER', 'EDITOR', 'VIEWER']);
}

// Util: lấy role mà KHÔNG write response (dùng cho logic check)
export async function getUserRole(
  familyId: string,
  userId: string,
): Promise<FamilyRole | null> {
  const access = await prisma.familyMember.findUnique({
    where: { familyId_userId: { familyId, userId } },
  });
  return (access?.role as FamilyRole) ?? null;
}
