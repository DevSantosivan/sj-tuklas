import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { BusinessService } from '../../../../core/services/business.service';
import { Business } from '../../../../core/models/business';

@Component({
  selector: 'app-business-promotions',
  imports: [RouterLink],
  templateUrl: './business-promotions.component.html',
  styleUrl: './business-promotions.component.scss',
})
export class BusinessPromotionsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly businessService = inject(BusinessService);

  business = signal<Business | null>(null);
  loading = signal(true);

  promotionsEnabled = signal(false);

  constructor() {
    this.loadBusiness();
  }

  async loadBusiness(): Promise<void> {
    const businessId = this.route.snapshot.paramMap.get('id');

    if (!businessId) {
      this.loading.set(false);
      return;
    }

    try {
      const business = await this.businessService.getBusinessById(businessId);

      this.business.set(business);

      this.promotionsEnabled.set(
        !!business?.isPro && !!business?.features?.promotions,
      );
    } catch (error) {
      console.error('Failed to load business:', error);
      this.business.set(null);
      this.promotionsEnabled.set(false);
    } finally {
      this.loading.set(false);
    }
  }
}
