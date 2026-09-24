export interface Business {
  id: string;

  // =========================================================
  // OWNER
  // =========================================================

  ownerId: string;

  // =========================================================
  // BUSINESS INFO
  // =========================================================

  name: string;

  category: string;

  businessType: string;

  description: string;

  phone: string;

  hours: string;

  // Existing image
  // Used as gallery / feature image
  image: string;

  // Business Profile cover / background
  coverImage: string;

  // Business Profile logo / profile picture
  profileImage: string;

  // =========================================================
  // LOCATION
  // =========================================================

  barangay: string;

  location: string;

  latitude: number;

  longitude: number;

  // =========================================================
  // BUSINESS STATUS
  // =========================================================

  status: 'pending' | 'approved' | 'rejected';

  verified: boolean;

  isPro: boolean;

  // =========================================================
  // RATING
  // SYSTEM CONTROLLED
  // =========================================================

  rating: number;

  reviews: number;

  // =========================================================
  // FEATURES
  // =========================================================

  features: BusinessFeatures;

  // =========================================================
  // TIMESTAMPS
  // =========================================================

  createdAt: string;

  updatedAt: string;
}

// =========================================================
// BUSINESS FEATURES
// =========================================================

export interface BusinessFeatures {
  menu: boolean;

  products: boolean;

  services: boolean;

  ordering: boolean;

  booking: boolean;

  reservations: boolean;

  inquiries: boolean;

  promotions: boolean;

  rooms: boolean;

  analytics: boolean;

  requestQuote: boolean;

  events: boolean;
}
