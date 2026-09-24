import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import { CommunityStats } from '../models/community-stats.model';

@Injectable({
  providedIn: 'root',
})
export class CommunityStatsService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${API_CONFIG.baseUrl}/public/stats`;

  async getStats(): Promise<CommunityStats> {
    return await firstValueFrom(
      this.http.get<CommunityStats>(this.apiUrl, {
        withCredentials: true,
      }),
    );
  }
}
