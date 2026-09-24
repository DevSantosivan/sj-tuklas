import {
  AfterViewInit,
  Component,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { BusinessCardComponent } from '../../../../shared/components/business-card/business-card.component';
import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';
import { BusinessMapComponent } from '../../../../shared/components/business-map/business-map.component';

import { BusinessService } from '../../../../core/services/business.service';

import {
  BusinessRealtimeService,
  BusinessStatusChangedEvent,
} from '../../../../core/services/business-realtime.service';

import { Business } from '../../../../core/models/business';

@Component({
  selector: 'app-search-page',
  imports: [BusinessCardComponent, SearchBarComponent, BusinessMapComponent],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss',
})
export class SearchPageComponent implements AfterViewInit, OnDestroy {
  // =========================================================
  // DEPENDENCIES
  // =========================================================

  private readonly businessService = inject(BusinessService);

  private readonly businessRealtimeService = inject(BusinessRealtimeService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  // =========================================================
  // STATE
  // =========================================================

  searchTerm = signal('');

  selectedCategory = signal('all');

  selectedType = signal('all');

  selectedLocation = signal('all');

  viewMode = signal<'list' | 'map'>('list');

  businesses = signal<Business[]>([]);

  loading = signal(false);

  error = signal<string | null>(null);

  nearbyExpanded = signal(false);

  @ViewChild(BusinessMapComponent)
  private businessMap?: BusinessMapComponent;

  readonly is3D = signal(false);

  // =========================================================
  // REALTIME LISTENER
  // =========================================================

  /**
   * Keep the same function reference so we can remove
   * the listener when this component is destroyed.
   */
  private readonly realtimeHandler = (
    event: BusinessStatusChangedEvent,
  ): void => {
    void this.handleBusinessStatusChanged(event);
  };

  // =========================================================
  // FILTER OPTIONS
  // =========================================================

  readonly categories = [
    'Foods & Drinks',
    'Shops',
    'Services',
    'Hotels',
    'Boarding Houses',
  ];

  readonly locations = [
    'San Jose',
    'Poblacion',
    'Central San Jose',
    'San Roque',
  ];

  // =========================================================
  // MAP 3D
  // =========================================================

  toggle3D(): void {
    this.is3D.update((value) => !value);

    this.businessMap?.set3D(this.is3D());
  }

  // =========================================================
  // IMAGE FALLBACK
  // =========================================================

  imageError = signal<Set<string>>(new Set());

  onImageError(businessId: string): void {
    const errors = new Set(this.imageError());

    errors.add(businessId);

    this.imageError.set(errors);
  }

  // =========================================================
  // AVAILABLE BUSINESS TYPES
  // =========================================================

  availableTypes = computed(() => {
    const category = this.selectedCategory();

    if (category === 'all') {
      return [];
    }

    const types = this.businesses()
      .filter((business) => business.category === category)
      .map((business) => business.businessType)
      .filter(Boolean);

    return [...new Set(types)].sort();
  });

  // =========================================================
  // FILTERED BUSINESSES
  // =========================================================

  filteredBusinesses = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();

    const category = this.selectedCategory();

    const type = this.selectedType();

    const location = this.selectedLocation();

    return this.businesses().filter((business) => {
      const searchableText = [
        business.name,
        business.category,
        business.businessType,
        business.description,
        business.location,
        business.barangay,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || searchableText.includes(term);

      const matchesCategory =
        category === 'all' || business.category === category;

      const matchesType = type === 'all' || business.businessType === type;

      const matchesLocation =
        location === 'all' ||
        business.location.toLowerCase().includes(location.toLowerCase()) ||
        business.barangay.toLowerCase().includes(location.toLowerCase());

      return matchesSearch && matchesCategory && matchesType && matchesLocation;
    });
  });

  // =========================================================
  // RESULTS
  // =========================================================

  resultCount = computed(() => this.filteredBusinesses().length);

  hasActiveFilters = computed(() => {
    return (
      this.searchTerm().trim().length > 0 ||
      this.selectedCategory() !== 'all' ||
      this.selectedType() !== 'all' ||
      this.selectedLocation() !== 'all'
    );
  });

  // =========================================================
  // INITIALIZATION
  // =========================================================

  constructor() {
    void this.initialize();
  }

  ngAfterViewInit(): void {}

  // =========================================================
  // INITIALIZE
  // =========================================================

  private async initialize(): Promise<void> {
    // -------------------------------------------------------
    // Initial API fetch
    // -------------------------------------------------------

    await this.loadBusinesses();

    // -------------------------------------------------------
    // Query parameters
    // -------------------------------------------------------

    this.route.queryParams.subscribe((params) => {
      this.applyQueryParams(params);
    });

    // -------------------------------------------------------
    // Start realtime
    // -------------------------------------------------------

    await this.startRealtime();
  }

  // =========================================================
  // START REALTIME
  // =========================================================

  private async startRealtime(): Promise<void> {
    try {
      await this.businessRealtimeService.connect(this.realtimeHandler);

      console.log('========================================');

      console.log('SEARCH PAGE REALTIME CONNECTED');

      console.log('========================================');
    } catch (error) {
      console.error('FAILED TO CONNECT BUSINESS SIGNALR:', error);
    }
  }

  // =========================================================
  // REALTIME BUSINESS STATUS CHANGED
  // =========================================================

  private async handleBusinessStatusChanged(
    event: BusinessStatusChangedEvent,
  ): Promise<void> {
    console.log('========================================');

    console.log('SEARCH PAGE REALTIME UPDATE');

    console.log('BUSINESS ID:', event.businessId);

    console.log('NEW STATUS:', event.status);

    console.log('========================================');

    // =======================================================
    // REFRESH APPROVED BUSINESSES
    // =======================================================

    await this.loadBusinesses();

    // =======================================================
    // REFRESH MAP
    // =======================================================

    this.refreshMap();

    console.log('SEARCH PAGE BUSINESSES REFRESHED');
  }

  // =========================================================
  // MAP REFRESH
  // =========================================================

  private refreshMap(): void {
    if (this.viewMode() !== 'map') {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.businessMap?.refresh();
      });
    });
  }

  // =========================================================
  // QUERY PARAMS
  // =========================================================

  private applyQueryParams(params: Record<string, string>): void {
    const category = params['category'] ?? 'all';

    const type = params['type'] ?? 'all';

    const location = params['location'] ?? 'all';

    const query = params['q'] ?? '';

    this.searchTerm.set(query);

    this.selectedCategory.set(
      this.isValidCategory(category) ? category : 'all',
    );

    this.selectedLocation.set(
      this.isValidLocation(location) ? location : 'all',
    );

    const validType =
      type !== 'all' &&
      this.businesses().some(
        (business) =>
          business.category === category && business.businessType === type,
      );

    this.selectedType.set(validType ? type : 'all');
  }

  private isValidCategory(category: string): boolean {
    return category === 'all' || this.categories.includes(category);
  }

  private isValidLocation(location: string): boolean {
    return location === 'all' || this.locations.includes(location);
  }

  // =========================================================
  // LOAD BUSINESSES
  // =========================================================

  async loadBusinesses(): Promise<void> {
    this.loading.set(true);

    this.error.set(null);

    try {
      console.log('FETCHING APPROVED BUSINESSES...');

      const businesses = await this.businessService.getApprovedBusinesses();

      this.businesses.set(businesses);

      console.log('APPROVED BUSINESSES:', businesses);
    } catch (error) {
      console.error('FAILED TO LOAD BUSINESSES:', error);

      this.error.set(
        error instanceof Error ? error.message : 'Failed to load businesses.',
      );

      this.businesses.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  // =========================================================
  // SEARCH
  // =========================================================

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  // =========================================================
  // FILTERS
  // =========================================================

  setCategory(category: string): void {
    this.selectedCategory.set(category);

    this.selectedType.set('all');
  }

  setType(type: string): void {
    this.selectedType.set(type);
  }

  setLocation(location: string): void {
    this.selectedLocation.set(location);
  }

  clearFilters(): void {
    this.searchTerm.set('');

    this.selectedCategory.set('all');

    this.selectedType.set('all');

    this.selectedLocation.set('all');
  }

  // =========================================================
  // VIEW MODE
  // =========================================================

  setViewMode(mode: 'list' | 'map'): void {
    this.viewMode.set(mode);

    if (mode === 'list') {
      this.nearbyExpanded.set(false);

      return;
    }

    this.refreshMap();
  }

  // =========================================================
  // NEARBY BUSINESSES
  // =========================================================

  toggleNearbyBusinesses(): void {
    this.nearbyExpanded.update((expanded) => !expanded);
  }

  // =========================================================
  // BUSINESS
  // =========================================================

  openBusiness(business: Business): void {
    this.router.navigate(['/business', business.id]);
  }

  // =========================================================
  // DESTROY
  // =========================================================

  ngOnDestroy(): void {
    /**
     * Important:
     *
     * DO NOT call:
     *
     * this.businessRealtimeService.disconnect()
     *
     * because the realtime service is shared
     * with other components such as BusinessLayout.
     *
     * We only remove THIS component's listener.
     */

    this.businessRealtimeService.removeListener(this.realtimeHandler);

    console.log('SEARCH PAGE REALTIME LISTENER REMOVED');
  }
}
