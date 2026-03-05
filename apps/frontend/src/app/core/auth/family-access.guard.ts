// apps/frontend/src/app/core/auth/family-access.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { FamilyService } from '../services/family.service';

export const familyAccessGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
) => {
  const familySvc = inject(FamilyService);
  const router = inject(Router);

  const familyId = route.params['id'];
  if (!familyId) return router.createUrlTree(['/families']);

  // ✅ Dùng getUserRole — không set signal, chỉ check
  const role = await familySvc.getUserRole(familyId);

  if (!role) {
    return router.createUrlTree(['/families']);
  }

  return true;
};
