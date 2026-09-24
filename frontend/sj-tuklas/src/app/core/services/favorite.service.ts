import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  FavoriteBusiness,
  FavoriteActionResponse,
} from '../models/favorite.model';

import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class FavoriteService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${API_CONFIG.baseUrl}/favorites`;

  // =========================================================
  // GET ALL FAVORITES
  // GET /api/favorites
  // =========================================================

  getFavorites(): Observable<FavoriteBusiness[]> {
    return this.http.get<FavoriteBusiness[]>(this.apiUrl, {
      withCredentials: true,
    });
  }

  // =========================================================
  // CHECK FAVORITE
  // GET /api/favorites/{businessId}
  // =========================================================

  isFavorite(businessId: string): Observable<FavoriteActionResponse> {
    return this.http.get<FavoriteActionResponse>(
      `${this.apiUrl}/${businessId}`,
      {
        withCredentials: true,
      },
    );
  }

  // =========================================================
  // ADD FAVORITE
  // POST /api/favorites/{businessId}
  // =========================================================

  addFavorite(businessId: string): Observable<FavoriteActionResponse> {
    return this.http.post<FavoriteActionResponse>(
      `${this.apiUrl}/${businessId}`,
      {},
      {
        withCredentials: true,
      },
    );
  }

  // =========================================================
  // REMOVE FAVORITE
  // DELETE /api/favorites/{businessId}
  // =========================================================

  removeFavorite(businessId: string): Observable<FavoriteActionResponse> {
    return this.http.delete<FavoriteActionResponse>(
      `${this.apiUrl}/${businessId}`,
      {
        withCredentials: true,
      },
    );
  }
}
