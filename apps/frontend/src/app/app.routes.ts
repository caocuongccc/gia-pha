// apps/frontend/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { FundPage } from './features/fund/fund.page';

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
    path: 'share/:id/activities',
    loadComponent: () =>
      import('./features/activities/activities.page').then(
        (m) => m.ActivitiesPage,
      ),
    data: { public: true },
  },
  {
    path: 'families/:id/activities',
    loadComponent: () =>
      import('./features/activities/activities.page').then(
        (m) => m.ActivitiesPage,
      ),
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
    // URL ngắn dễ share: /f/ho-le-duy
    path: 'f/:slug',
    loadComponent: () =>
      import('./features/families/pages/public-tree.page').then(
        (m) => m.PublicTreePage,
      ),
  },
  { path: 'f/:slug/fund', component: FundPage, data: { public: true } },
  {
    path: 'f/:slug/activities',
    loadComponent: () =>
      import('./features/activities/activities.page').then(
        (m) => m.ActivitiesPage,
      ),
    data: { public: true },
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
      import('./features/auth/auth-callback.component').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    path: 'access/:id',
    loadComponent: () =>
      import('./features/families/pages/access.page').then((m) => m.AccessPage),
    canActivate: [authGuard],
  },
  {
    path: 'families/:id/access',
    loadComponent: () =>
      import('./features/families/pages/access.page').then((m) => m.AccessPage),
    canActivate: [authGuard],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/pages/not-found.page').then((m) => m.NotFoundPage),
  },
];
