// apps/api/api/index.ts — single catch-all, static imports cho Vercel bundler
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../src/_lib/cors';

// ── Static imports — Vercel cần biết lúc build ───────────────────────────────
import familiesHandler from './families/index';
import familiesIdHandler from './families/[id]';
import familiesTreeHandler from './families/[id]/tree';
import familiesJoinHandler from './families/[id]/join';
import familiesMyRoleHandler from './families/[id]/my-role';
import membersHandler from './members/index';
import membersIdHandler from './members/[id]';
import relationsHandler from './relations/index';
import relationsIdHandler from './relations/[id]';
import invitesHandler from './invites/index';
import invitesAcceptHandler from './invites/accept';
import chiHandler from './chi/index';
import chiIdHandler from './chi/[id]';
import phaiHandler from './phai/index';
import phaiIdHandler from './phai/[id]';
import publicFamiliesHandler from './public/families/[id]';
import scholarshipHandler from './scholarship/index';
import scholarshipIdHandler from './scholarship/[id]';
import fundHandler from './fund/index';
import fundIdHandler from './fund/[id]';

// ── Helper inject :id vào req.query ──────────────────────────────────────────
function injectId(req: VercelRequest, id: string) {
  req.query = { ...req.query, id };
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);
  if (handleOptions(req, res)) return;

  const url = req.url ?? '';
  const path = url.replace(/\?.*$/, '');
  const seg = path.split('/').filter(Boolean); // ['api','families','uuid','tree']

  // /api/health
  if (path === '/api/health') {
    return res.json({ ok: true, time: new Date() });
  }

  // /api/public/families/:id  (+ /members, /relations sub-paths)
  if (seg[1] === 'public' && seg[2] === 'families') {
    if (seg[3]) injectId(req, seg[3]);
    if (seg[4]) req.query = { ...req.query, action: seg[4] }; // members | relations
    return publicFamiliesHandler(req, res);
  }

  // /api/families/:id/tree
  if (seg[1] === 'families' && seg[3] === 'tree') {
    injectId(req, seg[2]);
    return familiesTreeHandler(req, res);
  }

  // /api/families/:id/join
  if (seg[1] === 'families' && seg[3] === 'join') {
    injectId(req, seg[2]);
    return familiesJoinHandler(req, res);
  }

  // /api/families/:id/my-role
  if (seg[1] === 'families' && seg[3] === 'my-role') {
    injectId(req, seg[2]);
    return familiesMyRoleHandler(req, res);
  }

  // /api/families/:id
  if (seg[1] === 'families' && seg[2]) {
    injectId(req, seg[2]);
    return familiesIdHandler(req, res);
  }

  // /api/families
  if (seg[1] === 'families') {
    return familiesHandler(req, res);
  }

  // /api/members/:id
  if (seg[1] === 'members' && seg[2]) {
    injectId(req, seg[2]);
    return membersIdHandler(req, res);
  }

  // /api/members
  if (seg[1] === 'members') {
    return membersHandler(req, res);
  }

  // /api/relations/:id
  if (seg[1] === 'relations' && seg[2]) {
    injectId(req, seg[2]);
    return relationsIdHandler(req, res);
  }

  // /api/relations
  if (seg[1] === 'relations') {
    return relationsHandler(req, res);
  }

  // /api/invites/accept  — specific trước generic
  if (seg[1] === 'invites' && seg[2] === 'accept') {
    return invitesAcceptHandler(req, res);
  }

  // /api/invites
  if (seg[1] === 'invites') {
    return invitesHandler(req, res);
  }

  // /api/chi/:id
  if (seg[1] === 'chi' && seg[2]) {
    injectId(req, seg[2]);
    return chiIdHandler(req, res);
  }

  // /api/chi
  if (seg[1] === 'chi') {
    return chiHandler(req, res);
  }

  // /api/phai/:id
  if (seg[1] === 'phai' && seg[2]) {
    injectId(req, seg[2]);
    return phaiIdHandler(req, res);
  }

  // /api/phai
  if (seg[1] === 'phai') {
    return phaiHandler(req, res);
  }

  // /api/scholarship/:id
  if (seg[1] === 'scholarship' && seg[2]) {
    injectId(req, seg[2]);
    return scholarshipIdHandler(req, res);
  }

  // /api/scholarship
  if (seg[1] === 'scholarship') {
    return scholarshipHandler(req, res);
  }

  // /api/fund/:id
  if (seg[1] === 'fund' && seg[2]) {
    injectId(req, seg[2]);
    return fundIdHandler(req, res);
  }

  // /api/fund
  if (seg[1] === 'fund') {
    return fundHandler(req, res);
  }

  return res.status(404).json({ error: 'Route not found', path });
}
