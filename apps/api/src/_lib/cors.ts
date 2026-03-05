import { VercelResponse } from '@vercel/node';

export function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PATCH,DELETE,OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function handleOptions(res: VercelResponse) {
  setCorsHeaders(res);
  res.status(204).end();
}
