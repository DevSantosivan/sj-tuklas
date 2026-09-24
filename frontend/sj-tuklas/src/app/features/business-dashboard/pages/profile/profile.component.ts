import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { Business, BusinessFeatures } from '../../../../core/models/business';

import { BusinessService } from '../../../../core/services/business.service';

interface BusinessHour {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
}

interface BusinessPhoto {
  id: string;
  label: string;
  url: string | null;
  type: 'profile' | 'cover' | 'gallery';
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly businessService = inject(BusinessService);

  // =========================================================
  // BUSINESS
  // =========================================================

  business = signal<Business | null>(null);

  isLoading = signal(true);

  isSaving = signal(false);

  isUploading = signal(false);

  errorMessage = signal('');

  successMessage = signal('');

  // =========================================================
  // BUSINESS FORM
  // =========================================================

  businessName = '';

  category = '';

  businessType = '';

  phone = '';

  description = '';

  barangay = '';

  location = '';

  latitude: number | null = null;

  longitude: number | null = null;

  // =========================================================
  // FEATURES
  // =========================================================

  features = signal<BusinessFeatures | null>(null);

  // =========================================================
  // BUSINESS HOURS
  // =========================================================

  hoursList: BusinessHour[] = [
    {
      day: 'Monday',
      enabled: false,
      open: '08:00',
      close: '18:00',
    },
    {
      day: 'Tuesday',
      enabled: false,
      open: '08:00',
      close: '18:00',
    },
    {
      day: 'Wednesday',
      enabled: false,
      open: '08:00',
      close: '18:00',
    },
    {
      day: 'Thursday',
      enabled: false,
      open: '08:00',
      close: '18:00',
    },
    {
      day: 'Friday',
      enabled: false,
      open: '08:00',
      close: '18:00',
    },
    {
      day: 'Saturday',
      enabled: false,
      open: '08:00',
      close: '18:00',
    },
    {
      day: 'Sunday',
      enabled: false,
      open: '08:00',
      close: '18:00',
    },
  ];

  // =========================================================
  // PRO / PHOTOS
  // =========================================================

  isPro = computed(() => this.business()?.isPro ?? false);

  /**
   * Free:
   * - profile image
   * - cover image
   * - feature/main image
   *
   * PRO:
   * - profile image
   * - cover image
   * - feature/main image
   * - up to 4 gallery images
   */
  readonly proGalleryLimit = 4;

  photos = signal<BusinessPhoto[]>([]);

  galleryPhotos = computed(() =>
    this.photos().filter((photo) => photo.type === 'gallery'),
  );

  photoLimit = computed(() => {
    return this.isPro() ? this.proGalleryLimit : 0;
  });

  canAddPhoto = computed(() => {
    if (!this.isPro()) {
      return false;
    }

    return this.galleryPhotos().length < this.proGalleryLimit;
  });

  // =========================================================
  // FILE INPUT
  // =========================================================

