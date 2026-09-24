import { Component, inject } from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-visitor-layout',
  standalone: true,

  imports: [RouterOutlet, RouterLink, RouterLinkActive],

  templateUrl: './visitor-layout.component.html',
  styleUrl: './visitor-layout.component.scss',
})
export class VisitorLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;

  moreMenuOpen = false;

  // Temporary notification count.
  // Palitan natin ito later ng actual Supabase unread count.
  notificationCount = 3;

  // =====================================================
  // USER
  // =====================================================

  get userId(): string | null {
    return this.currentUser()?.id ?? null;
  }

  // =====================================================
  // ROUTES
  // =====================================================

  get overviewRoute(): string {
    return this.userId ? `/dashboard/${this.userId}/overview` : '/login';
  }

  get favoritesRoute(): string {
    return this.userId ? `/dashboard/${this.userId}/favorites` : '/login';
  }

  get bookingsRoute(): string {
    return this.userId ? `/dashboard/${this.userId}/bookings` : '/login';
  }

  get ordersRoute(): string {
    return this.userId ? `/dashboard/${this.userId}/orders` : '/login';
  }

  get transactionsRoute(): string {
    return this.userId ? `/dashboard/${this.userId}/transactions` : '/login';
  }

  get inquiriesRoute(): string {
    return this.userId ? `/dashboard/${this.userId}/inquiries` : '/login';
  }

  get recentlyViewedRoute(): string {
    return this.userId ? `/dashboard/${this.userId}/recently-viewed` : '/login';
  }

  get notificationsRoute(): string {
    return this.userId ? `/dashboard/${this.userId}/notifications` : '/login';
  }

  get profileRoute(): string {
    return this.userId ? `/dashboard/${this.userId}/profile` : '/login';
  }

  // =====================================================
  // MORE MENU
  // =====================================================

  toggleMoreMenu(): void {
    this.moreMenuOpen = !this.moreMenuOpen;
  }

  closeMoreMenu(): void {
    this.moreMenuOpen = false;
  }

  // =====================================================
  // LOGOUT
  // =====================================================

  async logout(): Promise<void> {
    this.closeMoreMenu();

    await this.authService.signOut();

    await this.router.navigate(['/login']);
  }
}
