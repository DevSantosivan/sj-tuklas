import { Injectable, NgZone, OnDestroy } from '@angular/core';

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

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

  // ============================================================
  // LISTENERS
  // ============================================================

  private readonly messageListeners = new Set<
    (message: GlobalChatMessage) => void
  >();

  private readonly moderationListeners = new Set<
    (moderation: GlobalChatModeration) => void
  >();

  private readonly connectionListeners = new Set<
    (connected: boolean) => void
  >();

  constructor(private readonly ngZone: NgZone) {}

  // ============================================================
  // CONNECT
  // ============================================================

  async connect(): Promise<void> {
    /*
     * Already connecting or connected.
     *
     * This prevents duplicate SignalR connections.
     */
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

      /*
       * Important:
       * If start() fails, remove the broken connection object.
       * Otherwise a later connect() could see the old object.
       */
      this.hubConnection = null;

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

    /*
     * Return cleanup function.
     *
     * Component calls this when it is destroyed.
     */
    return () => {
      this.messageListeners.delete(listener);

      /*
       * If nobody is using chat anymore,
       * stop the SignalR connection.
       */
      this.disconnectIfUnused();
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

      /*
       * Stop SignalR when no chat/moderation
       * subscriber remains.
       */
      this.disconnectIfUnused();
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

    const connection = this.hubConnection;

    /*
     * Clear the reference first.
     *
     * This prevents another connect() call from
     * accidentally reusing a connection that is
     * already being stopped.
     */
    this.hubConnection = null;

    try {
      if (connection.state !== HubConnectionState.Disconnected) {
        await connection.stop();
      }
    } catch (error) {
      console.error('[GlobalChat] Disconnect failed:', error);
    } finally {
      this.emitConnection(false);
    }
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  /**
   * Determines whether something is still actively
   * consuming realtime chat data.
   *
   * Connection listeners are intentionally NOT included.
   *
   * A component may only be watching connection status;
   * that alone should not keep the SignalR connection alive.
   */
  private hasChatListeners(): boolean {
    return this.messageListeners.size > 0 || this.moderationListeners.size > 0;
  }

  /**
   * Disconnect SignalR when there are no remaining
   * chat/moderation subscribers.
   */
  private disconnectIfUnused(): void {
    if (!this.hasChatListeners()) {
      void this.disconnect();
    }
  }

  /**
   * Notify connection-state subscribers.
   */
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
