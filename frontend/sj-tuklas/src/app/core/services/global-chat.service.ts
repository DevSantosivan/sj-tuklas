import { Injectable, NgZone, OnDestroy } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import { environment } from '../../../environments/environment';
import { GlobalChatMessage } from '../models/global-chat-message.model';
import { GlobalChatModeration } from '../models/global-chat-moderation.model';
import { API_CONFIG } from '../config/api.config';

@Injectable({
  providedIn: 'root',
})
export class GlobalChatService implements OnDestroy {
  private hubConnection: HubConnection | null = null;

  private get hubUrl(): string {
    return API_CONFIG.baseUrl.replace(/\/api\/?$/, '') + '/hubs/global-chat';
  }
  private messageListeners = new Set<(message: GlobalChatMessage) => void>();

  private moderationListeners = new Set<
    (moderation: GlobalChatModeration) => void
  >();

  private connectionListeners = new Set<(connected: boolean) => void>();

  constructor(private readonly ngZone: NgZone) {}

  async connect(): Promise<void> {
    if (
      this.hubConnection &&
      this.hubConnection.state !== HubConnectionState.Disconnected
    ) {
      return;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(LogLevel.Warning)
      .build();

    // ==========================================================
    // GLOBAL CHAT MESSAGE
    // ==========================================================

    this.hubConnection.on('GlobalChatMessage', (message: GlobalChatMessage) => {
      this.ngZone.run(() => {
        for (const listener of this.messageListeners) {
          listener(message);
        }
      });
    });

    // ==========================================================
    // GLOBAL CHAT MODERATION
    // ==========================================================

    this.hubConnection.on(
      'GlobalChatModeration',
      (moderation: GlobalChatModeration) => {
        this.ngZone.run(() => {
          for (const listener of this.moderationListeners) {
            listener(moderation);
          }
        });
      },
    );

    // ==========================================================
    // CONNECTION CLOSED
    // ==========================================================

    this.hubConnection.onclose(() => {
      this.ngZone.run(() => {
        this.emitConnection(false);
      });
    });

    // ==========================================================
    // RECONNECTED
    // ==========================================================

    this.hubConnection.onreconnected(() => {
      this.ngZone.run(() => {
        this.emitConnection(true);
      });
    });

    // ==========================================================
    // START
    // ==========================================================

    try {
      await this.hubConnection.start();

      this.ngZone.run(() => {
        this.emitConnection(true);
      });

      console.log('[GlobalChat] Connected.');
    } catch (error) {
      this.ngZone.run(() => {
        this.emitConnection(false);
      });

      console.error('[GlobalChat] Connection failed:', error);

      throw error;
    }
  }

  // ============================================================
  // SEND MESSAGE
  // ============================================================

  async sendMessage(message: string): Promise<void> {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      return;
    }

    if (!this.hubConnection) {
      throw new Error('Global Chat is not connected.');
    }

    if (this.hubConnection.state !== HubConnectionState.Connected) {
      throw new Error('Global Chat is not connected.');
    }

    await this.hubConnection.invoke('SendMessage', trimmedMessage);
  }

  // ============================================================
  // MESSAGE LISTENER
  // ============================================================

  onMessage(listener: (message: GlobalChatMessage) => void): () => void {
    this.messageListeners.add(listener);

    return () => {
      this.messageListeners.delete(listener);
    };
  }

  // ============================================================
  // MODERATION LISTENER
  // ============================================================

  onModeration(
    listener: (moderation: GlobalChatModeration) => void,
  ): () => void {
    this.moderationListeners.add(listener);

    return () => {
      this.moderationListeners.delete(listener);
    };
  }

  // ============================================================
  // CONNECTION LISTENER
  // ============================================================

  onConnectionChange(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.add(listener);

    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  // ============================================================
  // CONNECTION STATE
  // ============================================================

  get isConnected(): boolean {
    return this.hubConnection?.state === HubConnectionState.Connected;
  }

  // ============================================================
  // DISCONNECT
  // ============================================================

  async disconnect(): Promise<void> {
    if (!this.hubConnection) {
      return;
    }

    try {
      await this.hubConnection.stop();
    } finally {
      this.hubConnection = null;
      this.emitConnection(false);
    }
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  private emitConnection(connected: boolean): void {
    for (const listener of this.connectionListeners) {
      listener(connected);
    }
  }

  // ============================================================
  // DESTROY
  // ============================================================

  ngOnDestroy(): void {
    void this.disconnect();

    this.messageListeners.clear();
    this.moderationListeners.clear();
    this.connectionListeners.clear();
  }
}
