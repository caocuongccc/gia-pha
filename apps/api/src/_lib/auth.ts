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
    // Chi tiết lỗi để dễ debug
    const detail = error?.message ?? 'Unknown error';

    // Hint cho các lỗi thường gặp
    if (detail.includes('invalid claim') || detail.includes('Invalid JWT')) {
    }
    if (detail.includes('expired')) {
    }

    res.status(401).json({ error: 'Invalid token', detail });
    return null;
  }

  return data.user;
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
