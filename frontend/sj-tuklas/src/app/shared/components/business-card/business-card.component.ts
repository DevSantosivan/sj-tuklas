import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Business } from '../../../core/models/business';
import { ReviewService } from '../../../core/services/review.service';
import { ReviewSummary } from '../../../core/models/review';

@Component({
  selector: 'app-business-card',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  templateUrl: './business-card.component.html',
  styleUrl: './business-card.component.scss',
})
export class BusinessCardComponent {
  private readonly reviewService = inject(ReviewService);

  readonly business = input.required<Business>();
  readonly variant = input<'card' | 'list'>('card');

  readonly imageError = signal(false);

  readonly reviewSummary = signal<ReviewSummary | null>(null);
  readonly reviewLoading = signal(true);
  readonly reviewError = signal(false);

  readonly averageRating = computed(
    () => this.reviewSummary()?.averageRating ?? 0,
  );

  readonly totalReviews = computed(
    () => this.reviewSummary()?.totalReviews ?? 0,
  );

  constructor() {
    effect((onCleanup) => {
      const business = this.business();
      const businessId = business.id;

      console.log('[BUSINESS CARD] RECEIVED BUSINESS:', business);

      console.log('[BUSINESS CARD] RECEIVED ID:', businessId);

      this.reviewSummary.set(null);
      this.reviewLoading.set(true);
      this.reviewError.set(false);
      this.imageError.set(false);

      const subscription = this.reviewService.getSummary(businessId).subscribe({
        next: (summary) => {
          this.reviewSummary.set(summary);
          this.reviewLoading.set(false);
        },
        error: (error) => {
          console.error('[BUSINESS CARD] REVIEW SUMMARY FAILED:', {
            businessId,
            error,
          });

          this.reviewError.set(true);
          this.reviewLoading.set(false);
        },
      });

      onCleanup(() => {
        subscription.unsubscribe();
      });
    });
  }

  onImageError(): void {
    this.imageError.set(true);
  }
}
