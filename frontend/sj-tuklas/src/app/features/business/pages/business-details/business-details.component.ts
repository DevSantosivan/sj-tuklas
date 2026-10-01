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
import { ReviewService } from '../../../../core/services/review.service';
import { Review, ReviewSummary } from '../../../../core/models/review';
import { BusinessReviewsComponent } from '../../components/business-reviews/business-reviews.component';
import { LoginRequiredModalComponent } from '../../components/login-required-modal/login-required-modal.component';

type FavoriteModalType =
  | 'login'
  | 'inquiry'
  | 'success'
  | 'removed'
  | 'review-success';

@Component({
  selector: 'app-business-details',
  standalone: true,
  imports: [
    RouterLink,
    EmptyStateComponent,
    SkeletonComponent,
    BusinessReviewsComponent,
    LoginRequiredModalComponent,
  ],
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
  private readonly reviewService = inject(ReviewService);

  readonly showReviewLoginMessage = signal(false);

  // =========================================================
  // PAGE STATE
  // =========================================================

  readonly activeTab = signal<'overview' | 'reviews' | 'photos' | 'about'>(
    'overview',
  );

  readonly hasInquiryFeature = computed(() =>
    this.features().some((feature) => feature.key === 'inquiries'),
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
  // FAVORITES + SHARED MODAL
  // =========================================================

  readonly isFavorite = signal(false);
  readonly favoriteLoading = signal(false);
  readonly showFavoriteModal = signal(false);

  readonly favoriteModalType = signal<FavoriteModalType>('login');

  readonly loginModalIcon = computed(() => {
    switch (this.favoriteModalType()) {
      case 'success':
        return 'bx-heart';
      case 'removed':
        return 'bx-heart';
      case 'review-success':
        return 'bx-check-circle';
      case 'inquiry':
        return 'bx-message-square-dots';
      default:
        return 'bx-lock-alt';
    }
  });

  readonly loginModalPrimaryIcon = computed(() => {
    switch (this.favoriteModalType()) {
      case 'success':
      case 'removed':
      case 'review-success':
        return 'bx-check';
      default:
        return 'bx-log-in';
    }
  });

  readonly loginModalEyebrow = computed(() => {
    switch (this.favoriteModalType()) {
      case 'success':
        return 'SAVED TO FAVORITES';
      case 'removed':
        return 'FAVORITES UPDATED';
      case 'review-success':
        return 'REVIEW SUBMITTED';
      case 'inquiry':
        return 'BUSINESS INQUIRY';
      default:
        return 'MEMBER ACCESS';
    }
  });

  readonly loginModalTitle = computed(() => {
    switch (this.favoriteModalType()) {
      case 'success':
        return 'Added to favorites';
      case 'removed':
        return 'Removed from favorites';
      case 'review-success':
        return 'Thank you for your review!';
      case 'inquiry':
        return 'Login to send an inquiry';
      default:
        return this.showReviewLoginMessage()
          ? 'Login to write a review'
          : 'Login to save your favorites';
    }
  });

  readonly loginModalDescription = computed(() => {
    switch (this.favoriteModalType()) {
      case 'success':
        return 'This business has been added to your favorites. You can find it anytime in your saved businesses.';
      case 'removed':
        return 'This business has been removed from your favorites.';
      case 'review-success':
        return 'Your review has been submitted successfully. Thank you for sharing your experience with the community.';
      case 'inquiry':
        return 'Sign in to your SJ Tuklas account to send an inquiry and keep track of your conversations with this business.';
      default:
        return this.showReviewLoginMessage()
          ? 'Sign in to your SJ Tuklas account to share your experience and write a review for this business.'
          : 'Sign in to your SJ Tuklas account to save this business and easily find it again later.';
    }
  });

  readonly loginModalButtonLabel = computed(() =>
    ['success', 'removed', 'review-success'].includes(this.favoriteModalType())
      ? 'Done'
      : 'Login',
  );

  readonly loginModalShowCancel = computed(
    () =>
      !['success', 'removed', 'review-success'].includes(
        this.favoriteModalType(),
      ),
  );

  // =========================================================
  // REVIEW FORM
  // =========================================================

  readonly selectedRating = signal(0);
  readonly reviewText = signal('');
  readonly reviewSubmitted = signal(false);

  readonly reviews = signal<Review[]>([]);
  readonly myReview = signal<Review | null>(null);

  readonly reviewSummary = signal<ReviewSummary>({
    averageRating: 0,
    totalReviews: 0,
    breakdown: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
  });

  readonly reviewsLoading = signal(false);
  readonly reviewSubmitting = signal(false);
  readonly reviewError = signal<string | null>(null);

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

    this.isFavorite.set(false);
    this.reviews.set([]);
    this.myReview.set(null);
    this.reviewSummary.set({
      averageRating: 0,
      totalReviews: 0,
      breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    });
    this.reviewsLoading.set(false);
    this.reviewError.set(null);

    try {
      const business = await this.businessService.getBusinessById(id);

      if (!business) {
        this.error.set('Business not found.');
        return;
      }

      this.business.set(business);
      this.loadReviews(id);
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
  // REVIEWS LOAD
  // =========================================================

  loadReviews(businessId: string): void {
    this.reviewsLoading.set(true);
    this.reviewError.set(null);

    this.reviewService.getReviews(businessId).subscribe({
      next: (reviews) => {
        if (this.businessId() !== businessId) return;

        this.reviews.set(reviews ?? []);
        this.reviewsLoading.set(false);
      },
      error: (error) => {
        if (this.businessId() !== businessId) return;

        console.error('Failed to load reviews:', error);
        this.reviewError.set(
          error?.error?.message ?? 'Unable to load reviews. Please try again.',
        );
        this.reviewsLoading.set(false);
      },
    });

    this.reviewService.getSummary(businessId).subscribe({
      next: (summary) => {
        if (this.businessId() !== businessId) return;

        this.reviewSummary.set(
          summary ?? {
            averageRating: 0,
            totalReviews: 0,
            breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          },
        );
      },
      error: (error) => {
        if (this.businessId() !== businessId) return;
        console.error('Failed to load review summary:', error);
      },
    });

    this.reviewService.getMyReview(businessId).subscribe({
      next: (review) => {
        if (this.businessId() !== businessId) return;
        this.myReview.set(review ?? null);
      },
      error: (error) => {
        if (this.businessId() !== businessId) return;

        if (
          error.status !== 401 &&
          error.status !== 403 &&
          error.status !== 404
        ) {
          console.error('Failed to load current user review:', error);
        }

        this.myReview.set(null);
      },
    });
  }

  // =========================================================
  // FAVORITE STATUS
  // =========================================================

  private loadFavoriteStatus(businessId: string): void {
    if (this.authService.authLoading()) {
      void this.loadFavoriteStatusAfterAuth(businessId);
      return;
    }

    const user = this.authService.currentUser();

    if (!user) {
      this.isFavorite.set(false);
      return;
    }

    this.favoriteService.isFavorite(businessId).subscribe({
      next: (response) => {
        if (this.businessId() !== businessId) return;
        this.isFavorite.set(response.isFavorite);
      },
      error: (error) => {
        console.error('Failed to load favorite status:', error);
        this.isFavorite.set(false);
      },
    });
  }

  private async loadFavoriteStatusAfterAuth(businessId: string): Promise<void> {
    try {
      await this.authService.initialize();
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      this.isFavorite.set(false);
      return;
    }

    if (this.businessId() !== businessId) return;

    const user = this.authService.currentUser();

    if (!user) {
      this.isFavorite.set(false);
      return;
    }

    this.favoriteService.isFavorite(businessId).subscribe({
      next: (response) => {
        if (this.businessId() !== businessId) return;
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

    if (!hours) return [];

    return hours
      .split('\n')
      .map((line) => {
        const match = line.match(/^([^:]+):\s*(.+)$/);

        if (!match) return null;

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

  readonly todayName = computed(() =>
    new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    }).format(new Date()),
  );

  // =========================================================
  // BUSINESS CATEGORY
  // =========================================================

  readonly isHotel = computed(() => this.business()?.category === 'Hotels');

  readonly isBoardingHouse = computed(() => {
    const category = this.business()?.category;
    return category === 'boarding house' || category === 'Boarding Houses';
  });

  readonly isFoodBusiness = computed(
    () => this.business()?.category === 'Foods & Drinks',
  );

  readonly isShop = computed(() => this.business()?.category === 'Shops');

  readonly isServiceBusiness = computed(() => {
    const category = this.business()?.category;
    return category === 'Service' || category === 'Services';
  });

  // =========================================================
  // FAVORITE ACTION
  // =========================================================

  async toggleFavorite(): Promise<void> {
    if (this.favoriteLoading()) return;

    if (this.authService.authLoading()) {
      try {
        await this.authService.initialize();
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
      }
    }

    const user = this.authService.currentUser();

    if (!user) {
      this.showReviewLoginMessage.set(false);
      this.favoriteModalType.set('login');
      this.showFavoriteModal.set(true);
      return;
    }

    const currentBusiness = this.business();

    if (!currentBusiness) return;

    const businessId = currentBusiness.id;
    this.favoriteLoading.set(true);

    if (this.isFavorite()) {
      this.favoriteService.removeFavorite(businessId).subscribe({
        next: (response) => {
          if (this.businessId() !== businessId) return;

          this.isFavorite.set(response.isFavorite);
          this.favoriteModalType.set('removed');
          this.showFavoriteModal.set(true);
          this.favoriteLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to remove favorite:', error);
          this.favoriteLoading.set(false);
        },
      });

      return;
    }

    this.favoriteService.addFavorite(businessId).subscribe({
      next: (response) => {
        if (this.businessId() !== businessId) return;

        this.isFavorite.set(response.isFavorite);
        this.favoriteModalType.set('success');
        this.showFavoriteModal.set(true);
        this.favoriteLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to add favorite:', error);
        this.favoriteLoading.set(false);
      },
    });
  }

  // =========================================================
  // SHARED MODAL ACTIONS
  // =========================================================

  closeFavoriteModal(): void {
    this.showFavoriteModal.set(false);
    this.showReviewLoginMessage.set(false);
  }

  handleLoginModalAction(): void {
    const modalType = this.favoriteModalType();

    if (modalType === 'login' || modalType === 'inquiry') {
      this.goToLogin();
      return;
    }

    this.closeFavoriteModal();
  }

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

    if (!category) return [];

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

    if (!business || !business.isPro) return [];

    const configuredFeatures = this.getBusinessTypeFeatures(business);

    if (!configuredFeatures.length) return [];

    const availableFeatures: {
      key: string;
      title: string;
      description: string;
      icon: string;
      route: string;
    }[] = [];

    for (const feature of configuredFeatures) {
      const featureId = feature.id;

      if (featureId === 'analytics') continue;

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

      if (featureId === 'rooms' && business.features.rooms) {
        let description = feature.description;

        if (business.category === 'Hotels') {
          description = 'Explore rooms, rates, and accommodation options.';
        }

        if (this.isBoardingHouse()) {
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

      if (featureId === 'booking' && business.features.booking) {
        let title = feature.name;
        let description = feature.description;

        if (business.category === 'Hotels' || this.isBoardingHouse()) {
          title = 'Book a Room';
          description =
            business.category === 'Hotels'
              ? 'Book a room directly with this property.'
              : 'Send a room booking request to this boarding house.';
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

      if (featureId === 'inquiries' && business.features.inquiries) {
        let description = feature.description;

        if (business.category === 'Hotels') {
          description =
            'Ask about rooms, rates, amenities, and booking details.';
        }

        if (this.isBoardingHouse()) {
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

        if (this.isServiceBusiness()) {
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
  // INQUIRY
  // =========================================================

  async openInquiry(): Promise<void> {
    const business = this.business();

    if (!business || !this.hasInquiryFeature()) return;

    if (this.authService.authLoading()) {
      try {
        await this.authService.initialize();
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
      }
    }

    const visitorId = this.authService.currentUser()?.id;

    if (!visitorId) {
      this.showReviewLoginMessage.set(false);
      this.favoriteModalType.set('inquiry');
      this.showFavoriteModal.set(true);
      return;
    }

    await this.router.navigate(['/dashboard', visitorId, 'inquiries'], {
      queryParams: {
        businessId: business.id,
      },
    });
  }

  // =========================================================
  // MAP
  // =========================================================

  readonly mapUrl = computed<SafeResourceUrl | null>(() => {
    const business = this.business();

    if (!business?.location) return null;

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

    if (!business?.location) return '#';

    const location = encodeURIComponent(
      `${business.name}, ${business.location}, San Jose, Occidental Mindoro, Philippines`,
    );

    return `https://www.google.com/maps/search/?api=1&query=${location}`;
  });

  // =========================================================
  // REVIEW — RATING
  // =========================================================

  setRating(rating: number): void {
    if (rating < 1 || rating > 5) return;
    this.selectedRating.set(rating);
  }

  // =========================================================
  // REVIEW — TEXT
  // =========================================================

  onReviewTextChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.reviewText.set(textarea.value);
  }

  getAverageRating(): number {
    return this.reviewSummary()?.averageRating ?? 0;
  }

  getReviewTotal(): number {
    return this.reviewSummary()?.totalReviews ?? this.reviews().length;
  }

  // =========================================================
  // REVIEW — SUBMIT
  // =========================================================

  submitReview(): void {
    const businessId = this.businessId();
    const rating = this.selectedRating();
    const comment = this.reviewText().trim();

    if (
      !businessId ||
      rating < 1 ||
      rating > 5 ||
      !comment ||
      this.reviewSubmitting()
    ) {
      return;
    }

    if (!this.authService.currentUser()) {
      if (this.reviewDialog.open) {
        this.reviewDialog.close();
      }

      this.showReviewLoginMessage.set(true);
      this.favoriteModalType.set('login');
      this.showFavoriteModal.set(true);
      return;
    }

    this.reviewSubmitting.set(true);
    this.reviewError.set(null);

    this.reviewService
      .createReview(businessId, {
        rating,
        comment,
      })
      .subscribe({
        next: () => {
          this.reviewSubmitting.set(false);
          this.reviewSubmitted.set(true);
          this.selectedRating.set(0);
          this.reviewText.set('');

          this.loadReviews(businessId);

          this.showReviewLoginMessage.set(false);
          this.favoriteModalType.set('review-success');
          this.showFavoriteModal.set(true);
        },
        error: (error) => {
          console.error('Failed to submit review:', error);

          this.reviewSubmitting.set(false);

          this.reviewError.set(
            error.status === 409
              ? 'You have already reviewed this business.'
              : 'Unable to submit your review. Please try again.',
          );
        },
      });
  }

  async openReviewDialog(): Promise<void> {
    if (this.authService.authLoading()) {
      try {
        await this.authService.initialize();
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
      }
    }

    if (!this.authService.currentUser()) {
      this.showReviewLoginMessage.set(true);
      this.favoriteModalType.set('login');
      this.showFavoriteModal.set(true);
      return;
    }

    this.reviewError.set(null);
    this.reviewDialog.showModal();
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

    if (!business) return;

    if (
      !Number.isFinite(business.latitude) ||
      !Number.isFinite(business.longitude)
    ) {
      return;
    }

    if (!navigator.geolocation) return;

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
        // Location permission denied or unavailable.
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }
}