  selectedUploadType = signal<'profile' | 'cover' | 'gallery' | null>(null);

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    this.loadBusiness();
  }

  // =========================================================
  // LOAD BUSINESS
  // =========================================================

  async loadBusiness(): Promise<void> {
    this.isLoading.set(true);

    this.errorMessage.set('');

    try {
      const result = await this.businessService.getMyBusiness();

      // No business found
      if (!result) {
        this.business.set(null);
        this.errorMessage.set('No business found for this account.');

        return;
      }

      // From this point onward,
      // TypeScript knows result is Business.
      this.business.set(result);

      this.populateForm(result);

      this.populateHours(result.hours);

      this.populatePhotos(result);

      this.features.set(result.features ?? null);
    } catch (error) {
      console.error('Failed to load business:', error);

      this.business.set(null);

      this.errorMessage.set('Unable to load your business profile.');
    } finally {
      this.isLoading.set(false);
    }
  }

  // =========================================================
  // POPULATE FORM
  // =========================================================

  private populateForm(business: Business): void {
    this.businessName = business.name ?? '';

    this.category = business.category ?? '';

    this.businessType = business.businessType ?? '';

    this.phone = business.phone ?? '';

    this.description = business.description ?? '';

    this.barangay = business.barangay ?? '';

    this.location = business.location ?? '';

    this.latitude = business.latitude ?? null;

    this.longitude = business.longitude ?? null;
  }

  // =========================================================
  // PARSE BUSINESS HOURS
  // =========================================================

  private populateHours(hours: string | null | undefined): void {
    if (!hours) {
      return;
    }

    const lines = hours
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const hour of this.hoursList) {
      const line = lines.find((item) =>
        item.toLowerCase().startsWith(`${hour.day.toLowerCase()}:`),
      );

      if (!line) {
        continue;
      }

      const value = line.substring(hour.day.length + 1).trim();

      if (value.toLowerCase() === 'closed') {
        hour.enabled = false;

        continue;
      }

      const separator = value.indexOf(' - ');

      if (separator === -1) {
        hour.enabled = false;

        continue;
      }

      const open = value.substring(0, separator).trim();

      const close = value.substring(separator + 3).trim();

      hour.enabled = true;

      hour.open = this.normalizeTime(open);

      hour.close = this.normalizeTime(close);
    }
  }

  // =========================================================
  // TIME NORMALIZATION
  // =========================================================

  private normalizeTime(value: string): string {
    const cleanValue = value.trim();

    // Already 24-hour format
    if (/^\d{2}:\d{2}$/.test(cleanValue)) {
      return cleanValue;
    }

    // 12-hour format
    const match = cleanValue.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) {
      return '08:00';
    }

    let hour = Number(match[1]);

    const minute = match[2];

    const period = match[3].toUpperCase();

    if (period === 'AM' && hour === 12) {
      hour = 0;
    }

    if (period === 'PM' && hour !== 12) {
      hour += 12;
    }

    return `${hour.toString().padStart(2, '0')}:${minute}`;
  }

  // =========================================================
  // BUILD HOURS FOR DATABASE
  // =========================================================

  private buildBusinessHours(): string {
    return this.hoursList
      .map((hour) => {
        if (!hour.enabled) {
          return `${hour.day}: Closed`;
        }

        return `${hour.day}: ${hour.open} - ${hour.close}`;
      })
      .join('\n');
  }

  // =========================================================
  // SAVE CHANGES
  // =========================================================

  async saveChanges(): Promise<void> {
    const currentBusiness = this.business();

    if (!currentBusiness) {
      return;
    }

    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    this.errorMessage.set('');

    this.successMessage.set('');

    try {
      const hours = this.buildBusinessHours();

      const updatedBusiness = await this.businessService.updateMyBusiness(
        currentBusiness.id,
        {
          name: this.businessName.trim(),

          category: this.category.trim(),

          businessType: this.businessType.trim(),

          description: this.description.trim(),

          phone: this.phone.trim(),

          hours,

          barangay: this.barangay.trim(),

          location: this.location.trim(),

          latitude: this.latitude,

          longitude: this.longitude,
        },
      );

      this.business.set(updatedBusiness);

      this.populateForm(updatedBusiness);

      this.populateHours(updatedBusiness.hours);

      this.populatePhotos(updatedBusiness);

      this.features.set(updatedBusiness.features ?? null);

      this.successMessage.set('Business profile updated successfully.');

      setTimeout(() => {
        this.successMessage.set('');
      }, 3000);
    } catch (error) {
      console.error('Failed to save business:', error);

      this.errorMessage.set('Unable to save your business profile.');
    } finally {
      this.isSaving.set(false);
    }
  }

  // =========================================================
  // POPULATE PHOTOS
  // =========================================================

  private populatePhotos(business: Business): void {
    const photos: BusinessPhoto[] = [];

    // PROFILE
    photos.push({
      id: 'profile',
      label: 'Profile Image',
      url: business.profileImage ?? null,
      type: 'profile',
    });

    // COVER
    photos.push({
      id: 'cover',
      label: 'Cover Image',
      url: business.coverImage ?? null,
      type: 'cover',
    });

    // FEATURE / MAIN IMAGE
    photos.push({
      id: 'image',
      label: 'Feature Image',
      url: business.image ?? null,
      type: 'gallery',
    });

    this.photos.set(photos);
  }

  // =========================================================
  // FILE PICKER
  // =========================================================

  openImagePicker(type: 'profile' | 'cover' | 'gallery'): void {
    if (type === 'gallery' && !this.isPro()) {
      this.upgradeToPro();

      return;
    }

    if (type === 'gallery' && !this.canAddPhoto()) {
      return;
    }

    this.selectedUploadType.set(type);

    const input = document.createElement('input');

    input.type = 'file';

    input.accept = 'image/png,image/jpeg,image/webp';

    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      await this.uploadImage(type, file);
    };
  }

  // =========================================================
  // UPLOAD IMAGE
  // =========================================================

  private async uploadImage(
    type: 'profile' | 'cover' | 'gallery',
    file: File,
  ): Promise<void> {
    const currentBusiness = this.business();

    if (!currentBusiness) {
      return;
    }

    if (type === 'gallery' && !this.isPro()) {
      this.upgradeToPro();

      return;
    }

    if (type === 'gallery' && !this.canAddPhoto()) {
      this.errorMessage.set('You have reached the PRO photo limit.');

      return;
    }

    this.isUploading.set(true);

    this.errorMessage.set('');

    this.successMessage.set('');

    try {
      const result = await this.businessService.uploadBusinessImage(
        currentBusiness.id,
        type,
        file,
      );

      const updatedBusiness: Business = {
        ...currentBusiness,
      };

      if (type === 'profile') {
        updatedBusiness.profileImage = result.imageUrl;
      }

      if (type === 'cover') {
        updatedBusiness.coverImage = result.imageUrl;
      }

      if (type === 'gallery') {
        updatedBusiness.image = result.imageUrl;
      }

      this.business.set(updatedBusiness);

      this.populatePhotos(updatedBusiness);

      this.successMessage.set(
        `${this.getImageLabel(type)} uploaded successfully.`,
      );

      setTimeout(() => {
        this.successMessage.set('');
      }, 3000);
    } catch (error) {
      console.error(`Failed to upload ${type} image:`, error);

      this.errorMessage.set(
        'Unable to upload image. Please make sure the file is JPG, PNG, or WEBP and below 5MB.',
      );
    } finally {
      this.isUploading.set(false);
    }
  }

  // =========================================================
  // IMAGE LABEL
  // =========================================================

  private getImageLabel(type: 'profile' | 'cover' | 'gallery'): string {
    switch (type) {
      case 'profile':
        return 'Profile image';

      case 'cover':
        return 'Cover image';

      case 'gallery':
        return 'Feature image';

      default:
        return 'Image';
    }
  }

  // =========================================================
  // ADD PHOTO
  // =========================================================

  addPhoto(): void {
    if (!this.isPro()) {
      this.upgradeToPro();

      return;
    }

    if (!this.canAddPhoto()) {
      return;
    }

    this.openImagePicker('gallery');
  }

  // =========================================================
  // UPGRADE
  // =========================================================

  upgradeToPro(): void {
    console.log('Redirect to PRO subscription page');

    // Later:
    // this.router.navigate(['/owner/subscription']);
  }

  // =========================================================
  // PREVIEW
  // =========================================================

  previewProfile(): void {
    const currentBusiness = this.business();

    if (!currentBusiness) {
      return;
    }

    console.log('Preview business:', currentBusiness.id);

    // Later:
    // this.router.navigate(['/business', currentBusiness.id]);
  }

  // =========================================================
  // LOCATION
  // =========================================================

  setLocation(): void {
    console.log('Open map location picker');

    // Later connect to your map/location picker.
  }

  // =========================================================
  // FEATURE HELPERS
  // =========================================================

  featureEnabled(feature: keyof BusinessFeatures): boolean {
    return this.features()?.[feature] ?? false;
  }
}
