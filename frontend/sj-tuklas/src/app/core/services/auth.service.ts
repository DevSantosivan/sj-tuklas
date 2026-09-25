import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
          // IMPORTANT:
          // Allows browser to receive/store HttpOnly cookies
          // from the Render API.
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
      // -------------------------------------------------------
      // FIRST:
      // TRY ACCESS TOKEN
      // -------------------------------------------------------

      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${this.apiUrl}/me`, {
          withCredentials: true,
        }),
      );

      this._currentUser.set(user);

      return user;
    } catch {
      // -------------------------------------------------------
      // ACCESS TOKEN FAILED
      // TRY REFRESH TOKEN
      // -------------------------------------------------------

      try {
        await firstValueFrom(
          this.http.post(
            `${this.apiUrl}/refresh`,
            {},
            {
              withCredentials: true,
            },
          ),
        );

        // -----------------------------------------------------
        // REFRESH SUCCESSFUL
        // GET USER AGAIN
        // -----------------------------------------------------

        const user = await firstValueFrom(
          this.http.get<AuthUser>(`${this.apiUrl}/me`, {
            withCredentials: true,
          }),
        );

        this._currentUser.set(user);

        return user;
      } catch {
        // -----------------------------------------------------
        // SESSION INVALID / EXPIRED
        // -----------------------------------------------------

        this._currentUser.set(null);

        return null;
      }
    }
  }

  // =========================================================
  // GET USER BY ID
  // =========================================================

  async getUserById(userId: string): Promise<AuthUser | null> {
    if (!userId?.trim()) {
      return null;
    }

    try {
      const user = await firstValueFrom(
        this.http.get<AuthUser>(
          `${this.apiUrl}/users/${encodeURIComponent(userId)}`,
          {
            withCredentials: true,
          },
        ),
      );

      return user;
    } catch (error: any) {
      // -----------------------------------------------------
      // USER NOT FOUND
      // -----------------------------------------------------

      if (error?.status === 404) {
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
    this._authLoading.set(true);

    try {
      return await this.getUser();
    } finally {
      this._authLoading.set(false);
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
    try {
      // -----------------------------------------------------
      // REQUEST NEW ACCESS TOKEN
      // -----------------------------------------------------

      await firstValueFrom(
        this.http.post(
          `${this.apiUrl}/refresh`,
          {},
          {
            withCredentials: true,
          },
        ),
      );

      // -----------------------------------------------------
      // GET UPDATED USER
      // -----------------------------------------------------

      const user = await firstValueFrom(
        this.http.get<AuthUser>(`${this.apiUrl}/me`, {
          withCredentials: true,
        }),
      );

      this._currentUser.set(user);

      return true;
    } catch {
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
    } finally {
      // -----------------------------------------------------
      // CLEAR ANGULAR USER STATE
      // -----------------------------------------------------

      this._currentUser.set(null);
    }
  }
}
