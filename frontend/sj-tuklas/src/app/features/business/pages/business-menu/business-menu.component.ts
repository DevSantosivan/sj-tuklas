import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BUSINESSES } from '../../../../core/data/business.data';

@Component({
  selector: 'app-business-menu',
  imports: [RouterLink],
  templateUrl: './business-menu.component.html',
  styleUrl: './business-menu.component.scss',
})
export class BusinessMenuComponent {
  private route = inject(ActivatedRoute);

  businessId = this.route.snapshot.paramMap.get('id');

  business = computed(() =>
    BUSINESSES.find((business) => business.id === this.businessId),
  );

  menuEnabled = computed(() => {
    const business = this.business();
    return !!business?.isPro && !!business?.features.menu;
  });
}
