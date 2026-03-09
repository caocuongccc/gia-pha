// apps/api/api/index.ts
// Catch-all handler — gộp tất cả routes vào 1 Vercel Function duy nhất
// Giải quyết giới hạn 12 functions của Hobby plan
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../src/_lib/cors';

const injectId = (handler: any, req: any) => {
  const match = req.url.match(/\/([^/?]+)(\?|$)/g);
  // Extract last segment as id
  const segments = req.url.replace(/\?.*$/, '').split('/').filter(Boolean);
  req.query = { ...req.query, id: segments[segments.length - 1] };
  return handler(req);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  const url = req.url ?? '';
  // Strip query string for matching
  const path = url.replace(/\?.*$/, '');

  // ── /api/health ──────────────────────────────────────────────
  if (path === '/api/health') {
    return res.json({ ok: true, time: new Date() });
  }

  // ── /api/public/families/:id/* ───────────────────────────────
  if (path.match(/^\/api\/public\/families\/[^/]+(\/members|\/relations)?$/)) {
    const { default: h } = await import('./public/families/[id]');
    return h(req, res);
  }

  // ── /api/families/:id/tree ───────────────────────────────────
  if (path.match(/^\/api\/families\/[^/]+\/tree$/)) {
    const { default: h } = await import('./families/[id]/tree');
    return h(req, res);
  }

  // ── /api/families/:id ────────────────────────────────────────
  if (path.match(/^\/api\/families\/[^/]+$/)) {
    const segments = path.split('/').filter(Boolean);
    req.query = { ...req.query, id: segments[segments.length - 1] };
    const { default: h } = await import('./families/[id]');
    return h(req, res);
  }

  // ── /api/families ────────────────────────────────────────────
  if (path === '/api/families') {
    const { default: h } = await import('./families/index');
    return h(req, res);
  }

  // ── /api/members/:id ─────────────────────────────────────────
  if (path.match(/^\/api\/members\/[^/]+$/)) {
    const segments = path.split('/').filter(Boolean);
    req.query = { ...req.query, id: segments[segments.length - 1] };
    const { default: h } = await import('./members/[id]');
    return h(req, res);
  }

  // ── /api/members ─────────────────────────────────────────────
  if (path === '/api/members') {
    const { default: h } = await import('./members/index');
    return h(req, res);
  }

  // ── /api/relations/:id ───────────────────────────────────────
  if (path.match(/^\/api\/relations\/[^/]+$/)) {
    const segments = path.split('/').filter(Boolean);
    req.query = { ...req.query, id: segments[segments.length - 1] };
    const { default: h } = await import('./relations/[id]');
    return h(req, res);
  }

  // ── /api/relations ───────────────────────────────────────────
  if (path === '/api/relations') {
    const { default: h } = await import('./relations/index');
    return h(req, res);
  }

  // ── /api/invites/accept ──────────────────────────────────────
  if (path === '/api/invites/accept') {
    const { default: h } = await import('./invites/accept');
    return h(req, res);
  }

  // ── /api/invites ─────────────────────────────────────────────
  if (path === '/api/invites') {
    const { default: h } = await import('./invites/index');
    return h(req, res);
  }

  // ── /api/chi/:id ─────────────────────────────────────────────
  if (path.match(/^\/api\/chi\/[^/]+$/)) {
    const segments = path.split('/').filter(Boolean);
    req.query = { ...req.query, id: segments[segments.length - 1] };
    const { default: h } = await import('./chi/[id]');
    return h(req, res);
  }

  // ── /api/chi ─────────────────────────────────────────────────
  if (path === '/api/chi') {
    const { default: h } = await import('./chi/index');
    return h(req, res);
  }

  // ── /api/phai/:id ────────────────────────────────────────────
  if (path.match(/^\/api\/phai\/[^/]+$/)) {
    const segments = path.split('/').filter(Boolean);
    req.query = { ...req.query, id: segments[segments.length - 1] };
    const { default: h } = await import('./phai/[id]');
    return h(req, res);
  }

  // ── /api/phai ────────────────────────────────────────────────
  if (path === '/api/phai') {
    const { default: h } = await import('./phai/index');
    return h(req, res);
  }

  return res.status(404).json({ error: 'Not found', path });
}
