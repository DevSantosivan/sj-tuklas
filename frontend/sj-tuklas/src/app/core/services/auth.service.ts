import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { AccountRole, AuthResponse, AuthUser } from '../models/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${API_CONFIG.baseUrl}/auth`;

  // =========================================================
  // CURRENT USER
  // =========================================================

  private readonly _currentUser = signal<AuthUser | null>(null);

  readonly currentUser = this._currentUser.asReadonly();

  // =========================================================
  // AUTH LOADING
  // =========================================================

  private readonly _authLoading = signal(true);

  readonly authLoading = this._authLoading.asReadonly();

  // Prevent multiple simultaneous auth initialization requests.
  private initializationPromise: Promise<AuthUser | null> | null = null;

  // Prevent multiple simultaneous refresh requests.
  private refreshPromise: Promise<boolean> | null = null;

  // =========================================================
  // REGISTER
  // =========================================================

  async signUp(
    email: string,
    password: string,
    fullName: string,
    role: AccountRole,
    phone?: string,
  ): Promise<AuthResponse> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(
        `${this.apiUrl}/register`,
        {
          email: email.trim().toLowerCase(),
          password,
          fullName: fullName.trim(),
          role,
          phone: phone?.trim() || null,
        },
        {
          withCredentials: true,
        },
      ),
    );

    if (response.user) {
      this._currentUser.set(response.user);
    }

    return response;
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await firstValueFrom(
      this.http.post<AuthResponse>(
        `${this.apiUrl}/login`,
        {
          email: email.trim().toLowerCase(),
          password,
        },
        {
          withCredentials: true,
        },
      ),
    );

    if (response.user) {
      this._currentUser.set(response.user);
    }

    return response;
  }

  // =========================================================
  // CURRENT USER
  // =========================================================

  async getUser(): Promise<AuthUser | null> {
    try {
      // First, check the current access session.
      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${this.apiUrl}/me`, {
          withCredentials: true,
        }),
      );

      this._currentUser.set(user);

      return user;
    } catch (error) {
      // Do not clear the user for network or server errors.
      // Only attempt refresh when the server returns 401.
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        console.error('Failed to verify current session:', error);

        return this._currentUser();
      }
    }

    // Access session is unauthorized. Try refreshing it.
    const refreshed = await this.refresh();

    if (!refreshed) {
      return null;
    }

    return this._currentUser();
  }

  // =========================================================
  // GET USER BY ID
  // =========================================================

  async getUserById(userId: string): Promise<AuthUser | null> {
    if (!userId?.trim()) {
      return null;
    }

    try {
      return await firstValueFrom(
        this.http.get<AuthUser>(
          `${this.apiUrl}/users/${encodeURIComponent(userId)}`,
          {
            withCredentials: true,
          },
        ),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }

      console.error('Failed to load user by ID:', error);

      throw error;
    }
  }

  // =========================================================
  // INITIALIZE AUTH
  // =========================================================

  async initialize(): Promise<AuthUser | null> {
    // Reuse an existing initialization request.
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this._authLoading.set(true);

    this.initializationPromise = this.getUser();

    try {
      return await this.initializationPromise;
    } finally {
      this._authLoading.set(false);
      this.initializationPromise = null;
    }
  }

  // =========================================================
  // CURRENT ROLE
  // =========================================================

  async getCurrentRole(): Promise<AccountRole | null> {
    const user = await this.getUser();

    if (!user?.role) {
      return null;
    }

    switch (user.role) {
      case 'visitor':
      case 'business_owner':
      case 'admin':
        return user.role;

      default:
        return null;
    }
  }

  // =========================================================
  // REFRESH SESSION
  // =========================================================

  async refresh(): Promise<boolean> {
    // Reuse an active refresh request.
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<boolean> {
    try {
      // Ask the backend to refresh the access session.
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/refresh`,
          {},
          {
            withCredentials: true,
          },
        ),
      );

      // Verify the refreshed session.
      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${this.apiUrl}/me`, {
          withCredentials: true,
        }),
      );

      this._currentUser.set(user);

      return true;
    } catch (error) {
      console.error('Failed to refresh authentication session:', error);

      this._currentUser.set(null);

      return false;
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async signOut(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/logout`,
          {},
          {
            withCredentials: true,
          },
        ),
      );
    } catch (error) {
      console.error('Failed to sign out from backend:', error);
    } finally {
      // Always clear the local user state.
      this._currentUser.set(null);
    }
  }
}
