import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { BUSINESSES } from '../../../../core/data/business.data';

@Component({
  selector: 'app-business-availability',
  imports: [RouterLink],
  templateUrl: './business-availability.component.html',
  styleUrl: './business-availability.component.scss',
})
export class BusinessAvailabilityComponent {
  private route = inject(ActivatedRoute);

  businessId = this.route.snapshot.paramMap.get('id');

  business = computed(() =>
    BUSINESSES.find((business) => business.id === this.businessId),
  );

  checkIn = signal('');
  checkOut = signal('');
  guests = signal(1);

  searched = signal(false);
  available = signal(false);

  onCheckInChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.checkIn.set(input.value);
    this.searched.set(false);
  }

  onCheckOutChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.checkOut.set(input.value);
    this.searched.set(false);
  }

  onGuestsChange(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.guests.set(Number(select.value));
    this.searched.set(false);
  }

  checkAvailability(): void {
    const checkIn = this.checkIn();
    const checkOut = this.checkOut();

    if (!checkIn || !checkOut) {
      return;
    }

    if (checkOut <= checkIn) {
      this.available.set(false);
      this.searched.set(true);
      return;
    }

    this.searched.set(true);

    // Temporary demo result.
    // Later this will check actual rooms/reservations
    // from the database.
    this.available.set(true);
  }

  resetSearch(): void {
    this.checkIn.set('');
    this.checkOut.set('');
    this.guests.set(1);

    this.searched.set(false);
    this.available.set(false);
  }
}
