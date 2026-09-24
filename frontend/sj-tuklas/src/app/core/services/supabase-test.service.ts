import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class SupabaseTestService {
  private supabase = inject(SupabaseService).client;

  async testConnection(): Promise<void> {
    const { data, error } = await this.supabase.auth.getSession();

    console.log('SUPABASE SESSION:', data);

    if (error) {
      console.error('SUPABASE CONNECTION ERROR:', error);

      return;
    }

    console.log('SUPABASE CONNECTION OK');
  }
}
