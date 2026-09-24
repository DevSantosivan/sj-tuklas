import { BusinessFeatures } from './business';

export interface CreateBusinessInput {
  // =========================================================
  // BUSINESS INFO
  // =========================================================

  name: string;

  category: string;

  businessType: string;

  description: string;

  phone: string;

  hours: string;

  // =========================================================
  // BUSINESS IMAGES
  // =========================================================

  /**
   * Main / gallery / feature image.
   *
   * Uploaded separately after the business is created.
   */
  image?: File | null;

  /**
   * Business profile logo / profile picture.
   *
   * Uploaded separately after the business is created.
   */
  profileImage?: File | null;

  /**
   * Business cover / background image.
   *
   * Uploaded separately after the business is created.
   */
  coverImage?: File | null;

  // =========================================================
  // LOCATION
  // =========================================================

  barangay: string;

  location: string;

  latitude: number | null;

  longitude: number | null;

  // =========================================================
  // FEATURES
  // =========================================================

  features: BusinessFeatures;
}
