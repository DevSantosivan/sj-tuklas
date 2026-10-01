import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';

import { Review, ReviewSummary } from '../../../../core/models/review';

import { Business } from '../../../../core/models/business';
import { ReviewService } from '../../../../core/services/review.service';
import { BusinessService } from '../../../../core/services/business.service';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly businessService = inject(BusinessService);

  private requestId = 0;

  readonly business = signal<Business | null>(null);
  readonly businessId = signal('');

  readonly reviews = signal<Review[]>([]);
  readonly summary = signal<ReviewSummary | null>(null);

  readonly isLoading = signal(true);
  readonly isBusinessLoading = signal(true);
  readonly isSummaryLoading = signal(false);

  readonly errorMessage = signal('');
  readonly summaryError = signal('');

  readonly searchQuery = signal('');
  readonly selectedRating = signal('all');
  readonly sortBy = signal('newest');

  readonly ratingRows = computed(() => {
    const summary = this.summary();

    if (!summary) {
      return [5, 4, 3, 2, 1].map((rating) => ({
        rating,
        count: 0,
        percentage: 0,
      }));
    }

    return [5, 4, 3, 2, 1].map((rating) => {
      const count =
        summary.breakdown[rating as keyof ReviewSummary['breakdown']] ?? 0;

      return {
        rating,
        count,
        percentage:
          summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0,
      };
    });
  });

  readonly filteredReviews = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const rating = this.selectedRating();
    const sort = this.sortBy();

    const filtered = this.reviews().filter((review) => {
      const matchesSearch =
        !query ||
        (review.userName ?? '').toLowerCase().includes(query) ||
        (review.comment ?? '').toLowerCase().includes(query);

      const matchesRating =
        rating === 'all' || review.rating === Number(rating);

      return matchesSearch && matchesRating;
    });

    return [...filtered].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      switch (sort) {
        case 'oldest':
          return dateA - dateB;

        case 'highest':
          return b.rating - a.rating || dateB - dateA;

        case 'lowest':
          return a.rating - b.rating || dateB - dateA;

        case 'newest':
        default:
          return dateB - dateA;
      }
    });
  });

  ngOnInit(): void {
    this.loadBusiness();
  }

  /**
   * Load the currently authenticated owner's business.
   * The returned business ID is then used to load its reviews.
   */
  async loadBusiness(): Promise<void> {
    this.isBusinessLoading.set(true);
    this.isLoading.set(true);
    this.isSummaryLoading.set(false);

    this.errorMessage.set('');
    this.summaryError.set('');

    this.business.set(null);
    this.businessId.set('');
    this.reviews.set([]);
    this.summary.set(null);

    // Invalidate any previous review requests.
    this.requestId++;

    try {
      const result = await this.businessService.getMyBusiness();

      if (!result?.id) {
        this.business.set(null);
        this.businessId.set('');
        this.reviews.set([]);
        this.summary.set(null);

        this.errorMessage.set('No business found for this account.');

        this.isLoading.set(false);
        return;
      }

      this.business.set(result);
      this.businessId.set(result.id);

      console.log('[Reviews] Owner business loaded:', result);
      console.log('[Reviews] Business ID:', result.id);

      this.loadReviews(result.id);
    } catch (error: any) {
      console.error('[Reviews] Failed to load owner business:', error);

      this.business.set(null);
      this.businessId.set('');
      this.reviews.set([]);
      this.summary.set(null);

      this.errorMessage.set(
        error?.status === 401
          ? 'Your session has expired. Please sign in again.'
          : 'Unable to load your business. Please try again.',
      );

      this.isLoading.set(false);
    } finally {
      this.isBusinessLoading.set(false);
    }
  }

  /**
   * Load reviews and rating summary for the supplied business ID.
   */
  loadReviews(businessId: string = this.businessId()): void {
    const id = businessId?.trim();

    if (!id) {
      this.requestId++;
      this.reviews.set([]);
      this.summary.set(null);

      this.isLoading.set(false);
      this.isSummaryLoading.set(false);

      this.errorMessage.set('Business ID is missing.');
      this.summaryError.set('');

      return;
    }

    const currentRequest = ++this.requestId;

    console.log('[Reviews] Loading business reviews:', id);

    this.isLoading.set(true);
    this.isSummaryLoading.set(true);

    this.errorMessage.set('');
    this.summaryError.set('');

    this.reviews.set([]);
    this.summary.set(null);

    // Load individual reviews.
    this.reviewService
      .getReviews(id)
      .pipe(
        timeout(15000),
        finalize(() => {
          if (currentRequest === this.requestId) {
            this.isLoading.set(false);
          }
        }),
      )
      .subscribe({
        next: (reviews) => {
          if (currentRequest !== this.requestId) return;

          console.log('[Reviews] API response:', reviews);

          this.reviews.set(Array.isArray(reviews) ? reviews : []);
        },

        error: (error) => {
          if (currentRequest !== this.requestId) return;

          console.error('[Reviews] API error:', error);

          this.errorMessage.set(
            error?.name === 'TimeoutError'
              ? 'The request timed out. Please try again.'
              : error?.status === 401
                ? 'Your session has expired. Please sign in again.'
                : error?.status === 404
                  ? 'Reviews endpoint or business was not found.'
                  : 'Unable to load reviews. Please try again.',
          );
        },
      });

    // Load rating summary independently.
    this.reviewService
      .getSummary(id)
      .pipe(
        timeout(15000),
        finalize(() => {
          if (currentRequest === this.requestId) {
            this.isSummaryLoading.set(false);
          }
        }),
      )
      .subscribe({
        next: (summary) => {
          if (currentRequest !== this.requestId) return;

          console.log('[Reviews] Summary response:', summary);

          this.summary.set(summary);
        },

        error: (error) => {
          if (currentRequest !== this.requestId) return;

          console.error('[Reviews] Summary API error:', error);

          this.summaryError.set(
            error?.name === 'TimeoutError'
              ? 'Rating summary request timed out.'
              : 'Unable to load rating summary.',
          );
        },
      });
  }

  setSearch(value: string): void {
    this.searchQuery.set(value);
  }

  setRating(value: string): void {
    this.selectedRating.set(value);
  }

  setSort(value: string): void {
    this.sortBy.set(value);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedRating.set('all');
    this.sortBy.set('newest');
  }

  getInitials(name: string | null | undefined): string {
    return (name || 'Guest')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  getRelativeDate(date: string): string {
    const timestamp = new Date(date).getTime();

    if (!Number.isFinite(timestamp)) return '';

    const difference = Math.max(0, Date.now() - timestamp);

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;

    return `${Math.floor(days / 365)} years ago`;
  }

  exportReviews(): void {
    const rows = this.filteredReviews();

    if (!rows.length) return;

    const escapeCsv = (value: string | number): string =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const header = ['Customer', 'Rating', 'Comment', 'Date'];

    const data = rows.map((review) => {
      const timestamp = review.createdAt
        ? new Date(review.createdAt).getTime()
        : NaN;

      const formattedDate = Number.isFinite(timestamp)
        ? new Date(timestamp).toISOString()
        : '';

      return [
        review.userName || 'Guest',
        review.rating,
        review.comment || '',
        formattedDate,
      ];
    });

    const csv = [
      header.map(escapeCsv).join(','),
      ...data.map((row) => row.map(escapeCsv).join(',')),
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'business-reviews.csv';

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  trackByReviewId(index: number, review: Review): string {
    return review.id;
  }
}
