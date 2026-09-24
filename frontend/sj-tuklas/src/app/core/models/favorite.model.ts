export interface FavoriteActionResponse {
  success: boolean;
  isFavorite: boolean;
  businessId: string;
  message: string;
}

export interface FavoriteBusiness {
  id: string;
  ownerId: string;

  name: string;
  category: string;
  businessType: string;
  description: string;

  phone: string;
  hours: string;
  image: string;

  barangay: string;
  location: string;

  latitude: number;
  longitude: number;

  status: string;

  verified: boolean;
  isPro: boolean;

  rating: number;
  reviews: number;

  createdAt: string;
  updatedAt: string;

  favoritedAt: string;
}
