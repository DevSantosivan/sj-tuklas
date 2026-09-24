import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

interface Order {
  id: string;
  businessName: string;
  image: string;
  location: string;
  productSummary: string;
  items: number;
  date: string;
  total: string;
  status: OrderStatus;
  reference: string;
  createdAt: string;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class OrdersComponent {
  searchTerm = '';

  selectedStatus: 'all' | 'pending' | 'processing' | 'completed' | 'cancelled' =
    'all';

  /* =====================================================
     SAMPLE ORDERS
  ====================================================== */

  orders: Order[] = [
    {
      id: 'order-001',
      businessName: 'Casa Verde Restaurant',
      image:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      location: 'Mamburao, Occidental Mindoro',
      productSummary: 'Family Meal Set',
      items: 4,
      date: 'September 23, 2026',
      total: '₱1,250',
      status: 'processing',
      reference: 'SJ-ORD-1001',
      createdAt: 'September 23, 2026',
    },

    {
      id: 'order-002',
      businessName: 'Brew District Café',
      image:
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
      location: 'Mamburao, Occidental Mindoro',
      productSummary: 'Coffee & Pastry Bundle',
      items: 3,
      date: 'September 23, 2026',
      total: '₱420',
      status: 'pending',
      reference: 'SJ-ORD-1002',
      createdAt: 'September 23, 2026',
    },

    {
      id: 'order-003',
      businessName: 'Island Grill House',
      image:
        'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
      location: 'Mamburao, Occidental Mindoro',
      productSummary: 'Grilled Chicken Platter',
      items: 2,
      date: 'September 22, 2026',
      total: '₱780',
      status: 'completed',
      reference: 'SJ-ORD-1003',
      createdAt: 'September 22, 2026',
    },

    {
      id: 'order-004',
      businessName: 'Fresh Market',
      image:
        'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
      location: 'Mamburao, Occidental Mindoro',
      productSummary: 'Fresh Produce Bundle',
      items: 7,
      date: 'September 21, 2026',
      total: '₱965',
      status: 'completed',
      reference: 'SJ-ORD-1004',
      createdAt: 'September 21, 2026',
    },

    {
      id: 'order-005',
      businessName: 'Sunset Bay Resort',
      image:
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      location: 'Abra de Ilog, Occidental Mindoro',
      productSummary: 'Breakfast Package',
      items: 5,
      date: 'September 20, 2026',
      total: '₱1,500',
      status: 'cancelled',
      reference: 'SJ-ORD-1005',
      createdAt: 'September 19, 2026',
    },

    {
      id: 'order-006',
      businessName: 'Bakes & Brews',
      image:
        'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=80',
      location: 'San Jose, Occidental Mindoro',
      productSummary: 'Pastry Box',
      items: 6,
      date: 'September 18, 2026',
      total: '₱690',
      status: 'completed',
      reference: 'SJ-ORD-1006',
      createdAt: 'September 18, 2026',
    },

    {
      id: 'order-007',
      businessName: 'Daily Brew Coffee',
      image:
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
      location: 'Mamburao, Occidental Mindoro',
      productSummary: 'Coffee Lover Bundle',
      items: 4,
      date: 'September 17, 2026',
      total: '₱560',
      status: 'processing',
      reference: 'SJ-ORD-1007',
      createdAt: 'September 17, 2026',
    },
  ];

  /* =====================================================
     STATUS OPTIONS
  ====================================================== */

  readonly statusOptions = [
    {
      id: 'all' as const,
      name: 'All Orders',
      icon: 'bx-receipt',
    },

    {
      id: 'pending' as const,
      name: 'Pending',
      icon: 'bx-time-five',
    },

    {
      id: 'processing' as const,
      name: 'Processing',
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

  /* =====================================================
     FILTERED ORDERS
  ====================================================== */

  get filteredOrders(): Order[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.orders.filter((order) => {
      const matchesSearch =
        !search ||
        order.businessName.toLowerCase().includes(search) ||
        order.productSummary.toLowerCase().includes(search) ||
        order.location.toLowerCase().includes(search) ||
        order.reference.toLowerCase().includes(search);

      const matchesStatus =
        this.selectedStatus === 'all' || order.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  /* =====================================================
     COUNTS
  ====================================================== */

  get totalOrders(): number {
    return this.orders.length;
  }

  get pendingCount(): number {
    return this.orders.filter((order) => order.status === 'pending').length;
  }

  get processingCount(): number {
    return this.orders.filter((order) => order.status === 'processing').length;
  }

  get completedCount(): number {
    return this.orders.filter((order) => order.status === 'completed').length;
  }

  get cancelledCount(): number {
    return this.orders.filter((order) => order.status === 'cancelled').length;
  }

  /* =====================================================
     SELECT STATUS
  ====================================================== */

  selectStatus(
    status: 'all' | 'pending' | 'processing' | 'completed' | 'cancelled',
  ): void {
    this.selectedStatus = status;
  }

  /* =====================================================
     STATUS TITLE
  ====================================================== */

  get selectedStatusName(): string {
    switch (this.selectedStatus) {
      case 'pending':
        return 'Pending';

      case 'processing':
        return 'Processing';

      case 'completed':
        return 'Completed';

      case 'cancelled':
        return 'Cancelled';

      default:
        return 'All Orders';
    }
  }

  /* =====================================================
     STATUS LABEL
  ====================================================== */

  getStatusLabel(status: OrderStatus): string {
    switch (status) {
      case 'pending':
        return 'Pending';

      case 'processing':
        return 'Processing';

      case 'completed':
        return 'Completed';

      case 'cancelled':
        return 'Cancelled';

      default:
        return 'Order';
    }
  }

  /* =====================================================
     SEARCH
  ====================================================== */

  clearSearch(): void {
    this.searchTerm = '';
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = 'all';
  }

  /* =====================================================
     ACTIONS
  ====================================================== */

  viewOrder(order: Order): void {
    console.log('View order:', order);
  }

  reorder(order: Order): void {
    console.log('Reorder:', order);

    alert(`Reordering from ${order.businessName}`);
  }

  /* =====================================================
     TRACK BY
  ====================================================== */

  trackByOrder(index: number, order: Order): string {
    return order.id;
  }
}
