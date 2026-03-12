// apps/api/src/_lib/google-oauth.ts
import { google } from 'googleapis';
import { prisma } from './prisma';

const CALLBACK_URL =
  process.env.NODE_ENV === 'production'
    ? `${process.env.FRONTEND_URL}/api/google-auth/callback`
    : 'http://localhost:3000/api/google-auth/callback';

export function getOAuth2Client(overrideRedirect?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    overrideRedirect ?? CALLBACK_URL,
  );
}

// ── Step 1: Tạo URL để OWNER mở popup kết nối ─────────────────
// state = familyId:userId  (để biết gia phả nào + ai đang kết nối)
export function getGoogleAuthUrl(familyId: string, userId: string): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // luôn lấy refresh_token mới
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'openid',
      'email',
      'profile',
    ],
    state: `${familyId}:${userId}`,
  });
}

// ── Step 2: Exchange code → lưu vào FamilyDriveAccount ────────
export async function exchangeCodeAndSaveFamilyDrive(
  familyId: string,
  userId: string,
  code: string,
): Promise<void> {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);

  // Lấy email của Google account vừa kết nối
  oauth2.setCredentials(tokens);
  const oauth2api = google.oauth2({ version: 'v2', auth: oauth2 });
  const { data: profile } = await oauth2api.userinfo.get();

  await prisma.familyDriveAccount.upsert({
    where: { familyId },
    update: {
      connectedBy: userId,
      email: profile.email ?? '',
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    create: {
      familyId,
      connectedBy: userId,
      email: profile.email ?? '',
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token ?? undefined,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });
}

// ── Step 3: Lấy Drive client từ FamilyDriveAccount ────────────
export async function getFamilyDriveClient(familyId: string) {
  const account = await prisma.familyDriveAccount.findUnique({
    where: { familyId },
  });

  if (!account?.accessToken) {
    throw new Error(
      'Gia phả này chưa kết nối Google Drive. OWNER cần vào Cài đặt → Kết nối Drive.',
    );
  }

  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken ?? undefined,
    expiry_date: account.tokenExpiry?.getTime() ?? undefined,
  });

  // Auto-lưu lại token mới khi refresh
  oauth2.on('tokens', async (newTokens) => {
    await prisma.familyDriveAccount.update({
      where: { familyId },
      data: {
        accessToken: newTokens.access_token ?? account.accessToken,
        tokenExpiry: newTokens.expiry_date
          ? new Date(newTokens.expiry_date)
          : undefined,
      },
    });
  });

  return google.drive({ version: 'v3', auth: oauth2 });
}

// ── Kiểm tra user có quyền upload vào Family Drive không ──────
export async function canUserUploadToDrive(
  familyId: string,
  userId: string,
): Promise<boolean> {
  const account = await prisma.familyDriveAccount.findUnique({
    where: { familyId },
    select: { connectedBy: true, permissions: { select: { userId: true } } },
  });
  if (!account) return false;
  // Người kết nối luôn có quyền
  if (account.connectedBy === userId) return true;
  // Hoặc editor được cấp quyền
  return account.permissions.some((p) => p.userId === userId);
}
