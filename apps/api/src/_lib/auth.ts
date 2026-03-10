// apps/api/src/_lib/auth.ts
// ⚠️  KHÔNG tạo supabase client ở top-level
//     Phải lazy init sau khi dotenv đã load

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Lazy singleton — chỉ tạo khi gọi lần đầu
let _client: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env['SUPABASE_URL'] ?? '';
  const key =
    process.env['SUPABASE_SERVICE_KEY'] ?? // tên chuẩn
    process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? // tên thay thế
    '';

  _client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return _client;
}

export async function requireAuth(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    res.status(401).json({ error: 'Missing Authorization header' });
    return null;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid token', detail: error?.message });
    return null;
  }

  const supaUser = data.user;

  // ── Auto upsert vào bảng users ───────────────────────────────
  // Lấy email từ nhiều chỗ (Google OAuth để trong user_metadata)
  const email =
    supaUser.email ??
    supaUser.user_metadata?.['email'] ??
    supaUser.user_metadata?.['email_verified'] ??
    '';

  const name =
    supaUser.user_metadata?.['full_name'] ??
    supaUser.user_metadata?.['name'] ??
    supaUser.user_metadata?.['display_name'] ??
    email.split('@')[0] ??
    '';

  const avatarUrl =
    supaUser.user_metadata?.['avatar_url'] ??
    supaUser.user_metadata?.['picture'] ??
    null;

  if (email) {
    try {
      const { prisma } = await import('./prisma');
      await prisma.user.upsert({
        where: { id: supaUser.id },
        update: { email, name, avatarUrl },
        create: { id: supaUser.id, email, name, avatarUrl },
      });
    } catch (e) {
      // Không block request nếu upsert lỗi
      console.error('[auth] upsert user failed:', e);
    }
  }

  // Trả về user với email đã resolve
  return { ...supaUser, email };
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
