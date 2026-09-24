import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  BUSINESS_CATEGORIES,
  BusinessCategory,
  BusinessType,
} from '../../../../core/data/business-category.data';

import { Barangay, BARANGAYS } from '../../../../core/data/barangay.data';

import { BusinessFeatures } from '../../../../core/models/business';

import { CreateBusinessInput } from '../../../../core/models/business-create.model';

import { BusinessService } from '../../../../core/services/business.service';

import { BusinessMapComponent } from '../../../../shared/components/business-map/business-map.component';

import { SuccessStateComponent } from '../../../../shared/components/success-state/success-state.component';

@Component({
  selector: 'app-business-create',

  standalone: true,

  imports: [
    FormsModule,
    RouterLink,
    BusinessMapComponent,
    SuccessStateComponent,
  ],

  templateUrl: './business-create.component.html',

  styleUrl: './business-create.component.scss',
})
export class BusinessCreateComponent {
  // =========================================================
  // SERVICES
  // =========================================================

  private readonly router = inject(Router);

  private readonly businessService = inject(BusinessService);

  // =========================================================
  // STATE
  // =========================================================

  isSaving = false;

  isSuccess = false;

  errorMessage = '';

  // =========================================================
  // BUSINESS FORM
  // =========================================================

  businessName = '';

  phone = '';

  description = '';

  // =========================================================
  // BUSINESS HOURS
  // =========================================================

  days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  hours: Record<
    string,
    {
      enabled: boolean;
      open: string;
      close: string;
    }
  > = {
    Monday: {
      enabled: true,
      open: '08:00',
      close: '18:00',
    },

    Tuesday: {
      enabled: true,
      open: '08:00',
      close: '18:00',
    },

    Wednesday: {
      enabled: true,
      open: '08:00',
      close: '18:00',
    },

    Thursday: {
      enabled: true,
      open: '08:00',
      close: '18:00',
    },

    Friday: {
      enabled: true,
      open: '08:00',
      close: '18:00',
    },

    Saturday: {
      enabled: true,
      open: '08:00',
      close: '18:00',
    },

    Sunday: {
      enabled: true,
      open: '08:00',
      close: '18:00',
    },
  };

  // =========================================================
  // BUSINESS CATEGORIES
  // =========================================================

  readonly categories = BUSINESS_CATEGORIES;

  selectedCategory?: BusinessCategory;

  selectedBusinessType?: BusinessType;

  get availableBusinessTypes(): BusinessType[] {
    return this.selectedCategory?.types ?? [];
  }

  // =========================================================
  // BARANGAYS
  // =========================================================

  readonly barangays = BARANGAYS;

  selectedBarangay?: Barangay;

  latitude?: number;

  longitude?: number;

  // =========================================================
  // MAIN / FEATURED BUSINESS IMAGE
  // =========================================================
  //
  // Required.
  //
  // This becomes:
  //
  // businesses.image
  //
  // Upload type:
  //
  // gallery
  // =========================================================

  selectedImageFile: File | null = null;

  imagePreview = '';

  // =========================================================
  // PROFILE / LOGO IMAGE
  // =========================================================
  //
  // Optional.
  //
  // This becomes:
  //
  // businesses.profile_image
  //
  // Upload type:
  //
  // profile
  // =========================================================

  selectedProfileImageFile: File | null = null;

  profileImagePreview = '';

  // =========================================================
  // COVER IMAGE
  // =========================================================
  //
  // Optional.
  //
  // This becomes:
  //
  // businesses.cover_image
  //
  // Upload type:
  //
  // cover
  // =========================================================

  selectedCoverImageFile: File | null = null;

  coverImagePreview = '';

  // =========================================================
  // IMAGE SETTINGS
  // =========================================================

  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  /**
   * Maximum size of the original selected image.
   *
   * 5 MB
   */
  private readonly maxOriginalImageSize = 5 * 1024 * 1024;

  /**
   * Maximum output dimensions after compression.
   */
  private readonly maxImageWidth = 1600;

  private readonly maxImageHeight = 1200;

  /**
   * JPEG compression quality.
   */
  private readonly imageQuality = 0.8;

  // =========================================================
  // CATEGORY CHANGE
  // =========================================================

