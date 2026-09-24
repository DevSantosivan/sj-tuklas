import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  BUSINESS_CATEGORIES,
  BusinessCategory,
} from '../../../../core/data/business-category.data';

import { FavoriteService } from '../../../../core/services/favorite.service';
import { FavoriteBusiness as ApiFavoriteBusiness } from '../../../../core/models/favorite.model';

interface FavoriteBusiness {
  id: string;
  name: string;

  categoryId: string;
  typeId: string;

  location: string;
  rating: number;
  reviews: number;

  image: string;

  isOpen: boolean;
  description: string;
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent implements OnInit {
  // =========================================================
  // DEPENDENCIES
  // =========================================================

  private readonly favoriteService = inject(FavoriteService);

  // =========================================================
  // DATA
  // =========================================================

  readonly categories: BusinessCategory[] = BUSINESS_CATEGORIES;

  selectedCategory = 'all';
  searchTerm = '';

  favorites: FavoriteBusiness[] = [];

  // =========================================================
  // UI STATE
  // =========================================================

  isLoading = true;

  /**
   * Stores the ID of the business currently being removed.
   *
   * Better than a single boolean because multiple cards
   * can maintain their own disabled/loading state.
   */
  removingFavoriteId: string | null = null;

  // =========================================================
  // CATEGORY ALIASES
  // =========================================================

  private readonly categoryAliases: Record<string, string> = {
    food: 'foods-drinks',
    foods: 'foods-drinks',
    'food & drinks': 'foods-drinks',
    'foods & drinks': 'foods-drinks',
    restaurant: 'foods-drinks',
    restaurants: 'foods-drinks',
    cafe: 'foods-drinks',
    cafes: 'foods-drinks',
    cafés: 'foods-drinks',

    shop: 'shops',
    store: 'shops',
    stores: 'shops',

    service: 'services',
    services: 'services',

    hotel: 'hotels',
    hotels: 'hotels',
    resort: 'hotels',
    resorts: 'hotels',

    boarding: 'boarding-houses',
    'boarding house': 'boarding-houses',
    'boarding houses': 'boarding-houses',
    bedspace: 'boarding-houses',
  };

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    this.loadFavorites();
  }

  // =========================================================
  // LOAD FAVORITES
  // =========================================================

