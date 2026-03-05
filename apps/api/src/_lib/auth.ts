import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

/**
 * Xác thực JWT, trả về User nếu hợp lệ.
 * Nếu không hợp lệ, tự gửi 401 response và trả về null.
 */
export async function requireAuth(
  req: VercelRequest,
  res: VercelResponse,
): Promise<User | null> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return null;
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
  return user;
}

/** Kiểm tra user có quyền EDITOR hoặc OWNER trên family không */
export async function requireEditor(familyId: string, userId: string) {
  const { prisma } = await import('./prisma');
  return prisma.familyMember.findFirst({
    where: {
      familyId,
      userId,
      role: { in: ['OWNER', 'EDITOR'] },
    },
  });
}
