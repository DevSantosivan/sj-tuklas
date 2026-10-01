import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import {
  CreateInquiryRequest,
  Inquiry,
  InquiryDto,
  InquiryMessage,
  InquiryMessageDto,
  SendInquiryMessageRequest,
} from '../models/inquiry';

@Injectable({
  providedIn: 'root',
})
export class InquiryService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/inquiries';

  getMyInquiries(): Observable<Inquiry[]> {
    return this.http
      .get<InquiryDto[]>(this.apiUrl, { withCredentials: true })
      .pipe(map((items) => (items ?? []).map((item) => this.mapInquiry(item))));
  }

  getInquiryById(inquiryId: string): Observable<Inquiry> {
    return this.http
      .get<InquiryDto>(`${this.apiUrl}/${encodeURIComponent(inquiryId)}`, {
        withCredentials: true,
      })
      .pipe(map((item) => this.mapInquiry(item)));
  }

  getMessages(inquiryId: string): Observable<InquiryMessage[]> {
    return this.http
      .get<
        InquiryMessageDto[]
      >(`${this.apiUrl}/${encodeURIComponent(inquiryId)}/messages`, { withCredentials: true })
      .pipe(map((items) => (items ?? []).map((item) => this.mapMessage(item))));
  }

  createInquiry(request: CreateInquiryRequest): Observable<Inquiry> {
    return this.http
      .post<InquiryDto>(this.apiUrl, request, {
        withCredentials: true,
      })
      .pipe(map((item) => this.mapInquiry(item)));
  }

  findOrCreateForBusiness(businessId: string): Observable<Inquiry> {
    return this.http
      .post<InquiryDto>(
        `${this.apiUrl}/business/${encodeURIComponent(businessId)}`,
        {},
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapInquiry(item)));
  }

  sendMessage(inquiryId: string, message: string): Observable<InquiryMessage> {
    const request: SendInquiryMessageRequest = { message };

    return this.http
      .post<InquiryMessageDto>(
        `${this.apiUrl}/${encodeURIComponent(inquiryId)}/messages`,
        request,
        { withCredentials: true },
      )
      .pipe(map((item) => this.mapMessage(item)));
  }

  markAsRead(inquiryId: string): Observable<void> {
    return this.http.patch<void>(
      `${this.apiUrl}/${encodeURIComponent(inquiryId)}/read`,
      {},
      { withCredentials: true },
    );
  }

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

  private mapMessage(dto: InquiryMessageDto): InquiryMessage {
    return {
      id: dto.id,
      sender: dto.sender,
      message: dto.message,
      createdAt: dto.createdAt,
    };
  }

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