  loadFavorites(): void {
    this.isLoading = true;

    this.favoriteService
      .getFavorites()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (favorites) => {
          this.favorites = (favorites ?? []).map((favorite) =>
            this.mapFavorite(favorite),
          );
        },

        error: (error) => {
          console.error('FAILED TO LOAD FAVORITES:', error);

          this.favorites = [];
        },
      });
  }

  // =========================================================
  // MAP API MODEL → UI MODEL
  // =========================================================

  private mapFavorite(favorite: ApiFavoriteBusiness): FavoriteBusiness {
    const categoryId = this.resolveCategoryId(favorite.category);

    return {
      id: favorite.id,
      name: favorite.name?.trim() || 'Unnamed Business',

      categoryId,

      typeId: this.resolveTypeId(categoryId, favorite.businessType),

      location:
        favorite.location?.trim() ||
        favorite.barangay?.trim() ||
        'Location not available',

      rating: Number.isFinite(Number(favorite.rating))
        ? Number(favorite.rating)
        : 0,

      reviews: Number.isFinite(Number(favorite.reviews))
        ? Number(favorite.reviews)
        : 0,

      image: favorite.image?.trim() || 'assets/images/business-placeholder.jpg',

      isOpen: this.getBusinessOpenStatus(favorite.hours),

      description: favorite.description?.trim() || 'No description available.',
    };
  }

  // =========================================================
  // CATEGORY MAPPING
  // =========================================================

  private resolveCategoryId(category: string | null | undefined): string {
    const normalized = category?.trim().toLowerCase() ?? '';

    if (!normalized) {
      return '';
    }

    // Exact category ID or name match.
    const directMatch = this.categories.find(
      (item) =>
        item.id.toLowerCase() === normalized ||
        item.name.toLowerCase() === normalized,
    );

    if (directMatch) {
      return directMatch.id;
    }

    // Alias match.
    return this.categoryAliases[normalized] ?? normalized;
  }

  // =========================================================
  // BUSINESS TYPE MAPPING
  // =========================================================

  private resolveTypeId(
    categoryId: string,
    businessType: string | null | undefined,
  ): string {
    const normalized = businessType?.trim().toLowerCase() ?? '';

    if (!normalized) {
      return '';
    }

    const category = this.getCategory(categoryId);

    if (!category) {
      return normalized;
    }

    const type = category.types.find(
      (item) =>
        item.id.toLowerCase() === normalized ||
        item.name.toLowerCase() === normalized,
    );

    return type?.id ?? normalized;
  }

  // =========================================================
  // OPEN / CLOSED
  // =========================================================

  private getBusinessOpenStatus(hours: string | null | undefined): boolean {
    const normalized = hours?.trim().toLowerCase() ?? '';

    if (!normalized) {
      return false;
    }

    if (normalized.includes('closed') || normalized.includes('close')) {
      return false;
    }

    if (
      normalized.includes('open') ||
      normalized.includes('24 hours') ||
      normalized.includes('24/7')
    ) {
      return true;
    }

    /*
     * Current backend only exposes hours as a string.
     * Until structured opening/closing times are available,
     * we preserve the existing behavior.
     */
    return true;
  }

  // =========================================================
  // FILTERED FAVORITES
  // =========================================================

  get filteredFavorites(): FavoriteBusiness[] {
    const search = this.searchTerm.trim().toLowerCase();

    const category = this.selectedCategory;

    return this.favorites.filter((business) => {
      const matchesCategory =
        category === 'all' || business.categoryId === category;

      if (!matchesCategory) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        business.name.toLowerCase().includes(search) ||
        business.location.toLowerCase().includes(search) ||
        business.description.toLowerCase().includes(search)
      );
    });
  }

  // =========================================================
  // SELECTED CATEGORY NAME
  // =========================================================

  get selectedCategoryName(): string {
    if (this.selectedCategory === 'all') {
      return 'All Favorites';
    }

    return this.getCategory(this.selectedCategory)?.name ?? 'Favorites';
  }

  // =========================================================
  // GET CATEGORY
  // =========================================================

  getCategory(categoryId: string): BusinessCategory | undefined {
    return this.categories.find((category) => category.id === categoryId);
  }

  // =========================================================
  // BUSINESS TYPE NAME
  // =========================================================

  getBusinessTypeName(categoryId: string, typeId: string): string {
    const category = this.getCategory(categoryId);

    return (
      category?.types.find((type) => type.id === typeId)?.name ?? 'Business'
    );
  }

  // =========================================================
  // BUSINESS TYPE ICON
  // =========================================================

  getBusinessTypeIcon(categoryId: string, typeId: string): string {
    const category = this.getCategory(categoryId);

    return (
      category?.types.find((type) => type.id === typeId)?.icon ?? 'bx-store'
    );
  }

  // =========================================================
  // CATEGORY ICON
  // =========================================================

  getCategoryIcon(categoryId: string): string {
    return this.getCategory(categoryId)?.icon ?? 'bx-category';
  }

  // =========================================================
  // SELECT CATEGORY
  // =========================================================

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
  }

  // =========================================================
  // REMOVE FAVORITE
  // =========================================================

  removeFavorite(businessId: string, event: Event): void {
    event.stopPropagation();

    // Prevent duplicate request for the same business.
    if (this.removingFavoriteId === businessId) {
      return;
    }

    this.removingFavoriteId = businessId;

    this.favoriteService
      .removeFavorite(businessId)
      .pipe(
        finalize(() => {
          this.removingFavoriteId = null;
        }),
      )
      .subscribe({
        next: (response) => {
          console.log('FAVORITE REMOVED:', response);

          this.favorites = this.favorites.filter(
            (business) => business.id !== businessId,
          );
        },

        error: (error) => {
          console.error('FAILED TO REMOVE FAVORITE:', error);
        },
      });
  }

  // =========================================================
  // CHECK IF REMOVING
  // =========================================================

  isRemoving(businessId: string): boolean {
    return this.removingFavoriteId === businessId;
  }

  // =========================================================
  // CLEAR SEARCH
  // =========================================================

  clearSearch(): void {
    this.searchTerm = '';
  }

  // =========================================================
  // TRACK BY
  // =========================================================

  trackByBusiness(index: number, business: FavoriteBusiness): string {
    return business.id;
  }
}
