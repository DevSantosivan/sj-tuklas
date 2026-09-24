import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const visitorDashboardGuard: CanActivateFn = async (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = await authService.getUser();

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  // =====================================================
  // MUST BE VISITOR
  // =====================================================

  if (user.role !== 'visitor') {
    switch (user.role) {
      case 'business_owner':
        return router.createUrlTree(['/business/dashboard']);

      case 'admin':
        return router.createUrlTree(['/admin/approvals']);

      default:
        return router.createUrlTree(['/']);
    }
  }

  // =====================================================
  // CHECK DASHBOARD USER ID
  // =====================================================

  const routeId = route.paramMap.get('id');

  if (!routeId) {
    return router.createUrlTree([`/dashboard/${user.id}/overview`]);
  }

  // Visitor can only access their own dashboard
  if (routeId !== user.id) {
    return router.createUrlTree([`/dashboard/${user.id}/overview`]);
  }

  return true;
};
