import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Business } from '../../../../core/models/business';

import { BusinessService } from '../../../../core/services/business.service';

import {
  BusinessRealtimeService,
  BusinessStatusChangedEvent,
} from '../../../../core/services/business-realtime.service';

interface BusinessFeature {
  key: string;
  title: string;
  icon: string;
  route: string;
}

type BusinessStatus = 'pending' | 'approved' | 'rejected' | null;

@Component({
  selector: 'app-business-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './business-layout.component.html',
  styleUrl: './business-layout.component.scss',
})
export class BusinessLayoutComponent implements OnInit, OnDestroy {
  // =========================================================
  // SERVICES
  // =========================================================

  private readonly businessService = inject(BusinessService);

  private readonly businessRealtimeService = inject(BusinessRealtimeService);

  // =========================================================
  // BUSINESS
  // =========================================================

  readonly business = signal<Business | null>(null);

  readonly isLoading = signal(true);

  // =========================================================
  // BUSINESS STATUS
  // =========================================================

  readonly businessStatus = computed<BusinessStatus>(() => {
    const status = this.business()?.status?.toLowerCase().trim();

    if (
      status === 'pending' ||
      status === 'approved' ||
      status === 'rejected'
    ) {
      return status;
    }

    return null;
  });

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  readonly notifications = signal(2);

  readonly hasNotifications = computed(() => {
    return this.notifications() > 0;
  });

  // =========================================================
  // PRO
  // =========================================================

  readonly isPro = computed(() => {
    return this.business()?.isPro ?? false;
  });

  // =========================================================
  // BUSINESS NAME
  // =========================================================

  readonly businessName = computed(() => {
    return this.business()?.name ?? 'SJ Tuklas';
  });

  // =========================================================
  // CATEGORY
  // =========================================================

  readonly businessCategory = computed(() => {
    return this.business()?.category ?? '';
  });

  // =========================================================
  // STATUS LABEL
  // =========================================================

  readonly statusLabel = computed(() => {
    switch (this.businessStatus()) {
      case 'pending':
        return 'Pending Approval';

      case 'approved':
        return 'Approved';

      case 'rejected':
        return 'Rejected';

      default:
        return 'No Status';
    }
  });

  // =========================================================
  // STATUS ICON
  // =========================================================

  readonly statusIcon = computed(() => {
    switch (this.businessStatus()) {
      case 'pending':
        return 'bx-time-five';

      case 'approved':
        return 'bx-check-circle';

      case 'rejected':
        return 'bx-x-circle';

      default:
        return 'bx-help-circle';
    }
  });

  // =========================================================
  // CATEGORY-BASED BUSINESS TOOLS
  // =========================================================

  readonly businessFeatures = computed<BusinessFeature[]>(() => {
    const category = this.businessCategory().toLowerCase();

    // =======================================================
    // RESTAURANT / FOOD
    // =======================================================

    if (
      category.includes('restaurant') ||
      category.includes('food') ||
      category.includes('cafe') ||
      category.includes('fast food')
    ) {
      return [
        {
          key: 'menu',
          title: 'Menu',
          icon: 'bx-food-menu',
          route: '/business/dashboard/menu',
        },

        {
          key: 'orders',
          title: 'Orders',
          icon: 'bx-receipt',
          route: '/business/dashboard/orders',
        },

        {
          key: 'bookings',
          title: 'Bookings',
          icon: 'bx-calendar',
          route: '/business/dashboard/bookings',
        },

        {
          key: 'promotions',
          title: 'Promotions',
          icon: 'bx-purchase-tag',
          route: '/business/dashboard/promotions',
        },
      ];
    }

    // =======================================================
    // SALON / BEAUTY
    // =======================================================

    if (
      category.includes('salon') ||
      category.includes('beauty') ||
      category.includes('spa')
    ) {
      return [
        {
          key: 'services',
          title: 'Services',
          icon: 'bx-briefcase',
          route: '/business/dashboard/services',
        },

        {
          key: 'bookings',
          title: 'Bookings',
          icon: 'bx-calendar',
          route: '/business/dashboard/bookings',
        },

        {
          key: 'promotions',
          title: 'Promotions',
          icon: 'bx-purchase-tag',
          route: '/business/dashboard/promotions',
        },
      ];
    }

    // =======================================================
    // HOTEL / RESORT
    // =======================================================

    if (
      category.includes('hotel') ||
      category.includes('resort') ||
      category.includes('accommodation')
    ) {
      return [
        {
          key: 'rooms',
          title: 'Rooms',
          icon: 'bx-bed',
          route: '/business/dashboard/rooms',
        },

        {
          key: 'bookings',
          title: 'Bookings',
          icon: 'bx-calendar',
          route: '/business/dashboard/bookings',
        },

        {
          key: 'offers',
          title: 'Offers',
          icon: 'bx-purchase-tag',
          route: '/business/dashboard/promotions',
        },
      ];
    }

    // =======================================================
    // DEFAULT
    // =======================================================

    return [
      {
        key: 'services',
        title: 'Services',
        icon: 'bx-briefcase',
        route: '/business/dashboard/services',
      },

      {
        key: 'bookings',
        title: 'Bookings',
        icon: 'bx-calendar',
        route: '/business/dashboard/bookings',
      },

      {
        key: 'promotions',
        title: 'Promotions',
        icon: 'bx-purchase-tag',
        route: '/business/dashboard/promotions',
      },
    ];
  });

