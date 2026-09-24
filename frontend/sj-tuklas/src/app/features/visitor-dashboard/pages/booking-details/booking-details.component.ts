import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

type BookingStatus = 'upcoming' | 'pending' | 'completed' | 'cancelled';

interface Booking {
  id: string;
  businessName: string;
  image: string;
  location: string;
  service: string;
  date: string;
  time: string;
  guests: number;
  status: BookingStatus;
  reference: string;
  createdAt: string;
}

@Component({
  selector: 'app-booking-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-details.component.html',
  styleUrl: './booking-details.component.scss',
})
export class BookingDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  booking: Booking | null = null;

  bookings: Booking[] = [
    {
      id: 'booking-001',
      businessName: 'Casa Verde Restaurant',
      image:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      location: 'Mamburao, Occidental Mindoro',
      service: 'Table Reservation',
      date: 'September 28, 2026',
      time: '7:00 PM',
      guests: 4,
      status: 'upcoming',
      reference: 'SJ-BOOK-1001',
      createdAt: 'September 20, 2026',
    },
    {
      id: 'booking-002',
      businessName: 'Brew District Café',
      image:
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
      location: 'Mamburao, Occidental Mindoro',
      service: 'Private Table',
      date: 'October 02, 2026',
      time: '4:30 PM',
      guests: 2,
      status: 'pending',
      reference: 'SJ-BOOK-1002',
      createdAt: 'September 22, 2026',
    },
    {
      id: 'booking-003',
      businessName: 'Glow Beauty Studio',
      image:
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
      location: 'Mamburao, Occidental Mindoro',
      service: 'Hair & Beauty Package',
      date: 'September 30, 2026',
      time: '2:00 PM',
      guests: 1,
      status: 'upcoming',
      reference: 'SJ-BOOK-1003',
      createdAt: 'September 21, 2026',
    },
    {
      id: 'booking-004',
      businessName: 'Lens & Light Studio',
      image:
        'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?auto=format&fit=crop&w=1200&q=80',
      location: 'San Jose, Occidental Mindoro',
      service: 'Prenup Photography',
      date: 'September 15, 2026',
      time: '10:00 AM',
      guests: 2,
      status: 'completed',
      reference: 'SJ-BOOK-1004',
      createdAt: 'September 05, 2026',
    },
    {
      id: 'booking-005',
      businessName: 'Sunset Bay Resort',
      image:
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      location: 'Abra de Ilog, Occidental Mindoro',
      service: 'Family Room',
      date: 'October 10, 2026',
      time: '2:00 PM',
      guests: 5,
      status: 'pending',
      reference: 'SJ-BOOK-1005',
      createdAt: 'September 23, 2026',
    },
    {
      id: 'booking-006',
      businessName: 'Comfort Stay Apartment',
      image:
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      location: 'Calapan City, Oriental Mindoro',
      service: 'Apartment Viewing',
      date: 'September 18, 2026',
      time: '1:00 PM',
      guests: 3,
      status: 'cancelled',
      reference: 'SJ-BOOK-1006',
      createdAt: 'September 10, 2026',
    },
    {
      id: 'booking-007',
      businessName: 'Island Grill House',
      image:
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      location: 'Mamburao, Occidental Mindoro',
      service: 'Dinner Reservation',
      date: 'October 05, 2026',
      time: '6:30 PM',
      guests: 6,
      status: 'upcoming',
      reference: 'SJ-BOOK-1007',
      createdAt: 'September 23, 2026',
    },
    {
      id: 'booking-008',
      businessName: 'Fresh Cuts Barbershop',
      image:
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1200&q=80',
      location: 'Mamburao, Occidental Mindoro',
      service: 'Premium Haircut',
      date: 'September 12, 2026',
      time: '5:00 PM',
      guests: 1,
      status: 'completed',
      reference: 'SJ-BOOK-1008',
      createdAt: 'September 08, 2026',
    },
  ];

  constructor() {
    const bookingId = this.route.snapshot.paramMap.get('bookingId');

    this.booking =
      this.bookings.find((booking) => booking.id === bookingId) ?? null;
  }

  // ============================================================
  // VISITOR ID
  // ============================================================

  get visitorId(): string | null {
    return this.route.parent?.snapshot.paramMap.get('id') ?? null;
  }

  // ============================================================
  // BACK TO BOOKINGS
  // ============================================================

  goBackToBookings(): void {
    const visitorId = this.route.parent?.snapshot.paramMap.get('id');

    if (visitorId) {
      this.router.navigate(['/dashboard', visitorId, 'bookings']);
      return;
    }

    this.router.navigate(['/']);
  }

  // ============================================================
  // STATUS LABEL
  // ============================================================

  getStatusLabel(status: BookingStatus): string {
    switch (status) {
      case 'upcoming':
        return 'Upcoming';

      case 'pending':
        return 'Pending';

      case 'completed':
        return 'Completed';

      case 'cancelled':
        return 'Cancelled';

      default:
        return 'Booking';
    }
  }

  // ============================================================
  // CANCEL BOOKING
  // ============================================================

  cancelBooking(): void {
    if (!this.booking) {
      return;
    }

    if (
      this.booking.status === 'completed' ||
      this.booking.status === 'cancelled'
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel your booking at ${this.booking.businessName}?`,
    );

    if (!confirmed) {
      return;
    }

    this.booking.status = 'cancelled';
  }

  // ============================================================
  // BOOK AGAIN
  // ============================================================

  bookAgain(): void {
    if (!this.booking) {
      return;
    }

    console.log('Book again:', this.booking);

    // Later:
    // this.router.navigate(['/business', businessId, 'book']);
  }
}
