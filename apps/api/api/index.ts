import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../src/_lib/cors';

function injectParams(req: VercelRequest, segments: string[]) {
  const params: any = {};

  const idIndex = segments.findIndex(
    (s) =>
      s === 'families' ||
      s === 'members' ||
      s === 'relations' ||
      s === 'chi' ||
      s === 'phai',
  );

  if (idIndex >= 0 && segments[idIndex + 1]) {
    params.id = segments[idIndex + 1];
  }

  if (segments[idIndex + 2]) {
    params.action = segments[idIndex + 2];
  }

  req.query = {
    ...req.query,
    ...params,
  };
}

async function tryImport(path: string) {
  try {
    return await import(path);
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  const url = req.url ?? '';
  const path = url.replace(/\?.*$/, '');
  const segments = path.split('/').filter(Boolean);

  if (path === '/api/health') {
    return res.json({ ok: true, time: new Date() });
  }

  if (segments[0] !== 'api') {
    return res.status(404).json({ error: 'Invalid API path' });
  }

  const apiSegments = segments.slice(1);

  injectParams(req, apiSegments);

  // 1️⃣ try exact route
  let modulePath = './' + apiSegments.join('/');

  let mod = await tryImport(modulePath);

  // 2️⃣ try dynamic [id]
  if (!mod && apiSegments.length >= 2) {
    const dynamicSegments = [...apiSegments];
    dynamicSegments[1] = '[id]';

    modulePath = './' + dynamicSegments.join('/');
    mod = await tryImport(modulePath);
  }

  // 3️⃣ try nested dynamic
  if (!mod && apiSegments.length >= 3) {
    const dynamicSegments = [...apiSegments];
    dynamicSegments[1] = '[id]';

    modulePath = './' + dynamicSegments.slice(0, 2).join('/');
    mod = await tryImport(modulePath);
  }

  if (mod?.default) {
    return mod.default(req, res);
  }

  return res.status(404).json({
    error: 'Route not found',
    path,
  });
}
