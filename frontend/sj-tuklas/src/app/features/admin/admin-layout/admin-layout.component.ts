import { Component, inject, signal } from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  // =========================================================
  // SERVICES
  // =========================================================

  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  // =========================================================
  // SIDEBAR
  // =========================================================

  sidebarOpen = false;

  // =========================================================
  // PROFILE DROPDOWN
  // =========================================================

  profileMenuOpen = false;

  // =========================================================
  // PENDING APPROVALS
  // =========================================================

  // Temporary count.
  // Palitan later ng actual approval service.
  pendingCount = signal(0);

  // =========================================================
  // CURRENT USER
  // =========================================================

  readonly currentUser = this.authService.currentUser;

  // =========================================================
  // USER NAME
  // =========================================================

  get userName(): string {
    return this.currentUser()?.fullName?.trim() || 'Administrator';
  }

  // =========================================================
  // USER EMAIL
  // =========================================================

  get userEmail(): string {
    return this.currentUser()?.email || '';
  }

  // =========================================================
  // USER INITIAL
  // =========================================================

  get userInitial(): string {
    const name = this.currentUser()?.fullName?.trim();

    if (!name) {
      return 'A';
    }

    return name.charAt(0).toUpperCase();
  }

  // =========================================================
  // USER ROLE
  // =========================================================

  get userRole(): string {
    const role = this.currentUser()?.role;

    switch (role) {
      case 'admin':
        return 'Administrator';

      case 'business_owner':
        return 'Business Owner';

      case 'visitor':
        return 'Visitor';

      default:
        return 'Administrator';
    }
  }

  // =========================================================
  // SIDEBAR
  // =========================================================

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  closeSidebarOnMobile(): void {
    if (window.innerWidth <= 900) {
      this.sidebarOpen = false;
    }
  }

  // =========================================================
  // PROFILE MENU
  // =========================================================

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async logout(): Promise<void> {
    try {
      // Close UI
      this.profileMenuOpen = false;
      this.sidebarOpen = false;

      // Logout from backend
      await this.authService.signOut();

      // Redirect to login
      await this.router.navigate(['/login']);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }
}
