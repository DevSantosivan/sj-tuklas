export type InquiryStatus = 'new' | 'replied' | 'closed';

export type InquirySender = 'self' | 'other';

export interface InquiryMessage {
  id: string;
  sender: InquirySender;
  message: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  businessId: string;
  businessName: string;
  businessImage: string | null;
  subject: string;
  lastMessage: string;
  lastMessageTime: string;
  status: InquiryStatus;
  unread: number;
  messages: InquiryMessage[];
}

export interface InquiryDto {
  id: string;
  businessId: string;
  businessName: string;
  businessImage?: string | null;
  subject: string;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  status: InquiryStatus;
  unread?: number;
  messages?: InquiryMessageDto[];
}

export interface InquiryMessageDto {
  id: string;
  sender: InquirySender;
  message: string;
  createdAt: string;
}

export interface CreateInquiryRequest {
  businessId: string;
  subject: string;
  message: string;
}

export interface SendInquiryMessageRequest {
  message: string;
}
