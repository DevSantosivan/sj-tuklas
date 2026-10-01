import { Component, computed, input, output } from '@angular/core';
import { Review, ReviewSummary } from '../../../../core/models/review';

type ReviewRecord = Review & Record<string, unknown>;

@Component({
  selector: 'app-business-reviews',
  standalone: true,
  templateUrl: './business-reviews.component.html',
  styleUrl: './business-reviews.component.scss',
})
export class BusinessReviewsComponent {
  protected readonly Math = Math;
  readonly reviews = input<Review[]>([]);
  readonly reviewSummary = input<ReviewSummary>({
    averageRating: 0,
    totalReviews: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  readonly reviewsLoading = input(false);
  readonly reviewError = input<string | null>(null);
  readonly mode = input<'overview' | 'full'>('full');
  readonly previewCount = input(3);

  readonly writeReview = output<void>();
  readonly showAllReviews = output<void>();

  readonly ratingLevels: (1 | 2 | 3 | 4 | 5)[] = [5, 4, 3, 2, 1];

  readonly totalReviews = computed(() => {
    const total = this.reviewSummary().totalReviews;
    return total > 0 ? total : this.reviews().length;
  });

  readonly averageRating = computed(() => {
    const summary = this.reviewSummary();

    if (summary.totalReviews > 0) {
      return Number(summary.averageRating) || 0;
    }

    const list = this.reviews();
    if (!list.length) return 0;

    return (
      list.reduce((sum, review) => sum + this.ratingOf(review), 0) / list.length
    );
  });

  readonly displayedReviews = computed(() => {
    const list = this.reviews();
    return this.mode() === 'overview'
      ? list.slice(0, this.previewCount())
      : list;
  });

  readonly hasMoreReviews = computed(
    () =>
      this.mode() === 'overview' && this.reviews().length > this.previewCount(),
  );

  getRatingCount(rating: 1 | 2 | 3 | 4 | 5): number {
    const summary = this.reviewSummary();

    if (summary.totalReviews > 0) {
      return Number(summary.breakdown?.[rating] ?? 0);
    }

    return this.reviews().filter((review) => this.ratingOf(review) === rating)
      .length;
  }

  getRatingPercentage(rating: 1 | 2 | 3 | 4 | 5): number {
    const total = this.totalReviews();
    return total ? (this.getRatingCount(rating) / total) * 100 : 0;
  }

  ratingOf(review: Review): number {
    const value = Number((review as ReviewRecord).rating ?? 0);
    return Number.isFinite(value) ? Math.min(5, Math.max(0, value)) : 0;
  }

  reviewerName(review: Review): string {
    const item = review as ReviewRecord;
    const value =
      item['userName'] ??
      item['reviewerName'] ??
      item['displayName'] ??
      item['name'] ??
      item['fullName'] ??
      'Visitor';

    return String(value || 'Visitor');
  }

  reviewerInitials(review: Review): string {
    const name = this.reviewerName(review).trim();
    const parts = name.split(/\s+/).filter(Boolean);

    if (!parts.length) return 'V';
    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  reviewerAvatar(review: Review): string | null {
    const item = review as ReviewRecord;
    const value =
      item['userAvatar'] ??
      item['avatarUrl'] ??
      item['photoUrl'] ??
      item['image'];

    return typeof value === 'string' && value.trim() ? value : null;
  }

  reviewComment(review: Review): string {
    const item = review as ReviewRecord;
    const value = item['comment'] ?? item['text'] ?? item['content'];
    return typeof value === 'string' ? value.trim() : '';
  }

  reviewDate(review: Review): string {
    const item = review as ReviewRecord;

    const raw =
      item['createdAt'] ??
      item['created_at'] ??
      item['date'] ??
      item['reviewDate'];

    if (typeof raw !== 'string' && typeof raw !== 'number') {
      return '';
    }

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }
  onWriteReview(): void {
    this.writeReview.emit();
  }

  onShowAllReviews(): void {
    this.showAllReviews.emit();
  }

  trackReview(index: number, review: Review): string | number {
    const item = review as ReviewRecord;
    return String(item['id'] ?? item['reviewId'] ?? index);
  }
}