  // =========================================================
  // INIT
  // =========================================================

  async ngOnInit(): Promise<void> {
    await this.loadBusiness();

    await this.startRealtime();
  }

  // =========================================================
  // LOAD MY BUSINESS
  // =========================================================

  private async loadBusiness(): Promise<void> {
    this.isLoading.set(true);

    try {
      const business = await this.businessService.getMyBusiness();

      this.business.set(business);

      console.log('MY BUSINESS:', business);

      console.log('INITIAL BUSINESS STATUS:', business?.status);
    } catch (error) {
      console.error('FAILED TO LOAD BUSINESS:', error);

      this.business.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  // =========================================================
  // START REALTIME
  // =========================================================

  private async startRealtime(): Promise<void> {
    try {
      await this.businessRealtimeService.connect(
        (event: BusinessStatusChangedEvent) => {
          this.handleBusinessStatusChanged(event);
        },
      );
    } catch (error) {
      console.error('FAILED TO CONNECT BUSINESS SIGNALR:', error);
    }
  }

  // =========================================================
  // HANDLE BUSINESS STATUS CHANGE
  // =========================================================

  private handleBusinessStatusChanged(event: BusinessStatusChangedEvent): void {
    console.log('========================================');

    console.log('REALTIME BUSINESS STATUS EVENT');

    console.log('EVENT:', event);

    console.log('BUSINESS ID:', event.businessId);

    console.log('NEW STATUS:', event.status);

    console.log('========================================');

    // =======================================================
    // CURRENT BUSINESS
    // =======================================================

    const currentBusiness = this.business();

    if (!currentBusiness) {
      console.warn('REALTIME EVENT RECEIVED BUT NO BUSINESS IS LOADED.');

      return;
    }

    // =======================================================
    // MAKE SURE EVENT BELONGS TO CURRENT OWNER BUSINESS
    // =======================================================

    if (currentBusiness.id !== event.businessId) {
      console.warn('REALTIME EVENT BELONGS TO ANOTHER BUSINESS.');

      console.warn('CURRENT BUSINESS ID:', currentBusiness.id);

      console.warn('EVENT BUSINESS ID:', event.businessId);

      return;
    }

    // =======================================================
    // VALIDATE STATUS
    // =======================================================

    const status = event.status?.toLowerCase().trim();

    if (
      status !== 'pending' &&
      status !== 'approved' &&
      status !== 'rejected'
    ) {
      console.warn('INVALID BUSINESS STATUS:', event.status);

      return;
    }

    // =======================================================
    // UPDATE BUSINESS
    // =======================================================

    const updatedBusiness: Business = {
      ...currentBusiness,

      ...(event.business ?? {}),

      status,
    };

    // =======================================================
    // UPDATE SIGNAL
    // =======================================================

    this.business.set(updatedBusiness);

    // =======================================================
    // DEBUG
    // =======================================================

    console.log('BUSINESS UPDATED:', updatedBusiness);

    console.log('BUSINESS SIGNAL:', this.business());

    console.log('BUSINESS STATUS COMPUTED:', this.businessStatus());

    console.log('========================================');
  }

  // =========================================================
  // DESTROY
  // =========================================================

  async ngOnDestroy(): Promise<void> {
    await this.businessRealtimeService.disconnect();
  }
}
