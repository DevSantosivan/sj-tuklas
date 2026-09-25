import { Component, OnInit, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';

import { BusinessCardComponent } from '../../../../shared/components/business-card/business-card.component';

import { BusinessService } from '../../../../core/services/business.service';
import { Business } from '../../../../core/models/business';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-featured-businesses',
  standalone: true,

  imports: [BusinessCardComponent, RouterLink, SkeletonComponent],

  templateUrl: './featured-businesses.component.html',
  styleUrl: './featured-businesses.component.scss',
})
export class FeaturedBusinessesComponent implements OnInit {
  // =========================================================
  // DEPENDENCIES
  // =========================================================

  private readonly businessService = inject(BusinessService);

  // =========================================================
  // CONFIGURATION
  // =========================================================

  /**
   * Number of businesses displayed on the homepage.
   *
   * We only need 3 for the Featured section.
   */
  private readonly displayLimit = 3;

  // =========================================================
  // STATE
  // =========================================================

  readonly businesses = signal<Business[]>([]);

  readonly isLoading = signal(true);

  readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadBusinesses();
  }

  private async loadBusinesses(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const businesses = await this.businessService.getApprovedBusinesses();

      this.businesses.set(businesses.slice(0, this.displayLimit));
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
