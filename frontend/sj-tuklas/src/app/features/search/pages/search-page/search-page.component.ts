import { Component, OnInit, inject, signal, computed } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { SearchBarComponent } from '../../../../shared/components/search-bar/search-bar.component';

import { BusinessCardComponent } from '../../../../shared/components/business-card/business-card.component';

import { BusinessMapComponent } from '../../../../shared/components/business-map/business-map.component';

import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';

import { BusinessService } from '../../../../core/services/business.service';

import { Business } from '../../../../core/models/business';

@Component({
  selector: 'app-search-page',
  standalone: true,

  imports: [
    SearchBarComponent,
    BusinessCardComponent,
    BusinessMapComponent,
    SkeletonComponent,
  ],

  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss',
})
export class SearchPageComponent implements OnInit {
  private readonly businessService = inject(BusinessService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  /* =========================================================
     DATA
  ========================================================= */

  readonly businesses = signal<Business[]>([]);

  readonly loading = signal<boolean>(true);

  readonly error = signal<string | null>(null);

  /* =========================================================
     FILTERS
  ========================================================= */

  readonly searchTerm = signal<string>('');

  readonly selectedCategory = signal<string>('all');

  readonly selectedType = signal<string>('all');

  readonly selectedLocation = signal<string>('all');

  /* =========================================================
     VIEW
  ========================================================= */

  readonly viewMode = signal<'list' | 'map'>('list');

  readonly is3D = signal<boolean>(false);

  readonly nearbyExpanded = signal<boolean>(false);

  /* =========================================================
     IMAGE ERRORS
  ========================================================= */

  readonly imageError = signal<Set<string>>(new Set());

  /* =========================================================
     OPTIONS
  ========================================================= */

  readonly categories = [
    'Foods & Drinks',
    'Hotels',
    'Shops',
    'Service',
    'Boarding House',
    'Places',
  ];

  readonly locations = [
    'Central',
    'Poblacion',
    'San Roque',
    'Mabini',
    'Pag-asa',
    'Mangangan I',
    'Mangangan II',
  ];

  /* =========================================================
     FILTERED BUSINESSES
  ========================================================= */

  readonly filteredBusinesses = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    const category = this.selectedCategory();

    const type = this.selectedType();

    const location = this.selectedLocation();

    return this.businesses().filter((business) => {
      const name = business.name?.toLowerCase() ?? '';

      const businessCategory = business.category?.toLowerCase() ?? '';

      const businessType = business.businessType?.toLowerCase() ?? '';

      const description = business.description?.toLowerCase() ?? '';

      const matchesSearch =
        !search ||
        name.includes(search) ||
        businessCategory.includes(search) ||
        businessType.includes(search) ||
        description.includes(search);

      const matchesCategory =
        category === 'all' || business.category === category;

      const matchesType = type === 'all' || business.businessType === type;

      const matchesLocation =
        location === 'all' || business.location === location;

      return matchesSearch && matchesCategory && matchesType && matchesLocation;
    });
  });

  /* =========================================================
     RESULT COUNT
  ========================================================= */

  readonly resultCount = computed(() => this.filteredBusinesses().length);

  /* =========================================================
     ACTIVE FILTERS
  ========================================================= */

  readonly hasActiveFilters = computed(() => {
    return (
      this.searchTerm().trim().length > 0 ||
      this.selectedCategory() !== 'all' ||
      this.selectedType() !== 'all' ||
      this.selectedLocation() !== 'all'
    );
  });

  /* =========================================================
     AVAILABLE TYPES
  ========================================================= */

  readonly availableTypes = computed(() => {
    const category = this.selectedCategory();

    if (category === 'all') {
      return [];
    }

    return [
      ...new Set(
        this.businesses()
          .filter((business) => business.category === category)
          .map((business) => business.businessType)
          .filter(Boolean),
      ),
    ];
  });

  /* =========================================================
     INIT
  ========================================================= */

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.searchTerm.set(params['search'] ?? '');

      this.selectedCategory.set(params['category'] ?? 'all');

      this.selectedType.set(params['type'] ?? 'all');

      this.selectedLocation.set(params['location'] ?? 'all');

      /*
       * Do not reload unnecessarily when only the
       * query parameters change.
       *
       * The businesses themselves do not depend
       * on these local filters yet.
       */
      if (this.businesses().length === 0) {
        void this.loadBusinesses();
      }
    });
  }

  /* =========================================================
     LOAD BUSINESSES
  ========================================================= */

  async loadBusinesses(): Promise<void> {
    /*
     * Prevent duplicate requests while the current
     * request is still running.
     */
    if (this.loading() && this.businesses().length > 0) {
      return;
    }

    this.loading.set(true);

    this.error.set(null);

    try {
      const businesses = await this.businessService.getApprovedBusinesses();

      this.businesses.set(businesses);
    } catch (error: unknown) {
      console.error('Failed to load businesses:', error);

      this.businesses.set([]);

      this.error.set(
        error instanceof Error ? error.message : 'Failed to load businesses.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  /* =========================================================
     SEARCH
  ========================================================= */

  onSearch(value: string): void {
    this.searchTerm.set(value);

    this.updateQueryParams();
  }

  /* =========================================================
     CATEGORY
  ========================================================= */

  setCategory(category: string): void {
    this.selectedCategory.set(category);

    /*
     * Reset business type whenever category changes.
     */
    this.selectedType.set('all');

    this.updateQueryParams();
  }

  /* =========================================================
     TYPE
  ========================================================= */

  setType(type: string): void {
    this.selectedType.set(type);

    this.updateQueryParams();
  }

  /* =========================================================
     LOCATION
  ========================================================= */

  setLocation(location: string): void {
    this.selectedLocation.set(location);

    this.updateQueryParams();
  }

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  clearFilters(): void {
    this.searchTerm.set('');

    this.selectedCategory.set('all');

    this.selectedType.set('all');

    this.selectedLocation.set('all');

    this.updateQueryParams();
  }

  /* =========================================================
     QUERY PARAMS
  ========================================================= */

  private updateQueryParams(): void {
    void this.router.navigate([], {
      relativeTo: this.route,

      queryParams: {
        search: this.searchTerm() || null,

        category:
          this.selectedCategory() !== 'all' ? this.selectedCategory() : null,

        type: this.selectedType() !== 'all' ? this.selectedType() : null,

        location:
          this.selectedLocation() !== 'all' ? this.selectedLocation() : null,
      },

      queryParamsHandling: 'merge',
    });
  }

  /* =========================================================
     VIEW MODE
  ========================================================= */

  setViewMode(mode: 'list' | 'map'): void {
    this.viewMode.set(mode);

    if (mode === 'map') {
      this.nearbyExpanded.set(false);
    }
  }

  /* =========================================================
     3D
  ========================================================= */

  toggle3D(): void {
    this.is3D.update((value) => !value);
  }

  /* =========================================================
     NEARBY
  ========================================================= */

  toggleNearbyBusinesses(): void {
    this.nearbyExpanded.update((value) => !value);
  }

  /* =========================================================
     OPEN BUSINESS
  ========================================================= */

  openBusiness(business: Business): void {
    if (!business?.id) {
      return;
    }

    void this.router.navigate(['/business', business.id]);
  }

  /* =========================================================
     IMAGE ERROR
  ========================================================= */

  onImageError(businessId: string): void {
    this.imageError.update((current) => {
      const next = new Set(current);

      next.add(businessId);

      return next;
    });
  }
}
