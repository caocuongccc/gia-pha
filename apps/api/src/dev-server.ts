// apps/api/src/dev-server.ts
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') }) ||
  config({ path: resolve(process.cwd(), '../../.env') }) ||
  config({ path: resolve(__dirname, '../../../.env') }) ||
  config();

console.log('='.repeat(50));
console.log('ENV CHECK:');
console.log(
  '  SUPABASE_URL       :',
  process.env['SUPABASE_URL']
    ? process.env['SUPABASE_URL'].slice(0, 40) + '...'
    : '❌ MISSING',
);
console.log(
  '  SUPABASE_SERVICE_KEY:',
  process.env['SUPABASE_SERVICE_KEY'] ? '✅ present' : '❌ MISSING',
);
console.log(
  '  DATABASE_URL       :',
  process.env['DATABASE_URL'] ? '✅ present' : '❌ MISSING',
);
console.log('='.repeat(50));

import express from 'express';
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    'Access-Control-Allow-Origin',
    process.env['FRONTEND_URL'] ?? 'http://localhost:4200',
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PATCH,DELETE,OPTIONS',
  );
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

async function startServer() {
  const { default: familiesId } = await import('../api/families/[id].js');
  const { default: familiesTree } = await import(
    '../api/families/[id]/tree.js'
  );
  const { default: families } = await import('../api/families/index.js');
  const { default: members } = await import('../api/members/index.js');
  const { default: membersId } = await import('../api/members/[id].js');
  const { default: relations } = await import('../api/relations/index.js');
  const { default: relationsId } = await import('../api/relations/[id].js');
  const { default: inviteAccept } = await import('../api/invites/accept.js');
  const { default: invites } = await import('../api/invites/index.js');
  const { default: chiIndex } = await import('../api/chi/index.js');
  const { default: chiId } = await import('../api/chi/[id].js');
  const { default: phaiIndex } = await import('../api/phai/index.js');
  const { default: phaiId } = await import('../api/phai/[id].js');
  const { default: publicFamiliesId } = await import(
    '../api/public/families/[id].js'
  );

  // Helper: inject :id vào req.query để các handler dùng req.query.id
  const injectId = (handler: any) => (req: any, res: any) => {
    req.query = { ...req.query, id: req.params.id };
    return handler(req, res);
  };

  // ── Routes: specific trước, generic sau ──────────────────────
  // public (no auth) — specific sub-routes TRƯỚC route generic :id
  app.all('/api/public/families/:id/members', injectId(publicFamiliesId));
  app.all('/api/public/families/:id/relations', injectId(publicFamiliesId));
  app.all('/api/public/families/:id', injectId(publicFamiliesId));

  // families
  app.all('/api/families/:id/tree', (req, res) =>
    familiesTree(req as any, res as any),
  );
  app.all('/api/families/:id', injectId(familiesId));
  app.all('/api/families', (req, res) => families(req as any, res as any));

  // members — members/[id].ts dùng req.query.id nên cần inject
  app.all('/api/members/:id', injectId(membersId));
  app.all('/api/members', (req, res) => members(req as any, res as any));

  // relations — [id].ts dùng URL parsing, không cần inject; nhưng inject cũng không hại
  app.all('/api/relations/:id', injectId(relationsId));
  app.all('/api/relations', (req, res) => relations(req as any, res as any));

  // chi/phai — [id].ts dùng URL parsing
  app.all('/api/chi/:id', injectId(chiId));
  app.all('/api/chi', (req, res) => chiIndex(req as any, res as any));

  app.all('/api/phai/:id', injectId(phaiId));
  app.all('/api/phai', (req, res) => phaiIndex(req as any, res as any));

  // invites
  app.all('/api/invites/accept', (req, res) =>
    inviteAccept(req as any, res as any),
  );
  app.all('/api/invites', (req, res) => invites(req as any, res as any));

  // Health check
  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, time: new Date() }),
  );

  app.listen(3000, () => {
    console.log('');
    console.log('🚀 API running at http://localhost:3000');
    console.log('   Test: http://localhost:3000/api/health');
    console.log('');
  });
}

startServer().catch(console.error);
