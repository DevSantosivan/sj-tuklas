import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, tap } from 'rxjs';

import {
  Explore3dCharacter,
  CreateExplore3dCharacterRequest,
  UpdateExplore3dCharacterRequest,
} from '../../features/explore-3d/models/explore3d-character.model';

import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class Explore3dCharacterService {
  private readonly http = inject(HttpClient);

  // API_CONFIG.baseUrl is expected to include /api.
  // Example: http://localhost:5273/api
  private readonly endpoint = `${API_CONFIG.baseUrl.replace(/\/$/, '')}/explore3d/character`;

  private readonly _myCharacter = signal<Explore3dCharacter | null>(null);
  private readonly _loading = signal(false);

  readonly myCharacter = this._myCharacter.asReadonly();
  readonly loading = this._loading.asReadonly();

  /**
   * Get the character belonging to the currently authenticated user.
   * The backend should identify the user from the auth token or cookie.
   */
  getMyCharacter(): Observable<Explore3dCharacter> {
    this._loading.set(true);

    return this.http
      .get<Explore3dCharacter>(`${this.endpoint}/me`, {
        withCredentials: true,
      })
      .pipe(
        tap((character) => {
          this._myCharacter.set(character);
        }),
        finalize(() => {
          this._loading.set(false);
        }),
      );
  }

  /**
   * Create a character for the currently authenticated user.
   */
  createMyCharacter(
    request: CreateExplore3dCharacterRequest,
  ): Observable<Explore3dCharacter> {
    this._loading.set(true);

    return this.http
      .post<Explore3dCharacter>(`${this.endpoint}/me`, request, {
        withCredentials: true,
      })
      .pipe(
        tap((character) => {
          this._myCharacter.set(character);
        }),
        finalize(() => {
          this._loading.set(false);
        }),
      );
  }

  /**
   * Update the current user's character.
   */
  updateMyCharacter(
    request: UpdateExplore3dCharacterRequest,
  ): Observable<Explore3dCharacter> {
    this._loading.set(true);

    return this.http
      .patch<Explore3dCharacter>(`${this.endpoint}/me`, request, {
        withCredentials: true,
      })
      .pipe(
        tap((character) => {
          this._myCharacter.set(character);
        }),
        finalize(() => {
          this._loading.set(false);
        }),
      );
  }

  /**
   * Clear the current user's character state,
   * for example after logout.
   */
  clear(): void {
    this._myCharacter.set(null);
    this._loading.set(false);
  }
}
