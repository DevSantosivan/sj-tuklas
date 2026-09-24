import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { AccountRole } from '../models/auth.model';

export const roleGuard = (allowedRoles: AccountRole[]): CanActivateFn => {
  return async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const user = await authService.getUser();

    // Walang authenticated user
    if (!user) {
      return router.createUrlTree(['/login']);
    }

    // Role is not allowed
    if (!user.role || !allowedRoles.includes(user.role)) {
      switch (user.role) {
        case 'visitor':
          return router.createUrlTree([`/dashboard/${user.id}/overview`]);

        case 'business_owner':
          return router.createUrlTree(['/business/dashboard']);

        case 'admin':
          return router.createUrlTree(['/admin/approvals']);

        default:
          return router.createUrlTree(['/']);
      }
    }

    return true;
  };
};
