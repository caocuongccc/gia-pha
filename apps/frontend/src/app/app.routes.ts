// apps/frontend/src/app/app.routes.ts

import { Routes } from '@angular/router';
import { authInterceptor } from './core/auth/auth.interceptor';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'families',
    pathMatch: 'full',
  },
  {
    path: 'families',
    loadComponent: () =>
      import('./features/families/pages/families-list.page').then(
        (m) => m.FamiliesListPage,
      ),
    canActivate: [authInterceptor],
  },
  {
    path: 'families/:id',
    loadComponent: () =>
      import('./features/families/pages/family-detail.page').then(
        (m) => m.FamilyDetailPage,
      ),
    canActivate: [authInterceptor],
  },
  {
    path: 'share/:token',
    loadComponent: () =>
      import('./features/families/pages/public-tree.page').then(
        (m) => m.PublicTreePage,
      ),
    // Không cần authGuard — public page
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
