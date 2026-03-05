// apps/api/src/_helpers/response.ts

import type { VercelResponse } from '@vercel/node';

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export function ok<T>(res: VercelResponse, data: T, message?: string) {
  return res.status(200).json({ data, message } satisfies ApiResponse<T>);
}

export function created<T>(res: VercelResponse, data: T) {
  return res.status(201).json({ data } satisfies ApiResponse<T>);
}

export function noContent(res: VercelResponse) {
  return res.status(204).end();
}

export function badRequest(res: VercelResponse, error: string) {
  return res.status(400).json({ error } satisfies ApiResponse<never>);
}

export function unauthorized(res: VercelResponse, error = 'Unauthorized') {
  return res.status(401).json({ error } satisfies ApiResponse<never>);
}

export function forbidden(res: VercelResponse, error = 'Forbidden') {
  return res.status(403).json({ error } satisfies ApiResponse<never>);
}

export function notFound(res: VercelResponse, error = 'Not found') {
  return res.status(404).json({ error } satisfies ApiResponse<never>);
}

export function conflict(res: VercelResponse, error: string) {
  return res.status(409).json({ error } satisfies ApiResponse<never>);
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ error: 'Method Not Allowed' });
}

export function serverError(res: VercelResponse, err: unknown) {
  console.error('[serverError]', err);

  // Prisma errors
  const code = (err as any)?.code;
  if (code === 'P2002') return conflict(res, 'Duplicate entry');
  if (code === 'P2025') return notFound(res, 'Record not found');

  return res.status(500).json({ error: 'Internal server error' });
}
