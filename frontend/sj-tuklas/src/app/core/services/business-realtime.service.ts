import { Injectable } from '@angular/core';

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
} from '@microsoft/signalr';

import { Business } from '../models/business';
import { API_CONFIG } from '../config/api.config';

// =========================================================
// BUSINESS STATUS EVENT
// =========================================================

export interface BusinessStatusChangedEvent {
  businessId: string;
  status: Business['status'];
  business?: Business;
}

type BusinessStatusChangedHandler = (event: BusinessStatusChangedEvent) => void;

// =========================================================
// USER REGISTERED EVENT
// =========================================================

export interface UserRegisteredEvent {
  userId: string;
}

type UserRegisteredHandler = (event: UserRegisteredEvent) => void;

// =========================================================
// SERVICE
// =========================================================

@Injectable({
  providedIn: 'root',
})
export class BusinessRealtimeService {
  private connection: HubConnection | null = null;

  // =======================================================
  // BUSINESS LISTENERS
  // =======================================================

  private readonly businessListeners = new Set<BusinessStatusChangedHandler>();

  // =======================================================
  // USER REGISTRATION LISTENERS
  // =======================================================

  private readonly userRegisteredListeners = new Set<UserRegisteredHandler>();

  // =======================================================
  // SIGNALR URL
  // =======================================================

  private get signalRUrl(): string {
    return API_CONFIG.baseUrl.replace(/\/api\/?$/, '') + '/hubs/business';
  }

  // =======================================================
  // CONNECT
  // =======================================================

  async connect(handler?: BusinessStatusChangedHandler): Promise<void> {
    if (handler) {
      this.businessListeners.add(handler);
    }

    // -------------------------------------------------------
    // ALREADY CONNECTED
    // -------------------------------------------------------

    if (
      this.connection &&
      this.connection.state !== HubConnectionState.Disconnected
    ) {
      console.log('BUSINESS SIGNALR ALREADY CONNECTED:', this.connection.state);

      return;
    }

    // -------------------------------------------------------
    // CREATE CONNECTION
    // -------------------------------------------------------

    this.connection = new HubConnectionBuilder()
      .withUrl(this.signalRUrl, {
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .build();

    console.log('BUSINESS SIGNALR URL:', this.signalRUrl);

    // =======================================================
    // BUSINESS STATUS CHANGED
    // =======================================================

    this.connection.on(
      'BusinessStatusChanged',
      (event: BusinessStatusChangedEvent) => {
        console.log('BUSINESS STATUS CHANGED:', event);

        for (const listener of this.businessListeners) {
          try {
            listener(event);
          } catch (error) {
            console.error('BUSINESS REALTIME LISTENER ERROR:', error);
          }
        }
      },
    );

    // =======================================================
    // USER REGISTERED
    // =======================================================

    this.connection.on('UserRegistered', (event: UserRegisteredEvent) => {
      console.log('USER REGISTERED REALTIME:', event);

      for (const listener of this.userRegisteredListeners) {
        try {
          listener(event);
        } catch (error) {
          console.error('USER REGISTERED LISTENER ERROR:', error);
        }
      }
    });

    // =======================================================
    // RECONNECTING
    // =======================================================

    this.connection.onreconnecting((error) => {
      console.warn('BUSINESS SIGNALR RECONNECTING:', error);
    });

    // =======================================================
    // RECONNECTED
    // =======================================================

    this.connection.onreconnected((connectionId) => {
      console.log('BUSINESS SIGNALR RECONNECTED:', connectionId);
    });

    // =======================================================
    // CLOSED
    // =======================================================

    this.connection.onclose((error) => {
      console.warn('BUSINESS SIGNALR CLOSED:', error);
    });

    // =======================================================
    // START
    // =======================================================

    try {
      await this.connection.start();

      console.log('BUSINESS SIGNALR CONNECTED');
    } catch (error) {
      if (handler) {
        this.businessListeners.delete(handler);
      }

      console.error('FAILED TO CONNECT BUSINESS SIGNALR:', error);

      throw error;
    }
  }

  // =========================================================
  // USER REGISTERED LISTENER
  // =========================================================

  addUserRegisteredListener(handler: UserRegisteredHandler): void {
    this.userRegisteredListeners.add(handler);

    console.log('USER REGISTERED LISTENER ADDED');
  }

  // =========================================================
  // REMOVE USER REGISTERED LISTENER
  // =========================================================

  removeUserRegisteredListener(handler: UserRegisteredHandler): void {
    this.userRegisteredListeners.delete(handler);

    console.log('USER REGISTERED LISTENER REMOVED');
  }

  // =========================================================
  // REMOVE BUSINESS LISTENER
  // =========================================================

  removeListener(handler: BusinessStatusChangedHandler): void {
    this.businessListeners.delete(handler);

    console.log('BUSINESS SIGNALR LISTENER REMOVED');
  }

  // =========================================================
  // DISCONNECT
  // =========================================================

  async disconnect(): Promise<void> {
    this.businessListeners.clear();
    this.userRegisteredListeners.clear();

    if (!this.connection) {
      return;
    }

    try {
      await this.connection.stop();

      console.log('BUSINESS SIGNALR DISCONNECTED');
    } catch (error) {
      console.error('FAILED TO DISCONNECT BUSINESS SIGNALR:', error);
    } finally {
      this.connection = null;
    }
  }
}
