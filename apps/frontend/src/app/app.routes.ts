// apps/frontend/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { FundPage } from './features/fund/fund.page';
import { AccessPage } from './features/families/pages/access.page';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'families',
    pathMatch: 'full',
  },
  // ✅ Trang login — cần có để redirect khi chưa đăng nhập
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'families',
    loadComponent: () =>
      import('./features/families/pages/families-list.page').then(
        (m) => m.FamiliesListPage,
      ),
    canActivate: [authGuard], // ✅ dùng authGuard thật, không phải authInterceptor
  },
  { path: 'share/:id/fund', component: FundPage, data: { public: true } },
  { path: 'families/:id/fund', component: FundPage },
  {
    path: 'families/:id/access',
    component: AccessPage,
    canActivate: [authGuard],
  },
  {
    path: 'families/:id',
    loadComponent: () =>
      import('./features/families/pages/family-detail.page').then(
        (m) => m.FamilyDetailPage,
      ),
    canActivate: [authGuard],
  },
  {
    path: 'share/:token',
    loadComponent: () =>
      import('./features/families/pages/public-tree.page').then(
        (m) => m.PublicTreePage,
      ),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/auth-callback.component').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    path: 'auth/google/callback',
    loadComponent: () =>
      import('./features/auth/google-callback.component').then(
        (m) => m.GoogleCallbackComponent,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/pages/not-found.page').then((m) => m.NotFoundPage),
  },
];
