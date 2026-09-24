import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent {
  // =====================================================
  // DASHBOARD STATS
  // =====================================================

  stats = {
    favorites: 12,
    bookings: 5,
    upcomingBookings: 2,
    orders: 8,
    completedOrders: 6,
    inquiries: 4,
    unreadInquiries: 2,
  };

  // =====================================================
  // UPCOMING BOOKINGS
  // =====================================================

  bookings = [
    {
      business: 'Cafe Luna',
      date: 'September 26, 2026',
      time: '10:00 AM',
      status: 'Confirmed',
      icon: 'bx bx-coffee',
    },
    {
      business: 'Urban Wellness Spa',
      date: 'September 28, 2026',
      time: '2:00 PM',
      status: 'Confirmed',
      icon: 'bx bx-spa',
    },
    {
      business: 'Salon Bella',
      date: 'October 02, 2026',
      time: '4:30 PM',
      status: 'Pending',
      icon: 'bx bx-cut',
    },
  ];

  // =====================================================
  // RECENT ORDERS
  // =====================================================

  orders = [
    {
      business: 'Fresh Bites',
      items: 3,
      amount: 450,
      date: 'Today',
      status: 'Completed',
      icon: 'bx bx-restaurant',
    },
    {
      business: 'The Flower Shop',
      items: 1,
      amount: 850,
      date: 'Yesterday',
      status: 'Completed',
      icon: 'bx bx-flower',
    },
    {
      business: 'Urban Wear',
      items: 2,
      amount: 1200,
      date: 'Sep 21',
      status: 'Processing',
      icon: 'bx bx-shopping-bag',
    },
  ];

  // =====================================================
  // FAVORITES
  // =====================================================

  favorites = [
    {
      name: 'Cafe Luna',
      category: 'Food & Beverages',
      icon: 'bx bx-coffee',
    },
    {
      name: 'The Flower Shop',
      category: 'Retail',
      icon: 'bx bx-flower',
    },
    {
      name: 'Urban Fitness',
      category: 'Health & Fitness',
      icon: 'bx bx-dumbbell',
    },
    {
      name: 'Salon Bella',
      category: 'Beauty & Wellness',
      icon: 'bx bx-cut',
    },
  ];

  // =====================================================
  // NOTIFICATIONS
  // =====================================================

  notifications = [
    {
      title: 'Booking confirmed',
      message: 'Your booking at Cafe Luna has been confirmed.',
      time: '2 hours ago',
      unread: true,
      icon: 'bx bx-calendar-check',
    },
    {
      title: 'Order delivered',
      message: 'Your order from Fresh Bites has been delivered.',
      time: '5 hours ago',
      unread: true,
      icon: 'bx bx-package',
    },
    {
      title: 'New business update',
      message: 'The Flower Shop added new products.',
      time: 'Yesterday',
      unread: false,
      icon: 'bx bx-store',
    },
  ];

  // =====================================================
  // RECENT ACTIVITY
  // =====================================================

  activities = [
    {
      title: 'Added Cafe Luna to favorites',
      description: 'Food & Beverages',
      time: 'Today, 9:42 AM',
      icon: 'bx bx-heart',
    },
    {
      title: 'Completed an order',
      description: 'Fresh Bites · ₱450.00',
      time: 'Today, 8:15 AM',
      icon: 'bx bx-check-circle',
    },
    {
      title: 'Booked an appointment',
      description: 'Urban Wellness Spa',
      time: 'Yesterday, 4:30 PM',
      icon: 'bx bx-calendar',
    },
    {
      title: 'Sent an inquiry',
      description: 'Salon Bella',
      time: 'Sep 22, 2026',
      icon: 'bx bx-message-rounded-dots',
    },
  ];
}
