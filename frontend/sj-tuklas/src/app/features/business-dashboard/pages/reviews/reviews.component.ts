import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Review, ReviewSummary } from '../../../../core/models/review';
import { ReviewService } from '../../../../core/services/review.service';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnChanges {
  @Input({ required: true }) businessId!: string;

  private readonly reviewService = inject(ReviewService);

  readonly reviews = signal<Review[]>([]);
  readonly summary = signal<ReviewSummary | null>(null);

  readonly isLoading = signal(true);
  readonly errorMessage = signal('');
  readonly searchQuery = signal('');
  readonly selectedRating = signal('all');
  readonly sortBy = signal('newest');

  readonly ratingRows = computed(() => {
    const summary = this.summary();

    if (!summary) return [];

    return [5, 4, 3, 2, 1].map((rating) => {
      const count =
        summary.breakdown[rating as keyof ReviewSummary['breakdown']] ?? 0;

      return {
        rating,
        count,
        percentage: summary.totalReviews
          ? (count / summary.totalReviews) * 100
          : 0,
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
        review.userName.toLowerCase().includes(query) ||
        review.comment.toLowerCase().includes(query);

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['businessId'] && this.businessId) {
      this.loadReviews();
    }
  }

  loadReviews(): void {
    if (!this.businessId) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.reviewService.getReviews(this.businessId).subscribe({
      next: (reviews) => {
        this.reviews.set(reviews ?? []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load reviews:', error);
        this.errorMessage.set('Unable to load reviews. Please try again.');
        this.isLoading.set(false);
      },
    });

    this.reviewService.getSummary(this.businessId).subscribe({
      next: (summary) => {
        this.summary.set(summary);
      },
      error: (error) => {
        console.error('Failed to load review summary:', error);
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

  getInitials(name: string): string {
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
      `"${String(value).replace(/"/g, '""')}"`;

    const header = ['Customer', 'Rating', 'Comment', 'Date'];

    const data = rows.map((review) => [
      review.userName,
      review.rating,
      review.comment,
      new Date(review.createdAt).toISOString(),
    ]);

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
    link.click();

    URL.revokeObjectURL(url);
  }

  trackByReviewId(index: number, review: Review): string {
    return review.id;
  }
}
