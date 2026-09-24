import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { BusinessService } from '../../../../core/services/business.service';

import {
  BusinessRealtimeService,
  BusinessStatusChangedEvent,
  UserRegisteredEvent,
} from '../../../../core/services/business-realtime.service';

import { CommunityStatsService } from '../../../../core/services/community-stats.service';

@Component({
  selector: 'app-community-stats',
  standalone: true,
  imports: [],
  templateUrl: './community-stats.component.html',
  styleUrl: './community-stats.component.scss',
})
export class CommunityStatsComponent implements OnInit, OnDestroy {
  // =========================================================
  // SERVICES
  // =========================================================

  private readonly communityStatsService = inject(CommunityStatsService);

  private readonly businessService = inject(BusinessService);

  private readonly businessRealtimeService = inject(BusinessRealtimeService);

  // =========================================================
  // ACTUAL VALUES
  // =========================================================

  readonly registeredUsers = signal(0);

  readonly businesses = signal(0);

  readonly categories = signal(5);

  readonly services = signal(0);

  // =========================================================
  // ANIMATED VALUES
  // =========================================================

  readonly animatedRegisteredUsers = signal(0);

  readonly animatedBusinesses = signal(0);

  readonly animatedCategories = signal(8);

  readonly animatedServices = signal(0);

  // =========================================================
  // STATE
  // =========================================================

  readonly loading = signal(true);

  readonly error = signal(false);

  readonly realtimeUpdating = signal(false);

  // =========================================================
  // DISPLAY
  // =========================================================

  readonly registeredUsersDisplay = computed(() =>
    this.formatNumber(this.animatedRegisteredUsers()),
  );

  readonly businessesDisplay = computed(() =>
    this.formatNumber(this.animatedBusinesses()),
  );

  readonly categoriesDisplay = computed(() =>
    this.formatNumber(this.animatedCategories()),
  );

  readonly servicesDisplay = computed(() =>
    this.formatNumber(this.animatedServices()),
  );

  // =========================================================
  // BUSINESS REALTIME HANDLER
  // =========================================================

  private readonly realtimeHandler = (
    event: BusinessStatusChangedEvent,
  ): void => {
    void this.handleBusinessRealtimeUpdate(event);
  };

  // =========================================================
  // USER REGISTERED HANDLER
  // =========================================================

  private readonly userRegisteredHandler = (
    event: UserRegisteredEvent,
  ): void => {
    void this.handleUserRegistered(event);
  };

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    void this.initialize();
  }

  // =========================================================
  // INITIALIZE
  // =========================================================

  private async initialize(): Promise<void> {
    // Load initial data first
    await this.loadStats();

    // Start shared SignalR connection
    await this.startRealtime();
  }

  // =========================================================
  // LOAD STATS
  // =========================================================

  async loadStats(): Promise<void> {
    this.error.set(false);

    try {
      // =====================================================
      // COMMUNITY STATS
      // =====================================================

      const stats = await this.communityStatsService.getStats();

      this.registeredUsers.set(stats.registeredUsers);

      this.categories.set(stats.categories || 8);

      // =====================================================
      // APPROVED BUSINESSES
      // =====================================================

      const businesses = await this.businessService.getApprovedBusinesses();

      this.businesses.set(businesses.length);

      // =====================================================
      // UNIQUE SERVICES / BUSINESS TYPES
      // =====================================================

      const uniqueServices = new Set(
        businesses
          .map((business) => business.businessType?.trim())
          .filter((businessType): businessType is string => !!businessType),
      );

      this.services.set(uniqueServices.size);

      // =====================================================
      // ANIMATE
      // =====================================================

      this.animateNumber(this.animatedRegisteredUsers, stats.registeredUsers);

      this.animateNumber(this.animatedBusinesses, businesses.length);

      this.animateNumber(this.animatedCategories, stats.categories || 8);

      this.animateNumber(this.animatedServices, uniqueServices.size);
    } catch (error) {
      console.error('FAILED TO LOAD COMMUNITY STATS:', error);

      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  // =========================================================
  // NUMBER ANIMATION
  // =========================================================

  private animateNumber(
    targetSignal: ReturnType<typeof signal<number>>,
    target: number,
  ): void {
    const start = targetSignal();

    const difference = target - start;

    if (difference === 0) {
      return;
    }

    const duration = 700;

    const startTime = performance.now();

    const easeOut = (value: number): number => {
      return 1 - Math.pow(1 - value, 3);
    };

    const animate = (currentTime: number): void => {
      const elapsed = currentTime - startTime;

      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = easeOut(progress);

      const currentValue = Math.round(start + difference * easedProgress);

      targetSignal.set(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        targetSignal.set(target);
      }
    };

    requestAnimationFrame(animate);
  }

  // =========================================================
  // START REALTIME
  // =========================================================

  private async startRealtime(): Promise<void> {
    try {
      // -----------------------------------------------------
      // BUSINESS STATUS LISTENER
      // -----------------------------------------------------

      await this.businessRealtimeService.connect(this.realtimeHandler);

      // -----------------------------------------------------
      // USER REGISTERED LISTENER
      // -----------------------------------------------------

      this.businessRealtimeService.addUserRegisteredListener(
        this.userRegisteredHandler,
      );

      console.log('COMMUNITY STATS REALTIME CONNECTED');
    } catch (error) {
      console.error('FAILED TO CONNECT COMMUNITY STATS REALTIME:', error);
    }
  }

  // =========================================================
  // BUSINESS REALTIME UPDATE
  // =========================================================

  private async handleBusinessRealtimeUpdate(
    event: BusinessStatusChangedEvent,
  ): Promise<void> {
    console.log('COMMUNITY STATS BUSINESS UPDATE:', event);

    this.realtimeUpdating.set(true);

    try {
      await this.loadStats();
    } finally {
      this.realtimeUpdating.set(false);
    }
  }

  // =========================================================
  // USER REGISTERED REALTIME UPDATE
  // =========================================================

  private async handleUserRegistered(
    event: UserRegisteredEvent,
  ): Promise<void> {
    console.log('COMMUNITY STATS NEW USER:', event);

    this.realtimeUpdating.set(true);

    try {
      // This will refetch registeredUsers
      // from /api/public/stats

      await this.loadStats();
    } finally {
      this.realtimeUpdating.set(false);
    }
  }

  // =========================================================
  // FORMAT NUMBER
  // =========================================================

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {
    // Remove business listener
    this.businessRealtimeService.removeListener(this.realtimeHandler);

    // Remove user registration listener
    this.businessRealtimeService.removeUserRegisteredListener(
      this.userRegisteredHandler,
    );

    console.log('COMMUNITY STATS REALTIME LISTENERS REMOVED');
  }
}
