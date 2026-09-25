import {
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { BusinessService } from '../../../../core/services/business.service';
import { Business } from '../../../../core/models/business';
import {
  BusinessFeature,
  BUSINESS_CATEGORIES,
} from '../../../../core/data/business-category.data';

import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { AuthService } from '../../../../core/services/auth.service';
import { FavoriteService } from '../../../../core/services/favorite.service';

@Component({
  selector: 'app-business-details',
  imports: [RouterLink, EmptyStateComponent, SkeletonComponent],
  templateUrl: './business-details.component.html',
  styleUrl: './business-details.component.scss',
})
export class BusinessDetailsComponent {
  // =========================================================
  // DEPENDENCIES
  // =========================================================

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly businessService = inject(BusinessService);
  private readonly authService = inject(AuthService);
  private readonly favoriteService = inject(FavoriteService);

  // =========================================================
  // PAGE STATE
  // =========================================================

  readonly activeTab = signal<'overview' | 'reviews' | 'photos' | 'about'>(
    'overview',
  );

  readonly isLoading = signal(true);

  readonly loading = signal(true);

  readonly error = signal<string | null>(null);

  // =========================================================
  // BUSINESS
  // =========================================================

  readonly businessId = signal<string | null>(null);

  readonly business = signal<Business | null>(null);

  // =========================================================
  // BUSINESS STATUS
  // =========================================================

  readonly isOpenToday = signal(true);

  // =========================================================
  // FAVORITES
  // =========================================================

  readonly isFavorite = signal(false);

  readonly favoriteLoading = signal(false);

  readonly showFavoriteModal = signal(false);

  readonly favoriteModalType = signal<'login' | 'success' | 'removed'>('login');

  // =========================================================
  // REVIEW FORM
  // =========================================================

  readonly selectedRating = signal(0);

  readonly reviewText = signal('');

  readonly reviewSubmitted = signal(false);

  @ViewChild('reviewDialog', { read: ElementRef })
  private readonly reviewDialogElement!: ElementRef<HTMLDialogElement>;

  get reviewDialog(): HTMLDialogElement {
    return this.reviewDialogElement.nativeElement;
  }

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      this.businessId.set(id);

      if (!id) {
        this.business.set(null);

        this.error.set('Business not found.');

        this.loading.set(false);

        this.isLoading.set(false);

        return;
      }

      void this.loadBusiness(id);
    });
  }

  // =========================================================
  // TABS
  // =========================================================

  setActiveTab(tab: 'overview' | 'reviews' | 'photos' | 'about'): void {
    this.activeTab.set(tab);
  }

  // =========================================================
  // BUSINESS LOAD
  // =========================================================

  async loadBusiness(id: string): Promise<void> {
    this.loading.set(true);

    this.isLoading.set(true);

    this.error.set(null);

    this.business.set(null);

    // Reset favorite state while changing business.
    this.isFavorite.set(false);

    try {
      const business = await this.businessService.getBusinessById(id);

      if (!business) {
        this.error.set('Business not found.');

        return;
      }

      this.business.set(business);

      /*
       * Load favorite status separately.
       *
       * This uses the currently authenticated user
       * from the backend through the HttpOnly auth cookie.
       */
      this.loadFavoriteStatus(id);
    } catch (error) {
      console.error('Failed to load business:', error);

      this.error.set(
        error instanceof Error ? error.message : 'Failed to load business.',
      );

      this.business.set(null);
    } finally {
      this.loading.set(false);

      this.isLoading.set(false);
    }
  }

  // =========================================================
  // FAVORITE STATUS
  // =========================================================

  private loadFavoriteStatus(businessId: string): void {
    /*
     * If authentication is still being initialized,
     * do not immediately assume the business is not favorite.
     */
    if (this.authService.authLoading()) {
      void this.loadFavoriteStatusAfterAuth(businessId);

      return;
    }

    const user = this.authService.currentUser();

    /*
     * Visitor / logged out user.
     *
     * No backend favorite request is necessary because
     * favorites belong to authenticated users.
     */
    if (!user) {
      this.isFavorite.set(false);

      return;
    }

    this.favoriteService.isFavorite(businessId).subscribe({
      next: (response) => {
        /*
         * Make sure the response still belongs to
         * the currently displayed business.
         */
        if (this.businessId() !== businessId) {
          return;
        }

        this.isFavorite.set(response.isFavorite);
      },

      error: (error) => {
        console.error('Failed to load favorite status:', error);

        /*
         * Do not block the business details page
         * when favorite status fails to load.
         */
        this.isFavorite.set(false);
      },
    });
  }

  // =========================================================
  // FAVORITE STATUS — WAIT FOR AUTH
  // =========================================================

  private async loadFavoriteStatusAfterAuth(businessId: string): Promise<void> {
    try {
      await this.authService.initialize();
    } catch (error) {
      console.error('Failed to initialize authentication:', error);

      this.isFavorite.set(false);

      return;
    }

    /*
     * Business may have changed while authentication
     * was initializing.
     */
    if (this.businessId() !== businessId) {
      return;
    }

    const user = this.authService.currentUser();

    if (!user) {
      this.isFavorite.set(false);

      return;
    }

    this.favoriteService.isFavorite(businessId).subscribe({
      next: (response) => {
        if (this.businessId() !== businessId) {
          return;
        }

        this.isFavorite.set(response.isFavorite);
      },

      error: (error) => {
        console.error('Failed to load favorite status:', error);

        this.isFavorite.set(false);
      },
    });
  }

  // =========================================================
  // BUSINESS HOURS
  // =========================================================

  readonly formattedHours = computed(() => {
    const hours = this.business()?.hours;

    if (!hours) {
      return [];
    }

    return hours
      .split('\n')
      .map((line) => {
        const match = line.match(/^([^:]+):\s*(.+)$/);

        if (!match) {
          return null;
        }

        return {
          day: match[1].trim(),
          time: match[2].trim(),
        };
      })
      .filter(
        (
          item,
        ): item is {
          day: string;
          time: string;
        } => item !== null,
      );
  });

  readonly todayName = computed(() => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    }).format(new Date());
  });

  // =========================================================
  // BUSINESS CATEGORY
  // =========================================================

  readonly isHotel = computed(() => {
    return this.business()?.category === 'Hotels';
  });

  readonly isBoardingHouse = computed(() => {
    return this.business()?.category === 'Boarding Houses';
  });

  readonly isFoodBusiness = computed(() => {
    return this.business()?.category === 'Foods & Drinks';
  });

  readonly isShop = computed(() => {
    return this.business()?.category === 'Shops';
  });

  readonly isServiceBusiness = computed(() => {
    return this.business()?.category === 'Services';
  });

  // =========================================================
  // FAVORITE
  // =========================================================

  async toggleFavorite(): Promise<void> {
    /*
     * Prevent duplicate clicks while a favorite request
     * is already being processed.
     */
    if (this.favoriteLoading()) {
      return;
    }

    /*
     * Make sure authentication state has been initialized.
     */
    if (this.authService.authLoading()) {
      try {
        await this.authService.initialize();
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
      }
    }

    const user = this.authService.currentUser();

    // =======================================================
    // NOT LOGGED IN
    // =======================================================

    if (!user) {
      this.favoriteModalType.set('login');

      this.showFavoriteModal.set(true);

      return;
    }

    // =======================================================
    // GET CURRENT BUSINESS
    // =======================================================

    const currentBusiness = this.business();

    if (!currentBusiness) {
      return;
    }

    const businessId = currentBusiness.id;

    // =======================================================
    // START REQUEST
    // =======================================================

    this.favoriteLoading.set(true);

    // =======================================================
    // REMOVE FAVORITE
    // =======================================================

    if (this.isFavorite()) {
      this.favoriteService.removeFavorite(businessId).subscribe({
        next: (response) => {
          /*
           * Make sure the response is still for
           * the currently displayed business.
           */
          if (this.businessId() !== businessId) {
            return;
          }

          this.isFavorite.set(response.isFavorite);

          this.favoriteModalType.set('removed');

          this.showFavoriteModal.set(true);

          this.favoriteLoading.set(false);
        },

        error: (error) => {
          console.error('Failed to remove favorite:', error);

          /*
           * Keep the current favorite state if
           * the backend request failed.
           */
          this.favoriteLoading.set(false);
        },
      });

      return;
    }

    // =======================================================
    // ADD FAVORITE
    // =======================================================

    this.favoriteService.addFavorite(businessId).subscribe({
      next: (response) => {
        /*
         * Make sure the response is still for
         * the currently displayed business.
         */
        if (this.businessId() !== businessId) {
          return;
        }

        this.isFavorite.set(response.isFavorite);

        this.favoriteModalType.set('success');

        this.showFavoriteModal.set(true);

        this.favoriteLoading.set(false);
      },

      error: (error) => {
        console.error('Failed to add favorite:', error);

        /*
         * Keep the current state when the request
         * fails.
         */
        this.favoriteLoading.set(false);
      },
    });
  }

  // =========================================================
  // CLOSE FAVORITE MODAL
  // =========================================================

  closeFavoriteModal(): void {
    this.showFavoriteModal.set(false);
  }

  // =========================================================
  // LOGIN
  // =========================================================

  goToLogin(): void {
    this.showFavoriteModal.set(false);

    void this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: this.router.url,
      },
    });
  }

  // =========================================================
  // BUSINESS TYPE FEATURES
  // =========================================================

  private getBusinessTypeFeatures(business: Business): BusinessFeature[] {
    const category = BUSINESS_CATEGORIES.find(
      (category) => category.name === business.category,
    );

    if (!category) {
      return [];
    }

    const businessType = category.types.find(
      (type) => type.name === business.businessType,
    );

    return businessType?.features ?? [];
  }

  // =========================================================
  // AVAILABLE FEATURES
  // =========================================================

  readonly features = computed(() => {
    const business = this.business();

    if (!business) {
      return [];
    }

    if (!business.isPro) {
      return [];
    }

    const configuredFeatures = this.getBusinessTypeFeatures(business);

    if (!configuredFeatures.length) {
      return [];
    }

    const availableFeatures: {
      key: string;
      title: string;
      description: string;
      icon: string;
      route: string;
    }[] = [];

    for (const feature of configuredFeatures) {
      const featureId = feature.id;

      // =====================================================
      // ANALYTICS
      // =====================================================

      if (featureId === 'analytics') {
        continue;
      }

      // =====================================================
      // MENU
      // =====================================================

      if (featureId === 'menu' && business.features.menu) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/menu`,
        });

        continue;
      }

      // =====================================================
      // PRODUCTS
      // =====================================================

      if (featureId === 'products' && business.features.products) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/products`,
        });

        continue;
      }

      // =====================================================
      // SERVICES
      // =====================================================

      if (featureId === 'services' && business.features.services) {
        let description = feature.description;

        if (business.category === 'Hotels') {
          description =
            'Explore the services and amenities available at this property.';
        }

        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description,
          icon: feature.icon,
          route: `/business/${business.id}/services`,
        });

        continue;
      }

      // =====================================================
      // SERVICES / PROGRAMS
      // =====================================================

      if (featureId === 'services-programs' && business.features.services) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/services`,
        });

        continue;
      }

      // =====================================================
      // AMENITIES
      // =====================================================

      if (featureId === 'amenities' && business.features.services) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/services`,
        });

        continue;
      }

      // =====================================================
      // ROOMS
      // =====================================================

      if (featureId === 'rooms' && business.features.rooms) {
        let description = feature.description;

        if (business.category === 'Hotels') {
          description = 'Explore rooms, rates, and accommodation options.';
        }

        if (business.category === 'Boarding Houses') {
          description = 'View rooms, monthly rates, and accommodation details.';
        }

        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description,
          icon: feature.icon,
          route: `/business/${business.id}/rooms`,
        });

        continue;
      }

      // =====================================================
      // ROOMS / UNITS
      // =====================================================

      if (featureId === 'rooms-units' && business.features.rooms) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/rooms`,
        });

        continue;
      }

      // =====================================================
      // UNITS
      // =====================================================

      if (featureId === 'units' && business.features.rooms) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/rooms`,
        });

        continue;
      }

      // =====================================================
      // ORDERING
      // =====================================================

      if (featureId === 'ordering' && business.features.ordering) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/order`,
        });

        continue;
      }

      // =====================================================
      // ORDER REQUEST
      // =====================================================

      if (featureId === 'order-request' && business.features.ordering) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/order`,
        });

        continue;
      }

      // =====================================================
      // BOOKING
      // =====================================================

      if (featureId === 'booking' && business.features.booking) {
        let title = feature.name;
        let description = feature.description;

        if (business.category === 'Hotels') {
          title = 'Book a Room';
          description = 'Book a room directly with this property.';
        }

        if (business.category === 'Boarding Houses') {
          title = 'Book a Room';
          description = 'Send a room booking request to this boarding house.';
        }

        if (business.businessType === 'Catering') {
          title = 'Request Booking';
          description = 'Send a catering booking request to this business.';
        }

        if (business.businessType === 'Events & Entertainment') {
          title = 'Book Now';
          description =
            'Book an event or entertainment service with this business.';
        }

        availableFeatures.push({
          key: featureId,
          title,
          description,
          icon: feature.icon,
          route: `/business/${business.id}/book`,
        });

        continue;
      }

      // =====================================================
      // BOOKING REQUEST
      // =====================================================

      if (featureId === 'booking-request' && business.features.booking) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/book`,
        });

        continue;
      }

      // =====================================================
      // BOOKING INQUIRY
      // =====================================================

      if (featureId === 'booking-inquiry' && business.features.booking) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/book`,
        });

        continue;
      }

      // =====================================================
      // BOOKING ENROLLMENT
      // =====================================================

      if (featureId === 'booking-enrollment' && business.features.booking) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/book`,
        });

        continue;
      }

      // =====================================================
      // RESERVATIONS
      // =====================================================

      if (featureId === 'reservations' && business.features.reservations) {
        let title = feature.name;
        let description = feature.description;

        if (business.category === 'Foods & Drinks') {
          title = 'Reserve a Table';
          description = 'Reserve a table for your preferred date and time.';
        }

        availableFeatures.push({
          key: featureId,
          title,
          description,
          icon: feature.icon,
          route: `/business/${business.id}/reserve`,
        });

        continue;
      }

      // =====================================================
      // REQUEST QUOTE
      // =====================================================

      if (featureId === 'request-quote' && business.features.requestQuote) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/quote`,
        });

        continue;
      }

      // =====================================================
      // INQUIRIES
      // =====================================================

      if (featureId === 'inquiries' && business.features.inquiries) {
        let description = feature.description;

        if (business.category === 'Hotels') {
          description =
            'Ask about rooms, rates, amenities, and booking details.';
        }

        if (business.category === 'Boarding Houses') {
          description =
            'Ask about rooms, requirements, rates, house rules, and move-in details.';
        }

        if (business.category === 'Shops') {
          description = 'Ask about products, prices, and store details.';
        }

        if (business.category === 'Foods & Drinks') {
          description =
            'Ask about menu items, orders, and other business details.';
        }

        if (business.category === 'Services') {
          description =
            'Ask about services, pricing, schedules, and business details.';
        }

        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description,
          icon: feature.icon,
          route: `/business/${business.id}/inquire`,
        });

        continue;
      }

      // =====================================================
      // PROMOTIONS
      // =====================================================

      if (featureId === 'promotions' && business.features.promotions) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/promotions`,
        });

        continue;
      }

      // =====================================================
      // EVENTS
      // =====================================================

      if (featureId === 'events' && business.features.events) {
        availableFeatures.push({
          key: featureId,
          title: feature.name,
          description: feature.description,
          icon: feature.icon,
          route: `/business/${business.id}/events`,
        });
      }
    }

    return availableFeatures;
  });

  // =========================================================
  // MAP
  // =========================================================

  readonly mapUrl = computed<SafeResourceUrl | null>(() => {
    const business = this.business();

    if (!business?.location) {
      return null;
    }

    const location = encodeURIComponent(
      `${business.name}, ${business.location}, San Jose, Occidental Mindoro, Philippines`,
    );

    const url = `https://www.google.com/maps?q=${location}&output=embed`;

    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  // =========================================================
  // DIRECTIONS URL
  // =========================================================

  readonly directionsUrl = computed(() => {
    const business = this.business();

    if (!business?.location) {
      return '#';
    }

    const location = encodeURIComponent(
      `${business.name}, ${business.location}, San Jose, Occidental Mindoro, Philippines`,
    );

    return `https://www.google.com/maps/search/?api=1&query=${location}`;
  });

  // =========================================================
  // REVIEW — RATING
  // =========================================================

  setRating(rating: number): void {
    if (rating < 1 || rating > 5) {
      return;
    }

    this.selectedRating.set(rating);
  }

  // =========================================================
  // REVIEW — TEXT
  // =========================================================

  onReviewTextChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;

    this.reviewText.set(textarea.value);
  }

  // =========================================================
  // REVIEW — SUBMIT
  // =========================================================

  submitReview(): void {
    const rating = this.selectedRating();

    const comment = this.reviewText().trim();

    if (rating === 0) {
      return;
    }

    if (!comment) {
      return;
    }

    /*
     * UI ONLY FOR NOW
     *
     * Later:
     *
     * this.reviewService.create({
     *   businessId: this.businessId(),
     *   rating,
     *   comment
     * });
     */

    this.reviewSubmitted.set(true);

    this.selectedRating.set(0);

    this.reviewText.set('');
  }

  // =========================================================
  // REVIEW — WRITE ANOTHER
  // =========================================================

  writeAnotherReview(): void {
    this.reviewSubmitted.set(false);
  }

  // =========================================================
  // DIRECTIONS
  // =========================================================

  openDirections(): void {
    const business = this.business();

    if (!business) {
      return;
    }

    if (
      !Number.isFinite(business.latitude) ||
      !Number.isFinite(business.longitude)
    ) {
      return;
    }

    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void this.router.navigate(['/directions', business.id], {
          queryParams: {
            fromLat: position.coords.latitude,
            fromLng: position.coords.longitude,
          },
        });
      },
      () => {
        // Location permission denied.
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }
}
