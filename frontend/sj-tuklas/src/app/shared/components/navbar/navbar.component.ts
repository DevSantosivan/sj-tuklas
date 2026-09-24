import { Component, inject, signal } from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import { filter } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  // =========================================================
  // SERVICES
  // =========================================================

  readonly authService = inject(AuthService);
  readonly router = inject(Router);

  // =========================================================
  // AUTH STATE
  // =========================================================

  readonly currentUser = this.authService.currentUser;

  // TRUE habang chine-check pa kung may active session.
  //
  // Prevents "Log in" from flashing habang nire-restore
  // ang session pagkatapos ng browser refresh / PC restart.
  readonly authLoading = this.authService.authLoading;

  // =========================================================
  // PROFILE MENU
  // =========================================================

  readonly profileMenuOpen = signal(false);

  // =========================================================
  // CURRENT URL
  // =========================================================

  readonly currentUrl = signal(this.router.url);

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        // Update current URL
        this.currentUrl.set(event.urlAfterRedirects);

        // Automatically close profile dropdown
        // after navigation.
        this.closeProfileMenu();
      });
  }

  // =========================================================
  // USER INITIAL
  // =========================================================

  get userInitial(): string {
    const name = this.currentUser()?.fullName?.trim();

    if (!name) {
      return '?';
    }

    return name.charAt(0).toUpperCase();
  }

  // =========================================================
  // USER ID
  // =========================================================

  get userId(): string | null {
    return this.currentUser()?.id ?? null;
  }

  // =========================================================
  // DASHBOARD ROUTE
  //
  // /dashboard/:id/overview
  // =========================================================

  get dashboardRoute(): string {
    const id = this.userId;

    if (!id) {
      return '/login';
    }

    return `/dashboard/${id}/overview`;
  }

  // =========================================================
  // PROFILE ROUTE
  //
  // /dashboard/:id/profile
  // =========================================================

  get profileRoute(): string {
    const id = this.userId;

    if (!id) {
      return '/login';
    }

    return `/dashboard/${id}/profile`;
  }

  // =========================================================
  // HIDE MOBILE BOTTOM NAV
  //
  // HIDDEN INSIDE:
  // /dashboard/:id/*
  //
  // Examples:
  //
  // /dashboard/123
  // /dashboard/123/overview
  // /dashboard/123/profile
  // /dashboard/123/favorites
  // =========================================================

  get hideMobileBottomNav(): boolean {
    const url = this.currentUrl().split('?')[0];

    return /^\/dashboard\/[^/]+(?:\/.*)?$/.test(url);
  }

  // =========================================================
  // PROFILE MENU
  // =========================================================

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async logout(): Promise<void> {
    // Close dropdown first
    this.closeProfileMenu();

    // Clear authentication session
    await this.authService.signOut();

    // Go to login
    await this.router.navigate(['/login']);
  }
}
