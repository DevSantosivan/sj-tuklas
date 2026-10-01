import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CreateReviewRequest, Review, ReviewSummary } from '../models/review';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api';

  getReviews(businessId: string): Observable<Review[]> {
    return this.http.get<Review[]>(
      `${this.apiUrl}/businesses/${businessId}/reviews`,
      { withCredentials: true },
    );
  }

  getSummary(businessId: string): Observable<ReviewSummary> {
    return this.http.get<ReviewSummary>(
      `${this.apiUrl}/businesses/${businessId}/reviews/summary`,
      { withCredentials: true },
    );
  }

  getMyReview(businessId: string): Observable<Review | null> {
    return this.http.get<Review | null>(
      `${this.apiUrl}/businesses/${businessId}/reviews/me`,
      { withCredentials: true },
    );
  }

  createReview(
    businessId: string,
    request: CreateReviewRequest,
  ): Observable<Review> {
    return this.http.post<Review>(
      `${this.apiUrl}/businesses/${businessId}/reviews`,
      request,
      { withCredentials: true },
    );
  }

  deleteReview(reviewId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/reviews/${reviewId}`, {
      withCredentials: true,
    });
  }
}
