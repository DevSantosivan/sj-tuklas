import { Injectable } from '@angular/core';

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

export interface GlobalChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}

@Injectable()
export class Explore3dChatService {
  chatOpen = false;

  chatConnected = false;

  chatConnecting = false;

  chatMessage = '';

  chatName = 'Guest';

  chatMessages: GlobalChatMessage[] = [];

  private chatConnection?: HubConnection;

  private readonly maxChatMessages = 100;

  initialize(): void {
    this.chatConnection = new HubConnectionBuilder()
      .withUrl('https://localhost:7000/chatHub')
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Error)
      .build();

    this.chatConnection.on(
      'ReceiveGlobalMessage',
      (message: GlobalChatMessage) => {
        this.chatMessages = [...this.chatMessages, message].slice(
          -this.maxChatMessages,
        );
      },
    );

    this.chatConnection.onreconnecting(() => {
      this.chatConnected = false;
    });

    this.chatConnection.onreconnected(() => {
      this.chatConnected = true;
    });

    this.chatConnection.onclose(() => {
      this.chatConnected = false;
    });

    void this.connect();
  }

  async connect(): Promise<boolean> {
    const connection = this.chatConnection;

    if (!connection) {
      return false;
    }

    if (connection.state === HubConnectionState.Connected) {
      this.chatConnected = true;

      return true;
    }

    if (this.chatConnecting) {
      return false;
    }

    this.chatConnecting = true;

    try {
      await connection.start();

      this.chatConnected = true;

      console.log('Global chat connected.');

      return true;
    } catch (error) {
      this.chatConnected = false;

      console.error('Global chat connection failed:', error);

      return false;
    } finally {
      this.chatConnecting = false;
    }
  }

  toggle(): void {
    this.chatOpen = !this.chatOpen;
  }

  async send(): Promise<void> {
    const message = this.chatMessage.trim();

    const name = this.chatName.trim();

    if (!message || !name || !this.chatConnection) {
      return;
    }

    const connected = await this.connect();

    if (!connected) {
      return;
    }

    try {
      await this.chatConnection.invoke(
        'SendGlobalMessage',
        name.substring(0, 40),
        message.substring(0, 500),
      );

      this.chatMessage = '';
    } catch (error) {
      console.error('Unable to send chat message:', error);
    }
  }

  async dispose(): Promise<void> {
    if (!this.chatConnection) {
      return;
    }

    try {
      await this.chatConnection.stop();
    } catch {
      // Ignore disconnect errors.
    }

    this.chatConnection = undefined;
  }
}
