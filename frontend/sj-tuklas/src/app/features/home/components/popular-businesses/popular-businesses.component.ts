import { Component, OnInit, inject, signal } from '@angular/core';

import { BusinessCardComponent } from '../../../../shared/components/business-card/business-card.component';
import { BusinessService } from '../../../../core/services/business.service';
import { Business } from '../../../../core/models/business';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

@Component({
  selector: 'app-popular-businesses',
  standalone: true,
  imports: [BusinessCardComponent, SkeletonComponent],
  templateUrl: './popular-businesses.component.html',
  styleUrl: './popular-businesses.component.scss',
})
export class PopularBusinessesComponent implements OnInit {
  private readonly businessService = inject(BusinessService);

  private readonly displayLimit = 4;

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
      const businesses = await this.businessService.getPopularBusinesses(
        this.displayLimit,
      );

      this.businesses.set(businesses);
    } catch (error: unknown) {
      console.error('Failed to load popular businesses:', error);

      this.businesses.set([]);

      this.errorMessage.set(
        error instanceof Error ? error.message : 'Failed to load businesses.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
