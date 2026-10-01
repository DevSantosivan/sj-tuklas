import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import {
  CreateInquiryRequest,
  Inquiry,
  InquiryDto,
  InquiryMessage,
  InquiryMessageDto,
  SendInquiryMessageRequest,
} from '../models/inquiry';

import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class InquiryService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${API_CONFIG.baseUrl}/inquiries`;

  // =========================================================
  // GET MY INQUIRIES
  // VISITOR
  // =========================================================

  async getMyInquiries(): Promise<Inquiry[]> {
    const items = await firstValueFrom(
      this.http.get<InquiryDto[]>(this.apiUrl, {
        withCredentials: true,
      }),
    );

    return (items ?? []).map((item) => this.mapInquiry(item));
  }

  // =========================================================
  // GET BUSINESS INQUIRIES
  // BUSINESS OWNER
  // =========================================================
  //
  // Endpoint:
  // GET /api/inquiries/business
  //
  // Backend should return inquiries received by the
  // authenticated owner's business.
  // =========================================================

  async getBusinessInquiries(): Promise<Inquiry[]> {
    const items = await firstValueFrom(
      this.http.get<InquiryDto[]>(`${this.apiUrl}/business`, {
        withCredentials: true,
      }),
    );

    return (items ?? []).map((item) => this.mapInquiry(item));
  }

  // =========================================================
  // GET INQUIRY BY ID
  // PROTECTED
  // =========================================================

  async getInquiryById(inquiryId: string): Promise<Inquiry> {
    if (!inquiryId?.trim()) {
      throw new Error('Inquiry ID is required.');
    }

    const item = await firstValueFrom(
      this.http.get<InquiryDto>(
        `${this.apiUrl}/${encodeURIComponent(inquiryId)}`,
        {
          withCredentials: true,
        },
      ),
    );

    return this.mapInquiry(item);
  }

  // =========================================================
  // GET INQUIRY MESSAGES
  // PROTECTED
  // =========================================================

  async getMessages(inquiryId: string): Promise<InquiryMessage[]> {
    if (!inquiryId?.trim()) {
      throw new Error('Inquiry ID is required.');
    }

    const items = await firstValueFrom(
      this.http.get<InquiryMessageDto[]>(
        `${this.apiUrl}/${encodeURIComponent(inquiryId)}/messages`,
        {
          withCredentials: true,
        },
      ),
    );

    return (items ?? []).map((item) => this.mapMessage(item));
  }

  // =========================================================
  // CREATE INQUIRY
  // VISITOR
  // =========================================================

  async createInquiry(request: CreateInquiryRequest): Promise<Inquiry> {
    const item = await firstValueFrom(
      this.http.post<InquiryDto>(this.apiUrl, request, {
        withCredentials: true,
      }),
    );

    return this.mapInquiry(item);
  }

  // =========================================================
  // FIND OR CREATE INQUIRY FOR BUSINESS
  // VISITOR
  // =========================================================

  async findOrCreateForBusiness(businessId: string): Promise<Inquiry> {
    if (!businessId?.trim()) {
      throw new Error('Business ID is required.');
    }

    const item = await firstValueFrom(
      this.http.post<InquiryDto>(
        `${this.apiUrl}/business/${encodeURIComponent(businessId)}`,
        {},
        {
          withCredentials: true,
        },
      ),
    );

    return this.mapInquiry(item);
  }

  // =========================================================
  // SEND MESSAGE
  // VISITOR / BUSINESS OWNER
  // =========================================================

  async sendMessage(
    inquiryId: string,
    message: string,
  ): Promise<InquiryMessage> {
    if (!inquiryId?.trim()) {
      throw new Error('Inquiry ID is required.');
    }

    if (!message?.trim()) {
      throw new Error('Message is required.');
    }

    const request: SendInquiryMessageRequest = {
      message: message.trim(),
    };

    const item = await firstValueFrom(
      this.http.post<InquiryMessageDto>(
        `${this.apiUrl}/${encodeURIComponent(inquiryId)}/messages`,
        request,
        {
          withCredentials: true,
        },
      ),
    );

    return this.mapMessage(item);
  }

  // =========================================================
  // MARK INQUIRY AS READ
  // VISITOR / BUSINESS OWNER
  // =========================================================

  async markAsRead(inquiryId: string): Promise<void> {
    if (!inquiryId?.trim()) {
      throw new Error('Inquiry ID is required.');
    }

    await firstValueFrom(
      this.http.patch<void>(
        `${this.apiUrl}/${encodeURIComponent(inquiryId)}/read`,
        {},
        {
          withCredentials: true,
        },
      ),
    );
  }

  // =========================================================
  // MAP INQUIRY DTO
  // =========================================================

  private mapInquiry(dto: InquiryDto): Inquiry {
    const lastMessageTime = dto.lastMessageTime
      ? this.formatTime(dto.lastMessageTime)
      : '';

    return {
      id: dto.id,
      businessId: dto.businessId,
      businessName: dto.businessName,
      businessImage: dto.businessImage ?? null,
      subject: dto.subject,
      lastMessage: dto.lastMessage ?? '',
      lastMessageTime,
      status: dto.status,
      unread: dto.unread ?? 0,
      messages: (dto.messages ?? []).map((message) => this.mapMessage(message)),
    };
  }

  // =========================================================
  // MAP MESSAGE DTO
  // =========================================================

  private mapMessage(dto: InquiryMessageDto): InquiryMessage {
    return {
      id: dto.id,
      sender: dto.sender,
      message: dto.message,
      createdAt: dto.createdAt,
    };
  }

  // =========================================================
  // FORMAT MESSAGE TIME
  // =========================================================

  private formatTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();

    if (sameDay) {
      return new Intl.DateTimeFormat('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }
}