  onCategoryChange(event: Event): void {
    const select = event.target as HTMLSelectElement;

    const categoryId = select.value;

    this.selectedCategory = this.categories.find(
      (category) => category.id === categoryId,
    );

    // Reset business type.
    this.selectedBusinessType = undefined;

    this.clearMessages();
  }

  // =========================================================
  // BUSINESS TYPE CHANGE
  // =========================================================

  onBusinessTypeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;

    const typeId = select.value;

    this.selectedBusinessType = this.selectedCategory?.types.find(
      (type) => type.id === typeId,
    );

    this.clearMessages();
  }

  // =========================================================
  // BARANGAY CHANGE
  // =========================================================

  onBarangayChange(event: Event): void {
    const select = event.target as HTMLSelectElement;

    const barangayId = Number(select.value);

    const barangay = this.barangays.find((item) => item.id === barangayId);

    if (!barangay) {
      this.selectedBarangay = undefined;

      this.latitude = undefined;

      this.longitude = undefined;

      this.clearMessages();

      return;
    }

    this.selectedBarangay = barangay;

    // Clear previous exact map location.
    //
    // This prevents coordinates from another
    // barangay being accidentally submitted.

    this.latitude = undefined;

    this.longitude = undefined;

    this.clearMessages();
  }

  // =========================================================
  // MAP LOCATION
  // =========================================================

  onLocationSelected(location: { latitude: number; longitude: number }): void {
    this.latitude = location.latitude;

    this.longitude = location.longitude;

    this.clearMessages();
  }

  // =========================================================
  // FORMAT COORDINATE
  // =========================================================

  formatCoordinate(value?: number): string {
    if (value === undefined) {
      return '—';
    }

    return value.toFixed(6);
  }

  // =========================================================
  // IMAGE VALIDATION
  // =========================================================

  private validateImageFile(file: File): string | null {
    if (!this.allowedImageTypes.includes(file.type)) {
      return 'Please select a JPG, PNG, or WEBP image.';
    }

    if (file.size > this.maxOriginalImageSize) {
      return 'Image must be smaller than 5 MB.';
    }

    return null;
  }

  // =========================================================
  // MAIN BUSINESS IMAGE
  // =========================================================

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.clearMessages();

    // -------------------------------------------------------
    // VALIDATE
    // -------------------------------------------------------

    const validationError = this.validateImageFile(file);

    if (validationError) {
      this.errorMessage = validationError;

      input.value = '';

      this.selectedImageFile = null;

      this.imagePreview = '';

      return;
    }

    try {
      // -----------------------------------------------------
      // COMPRESS
      // -----------------------------------------------------

      const compressedFile = await this.compressImage(file);

      this.selectedImageFile = compressedFile;

      // -----------------------------------------------------
      // PREVIEW
      // -----------------------------------------------------

      this.readImagePreview(compressedFile, (preview) => {
        this.imagePreview = preview;
      });

      // -----------------------------------------------------
      // DEBUG
      // -----------------------------------------------------

      console.log('Original image size:', this.formatFileSize(file.size));

      console.log(
        'Compressed image size:',
        this.formatFileSize(compressedFile.size),
      );

      this.clearMessages();
    } catch (error) {
      console.error('IMAGE COMPRESSION ERROR:', error);

      this.errorMessage =
        'Unable to process the image. Please try another image.';

      input.value = '';

      this.selectedImageFile = null;

      this.imagePreview = '';
    }
  }

  // =========================================================
  // PROFILE / LOGO IMAGE
  // =========================================================

  async onProfileImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.clearMessages();

    // -------------------------------------------------------
    // VALIDATE
    // -------------------------------------------------------

    const validationError = this.validateImageFile(file);

    if (validationError) {
      this.errorMessage = validationError;

      input.value = '';

      this.selectedProfileImageFile = null;

      this.profileImagePreview = '';

      return;
    }

    try {
      // -----------------------------------------------------
      // COMPRESS
      // -----------------------------------------------------

      const compressedFile = await this.compressImage(file);

      this.selectedProfileImageFile = compressedFile;

      // -----------------------------------------------------
      // PREVIEW
      // -----------------------------------------------------

      this.readImagePreview(compressedFile, (preview) => {
        this.profileImagePreview = preview;
      });

      console.log(
        'Profile image original size:',
        this.formatFileSize(file.size),
      );

      console.log(
        'Profile image compressed size:',
        this.formatFileSize(compressedFile.size),
      );
    } catch (error) {
      console.error('PROFILE IMAGE COMPRESSION ERROR:', error);

      this.errorMessage =
        'Unable to process the profile image. Please try another image.';

      input.value = '';

      this.selectedProfileImageFile = null;

      this.profileImagePreview = '';
    }
  }

  // =========================================================
  // COVER IMAGE
  // =========================================================

  async onCoverImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.clearMessages();

    // -------------------------------------------------------
    // VALIDATE
    // -------------------------------------------------------

    const validationError = this.validateImageFile(file);

    if (validationError) {
      this.errorMessage = validationError;

      input.value = '';

      this.selectedCoverImageFile = null;

      this.coverImagePreview = '';

      return;
    }

    try {
      // -----------------------------------------------------
      // COMPRESS
      // -----------------------------------------------------

      const compressedFile = await this.compressImage(file);

      this.selectedCoverImageFile = compressedFile;

      // -----------------------------------------------------
      // PREVIEW
      // -----------------------------------------------------

      this.readImagePreview(compressedFile, (preview) => {
        this.coverImagePreview = preview;
      });

      console.log('Cover image original size:', this.formatFileSize(file.size));

      console.log(
        'Cover image compressed size:',
        this.formatFileSize(compressedFile.size),
      );
    } catch (error) {
      console.error('COVER IMAGE COMPRESSION ERROR:', error);

      this.errorMessage =
        'Unable to process the cover image. Please try another image.';

      input.value = '';

      this.selectedCoverImageFile = null;

      this.coverImagePreview = '';
    }
  }

  // =========================================================
  // COMPRESS IMAGE
  // =========================================================

  private async compressImage(file: File): Promise<File> {
    const image = await this.loadImage(file);

    let width = image.naturalWidth;

    let height = image.naturalHeight;

    // -------------------------------------------------------
    // CALCULATE NEW DIMENSIONS
    // -------------------------------------------------------

    const widthRatio = this.maxImageWidth / width;

    const heightRatio = this.maxImageHeight / height;

    const ratio = Math.min(widthRatio, heightRatio, 1);

    width = Math.round(width * ratio);

    height = Math.round(height * ratio);

    // -------------------------------------------------------
    // CANVAS
    // -------------------------------------------------------

    const canvas = document.createElement('canvas');

    canvas.width = width;

    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Unable to create image canvas.');
    }

    // -------------------------------------------------------
    // IMAGE QUALITY
    // -------------------------------------------------------

    context.imageSmoothingEnabled = true;

    context.imageSmoothingQuality = 'high';

    // -------------------------------------------------------
    // DRAW IMAGE
    // -------------------------------------------------------

    context.drawImage(image, 0, 0, width, height);

    // -------------------------------------------------------
    // OUTPUT
    // -------------------------------------------------------

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', this.imageQuality);
    });

    if (!blob) {
      throw new Error('Unable to compress image.');
    }

    // -------------------------------------------------------
    // CREATE FILE NAME
    // -------------------------------------------------------

    const baseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-');

    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  }

  // =========================================================
  // LOAD IMAGE
  // =========================================================

  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();

      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);

        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);

        reject(new Error('Unable to read image.'));
      };

      image.src = objectUrl;
    });
  }

  // =========================================================
  // IMAGE PREVIEW
  // =========================================================

  private readImagePreview(
    file: File,
    callback: (preview: string) => void,
  ): void {
    const reader = new FileReader();

    reader.onload = () => {
      callback(reader.result as string);
    };

    reader.onerror = () => {
      console.error('Unable to read image preview.');
    };

    reader.readAsDataURL(file);
  }

  // =========================================================
  // FILE SIZE
  // =========================================================

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  // =========================================================
  // HOURS → STRING
  // =========================================================

  private buildHours(): string {
    return this.days
      .map((day) => {
        const schedule = this.hours[day];

        if (!schedule.enabled) {
          return `${day}: Closed`;
        }

        return `${day}: ` + `${schedule.open} - ` + `${schedule.close}`;
      })
      .join('\n');
  }

  // =========================================================
  // FEATURES
  // =========================================================

  private buildFeatures(): BusinessFeatures {
    const featureIds =
      this.selectedBusinessType?.features.map((feature) => feature.id) ?? [];

    return {
      menu: featureIds.includes('menu'),

      products: featureIds.includes('products'),

      services: featureIds.includes('services'),

      ordering: featureIds.includes('ordering'),

      booking: featureIds.includes('booking'),

      reservations: featureIds.includes('reservations'),

      inquiries: featureIds.includes('inquiries'),

      promotions: featureIds.includes('promotions'),

      rooms: featureIds.includes('rooms'),

      analytics: featureIds.includes('analytics'),

      requestQuote: featureIds.includes('request-quote'),

      events: featureIds.includes('events'),
    };
  }

  // =========================================================
  // FORM VALIDATION
  // =========================================================

  private validateForm(): string | null {
    // -------------------------------------------------------
    // BUSINESS NAME
    // -------------------------------------------------------

    if (!this.businessName.trim()) {
      return 'Please enter your business name.';
    }

    if (this.businessName.trim().length < 2) {
      return 'Business name must be at least 2 characters.';
    }

    // -------------------------------------------------------
    // CATEGORY
    // -------------------------------------------------------

    if (!this.selectedCategory) {
      return 'Please select a business category.';
    }

    // -------------------------------------------------------
    // BUSINESS TYPE
    // -------------------------------------------------------

    if (!this.selectedBusinessType) {
      return 'Please select your business type.';
    }

    // -------------------------------------------------------
    // PHONE
    // -------------------------------------------------------

    if (!this.phone.trim()) {
      return 'Please enter your business phone number.';
    }

    // -------------------------------------------------------
    // DESCRIPTION
    // -------------------------------------------------------

    if (!this.description.trim()) {
      return 'Please enter a business description.';
    }

    // -------------------------------------------------------
    // MAIN IMAGE
    // -------------------------------------------------------

    if (!this.selectedImageFile) {
      return 'Please upload a business image.';
    }

    // -------------------------------------------------------
    // BARANGAY
    // -------------------------------------------------------

    if (!this.selectedBarangay) {
      return 'Please select your barangay.';
    }

    // -------------------------------------------------------
    // EXACT LOCATION
    // -------------------------------------------------------

    if (this.latitude === undefined || this.longitude === undefined) {
      return 'Please select your exact business location on the map.';
    }

    return null;
  }

  // =========================================================
  // SUBMIT
  // =========================================================

  async onSubmit(): Promise<void> {
    // -------------------------------------------------------
    // PREVENT DOUBLE SUBMIT
    // -------------------------------------------------------

    if (this.isSaving) {
      return;
    }

    this.clearMessages();

    // -------------------------------------------------------
    // VALIDATE
    // -------------------------------------------------------

    const validationError = this.validateForm();

    if (validationError) {
      this.errorMessage = validationError;

      return;
    }

    this.isSaving = true;

    try {
      // =====================================================
      // 1. CREATE BUSINESS
      // =====================================================

      const businessData: CreateBusinessInput = {
        name: this.businessName.trim(),

        category: this.selectedCategory!.name,

        businessType: this.selectedBusinessType!.name,

        description: this.description.trim(),

        phone: this.phone.trim(),

        hours: this.buildHours(),

        // ===================================================
        // IMAGE FILES
        // ===================================================
        //
        // These are part of the frontend model only.
        //
        // BusinessService.createBusiness()
        // does NOT send these files in JSON.
        //
        // They are uploaded separately below.
        // ===================================================

        image: this.selectedImageFile,

        profileImage: this.selectedProfileImageFile,

        coverImage: this.selectedCoverImageFile,

        // ===================================================
        // LOCATION
        // ===================================================

        barangay: this.selectedBarangay!.name,

        location: this.selectedBarangay!.name,

        latitude: this.latitude!,

        longitude: this.longitude!,

        // ===================================================
        // FEATURES
        // ===================================================

        features: this.buildFeatures(),
      };

      console.log('================================================');

      console.log('CREATING BUSINESS...');

      console.log('BUSINESS DATA:', businessData);

      console.log('================================================');

      const createdBusiness =
        await this.businessService.createBusiness(businessData);

      console.log('BUSINESS CREATED:', createdBusiness);

      // =====================================================
      // 2. UPLOAD MAIN / FEATURE IMAGE
      // =====================================================

      if (this.selectedImageFile) {
        console.log('================================================');

        console.log('UPLOADING MAIN BUSINESS IMAGE...');

        console.log('Business ID:', createdBusiness.id);

        console.log(
          'Upload size:',
          this.formatFileSize(this.selectedImageFile.size),
        );

        console.log('================================================');

        const result = await this.businessService.uploadBusinessImage(
          createdBusiness.id,
          'gallery',
          this.selectedImageFile,
        );

        console.log('BUSINESS IMAGE UPLOADED:', result);
      }

      // =====================================================
      // 3. UPLOAD PROFILE IMAGE
      // =====================================================

      if (this.selectedProfileImageFile) {
        console.log('UPLOADING PROFILE IMAGE...');

        const result = await this.businessService.uploadBusinessImage(
          createdBusiness.id,
          'profile',
          this.selectedProfileImageFile,
        );

        console.log('PROFILE IMAGE UPLOADED:', result);
      }

      // =====================================================
      // 4. UPLOAD COVER IMAGE
      // =====================================================

      if (this.selectedCoverImageFile) {
        console.log('UPLOADING COVER IMAGE...');

        const result = await this.businessService.uploadBusinessImage(
          createdBusiness.id,
          'cover',
          this.selectedCoverImageFile,
        );

        console.log('COVER IMAGE UPLOADED:', result);
      }

      // =====================================================
      // 5. SUCCESS
      // =====================================================

      console.log('================================================');

      console.log('BUSINESS SETUP COMPLETED.');

      console.log('Business ID:', createdBusiness.id);

      console.log('================================================');

      this.isSuccess = true;
    } catch (error: unknown) {
      console.error('BUSINESS CREATE / IMAGE UPLOAD ERROR:', error);

      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.isSaving = false;
    }
  }

  // =========================================================
  // NAVIGATION
  // =========================================================

  goHome(): void {
    this.router.navigate(['/']);
  }

  // =========================================================
  // ERROR HANDLER
  // =========================================================

  private getErrorMessage(error: unknown): string {
    // -------------------------------------------------------
    // HTTP ERROR
    // -------------------------------------------------------

    if (error && typeof error === 'object') {
      const httpError = error as {
        message?: unknown;
        error?: unknown;
        status?: number;
      };

      // -----------------------------------------------------
      // BACKEND RESPONSE
      // -----------------------------------------------------

      if (httpError.error && typeof httpError.error === 'object') {
        const backendError = httpError.error as {
          message?: unknown;
        };

        if (backendError.message) {
          return String(backendError.message);
        }
      }

      // -----------------------------------------------------
      // ERROR MESSAGE
      // -----------------------------------------------------

      if (httpError.message) {
        const message = String(httpError.message);

        const normalizedMessage = message.toLowerCase();

        // ---------------------------------------------------
        // DUPLICATE
        // ---------------------------------------------------

        if (normalizedMessage.includes('duplicate')) {
          return 'This business information already exists.';
        }

        // ---------------------------------------------------
        // RLS
        // ---------------------------------------------------

        if (normalizedMessage.includes('row-level security')) {
          return 'You are not allowed to perform this action.';
        }

        // ---------------------------------------------------
        // UNAUTHORIZED
        // ---------------------------------------------------

        if (
          normalizedMessage.includes('unauthorized') ||
          normalizedMessage.includes('401')
        ) {
          return 'Your session has expired. Please log in again.';
        }

        // ---------------------------------------------------
        // FORBIDDEN
        // ---------------------------------------------------

        if (normalizedMessage.includes('403')) {
          return 'You are not allowed to perform this action.';
        }

        // ---------------------------------------------------
        // STORAGE
        // ---------------------------------------------------

        if (normalizedMessage.includes('storage')) {
          return 'Business was created, but the image could not be uploaded. Please try again.';
        }

        // ---------------------------------------------------
        // IMAGE
        // ---------------------------------------------------

        if (normalizedMessage.includes('image file')) {
          return message;
        }

        return message;
      }
    }

    // -------------------------------------------------------
    // DEFAULT
    // -------------------------------------------------------

    return 'Something went wrong while creating your business. Please try again.';
  }

  // =========================================================
  // CLEAR MESSAGES
  // =========================================================

  private clearMessages(): void {
    this.errorMessage = '';
  }
}
