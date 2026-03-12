// apps/api/src/_lib/google-drive.ts
import { Readable } from 'stream';
import { getFamilyDriveClient } from './google-oauth';
import { prisma } from './prisma';

const ROOT_FOLDER = process.env.GOOGLE_DRIVE_FOLDER_NAME || 'GiaPha';

async function getOrCreateFolder(
  drive: Awaited<ReturnType<typeof getFamilyDriveClient>>,
  name: string,
  parentId: string,
): Promise<string> {
  const res = await drive.files.list({
    q: `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id)',
  });
  if (res.data.files?.length) return res.data.files[0].id!;

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  return folder.data.id!;
}

async function getFamilyRootFolder(
  familyId: string,
): Promise<{ drive: any; folderId: string }> {
  const drive = await getFamilyDriveClient(familyId);

  // Kiểm tra folder đã cache chưa
  const account = await prisma.familyDriveAccount.findUnique({
    where: { familyId },
    select: { folderId: true },
  });

  if (account?.folderId) return { drive, folderId: account.folderId };

  // Tìm hoặc tạo root folder "GiaPha"
  const rootRes = await drive.files.list({
    q: `name='${ROOT_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
  });

  let rootId: string;
  if (rootRes.data.files?.length) {
    rootId = rootRes.data.files[0].id!;
  } else {
    const f = await drive.files.create({
      requestBody: {
        name: ROOT_FOLDER,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });
    rootId = f.data.id!;
  }

  // Cache folderId
  await prisma.familyDriveAccount.update({
    where: { familyId },
    data: { folderId: rootId },
  });

  return { drive, folderId: rootId };
}

export async function uploadFileToDrive(
  familyId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string,
  subFolder: string, // e.g. postId hoặc 'album-xxx'
): Promise<{ fileId: string; url: string }> {
  const { drive, folderId: rootId } = await getFamilyRootFolder(familyId);

  // Subfolder theo postId để dễ manage
  const subId = await getOrCreateFolder(drive, subFolder, rootId);

  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);

  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [subId] },
    media: { mimeType, body: readable },
    fields: 'id',
  });

  const fileId = res.data.id!;

  // Public read để hiển thị ảnh
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  // URL thumbnail — không cần auth để xem
  const url = `https://lh3.googleusercontent.com/d/${fileId}`;
  return { fileId, url };
}

export function getThumbnailUrl(fileId: string, size = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}
