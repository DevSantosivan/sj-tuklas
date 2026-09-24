import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = await authService.getUser();

  // Not logged in
  if (!user) {
    return router.createUrlTree(['/login']);
  }

  // Not admin
  if (user.role !== 'admin') {
    switch (user.role) {
      case 'visitor':
        return router.createUrlTree([`/dashboard/${user.id}/overview`]);

      case 'business_owner':
        return router.createUrlTree(['/business/dashboard']);

      default:
        return router.createUrlTree(['/']);
    }
  }

  return true;
};
