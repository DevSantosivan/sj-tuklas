import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CreateReviewRequest, Review, ReviewSummary } from '../models/review';

import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.baseUrl}/businesses`;

  // GET ALL BUSINESS REVIEWS
  getReviews(businessId: string): Observable<Review[]> {
    return this.http.get<Review[]>(
      `${this.apiUrl}/${encodeURIComponent(businessId)}/reviews`,
      { withCredentials: true },
    );
  }

  // GET REVIEW SUMMARY
  getSummary(businessId: string): Observable<ReviewSummary> {
    return this.http.get<ReviewSummary>(
      `${this.apiUrl}/${encodeURIComponent(businessId)}/reviews/summary`,
      { withCredentials: true },
    );
  }

  // GET CURRENT USER'S REVIEW
  getMyReview(businessId: string): Observable<Review | null> {
    return this.http.get<Review | null>(
      `${this.apiUrl}/${encodeURIComponent(businessId)}/reviews/me`,
      { withCredentials: true },
    );
  }

  // CREATE REVIEW
  createReview(
    businessId: string,
    request: CreateReviewRequest,
  ): Observable<Review> {
    return this.http.post<Review>(
      `${this.apiUrl}/${encodeURIComponent(businessId)}/reviews`,
      request,
      { withCredentials: true },
    );
  }

  // DELETE REVIEW
  deleteReview(reviewId: string): Observable<void> {
    return this.http.delete<void>(
      `/api/reviews/${encodeURIComponent(reviewId)}`,
      { withCredentials: true },
    );
  }
}
