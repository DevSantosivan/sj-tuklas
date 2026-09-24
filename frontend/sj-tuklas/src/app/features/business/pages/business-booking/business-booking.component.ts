import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BUSINESSES } from '../../../../core/data/business.data';

@Component({
  selector: 'app-business-booking',
  imports: [RouterLink],
  templateUrl: './business-booking.component.html',
  styleUrl: './business-booking.component.scss',
})
export class BusinessBookingComponent {
  private route = inject(ActivatedRoute);

  businessId = this.route.snapshot.paramMap.get('id');

  business = computed(() =>
    BUSINESSES.find((business) => business.id === this.businessId),
  );

  bookingEnabled = computed(() => {
    const business = this.business();
    return !!business?.isPro && !!business?.features.booking;
  });
}
