import { Component, computed, inject, signal } from '@angular/core';

import { DecimalPipe } from '@angular/common';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { Business } from '../../../../core/models/business';
import { BUSINESSES } from '../../../../core/data/business.data';

import { BARANGAYS, Barangay } from '../../../../core/data/barangay.data';

import { BusinessMapComponent } from '../../../../shared/components/business-map/business-map.component';

@Component({
  selector: 'app-location-details',
  standalone: true,
  imports: [RouterLink, BusinessMapComponent],
  templateUrl: './location-details.component.html',
  styleUrl: './location-details.component.scss',
})
export class LocationDetailsComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  businesses: Business[] = BUSINESSES;
  locations: Barangay[] = BARANGAYS;

  searchTerm = signal('');
  selectedCategory = signal('All');

  /* =========================================================
     CURRENT SLUG
  ========================================================= */

  slug = computed(() => this.route.snapshot.paramMap.get('slug') ?? '');

  /* =========================================================
     CURRENT LOCATION
  ========================================================= */

  location = computed(() => {
    return this.locations.find((location) => location.slug === this.slug());
  });

  /* =========================================================
     BUSINESSES IN CURRENT BARANGAY
  ========================================================= */

  locationBusinesses = computed(() => {
    const selectedLocation = this.location();

    if (!selectedLocation) {
      return [];
    }

    return this.businesses.filter(
      (business) =>
        business.barangay.trim().toLowerCase() ===
        selectedLocation.name.trim().toLowerCase(),
    );
  });

  /* =========================================================
     CATEGORIES
  ========================================================= */

  categories = computed(() => {
    const categories = this.locationBusinesses()
      .map((business) => business.category)
      .filter(Boolean);

    return ['All', ...Array.from(new Set(categories))];
  });

  /* =========================================================
     FILTERED BUSINESSES
  ========================================================= */

  filteredBusinesses = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();

    const category = this.selectedCategory();

    return this.locationBusinesses().filter((business) => {
      const matchesCategory =
        category === 'All' || business.category === category;

      const matchesSearch =
        !search ||
        business.name.toLowerCase().includes(search) ||
        business.businessType.toLowerCase().includes(search) ||
        business.category.toLowerCase().includes(search) ||
        business.description.toLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  });

  /* =========================================================
     BUSINESS COUNT
  ========================================================= */

  businessCount = computed(() => this.locationBusinesses().length);

  filteredBusinessCount = computed(() => this.filteredBusinesses().length);

  /* =========================================================
     CATEGORY COUNT
  ========================================================= */

  categoryCount = computed(
    () =>
      new Set(this.locationBusinesses().map((business) => business.category))
        .size,
  );

  /* =========================================================
     SERVICES COUNT
  ========================================================= */

  servicesCount = computed(
    () =>
      this.locationBusinesses().filter((business) => business.features.services)
        .length,
  );

  /* =========================================================
     VERIFIED COUNT
  ========================================================= */

  verifiedCount = computed(
    () =>
      this.locationBusinesses().filter((business) => business.verified).length,
  );

  /* =========================================================
     PRO COUNT
  ========================================================= */

  proCount = computed(
    () => this.locationBusinesses().filter((business) => business.isPro).length,
  );

  /* =========================================================
     NEARBY LOCATIONS
  ========================================================= */

  nearbyLocations = computed(() => {
    const current = this.location();

    if (!current) {
      return [];
    }

    return this.locations
      .filter((location) => location.id !== current.id)
      .map((location) => ({
        ...location,

        distance: this.calculateDistance(
          current.latitude,
          current.longitude,
          location.latitude,
          location.longitude,
        ),

        businessCount: this.businesses.filter(
          (business) =>
            business.barangay.trim().toLowerCase() ===
            location.name.trim().toLowerCase(),
        ).length,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
  });

  /* =========================================================
     SEARCH
  ========================================================= */

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.searchTerm.set(input.value);
  }

  /* =========================================================
     CATEGORY FILTER
  ========================================================= */

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('All');
  }

  /* =========================================================
     BUSINESS IMAGE
  ========================================================= */

  getBusinessImage(business: Business): string {
    return (
      business.image ||
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72'
    );
  }

  /* =========================================================
     BUSINESS SELECTED FROM MAP
  ========================================================= */

  onBusinessSelected(business: Business): void {
    this.router.navigate(['/business', business.id]);
  }

  /* =========================================================
     DISTANCE
  ========================================================= */

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const earthRadius = 6371;

    const dLat = this.toRadians(lat2 - lat1);

    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadius * c;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  /* =========================================================
     OPEN LOCATION
  ========================================================= */

  openLocation(location: Barangay): void {
    this.router.navigate(['/locations', location.slug]);
  }

  openBusiness(business: Business): void {
    this.router.navigate(['/business', business.id]);
  }
}
