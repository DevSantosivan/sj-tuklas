import { Component, OnInit, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';

import { BusinessCardComponent } from '../../../../shared/components/business-card/business-card.component';

import { BusinessService } from '../../../../core/services/business.service';
import { Business } from '../../../../core/models/business';

@Component({
  selector: 'app-featured-businesses',
  standalone: true,

  imports: [BusinessCardComponent, RouterLink],

  templateUrl: './featured-businesses.component.html',
  styleUrl: './featured-businesses.component.scss',
})
export class FeaturedBusinessesComponent implements OnInit {
  // =========================================================
  // DEPENDENCIES
  // =========================================================

  private readonly businessService = inject(BusinessService);

  // =========================================================
  // STATE
  // =========================================================

  readonly businesses = signal<Business[]>([]);

  readonly isLoading = signal<boolean>(true);

  readonly errorMessage = signal<string | null>(null);

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    void this.loadBusinesses();
  }

  // =========================================================
  // LOAD APPROVED BUSINESSES
  //
  // Backend:
  // GET /api/businesses
  //
  // Backend already filters:
  // status = approved
  //
  // We only display the first 3.
  // =========================================================

  async loadBusinesses(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const businesses = await this.businessService.getApprovedBusinesses();

      // =====================================================
      // ONLY FIRST 3 APPROVED BUSINESSES
      // =====================================================

      this.businesses.set(businesses.slice(0, 3));
    } catch (error: unknown) {
      console.error('Failed to load featured businesses:', error);

      this.businesses.set([]);

      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to load businesses.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
