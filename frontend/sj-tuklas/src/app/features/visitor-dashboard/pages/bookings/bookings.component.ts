import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.scss',
})
export class BookingsComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // ============================================================
  // SEARCH
  // ============================================================

  searchTerm = '';

  // ============================================================
  // STATUS FILTER
  // ============================================================

  selectedStatus: 'all' | 'upcoming' | 'pending' | 'completed' | 'cancelled' =
    'all';

  // ============================================================
  // DUMMY BOOKINGS
  // ============================================================

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

  // ============================================================
  // STATUS OPTIONS
  // ============================================================

  readonly statusOptions = [
    {
      id: 'all' as const,
      name: 'All Bookings',
      icon: 'bx-calendar',
    },

    {
      id: 'upcoming' as const,
      name: 'Upcoming',
      icon: 'bx-time-five',
    },

    {
      id: 'pending' as const,
      name: 'Pending',
      icon: 'bx-loader-circle',
    },

    {
      id: 'completed' as const,
      name: 'Completed',
      icon: 'bx-check-circle',
    },

    {
      id: 'cancelled' as const,
      name: 'Cancelled',
      icon: 'bx-x-circle',
    },
  ];

  // ============================================================
  // SELECTED STATUS NAME
  // ============================================================

  get selectedStatusName(): string {
    switch (this.selectedStatus) {
      case 'upcoming':
        return 'Upcoming';

      case 'pending':
        return 'Pending';

      case 'completed':
        return 'Completed';

      case 'cancelled':
        return 'Cancelled';

      default:
        return 'All Bookings';
    }
  }

  // ============================================================
  // FILTERED BOOKINGS
  // ============================================================

  get filteredBookings(): Booking[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.bookings.filter((booking) => {
      // ------------------------------------------------------
      // SEARCH
      // ------------------------------------------------------

      const matchesSearch =
        !search ||
        booking.businessName.toLowerCase().includes(search) ||
        booking.service.toLowerCase().includes(search) ||
        booking.location.toLowerCase().includes(search) ||
        booking.reference.toLowerCase().includes(search);

      // ------------------------------------------------------
      // STATUS
      // ------------------------------------------------------

      const matchesStatus =
        this.selectedStatus === 'all' || booking.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  // ============================================================
  // TOTAL BOOKINGS
  // ============================================================

  get totalBookings(): number {
    return this.bookings.length;
  }

  // ============================================================
  // UPCOMING COUNT
  // ============================================================

  get upcomingCount(): number {
    return this.bookings.filter((booking) => booking.status === 'upcoming')
      .length;
  }

  // ============================================================
  // PENDING COUNT
  // ============================================================

  get pendingCount(): number {
    return this.bookings.filter((booking) => booking.status === 'pending')
      .length;
  }

  // ============================================================
  // COMPLETED COUNT
  // ============================================================

  get completedCount(): number {
    return this.bookings.filter((booking) => booking.status === 'completed')
      .length;
  }

  // ============================================================
  // CANCELLED COUNT
  // ============================================================

  get cancelledCount(): number {
    return this.bookings.filter((booking) => booking.status === 'cancelled')
      .length;
  }

  // ============================================================
  // SELECT STATUS
  // ============================================================

  selectStatus(
    status: 'all' | 'upcoming' | 'pending' | 'completed' | 'cancelled',
  ): void {
    this.selectedStatus = status;
  }

  // ============================================================
  // CLEAR SEARCH
  // ============================================================

  clearSearch(): void {
    this.searchTerm = '';
  }

  // ============================================================
  // RESET FILTERS
  // ============================================================

  resetFilters(): void {
    this.searchTerm = '';

    this.selectedStatus = 'all';
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
  // STATUS ICON
  // ============================================================

  getStatusIcon(status: BookingStatus): string {
    switch (status) {
      case 'upcoming':
        return 'bx-time-five';

      case 'pending':
        return 'bx-loader-circle';

      case 'completed':
        return 'bx-check-circle';

      case 'cancelled':
        return 'bx-x-circle';

      default:
        return 'bx-calendar';
    }
  }

  // ============================================================
  // CANCEL BOOKING
  // ============================================================

  cancelBooking(booking: Booking): void {
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return;
    }

    const confirmed = window.confirm(
      `Cancel your booking at ${booking.businessName}?`,
    );

    if (!confirmed) {
      return;
    }

    booking.status = 'cancelled';
  }

  // ============================================================
  // BOOK AGAIN
  // ============================================================

  bookAgain(booking: Booking): void {
    console.log('Book again:', booking);

    alert(`Booking again at ${booking.businessName}`);
  }

  viewBooking(booking: Booking): void {
    const visitorId = this.route.parent?.snapshot.paramMap.get('id');

    if (!visitorId) {
      console.error('Visitor ID not found.');
      return;
    }

    this.router.navigate(['/dashboard', visitorId, 'bookings', booking.id]);
  }

  // ============================================================
  // TRACK BY
  // ============================================================

  trackByBooking(index: number, booking: Booking): string {
    return booking.id;
  }
}
