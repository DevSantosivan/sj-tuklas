import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { BusinessService } from '../../../../core/services/business.service';
import { Business } from '../../../../core/models/business';

@Component({
  selector: 'app-business-services',
  imports: [RouterLink],
  templateUrl: './business-services.component.html',
  styleUrl: './business-services.component.scss',
})
export class BusinessServicesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly businessService = inject(BusinessService);

  business = signal<Business | null>(null);
  loading = signal(true);

  servicesEnabled = signal(false);

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

      this.servicesEnabled.set(
        !!business?.isPro && !!business?.features?.services,
      );
    } catch (error) {
      console.error('Failed to load business:', error);
      this.business.set(null);
      this.servicesEnabled.set(false);
    } finally {
      this.loading.set(false);
    }
  }
}
