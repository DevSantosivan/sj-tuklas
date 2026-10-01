import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { InquiryService } from '../../../../core/services/inquiry.service';
import { Inquiry, InquiryMessage } from '../../../../core/models/inquiry';

type InquiryMode = 'visitor' | 'business';

@Component({
  selector: 'app-inquiries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inquiries.component.html',
  styleUrl: './inquiries.component.scss',
})
export class InquiriesComponent implements OnInit, OnDestroy {
  private readonly inquiryService = inject(InquiryService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  // =========================================================
  // STATE
  // =========================================================

  inquiries: Inquiry[] = [];
  selectedInquiry: Inquiry | null = null;

  mode: InquiryMode = 'visitor';

  searchTerm = '';
  messageText = '';

  isLoading = false;
  isLoadingMessages = false;
  isOpeningInquiry = false;
  isSending = false;
  mobileChatOpen = false;

  errorMessage = '';
  sendError = '';

  visitorName = 'You';

  // =========================================================
  // MODE
  // =========================================================

  get isBusinessMode(): boolean {
    return this.mode === 'business';
  }

  get isBusinessOwner(): boolean {
    return this.isBusinessMode;
  }

  // =========================================================
  // PAGE TEXT
  // =========================================================

  get pageTitle(): string {
    return this.isBusinessOwner ? 'Customer inquiries' : 'Your messages';
  }

  get pageDescription(): string {
    return this.isBusinessOwner
      ? 'Manage customer questions and keep conversations moving.'
      : 'View and manage your conversations with local businesses.';
  }

  get conversationLabel(): string {
    return this.inquiries.length === 1 ? 'Conversation' : 'Conversations';
  }

  get inboxLabel(): string {
    return this.isBusinessOwner ? 'CUSTOMER INBOX' : 'YOUR INBOX';
  }

  get emptyTitle(): string {
    if (this.searchTerm.trim()) {
      return 'No conversations found';
    }

    return this.isBusinessOwner
      ? 'No customer messages yet'
      : 'No conversations yet';
  }

  get emptyDescription(): string {
    if (this.searchTerm.trim()) {
      return 'Try another name or keyword to find a conversation.';
    }

    return this.isBusinessOwner
      ? 'When customers send an inquiry to your business, their conversations will appear here.'
      : 'When you contact a business, your conversations will appear here.';
  }

  // =========================================================
  // FILTERED INQUIRIES
  // =========================================================

  get filteredInquiries(): Inquiry[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.inquiries;
    }

    return this.inquiries.filter((inquiry) => {
      const name = this.getConversationName(inquiry).toLowerCase();
      const subject = (inquiry.subject ?? '').toLowerCase();
      const business = (inquiry.businessName ?? '').toLowerCase();
      const lastMessage = (inquiry.lastMessage ?? '').toLowerCase();

      return (
        name.includes(term) ||
        subject.includes(term) ||
        business.includes(term) ||
        lastMessage.includes(term)
      );
    });
  }

  get unreadTotal(): number {
    return this.inquiries.reduce(
      (total, inquiry) => total + (inquiry.unread ?? 0),
      0,
    );
  }

