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
// CORS phải đứng TRƯỚC body parser
// để kể cả khi 413 xảy ra, header vẫn được gửi
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

// 50mb để chứa base64 ảnh (ảnh 10MB raw ≈ 13.3MB base64, batch 3 ảnh ≈ 40MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

async function startServer() {
  const { default: familiesId } = await import('../api/families/[id].js');
  const { default: familiesTree } = await import(
    '../api/families/[id]/tree.js'
  );
  const { default: familiesJoin } = await import(
    '../api/families/[id]/join.js'
  );
  const { default: familiesMyRole } = await import(
    '../api/families/[id]/my-role.js'
  );
  const { default: familiesAccess } = await import(
    '../api/families/[id]/access.js'
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
  const { default: publicBySlug } = await import(
    '../api/public/families/slug/[slug].js'
  ).catch(() => import('../api/public/families/slug/[slug]'));
  const { default: scholarshipIndex } = await import(
    '../api/scholarship/index.js'
  );
  const { default: scholarshipId } = await import('../api/scholarship/[id].js');
  const { default: fundIndex } = await import('../api/fund/index.js');
  const { default: fundId } = await import('../api/fund/[id].js');
  const { default: postIndex } = await import('../api/post/index.js');
  const { default: postId } = await import('../api/post/[id].js');
  const { default: uploadIndex } = await import('../api/upload/index.js');
  const { default: googleAuthIndex } = await import(
    '../api/google-auth/index.js'
  );
  const { default: googleAuthCb } = await import(
    '../api/google-auth/callback.js'
  );

  // Helper: inject :id vào req.query
  const injectId = (handler: any) => (req: any, res: any) => {
    req.query = { ...req.query, id: req.params.id };
    return handler(req, res);
  };

  // ── Routes: specific trước, generic sau ──────────────────────

  // public — không cần auth, inject action cho sub-path
  // /api/public/families/slug/:slug  → resolve slug
  app.get('/api/public/families/slug/:slug', (req: any, res: any) => {
    req.query = { ...req.query, slug: req.params.slug };
    return publicBySlug(req, res);
  });

  app.get('/api/public/families/:id/members', (req, res) => {
    req.query = { ...req.query, id: req.params.id, action: 'members' };
    return publicFamiliesId(req as any, res as any);
  });
  app.get('/api/public/families/:id/relations', (req, res) => {
    req.query = { ...req.query, id: req.params.id, action: 'relations' };
    return publicFamiliesId(req as any, res as any);
  });
  app.get('/api/public/families/:id', injectId(publicFamiliesId));

  // families
  app.all('/api/families/:id/tree', (req, res) =>
    familiesTree(req as any, res as any),
  );
  app.all('/api/families/:id/join', injectId(familiesJoin));
  app.all('/api/families/:id/my-role', injectId(familiesMyRole));
  app.all('/api/families/:id/access', injectId(familiesAccess));
  app.all('/api/families/:id', injectId(familiesId));
  app.all('/api/families', (req, res) => families(req as any, res as any));

  // members
  app.all('/api/members/:id', injectId(membersId));
  app.all('/api/members', (req, res) => members(req as any, res as any));

  // relations
  app.all('/api/relations/:id', injectId(relationsId));
  app.all('/api/relations', (req, res) => relations(req as any, res as any));

  // chi/phai
  app.all('/api/chi/:id', injectId(chiId));
  app.all('/api/chi', (req, res) => chiIndex(req as any, res as any));
  app.all('/api/phai/:id', injectId(phaiId));
  app.all('/api/phai', (req, res) => phaiIndex(req as any, res as any));

  // scholarship & fund
  app.all('/api/scholarship/:id', injectId(scholarshipId));
  app.all('/api/scholarship', (req, res) =>
    scholarshipIndex(req as any, res as any),
  );
  app.all('/api/fund/:id', injectId(fundId));
  app.all('/api/fund', (req, res) => fundIndex(req as any, res as any));

  // post
  app.all('/api/post/:id', injectId(postId));
  app.all('/api/post', (req, res) => postIndex(req as any, res as any));
  app.all('/api/upload', (req, res) => uploadIndex(req as any, res as any));
  app.all('/api/google-auth/callback', async (req: any, res: any) => {
    try {
      await googleAuthCb(req, res);
    } catch (e: any) {
      console.error('[google-auth/callback]', e?.message);
      if (!res.headersSent) res.status(500).json({ error: e?.message });
    }
  });
  // google-auth/permissions
  let googleAuthPerms: any;
  try {
    const m = await import('../api/google-auth/permissions.js').catch(
      () => import('../api/google-auth/permissions'),
    );
    googleAuthPerms = m.default;
    console.log('✅ google-auth/permissions loaded');
  } catch (e: any) {
    console.error('❌ Failed to load google-auth/permissions:', e.message);
  }
  app.all('/api/google-auth/permissions', async (req: any, res: any) => {
    if (!googleAuthPerms) {
      return res.status(500).json({
        error: 'permissions handler not loaded — check compile output',
      });
    }
    try {
      await googleAuthPerms(req, res);
    } catch (e: any) {
      console.error('[google-auth/permissions]', e?.message);
      if (!res.headersSent) res.status(500).json({ error: e?.message });
    }
  });
  app.all('/api/google-auth', async (req: any, res: any) => {
    try {
      await googleAuthIndex(req, res);
    } catch (e: any) {
      console.error('[google-auth]', e?.message);
      if (!res.headersSent) res.status(500).json({ error: e?.message });
    }
  });

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
