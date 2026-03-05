import { google } from 'googleapis';
import { Readable } from 'stream';

/** Khởi tạo OAuth2 client dùng chung */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!,
  );
}

/** Tạo URL để redirect user đến Google login */
export function getAuthUrl(): string {
  const oauth2 = createOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline', // Lấy refresh_token để dùng sau
    prompt: 'consent', // Luôn hỏi lại để lấy refresh_token
    scope: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  });
}

/**
 * Upload 1 file lên Google Drive của user.
 * @param accessToken  - OAuth2 access token của user
 * @param fileBuffer   - Buffer chứa dữ liệu file
 * @param filename     - Tên file
 * @param mimeType     - e.g. "image/jpeg"
 * @returns public URL để embed trực tiếp vào
 */
export async function uploadToDrive(
  accessToken: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const oauth2 = createOAuth2Client();
  oauth2.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2 });

  // Tìm hoặc tạo folder "Cây Gia Phả" trong Drive của user
  const folderId = await ensureFolder(drive);

  // Upload file
  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
      mimeType,
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: 'id, name, webViewLink, webContentLink',
  });

  const fileId = response.data.id!;

  // Set permission: "anyone with link can view" → dùng được như img src
  await drive.permissions.create({
    fileId,
    requestBody: { type: 'anyone', role: 'reader' },
  });

  // URL trực tiếp để nhúng vào thẻ
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

/** Tìm folder "Cây Gia Phả" trong Drive, tạo mới nếu chưa có */
async function ensureFolder(drive: any): Promise<string> {
  const FOLDER_NAME = 'Cây Gia Phả — Ảnh thành viên';

  const existing = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  if (existing.data.files?.length) return existing.data.files[0].id!;

  // Chưa có → tạo mới
  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });
  return folder.data.id!;
}
