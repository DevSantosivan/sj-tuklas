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

  readonly hasNotifications = computed(() => this.notifications() > 0);

  // =========================================================
  // PRO
  // =========================================================

  readonly isPro = computed(() => this.business()?.isPro ?? false);

  // =========================================================
  // BUSINESS NAME
  // =========================================================

  readonly businessName = computed(() => this.business()?.name ?? 'SJ Tuklas');

  // =========================================================
  // CATEGORY
  // =========================================================

  readonly businessCategory = computed(
    () => this.business()?.category?.trim() ?? '',
  );

  readonly businessType = computed(
    () => this.business()?.businessType?.trim() ?? '',
  );

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
  // FEATURE FLAGS
  // =========================================================

  private isFeatureEnabled(featureKey: string): boolean {
    const features = this.business()?.features as
      | Record<string, boolean | undefined>
      | undefined;

    if (!features) {
      return false;
    }

    const aliases: Record<string, string[]> = {
      menu: ['menu'],
      products: ['products'],
      services: ['services', 'servicesPrograms', 'amenities'],
      rooms: ['rooms', 'roomsUnits', 'units'],
      orders: ['ordering', 'orders', 'orderRequest'],
      bookings: ['booking', 'bookings', 'appointments'],
      reservations: ['reservations'],
      quotes: ['requestQuote', 'request-quote'],
      inquiries: ['inquiries'],
      promotions: ['promotions'],
      events: ['events'],
    };

    const keys = aliases[featureKey] ?? [featureKey];

    return keys.some((key) => features[key] === true);
  }

  // =========================================================
  // CONFIGURED FEATURES
  // Based on category, business type, and feature flags.
  // =========================================================

  readonly configuredBusinessFeatures = computed<BusinessFeature[]>(() => {
    const business = this.business();

    if (!business) {
      return [];
    }

    const category = business.category?.toLowerCase().trim() ?? '';
    const type = business.businessType?.toLowerCase().trim() ?? '';

    // =======================================================
    // BUSINESS TYPE DETECTION
    // =======================================================

    const isFood =
      category.includes('food') ||
      category.includes('restaurant') ||
      category.includes('cafe') ||
      type.includes('restaurant') ||
      type.includes('cafe') ||
      type.includes('food') ||
      type.includes('fast food');

    const isHotel =
      category.includes('hotel') ||
      category.includes('accommodation') ||
      category.includes('resort') ||
      type.includes('hotel') ||
      type.includes('resort') ||
      type.includes('accommodation');

    const isBoardingHouse =
      category.includes('boarding') ||
      type.includes('boarding house') ||
      type.includes('dormitory');

    const isShop =
      category.includes('shop') ||
      category.includes('retail') ||
      category.includes('store') ||
      category.includes('market') ||
      category.includes('grocery');

    const isBeauty =
      category.includes('beauty') ||
      type.includes('salon') ||
      type.includes('beauty') ||
      type.includes('spa');

    const isService =
      category.includes('service') ||
      type.includes('service') ||
      type.includes('repair') ||
      type.includes('computer') ||
      type.includes('it service');

    const isEvents =
      type.includes('event') ||
      type.includes('entertainment') ||
      type.includes('catering');

    const features: BusinessFeature[] = [];

    // =======================================================
    // ADD FEATURE
    // =======================================================

    const add = (
      key: string,
      title: string,
      icon: string,
      route: string,
    ): void => {
      if (this.isFeatureEnabled(key)) {
        features.push({
          key,
          title,
          icon,
          route,
        });
      }
    };

    // =======================================================
    // FOODS & DRINKS
    // =======================================================

    if (isFood) {
      add('menu', 'Menu', 'bx-food-menu', '/business/dashboard/menu');

      add('products', 'Products', 'bx-package', '/business/dashboard/products');

      add('orders', 'Orders', 'bx-receipt', '/business/dashboard/orders');

      add(
        'bookings',
        'Bookings',
        'bx-calendar',
        '/business/dashboard/bookings',
      );

      add(
        'reservations',
        'Reservations',
        'bx-calendar-check',
        '/business/dashboard/bookings',
      );

      add(
        'promotions',
        'Promotions',
        'bx-purchase-tag',
        '/business/dashboard/promotions',
      );

      add(
        'events',
        'Events',
        'bx-calendar-event',
        '/business/dashboard/analytics',
      );

      add(
        'inquiries',
        'Inquiries',
        'bx-message-rounded',
        '/business/dashboard/inquiries',
      );
    }

    // =======================================================
    // HOTELS
    // =======================================================

    if (isHotel) {
      add('rooms', 'Rooms & Units', 'bx-bed', '/business/dashboard/rooms');

      add(
        'bookings',
        'Bookings',
        'bx-calendar',
        '/business/dashboard/bookings',
      );

      add(
        'reservations',
        'Reservations',
        'bx-calendar-check',
        '/business/dashboard/bookings',
      );

      add(
        'services',
        'Amenities',
        'bx-building',
        '/business/dashboard/services',
      );

      add(
        'promotions',
        'Offers',
        'bx-purchase-tag',
        '/business/dashboard/promotions',
      );

      add(
        'inquiries',
        'Inquiries',
        'bx-message-rounded',
        '/business/dashboard/inquiries',
      );
    }

    // =======================================================
    // BOARDING HOUSE
    // =======================================================

    if (isBoardingHouse) {
      add('rooms', 'Rooms & Units', 'bx-bed', '/business/dashboard/rooms');

      add(
        'bookings',
        'Bookings',
        'bx-calendar',
        '/business/dashboard/bookings',
      );

      add(
        'inquiries',
        'Inquiries',
        'bx-message-rounded',
        '/business/dashboard/inquiries',
      );

      add(
        'promotions',
        'Promotions',
        'bx-purchase-tag',
        '/business/dashboard/promotions',
      );
    }

    // =======================================================
    // SHOPS
    // =======================================================

    if (isShop) {
      add('products', 'Products', 'bx-package', '/business/dashboard/products');

      add('orders', 'Orders', 'bx-receipt', '/business/dashboard/orders');

      add(
        'promotions',
        'Promotions',
        'bx-purchase-tag',
        '/business/dashboard/promotions',
      );

      add(
        'inquiries',
        'Inquiries',
        'bx-message-rounded',
        '/business/dashboard/inquiries',
      );
    }

    // =======================================================
    // BEAUTY / SALON
    // =======================================================

    if (isBeauty) {
      add(
        'services',
        'Services',
        'bx-briefcase',
        '/business/dashboard/services',
      );

      add(
        'bookings',
        'Bookings',
        'bx-calendar',
        '/business/dashboard/bookings',
      );

      add(
        'promotions',
        'Promotions',
        'bx-purchase-tag',
        '/business/dashboard/promotions',
      );

      add(
        'inquiries',
        'Inquiries',
        'bx-message-rounded',
        '/business/dashboard/inquiries',
      );
    }

    // =======================================================
    // GENERAL SERVICES
    // =======================================================

    if (isService && !isBeauty) {
      add(
        'services',
        'Services',
        'bx-briefcase',
        '/business/dashboard/services',
      );

      add(
        'quotes',
        'Request Quotes',
        'bx-file',
        '/business/dashboard/bookings',
      );

      add(
        'bookings',
        'Bookings',
        'bx-calendar',
        '/business/dashboard/bookings',
      );

      add(
        'promotions',
        'Promotions',
        'bx-purchase-tag',
        '/business/dashboard/promotions',
      );

      add(
        'inquiries',
        'Inquiries',
        'bx-message-rounded',
        '/business/dashboard/inquiries',
      );
    }

    // =======================================================
    // EVENTS / CATERING
    // =======================================================

    if (isEvents) {
      add(
        'events',
        'Events',
        'bx-calendar-event',
        '/business/dashboard/analytics',
      );

      add(
        'menu',
        'Packages & Menu',
        'bx-food-menu',
        '/business/dashboard/menu',
      );

      add(
        'bookings',
        'Bookings',
        'bx-calendar',
        '/business/dashboard/bookings',
      );

      add(
        'quotes',
        'Request Quotes',
        'bx-file',
        '/business/dashboard/bookings',
      );

      add(
        'promotions',
        'Promotions',
        'bx-purchase-tag',
        '/business/dashboard/promotions',
      );

      add(
        'inquiries',
        'Inquiries',
        'bx-message-rounded',
        '/business/dashboard/inquiries',
      );
    }

    // =======================================================
    // FALLBACK FOR OTHER BUSINESS TYPES
    // =======================================================

    if (features.length === 0) {
      add(
        'services',
        'Services',
        'bx-briefcase',
        '/business/dashboard/services',
      );

      add(
        'bookings',
        'Bookings',
        'bx-calendar',
        '/business/dashboard/bookings',
      );

      add(
        'promotions',
        'Promotions',
        'bx-purchase-tag',
        '/business/dashboard/promotions',
      );

      add(
        'inquiries',
        'Inquiries',
        'bx-message-rounded',
        '/business/dashboard/inquiries',
      );
    }

    // =======================================================
    // REMOVE DUPLICATES
    // =======================================================

    return features.filter(
      (feature, index, array) =>
        array.findIndex((item) => item.key === feature.key) === index,
    );
  });

  // =========================================================
  // BUSINESS FEATURES
  // Free: display as locked.
  // Pro: display as accessible links.
  // =========================================================

  readonly businessFeatures = computed<BusinessFeature[]>(() => {
    return this.configuredBusinessFeatures();
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
    const currentBusiness = this.business();

    if (!currentBusiness) {
      console.warn('REALTIME EVENT RECEIVED BUT NO BUSINESS IS LOADED.');
      return;
    }

    if (currentBusiness.id !== event.businessId) {
      console.warn('REALTIME EVENT BELONGS TO ANOTHER BUSINESS.');
      return;
    }

    const status = event.status?.toLowerCase().trim();

    if (
      status !== 'pending' &&
      status !== 'approved' &&
      status !== 'rejected'
    ) {
      console.warn('INVALID BUSINESS STATUS:', event.status);
      return;
    }

    const updatedBusiness: Business = {
      ...currentBusiness,
      ...(event.business ?? {}),
      status,
    };

    this.business.set(updatedBusiness);

    console.log('BUSINESS UPDATED:', updatedBusiness);
    console.log('BUSINESS STATUS:', this.businessStatus());
    console.log('BUSINESS IS PRO:', this.isPro());
  }

  // =========================================================
  // DESTROY
  // =========================================================

  async ngOnDestroy(): Promise<void> {
    await this.businessRealtimeService.disconnect();
  }
}
