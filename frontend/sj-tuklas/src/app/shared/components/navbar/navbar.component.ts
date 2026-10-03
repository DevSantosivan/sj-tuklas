import { Component, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { Explore3dCharacterService } from '../../../core/services/explore3d-character.service';
import { Explore3dEntryModalComponent } from '../../../features/explore-3d/components/explore3d-entry-modal/explore3d-entry-modal.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, Explore3dEntryModalComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  // =========================================================
  // SERVICES
  // =========================================================

  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  private readonly characterService = inject(Explore3dCharacterService);

  // =========================================================
  // AUTH STATE
  // =========================================================

  readonly currentUser = this.authService.currentUser;
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
  // 3D EXPLORE MODAL
  // =========================================================

  readonly exploreModalOpen = signal(false);
  readonly exploreModalMode = signal<'auth' | 'character'>('auth');
  readonly exploreUserName = signal('Explorer');
  readonly checkingCharacter = signal(false);

  /**
   * Called when the user clicks the Explore in 3D button.
   *
   * Not logged in:
   *   Open registration/login modal.
   *
   * Logged in with a character:
   *   Navigate directly to 3D Explore.
   *
   * Logged in without a character:
   *   Open character creation modal.
   */
  async openExplore3d(event: Event): Promise<void> {
    event.preventDefault();

    // Wait until the authentication state is restored.
    if (this.authLoading() || this.checkingCharacter()) {
      return;
    }

    const user = this.currentUser();

    // User is not logged in.
    if (!user) {
      this.exploreModalMode.set('auth');
      this.exploreModalOpen.set(true);
      return;
    }

    this.exploreUserName.set(user.fullName?.trim() || 'Explorer');
    this.checkingCharacter.set(true);

    try {
      const character = await firstValueFrom(
        this.characterService.getMyCharacter(),
      );

      // Existing character found.
      if (character) {
        await this.router.navigate(['/explore']);
        return;
      }

      // Empty response: show character setup.
      this.exploreModalMode.set('character');
      this.exploreModalOpen.set(true);
    } catch (error: any) {
      // A 404 means the user has not created a character yet.
      if (error?.status === 404) {
        this.exploreModalMode.set('character');
        this.exploreModalOpen.set(true);
        return;
      }

      // Don't treat a server/network error as a missing character.
      console.error('Failed to load Explore 3D character:', error);
    } finally {
      this.checkingCharacter.set(false);
    }
  }

  closeExploreModal(): void {
    this.exploreModalOpen.set(false);
  }

  goToExploreRegister(): void {
    this.exploreModalOpen.set(false);

    void this.router.navigate(['/register'], {
      queryParams: {
        returnUrl: '/explore',
      },
    });
  }

  goToExploreLogin(): void {
    this.exploreModalOpen.set(false);

    void this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: '/explore',
      },
    });
  }

  onExploreCharacterCreated(): void {
    this.exploreModalOpen.set(false);
    void this.router.navigate(['/explore']);
  }

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
        this.currentUrl.set(event.urlAfterRedirects);
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
    this.closeProfileMenu();

    // Clear character state from the client as well.
    this.characterService.clear();

    await this.authService.signOut();
    await this.router.navigate(['/login']);
  }
}
