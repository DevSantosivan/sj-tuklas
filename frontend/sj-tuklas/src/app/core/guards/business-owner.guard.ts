import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const businessOwnerGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = await authService.getUser();

  // Not logged in
  if (!user) {
    return router.createUrlTree(['/login']);
  }

  // Not business owner
  if (user.role !== 'business_owner') {
    switch (user.role) {
      case 'visitor':
        return router.createUrlTree([`/dashboard/${user.id}/overview`]);

      case 'admin':
        return router.createUrlTree(['/admin/approvals']);

      default:
        return router.createUrlTree(['/']);
    }
  }

  return true;
};
