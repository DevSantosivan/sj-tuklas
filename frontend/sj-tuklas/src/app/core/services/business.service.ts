import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { CreateBusinessInput } from '../models/business-create.model';
import { Business } from '../models/business';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class BusinessService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${API_CONFIG.baseUrl}/businesses`;

  // =========================================================
  // CREATE BUSINESS
  // =========================================================
  //
  // IMPORTANT:
  // Business creation uses JSON.
  //
  // Images are uploaded separately using:
  //
  // uploadBusinessImage()
  //
  // POST:
  // /api/businesses
  // =========================================================

  async createBusiness(input: CreateBusinessInput): Promise<Business> {
    const payload = {
      name: input.name?.trim() ?? '',

      category: input.category,

      businessType: input.businessType,

      description: input.description?.trim() ?? '',

      phone: input.phone?.trim() ?? '',

      hours: input.hours?.trim() ?? '',

      barangay: input.barangay,

      location: input.location,

      latitude: input.latitude,

      longitude: input.longitude,

      features: input.features,
    };

    console.log('================================================');

    console.log('CREATE BUSINESS PAYLOAD:', payload);

    console.log('CREATE BUSINESS URL:', this.apiUrl);

    console.log('================================================');

    return await firstValueFrom(
      this.http.post<Business>(this.apiUrl, payload, {
        withCredentials: true,
      }),
    );
  }

  // =========================================================
  // UPLOAD BUSINESS IMAGE
  // =========================================================
  //
  // This endpoint uses multipart/form-data.
  //
  // imageType:
  //
  // profile -> profile_image
  // cover   -> cover_image
  // gallery -> image
  //
  // POST:
  //
  // /api/businesses/{businessId}/images/profile
  // /api/businesses/{businessId}/images/cover
  // /api/businesses/{businessId}/images/gallery
  //
  // IMPORTANT:
  // Do NOT manually set Content-Type.
  //
  // Browser will automatically generate:
  //
  // multipart/form-data;
  // boundary=----------------...
  // =========================================================

  async uploadBusinessImage(
    businessId: string,
    imageType: 'profile' | 'cover' | 'gallery',
    file: File,
  ): Promise<{
    message: string;
    imageType: string;
    imageUrl: string;
  }> {
    // -------------------------------------------------------
    // VALIDATE BUSINESS ID
    // -------------------------------------------------------

    if (!businessId?.trim()) {
      throw new Error('Business ID is required.');
    }

    // -------------------------------------------------------
    // VALIDATE FILE
    // -------------------------------------------------------

    if (!file) {
      throw new Error('Image file is required.');
    }

    // -------------------------------------------------------
    // VALIDATE IMAGE TYPE
    // -------------------------------------------------------

    const allowedImageTypes = ['profile', 'cover', 'gallery'] as const;

    if (!allowedImageTypes.includes(imageType)) {
      throw new Error('Invalid image type.');
    }

    // -------------------------------------------------------
    // VALIDATE FILE TYPE
    // -------------------------------------------------------

    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      throw new Error('Only JPG, PNG, and WEBP images are allowed.');
    }

    // -------------------------------------------------------
    // VALIDATE FILE SIZE
    // -------------------------------------------------------
    //
    // Backend limit:
    // 5 MB
    // -------------------------------------------------------

    const maxFileSize = 5 * 1024 * 1024;

    if (file.size > maxFileSize) {
      throw new Error('Image file must not exceed 5 MB.');
    }

    // -------------------------------------------------------
    // CREATE FORM DATA
    // -------------------------------------------------------

    const formData = new FormData();

    formData.append('file', file, file.name);

    // -------------------------------------------------------
    // CREATE URL
    // -------------------------------------------------------

    const url =
      `${this.apiUrl}/` +
      `${encodeURIComponent(businessId)}/` +
      `images/${imageType}`;

    // -------------------------------------------------------
    // DEBUG
    // -------------------------------------------------------

    console.log('================================================');

    console.log('UPLOAD BUSINESS IMAGE');

    console.log('Business ID:', businessId);

    console.log('Image Type:', imageType);

    console.log('File Name:', file.name);

    console.log('File Type:', file.type);

    console.log('File Size:', file.size);

    console.log('URL:', url);

    console.log('================================================');

    // -------------------------------------------------------
    // UPLOAD
    // -------------------------------------------------------
    //
    // IMPORTANT:
    // Do NOT set Content-Type manually.
    //
    // Angular/browser handles multipart boundary.
    // -------------------------------------------------------

    return await firstValueFrom(
      this.http.post<{
        message: string;
        imageType: string;
        imageUrl: string;
      }>(url, formData, {
        withCredentials: true,
      }),
    );
  }

  // =========================================================
  // GET APPROVED BUSINESSES
  // PUBLIC
  // =========================================================

  async getApprovedBusinesses(): Promise<Business[]> {
    return await firstValueFrom(this.http.get<Business[]>(this.apiUrl));
  }

  // =========================================================
  // GET BUSINESSES
  // PUBLIC
  //
  // This currently returns APPROVED businesses only.
  // =========================================================

  async getBusinesses(): Promise<Business[]> {
    return await this.getApprovedBusinesses();
  }

  // =========================================================
  // GET ALL BUSINESSES
  // ADMIN
  //
  // Includes:
  //
  // pending
  // approved
  // rejected
  // =========================================================

  async getAdminBusinesses(): Promise<Business[]> {
    return await firstValueFrom(
      this.http.get<Business[]>(`${this.apiUrl}/admin/all`, {
        withCredentials: true,
      }),
    );
  }

  // =========================================================
  // GET BUSINESS BY ID
  // PUBLIC
  //
  // Only approved business can be returned.
  // =========================================================

  async getBusinessById(businessId: string): Promise<Business | null> {
    if (!businessId?.trim()) {
      return null;
    }

    try {
      return await firstValueFrom(
        this.http.get<Business>(
          `${this.apiUrl}/${encodeURIComponent(businessId)}`,
        ),
      );
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }

      console.error('FAILED TO GET BUSINESS:', error);

      throw error;
    }
  }

  // =========================================================
  // GET BUSINESS BY ID
  // ADMIN
  //
  // Admin can see:
  //
  // pending
  // approved
  // rejected
  // =========================================================

  async getAdminBusinessById(businessId: string): Promise<Business | null> {
    if (!businessId?.trim()) {
      return null;
    }

    try {
      return await firstValueFrom(
        this.http.get<Business>(
          `${this.apiUrl}/admin/${encodeURIComponent(businessId)}`,
          {
            withCredentials: true,
          },
        ),
      );
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }

      console.error('FAILED TO GET ADMIN BUSINESS:', error);

      throw error;
    }
  }

  // =========================================================
  // GET MY BUSINESS
  // PROTECTED
  // =========================================================

  async getMyBusiness(): Promise<Business | null> {
    try {
      return await firstValueFrom(
        this.http.get<Business>(`${this.apiUrl}/mine`, {
          withCredentials: true,
        }),
      );
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }

      console.error('FAILED TO GET MY BUSINESS:', error);

      throw error;
    }
  }

  // =========================================================
  // UPDATE MY BUSINESS
  // PROTECTED
  // OWNER ONLY
  // =========================================================

  async updateMyBusiness(
    businessId: string,
    input: Partial<CreateBusinessInput>,
  ): Promise<Business> {
    if (!businessId?.trim()) {
      throw new Error('Business ID is required.');
    }

    const payload: Record<string, unknown> = {};

    // -------------------------------------------------------
    // BASIC INFORMATION
    // -------------------------------------------------------

    if (input.name !== undefined) {
      payload['name'] = input.name.trim();
    }

    if (input.category !== undefined) {
      payload['category'] = input.category;
    }

    if (input.businessType !== undefined) {
      payload['businessType'] = input.businessType;
    }

    if (input.description !== undefined) {
      payload['description'] = input.description.trim();
    }

    if (input.phone !== undefined) {
      payload['phone'] = input.phone.trim();
    }

    if (input.hours !== undefined) {
      payload['hours'] = input.hours.trim();
    }

    // -------------------------------------------------------
    // IMAGE
    // -------------------------------------------------------
    //
    // Kept for compatibility with existing update logic.
    //
    // For actual file upload, use:
    //
    // uploadBusinessImage()
    // -------------------------------------------------------

    if (input.image !== undefined) {
      payload['image'] = input.image;
    }

    // -------------------------------------------------------
    // LOCATION
    // -------------------------------------------------------

    if (input.barangay !== undefined) {
      payload['barangay'] = input.barangay;
    }

    if (input.location !== undefined) {
      payload['location'] = input.location;
    }

    if (input.latitude !== undefined) {
      payload['latitude'] = input.latitude;
    }

    if (input.longitude !== undefined) {
      payload['longitude'] = input.longitude;
    }

    // -------------------------------------------------------
    // FEATURES
    // -------------------------------------------------------

    if (input.features !== undefined) {
      payload['features'] = input.features;
    }

    // -------------------------------------------------------
    // DEBUG
    // -------------------------------------------------------

    console.log('================================================');

    console.log('UPDATE BUSINESS PAYLOAD:', payload);

    console.log('BUSINESS ID:', businessId);

    console.log('================================================');

    // -------------------------------------------------------
    // UPDATE
    // -------------------------------------------------------

    return await firstValueFrom(
      this.http.put<Business>(
        `${this.apiUrl}/${encodeURIComponent(businessId)}`,
        payload,
        {
          withCredentials: true,
        },
      ),
    );
  }

  // =========================================================
  // DELETE MY BUSINESS
  // PROTECTED
  // OWNER ONLY
  // =========================================================

  async deleteMyBusiness(businessId: string): Promise<void> {
    if (!businessId?.trim()) {
      throw new Error('Business ID is required.');
    }

    await firstValueFrom(
      this.http.delete<void>(
        `${this.apiUrl}/${encodeURIComponent(businessId)}`,
        {
          withCredentials: true,
        },
      ),
    );
  }

  // =========================================================
  // UPDATE BUSINESS STATUS
  // ADMIN ONLY
  // =========================================================

  async updateBusinessStatus(
    businessId: string,
    status: 'pending' | 'approved' | 'rejected',
  ): Promise<Business> {
    if (!businessId?.trim()) {
      throw new Error('Business ID is required.');
    }

    return await firstValueFrom(
      this.http.patch<Business>(
        `${this.apiUrl}/${encodeURIComponent(businessId)}/status`,
        {
          status,
        },
        {
          withCredentials: true,
        },
      ),
    );
  }
}
