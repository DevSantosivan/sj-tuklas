import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { GlobalChatMessage } from '../../../../core/models/global-chat-message.model';
import { GlobalChatModeration } from '../../../../core/models/global-chat-moderation.model';
import { Explore3dPlayerService } from '../../services/explore3d-player.service';

@Component({
  selector: 'app-global-chat',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './global-chat.component.html',
  styleUrl: './global-chat.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalChatComponent implements OnChanges {
  @ViewChild('messagesContainer')
  messagesContainer?: ElementRef<HTMLElement>;

  @Input() messages: GlobalChatMessage[] = [];
  @Input() isOnline = false;
  @Input() onlineCount = 0;
  @Input() unreadCount = 0;
  @Input() currentUsername = '';
  @Input() moderation: GlobalChatModeration | null = null;

  @Output()
  messageSend = new EventEmitter<string>();

  @Output()
  chatOpened = new EventEmitter<void>();

  isOpen = false;
  draftMessage = '';

  private readonly processedMessageIds = new Set<string>();
  private chatHistoryInitialized = false;

  constructor(
    private readonly explore3dPlayerService: Explore3dPlayerService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['messages']) {
      return;
    }

    const messages = this.messages ?? [];

    if (!this.chatHistoryInitialized) {
      for (const message of messages) {
        if (message.id) {
          this.processedMessageIds.add(message.id);
        }
      }

      this.chatHistoryInitialized = true;
      return;
    }

    for (const message of messages) {
      if (!message.id) {
        continue;
      }

      if (this.processedMessageIds.has(message.id)) {
        continue;
      }

      this.processedMessageIds.add(message.id);
      this.showMessageAbovePlayer(message);
    }

    if (this.isOpen) {
      setTimeout(() => {
        this.scrollToBottom();
      });
    }

    this.cleanupProcessedMessageIds(messages);
  }

  private showMessageAbovePlayer(message: GlobalChatMessage): void {
    const userName = message.userName?.trim();
    const text = message.message?.trim();

    if (!userName || !text) {
      return;
    }

    this.explore3dPlayerService.showRemoteChatMessageByName(
      userName,
      text,
      5000,
    );
  }

  private cleanupProcessedMessageIds(messages: GlobalChatMessage[]): void {
    if (this.processedMessageIds.size <= 200) {
      return;
    }

    const currentIds = new Set(
      messages
        .slice(-100)
        .map((message) => message.id)
        .filter((id): id is string => !!id),
    );

    for (const id of this.processedMessageIds) {
      if (!currentIds.has(id)) {
        this.processedMessageIds.delete(id);
      }
    }
  }

  get isChatBlocked(): boolean {
    return this.moderation?.isChatBlocked ?? false;
  }

  get isRestricted(): boolean {
    const restrictedUntil = this.moderation?.restrictedUntil;

    if (!restrictedUntil) {
      return false;
    }

    const date = new Date(restrictedUntil);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date.getTime() > Date.now();
  }

  get moderationMessage(): string {
    return this.moderation?.message ?? '';
  }

  get canSend(): boolean {
    return this.isOnline && !this.isChatBlocked && !this.isRestricted;
  }

  get inputPlaceholder(): string {
    if (this.isChatBlocked) {
      return 'Global Chat permanently blocked';
    }

    if (this.isRestricted) {
      return 'Global Chat temporarily restricted';
    }

    if (!this.isOnline) {
      return 'Connecting...';
    }

    return 'Message everyone...';
  }

  toggle(): void {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.chatOpened.emit();

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

    if (!message || !this.canSend) {
      return;
    }

    this.messageSend.emit(message);

    this.draftMessage = '';

    setTimeout(() => {
      this.scrollToBottom();
    });
  }

  handleKeydown(event: KeyboardEvent): void {
    event.stopPropagation();

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitMessage();
    }
  }

  handleKeyup(event: KeyboardEvent): void {
    event.stopPropagation();
  }

  handleKeypress(event: KeyboardEvent): void {
    event.stopPropagation();
  }

  stopKeyboardPropagation(event: KeyboardEvent): void {
    event.stopPropagation();
  }

  isMyMessage(message: GlobalChatMessage): boolean {
    if (!this.currentUsername) {
      return false;
    }

    return message.userName === this.currentUsername;
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

  formatTime(timestamp: string): string {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  formatRestrictionDate(timestamp: string | null): string {
    if (!timestamp) {
      return '';
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
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
