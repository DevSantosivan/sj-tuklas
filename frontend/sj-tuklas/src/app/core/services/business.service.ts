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

    return await firstValueFrom(
      this.http.post<Business>(this.apiUrl, payload, {
        withCredentials: true,
      }),
    );
  }

  async getPopularBusinesses(limit = 5): Promise<Business[]> {
    const businesses = await this.getApprovedBusinesses();

    return businesses
      .filter((business) => business.status === 'approved')
      .sort((a, b) => {
        const ratingDifference = Number(b.rating ?? 0) - Number(a.rating ?? 0);

        if (ratingDifference !== 0) {
          return ratingDifference;
        }

        return Number(b.reviews ?? 0) - Number(a.reviews ?? 0);
      })
      .slice(0, limit);
  }

  async uploadBusinessImage(
    businessId: string,
    imageType: 'profile' | 'cover' | 'gallery',
    file: File,
  ): Promise<{
    message: string;
    imageType: string;
    imageUrl: string;
  }> {
    if (!businessId?.trim()) {
      throw new Error('Business ID is required.');
    }

    if (!file) {
      throw new Error('Image file is required.');
    }

    const allowedImageTypes = ['profile', 'cover', 'gallery'] as const;

    if (!allowedImageTypes.includes(imageType)) {
      throw new Error('Invalid image type.');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
      throw new Error('Only JPG, PNG, and WEBP images are allowed.');
    }

    const maxFileSize = 5 * 1024 * 1024;

    if (file.size > maxFileSize) {
      throw new Error('Image file must not exceed 5 MB.');
    }

    const formData = new FormData();

    formData.append('file', file, file.name);

    const url =
      `${this.apiUrl}/` +
      `${encodeURIComponent(businessId)}/` +
      `images/${imageType}`;

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

  async getApprovedBusinesses(): Promise<Business[]> {
    const businesses = await firstValueFrom(
      this.http.get<Business[]>(this.apiUrl),
    );

    // TEMPORARY DIAGNOSTIC
    console.table(
      businesses.map((business) => ({
        id: business.id,
        name: business.name,
      })),
    );

    return businesses;
  }

  async getBusinesses(): Promise<Business[]> {
    return await this.getApprovedBusinesses();
  }

  async getAdminBusinesses(): Promise<Business[]> {
    return await firstValueFrom(
      this.http.get<Business[]>(`${this.apiUrl}/admin/all`, {
        withCredentials: true,
      }),
    );
  }

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

  async updateMyBusiness(
    businessId: string,
    input: Partial<CreateBusinessInput>,
  ): Promise<Business> {
    if (!businessId?.trim()) {
      throw new Error('Business ID is required.');
    }

    const payload: Record<string, unknown> = {};

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

    if (input.image !== undefined) {
      payload['image'] = input.image;
    }

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

    if (input.features !== undefined) {
      payload['features'] = input.features;
    }

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
        { status },
        {
          withCredentials: true,
        },
      ),
    );
  }
}
