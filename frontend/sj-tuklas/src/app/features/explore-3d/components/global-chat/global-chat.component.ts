import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface GlobalChatMessage {
  id?: string | number;
  senderName: string;
  message: string;
  timestamp?: Date | string;
  isMine?: boolean;
}

@Component({
  selector: 'app-global-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './global-chat.component.html',
  styleUrl: './global-chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalChatComponent {
  @ViewChild('messagesContainer')
  messagesContainer?: ElementRef<HTMLElement>;

  @Input() messages: GlobalChatMessage[] = [];
  @Input() isOnline = false;
  @Input() onlineCount = 0;
  @Input() unreadCount = 0;

  @Output() messageSend = new EventEmitter<string>();

  isOpen = false;
  draftMessage = '';

  toggle(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.unreadCount = 0;

      setTimeout(() => {
        this.scrollToBottom();
      });
    }
  }

  close(): void {
    this.isOpen = false;
  }

  submitMessage(): void {
    const message = this.draftMessage.trim();

    if (!message || !this.isOnline) {
      return;
    }

    this.messageSend.emit(message);
    this.draftMessage = '';

    setTimeout(() => {
      this.scrollToBottom();
    });
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitMessage();
    }
  }

  getSenderColor(name: string): string {
    const colors = [
      '#2563eb',
      '#7c3aed',
      '#db2777',
      '#ea580c',
      '#0891b2',
      '#16a34a',
      '#ca8a04',
      '#9333ea',
    ];

    let hash = 0;

    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  formatTime(timestamp?: Date | string): string {
    if (!timestamp) {
      return '';
    }

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  private scrollToBottom(): void {
    const element = this.messagesContainer?.nativeElement;

    if (!element) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }
}
