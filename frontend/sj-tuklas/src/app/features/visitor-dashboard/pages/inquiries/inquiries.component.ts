import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Inquiry, InquiryStatus } from '../../../../core/models/inquiry';
import { InquiryService } from '../../../../core/services/inquiry.service';

@Component({
  selector: 'app-inquiries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inquiries.component.html',
  styleUrl: './inquiries.component.scss',
})
export class InquiriesComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly inquiryService = inject(InquiryService);
  private readonly destroy$ = new Subject<void>();

  searchTerm = '';
  messageText = '';

  inquiries: Inquiry[] = [];
  selectedInquiry: Inquiry | null = null;

  isLoading = true;
  isOpeningInquiry = false;
  isSending = false;
  isLoadingMessages = false;
  errorMessage: string | null = null;
  sendError: string | null = null;
  mobileChatOpen = false;

  ngOnInit(): void {
    this.loadInquiries();

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const businessId = params.get('businessId');

        if (businessId) {
          this.openBusinessInquiry(businessId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredInquiries(): Inquiry[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) return this.inquiries;

    return this.inquiries.filter((inquiry) =>
      [inquiry.businessName, inquiry.subject, inquiry.lastMessage].some(
        (value) => value.toLowerCase().includes(search),
      ),
    );
  }

  get unreadTotal(): number {
    return this.inquiries.reduce((total, inquiry) => total + inquiry.unread, 0);
  }

  loadInquiries(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.inquiryService
      .getMyInquiries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inquiries) => {
          this.inquiries = inquiries;
          this.isLoading = false;

          if (this.selectedInquiry) {
            const refreshed = inquiries.find(
              (item) => item.id === this.selectedInquiry?.id,
            );

            if (refreshed) {
              this.selectedInquiry = {
                ...refreshed,
                messages: this.selectedInquiry.messages,
              };
            }
          }
        },
        error: (error) => {
          console.error('Failed to load inquiries:', error);
          this.errorMessage =
            error?.status === 401
              ? 'Please sign in again to view your inquiries.'
              : 'Unable to load your conversations. Please try again.';
          this.isLoading = false;
        },
      });
  }

  openBusinessInquiry(businessId: string): void {
    if (this.isOpeningInquiry) return;

    this.isOpeningInquiry = true;
    this.errorMessage = null;

    this.inquiryService
      .findOrCreateForBusiness(businessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inquiry) => {
          this.isOpeningInquiry = false;

          const existingIndex = this.inquiries.findIndex(
            (item) => item.id === inquiry.id,
          );

          if (existingIndex >= 0) {
            this.inquiries[existingIndex] = inquiry;
          } else {
            this.inquiries = [inquiry, ...this.inquiries];
          }

          this.selectInquiry(inquiry);
        },
        error: (error) => {
          console.error('Failed to open business inquiry:', error);
          this.isOpeningInquiry = false;
          this.errorMessage =
            error?.status === 401
              ? 'Please sign in to start an inquiry.'
              : 'Unable to open this conversation. Please try again.';
        },
      });
  }

  selectInquiry(inquiry: Inquiry): void {
    this.selectedInquiry = inquiry;
    this.mobileChatOpen = true;
    this.sendError = null;
    this.isLoadingMessages = true;

    this.inquiryService
      .getMessages(inquiry.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          if (this.selectedInquiry?.id !== inquiry.id) return;

          this.selectedInquiry = {
            ...inquiry,
            messages,
            unread: 0,
          };

          this.updateInquiry(this.selectedInquiry);
          this.isLoadingMessages = false;

          this.inquiryService
            .markAsRead(inquiry.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              error: (error) =>
                console.error('Unable to mark inquiry as read:', error),
            });
        },
        error: (error) => {
          console.error('Failed to load inquiry messages:', error);
          this.isLoadingMessages = false;
          this.sendError = 'Unable to load messages. Please try again.';
        },
      });
  }

  sendMessage(): void {
    const message = this.messageText.trim();
    const inquiry = this.selectedInquiry;

    if (!message || !inquiry || this.isSending) return;

    if (inquiry.status === 'closed') {
      this.sendError = 'This conversation is closed.';
      return;
    }

    this.isSending = true;
    this.sendError = null;

    this.inquiryService
      .sendMessage(inquiry.id, message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (savedMessage) => {
          if (this.selectedInquiry?.id !== inquiry.id) {
            this.isSending = false;
            return;
          }

          const updated: Inquiry = {
            ...inquiry,
            messages: [...inquiry.messages, savedMessage],
            lastMessage: savedMessage.message,
            lastMessageTime: this.formatTime(savedMessage.createdAt),
            status: 'new',
          };

          this.selectedInquiry = updated;
          this.updateInquiry(updated);
          this.messageText = '';
          this.isSending = false;
        },
        error: (error) => {
          console.error('Failed to send inquiry message:', error);
          this.sendError =
            error?.status === 401
              ? 'Your session has expired. Please sign in again.'
              : 'Message was not sent. Please try again.';
          this.isSending = false;
        },
      });
  }

  getStatusLabel(status: InquiryStatus): string {
    switch (status) {
      case 'new':
        return 'New';
      case 'replied':
        return 'Replied';
      case 'closed':
        return 'Closed';
      default:
        return 'Inquiry';
    }
  }

  backToConversations(): void {
    this.mobileChatOpen = false;
  }

  trackInquiry(_: number, inquiry: Inquiry): string {
    return inquiry.id;
  }

  trackMessage(_: number, message: { id: string }): string {
    return message.id;
  }

  private updateInquiry(updated: Inquiry): void {
    this.inquiries = this.inquiries.map((item) =>
      item.id === updated.id ? updated : item,
    );
  }

  private formatTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}
