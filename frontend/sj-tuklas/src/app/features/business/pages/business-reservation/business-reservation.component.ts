import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { BUSINESSES } from '../../../../core/data/business.data';

@Component({
  selector: 'app-business-reservation',
  imports: [RouterLink, FormsModule],
  templateUrl: './business-reservation.component.html',
  styleUrl: './business-reservation.component.scss',
})
export class BusinessReservationComponent {
  private route = inject(ActivatedRoute);

  // =========================
  // BUSINESS
  // =========================

  businessId = this.route.snapshot.paramMap.get('id');

  business = computed(() =>
    BUSINESSES.find((business) => business.id === this.businessId),
  );

  businessName = computed(() => this.business()?.name ?? 'Business');

  // =========================
  // FORM
  // =========================

  reservationDate = signal('');
  reservationTime = signal('');
  guests = signal(1);
  specialRequest = signal('');

  // =========================
  // UI STATE
  // =========================

  isSubmitting = signal(false);
  submitted = signal(false);

  // =========================
  // FORM HANDLERS
  // =========================

  onDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.reservationDate.set(input.value);
  }

  onTimeChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.reservationTime.set(input.value);
  }

  onGuestsChange(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.guests.set(Number(select.value));
  }

  onRequestChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;

    this.specialRequest.set(textarea.value);
  }

  // =========================
  // SUBMIT
  // =========================

  submitReservation(): void {
    if (
      !this.reservationDate() ||
      !this.reservationTime() ||
      this.guests() < 1
    ) {
      return;
    }

    this.isSubmitting.set(true);

    // Temporary simulation.
    // Later, this will connect to Supabase.
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.submitted.set(true);
    }, 800);
  }

  // =========================
  // RESET
  // =========================

  makeAnotherReservation(): void {
    this.reservationDate.set('');
    this.reservationTime.set('');
    this.guests.set(1);
    this.specialRequest.set('');

    this.submitted.set(false);
  }
}
