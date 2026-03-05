// apps/frontend/src/app/core/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Đợi Supabase khởi tạo session (isLoading = false)
  if (auth.isLoading()) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (!auth.isLoading()) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  }

  if (auth.currentUser()) return true;

  // Chưa đăng nhập → về trang login
  return router.createUrlTree(['/login']);
};
