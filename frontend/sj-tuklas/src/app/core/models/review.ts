export interface Review {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  userAvatar?: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  breakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface CreateReviewRequest {
  rating: number;
  comment: string;
}
