import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface InquiryMessage {
  id: string;
  sender: 'visitor' | 'business';
  message: string;
  time: string;
}

interface Inquiry {
  id: string;
  businessName: string;
  businessImage: string;
  subject: string;
  lastMessage: string;
  lastMessageTime: string;
  status: 'new' | 'replied' | 'closed';
  unread: number;
  messages: InquiryMessage[];
}

@Component({
  selector: 'app-inquiries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inquiries.component.html',
  styleUrl: './inquiries.component.scss',
})
export class InquiriesComponent {
  searchTerm = '';
  messageText = '';

  selectedInquiry: Inquiry | null = null;

  inquiries: Inquiry[] = [
    {
      id: 'inq-001',
      businessName: 'Casa Verde Restaurant',
      businessImage:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80',
      subject: 'Table reservation inquiry',
      lastMessage: 'Yes, we can accommodate 6 guests.',
      lastMessageTime: '10:42 AM',
      status: 'replied',
      unread: 0,
      messages: [
        {
          id: 'msg-001',
          sender: 'visitor',
          message:
            'Hi! I would like to ask if you can accommodate 6 guests this Saturday at 7:00 PM?',
          time: '10:35 AM',
        },
        {
          id: 'msg-002',
          sender: 'business',
          message:
            'Hello! Yes, we can accommodate 6 guests. Would you like to proceed with the reservation?',
          time: '10:42 AM',
        },
      ],
    },

    {
      id: 'inq-002',
      businessName: 'Brew District Café',
      businessImage:
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80',
      subject: 'Private table availability',
      lastMessage: 'Is the private table still available?',
      lastMessageTime: 'Yesterday',
      status: 'new',
      unread: 1,
      messages: [
        {
          id: 'msg-003',
          sender: 'visitor',
          message: 'Hi! Is your private table still available for October 2?',
          time: 'Yesterday',
        },
      ],
    },

    {
      id: 'inq-003',
      businessName: 'Glow Beauty Studio',
      businessImage:
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=300&q=80',
      subject: 'Hair & Beauty Package',
      lastMessage: 'Thank you for the information!',
      lastMessageTime: 'Sep 22',
      status: 'closed',
      unread: 0,
      messages: [
        {
          id: 'msg-004',
          sender: 'visitor',
          message: 'Can I ask what is included in your Hair & Beauty Package?',
          time: 'Sep 22',
        },
        {
          id: 'msg-005',
          sender: 'business',
          message:
            'The package includes haircut, styling, treatment, and basic makeup.',
          time: 'Sep 22',
        },
        {
          id: 'msg-006',
          sender: 'visitor',
          message: 'Thank you for the information!',
          time: 'Sep 22',
        },
      ],
    },

    {
      id: 'inq-004',
      businessName: 'Sunset Bay Resort',
      businessImage:
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=300&q=80',
      subject: 'Family room inquiry',
      lastMessage: 'Do you have a family room for 5 guests?',
      lastMessageTime: 'Sep 21',
      status: 'new',
      unread: 1,
      messages: [
        {
          id: 'msg-007',
          sender: 'visitor',
          message:
            'Good day! Do you have a family room available for 5 guests on October 10?',
          time: 'Sep 21',
        },
      ],
    },
  ];

  constructor() {
    this.selectedInquiry = this.inquiries[0];
  }

  get filteredInquiries(): Inquiry[] {
    const search = this.searchTerm.trim().toLowerCase();

    if (!search) {
      return this.inquiries;
    }

    return this.inquiries.filter(
      (inquiry) =>
        inquiry.businessName.toLowerCase().includes(search) ||
        inquiry.subject.toLowerCase().includes(search) ||
        inquiry.lastMessage.toLowerCase().includes(search),
    );
  }

  selectInquiry(inquiry: Inquiry): void {
    this.selectedInquiry = inquiry;
    inquiry.unread = 0;
  }

  getStatusLabel(status: Inquiry['status']): string {
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

  sendMessage(): void {
    const message = this.messageText.trim();

    if (!message || !this.selectedInquiry) {
      return;
    }

    this.selectedInquiry.messages.push({
      id: `msg-${Date.now()}`,
      sender: 'visitor',
      message,
      time: 'Just now',
    });

    this.selectedInquiry.lastMessage = message;
    this.selectedInquiry.lastMessageTime = 'Just now';
    this.selectedInquiry.status = 'new';

    this.messageText = '';
  }
}
