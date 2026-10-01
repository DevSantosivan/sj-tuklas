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

  /**
   * Fallback name used when the inquiry does not contain
   * the visitor's profile name.
   *
   * If your auth/profile service provides the signed-in user's name,
   * assign it here when the component loads.
   */
  visitorName = 'You';

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

    if (!search) {
      return this.inquiries;
    }

    return this.inquiries.filter((inquiry) =>
      [inquiry.businessName, inquiry.subject, inquiry.lastMessage].some(
        (value) => (value ?? '').toLowerCase().includes(search),
      ),
    );
  }

  get unreadTotal(): number {
    return this.inquiries.reduce(
      (total, inquiry) => total + (inquiry.unread ?? 0),
      0,
    );
  }

  /**
   * Visitor name for the selected inquiry.
   * Supports optional name fields if your API includes them,
   * without requiring changes to the Inquiry interface.
   */
  get currentVisitorName(): string {
    const inquiry = this.selectedInquiry as
      | (Inquiry & Record<string, unknown>)
      | null;

    if (!inquiry) {
      return this.visitorName;
    }

    const directNames = [
      inquiry['visitorName'],
      inquiry['customerName'],
      inquiry['userName'],
      inquiry['fullName'],
    ];

    for (const value of directNames) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    const nestedProfiles = [
      inquiry['visitor'],
      inquiry['customer'],
      inquiry['user'],
      inquiry['profile'],
    ];

    for (const profile of nestedProfiles) {
      if (
        profile &&
        typeof profile === 'object' &&
        'name' in profile &&
        typeof (profile as Record<string, unknown>)['name'] === 'string'
      ) {
        const name = (profile as Record<string, unknown>)['name'] as string;

        if (name.trim()) {
          return name.trim();
        }
      }

      if (
        profile &&
        typeof profile === 'object' &&
        'fullName' in profile &&
        typeof (profile as Record<string, unknown>)['fullName'] === 'string'
      ) {
        const name = (profile as Record<string, unknown>)['fullName'] as string;

        if (name.trim()) {
          return name.trim();
        }
      }
    }

    return this.visitorName;
  }

  /**
   * Generate initials for business and visitor avatars.
   * Examples:
   * Ivan Santos -> IS
   * SJ Tuklas -> ST
   * Ivan -> IV
   */
  getInitials(name: string | null | undefined): string {
    const cleanName = (name ?? '').trim();

    if (!cleanName) {
      return '?';
    }

    const parts = cleanName.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  /**
   * Supports sender values from different API mappings:
   * visitor/self/user/customer are the signed-in visitor.
   */
  isVisitorMessage(sender: string | null | undefined): boolean {
    const normalized = (sender ?? '').trim().toLowerCase();

    return ['visitor', 'self', 'user', 'customer', 'client', 'sender'].includes(
      normalized,
    );
  }

  /**
   * Supports business/owner/other values for business replies.
   */
  isBusinessMessage(sender: string | null | undefined): boolean {
    const normalized = (sender ?? '').trim().toLowerCase();

    return [
      'business',
      'other',
      'owner',
      'businessowner',
      'business_owner',
      'admin',
      'recipient',
    ].includes(normalized);
  }

  loadInquiries(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.inquiryService
      .getMyInquiries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (inquiries) => {
          this.inquiries = inquiries ?? [];
          this.isLoading = false;

          if (this.selectedInquiry) {
            const refreshed = this.inquiries.find(
              (item) => item.id === this.selectedInquiry?.id,
            );

            if (refreshed) {
              this.selectedInquiry = {
                ...refreshed,
                messages: this.selectedInquiry.messages ?? [],
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
    if (this.isOpeningInquiry) {
      return;
    }

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
            this.inquiries = this.inquiries.map((item) =>
              item.id === inquiry.id ? inquiry : item,
            );
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
    this.selectedInquiry = {
      ...inquiry,
      messages: [],
    };

    this.mobileChatOpen = true;
    this.sendError = null;
    this.isLoadingMessages = true;

    const selectedId = inquiry.id;

    this.inquiryService
      .getMessages(selectedId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          if (this.selectedInquiry?.id !== selectedId) {
            return;
          }

          const updated: Inquiry = {
            ...inquiry,
            messages: messages ?? [],
            unread: 0,
          };

          this.selectedInquiry = updated;
          this.updateInquiry(updated);
          this.isLoadingMessages = false;

          this.inquiryService
            .markAsRead(selectedId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              error: (error) =>
                console.error('Unable to mark inquiry as read:', error),
            });
        },
        error: (error) => {
          console.error('Failed to load inquiry messages:', error);

          if (this.selectedInquiry?.id !== selectedId) {
            return;
          }

          this.isLoadingMessages = false;
          this.sendError = 'Unable to load messages. Please try again.';
        },
      });
  }

  sendMessage(): void {
    const message = this.messageText.trim();
    const inquiry = this.selectedInquiry;

    if (!message || !inquiry || this.isSending) {
      return;
    }

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
            ...this.selectedInquiry,
            messages: [...(this.selectedInquiry.messages ?? []), savedMessage],
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

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}