  // =========================================================
  // LIFECYCLE
  // =========================================================

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.mode = data['inquiryMode'] === 'business' ? 'business' : 'visitor';
      this.loadInquiries();
    });

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const businessId = params.get('businessId');

        if (businessId && this.mode === 'visitor') {
          this.openBusinessInquiry(businessId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =========================================================
  // LOAD INQUIRIES
  // =========================================================

  async loadInquiries(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = this.isBusinessOwner
        ? await this.inquiryService.getBusinessInquiries()
        : await this.inquiryService.getMyInquiries();

      this.inquiries = result ?? [];

      if (this.selectedInquiry) {
        const updated = this.inquiries.find(
          (item) => item.id === this.selectedInquiry?.id,
        );

        if (updated) {
          this.selectedInquiry = {
            ...updated,
            messages: this.selectedInquiry.messages ?? [],
          };
        } else {
          this.selectedInquiry = null;
        }
      }
    } catch (error) {
      console.error('Failed to load inquiries:', error);
      this.errorMessage = 'Unable to load conversations. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  // =========================================================
  // OPEN BUSINESS INQUIRY
  // =========================================================

  async openBusinessInquiry(businessId: string): Promise<void> {
    if (this.isBusinessOwner || !businessId) {
      return;
    }

    this.isOpeningInquiry = true;
    this.errorMessage = '';

    try {
      const inquiry =
        await this.inquiryService.findOrCreateForBusiness(businessId);

      await this.loadInquiries();

      const matchingInquiry =
        this.inquiries.find((item) => item.id === inquiry.id) ?? inquiry;

      await this.selectInquiry(matchingInquiry);

      await this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { businessId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    } catch (error) {
      console.error('Failed to open business inquiry:', error);
      this.errorMessage =
        'Unable to start a conversation with this business. Please try again.';
    } finally {
      this.isOpeningInquiry = false;
    }
  }

  // =========================================================
  // SELECT INQUIRY
  // =========================================================

  async selectInquiry(inquiry: Inquiry): Promise<void> {
    if (!inquiry?.id) {
      return;
    }

    this.selectedInquiry = inquiry;
    this.mobileChatOpen = true;
    this.isLoadingMessages = true;
    this.sendError = '';
    this.messageText = '';

    try {
      const messages = await this.inquiryService.getMessages(inquiry.id);

      if (this.selectedInquiry?.id !== inquiry.id) {
        return;
      }

      this.selectedInquiry = {
        ...inquiry,
        messages: messages ?? [],
      };

      await this.inquiryService.markAsRead(inquiry.id);

      this.updateInquiry({
        ...this.selectedInquiry,
        unread: 0,
      });
    } catch (error) {
      console.error('Failed to load inquiry messages:', error);
      this.sendError = 'Unable to load messages. Please try again.';
    } finally {
      this.isLoadingMessages = false;
    }
  }

  // =========================================================
  // SEND MESSAGE
  // =========================================================

  async sendMessage(): Promise<void> {
    const inquiry = this.selectedInquiry;
    const message = this.messageText.trim();

    if (
      !inquiry ||
      !message ||
      this.isSending ||
      this.isLoadingMessages ||
      inquiry.status === 'closed'
    ) {
      return;
    }

    this.isSending = true;
    this.sendError = '';

    try {
      const sentMessage = await this.inquiryService.sendMessage(
        inquiry.id,
        message,
      );

      const currentMessages = this.selectedInquiry?.messages ?? [];

      this.selectedInquiry = {
        ...inquiry,
        messages: [...currentMessages, sentMessage],
        lastMessage: sentMessage.message,
        lastMessageTime: this.formatTime(sentMessage.createdAt),
        status: this.isBusinessOwner ? 'replied' : inquiry.status,
      };

      this.updateInquiry(this.selectedInquiry);
      this.messageText = '';
    } catch (error) {
      console.error('Failed to send message:', error);
      this.sendError = 'Message could not be sent. Please try again.';
    } finally {
      this.isSending = false;
    }
  }

  // =========================================================
  // CONVERSATION DISPLAY
  // =========================================================

  getConversationName(inquiry: Inquiry): string {
    const item = inquiry as any;

    if (this.isBusinessOwner) {
      return (
        item.visitorName ||
        item.customerName ||
        item.userName ||
        item.fullName ||
        item.visitor?.name ||
        item.customer?.name ||
        item.user?.name ||
        item.profile?.fullName ||
        'Customer'
      );
    }

    return inquiry.businessName || 'Business';
  }

  getConversationImage(inquiry: Inquiry): string | null {
    const item = inquiry as any;

    if (this.isBusinessOwner) {
      return (
        item.visitorImage ||
        item.customerImage ||
        item.userImage ||
        item.avatar ||
        item.visitor?.image ||
        item.customer?.image ||
        item.user?.avatar ||
        item.profile?.avatarUrl ||
        null
      );
    }

    return (
      item.businessImage || item.business?.image || item.business?.logo || null
    );
  }

  getInitials(name: string | null | undefined): string {
    const value = (name ?? '').trim();

    if (!value) {
      return '??';
    }

    const parts = value.split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  // =========================================================
  // MESSAGE SENDER HELPERS
  // =========================================================

  isVisitorMessage(sender: string): boolean {
    return (
      sender?.toLowerCase() === 'visitor' || sender?.toLowerCase() === 'user'
    );
  }

  isBusinessMessage(sender: string): boolean {
    return (
      sender?.toLowerCase() === 'business' || sender?.toLowerCase() === 'owner'
    );
  }

  isCurrentUserMessage(sender: string): boolean {
    const normalized = (sender ?? '').toLowerCase();

    return this.isBusinessOwner
      ? normalized === 'business' || normalized === 'owner'
      : normalized === 'visitor' || normalized === 'user';
  }

  isOtherUserMessage(sender: string): boolean {
    return !this.isCurrentUserMessage(sender);
  }

  // =========================================================
  // STATUS
  // =========================================================

  getStatusLabel(status: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'new':
        return 'New';
      case 'replied':
        return 'Replied';
      case 'closed':
        return 'Closed';
      default:
        return status || 'Open';
    }
  }

  // =========================================================
  // MOBILE NAVIGATION
  // =========================================================

  backToConversations(): void {
    this.mobileChatOpen = false;
  }

  // =========================================================
  // UPDATE LOCAL INQUIRY
  // =========================================================

  private updateInquiry(updated: Inquiry): void {
    this.inquiries = this.inquiries.map((item) =>
      item.id === updated.id ? { ...item, ...updated } : item,
    );
  }

  // =========================================================
  // TRACK BY
  // =========================================================

  trackInquiry(index: number, inquiry: Inquiry): string | number {
    return inquiry.id || index;
  }

  trackMessage(index: number, message: InquiryMessage): string | number {
    return message.id || index;
  }

  // =========================================================
  // TIME FORMAT
  // =========================================================

  private formatTime(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
