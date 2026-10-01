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
      quote: ['requestQuote', 'request-quote'],
      inquiries: ['inquiries'],
      promotions: ['promotions'],
      events: ['events'],
    };

    const keys = aliases[featureKey] ?? [featureKey];

    return keys.some((key) => features[key] === true);
  }

  // =========================================================
  // CONFIGURED FEATURES
  // All features available for the business category/type.
  // This list is independent of the Pro subscription.
  // =========================================================

  readonly configuredBusinessFeatures = computed<BusinessFeature[]>(() => {
    const business = this.business();

    if (!business) {
      return [];
    }

    const category = business.category?.toLowerCase().trim() ?? '';
    const type = business.businessType?.toLowerCase().trim() ?? '';

    const isFood =
      category.includes('food') ||
      category.includes('restaurant') ||
      category.includes('cafe') ||
      category.includes('fast food') ||
      type.includes('restaurant') ||
      type.includes('cafe') ||
      type.includes('food');

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
      type.includes('retail') ||
      type.includes('store') ||
      type.includes('market') ||
      type.includes('grocery');

    const isBeauty =
      type.includes('salon') ||
      type.includes('beauty') ||
      type.includes('spa') ||
      category.includes('beauty');

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

    const add = (key: string, title: string, icon: string, route: string) => {
      if (this.isFeatureEnabled(key)) {
        features.push({ key, title, icon, route });
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
        '/business/dashboard/reservations',
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
        '/business/dashboard/events',
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
        '/business/dashboard/reservations',
      );
      add(
        'services',
        'Amenities',
        'bx-concierge-bell',
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
      add('quote', 'Request Quotes', 'bx-file', '/business/dashboard/quotes');
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
        '/business/dashboard/events',
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
      add('quote', 'Request Quotes', 'bx-file', '/business/dashboard/quotes');
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
    // FALLBACK
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

    // Avoid duplicate navigation items when a business matches
    // more than one category/type condition.
    return features.filter(
      (feature, index, array) =>
        array.findIndex((item) => item.key === feature.key) === index,
    );
  });

  // =========================================================
  // BUSINESS FEATURES
  // Pro businesses can access enabled tools.
  // Free businesses see the same tools as locked items.
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
  }

  // =========================================================
  // DESTROY
  // =========================================================

  async ngOnDestroy(): Promise<void> {
    await this.businessRealtimeService.disconnect();
  }
}
