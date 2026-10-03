import { Injectable, signal } from '@angular/core';

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import { API_CONFIG } from '../config/api.config';

export interface Explore3dRemotePlayer {
  userId: string;
  connectionId: string;
  worldId: string;
  displayName: string;
  characterModel: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

export interface Explore3dPlayerPosition {
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

interface JoinWorldRequest {
  worldId: string;
  displayName: string;
  characterModel: string;
  position: Explore3dPlayerPosition;
}

interface PlayerLeftEvent {
  connectionId: string;
}

@Injectable({
  providedIn: 'root',
})
export class Explore3dMultiplayerService {
  private connection?: HubConnection;
  private startPromise?: Promise<void>;
  private currentWorld?: JoinWorldRequest;

  private readonly _players = signal<Explore3dRemotePlayer[]>([]);
  private readonly _connected = signal(false);
  private readonly _joining = signal(false);

  readonly players = this._players.asReadonly();
  readonly connected = this._connected.asReadonly();
  readonly joining = this._joining.asReadonly();

  /**
   * Regular API requests still use API_CONFIG.baseUrl = '/api'.
   * SignalR connects directly to the deployed ASP.NET Core backend.
   */
  private readonly hubUrl = 'https://sj-tuklas.onrender.com/hubs/explore3d';

  /**
   * Establish the SignalR connection.
   * Reuse an existing connection and prevent duplicate starts.
   */
  async connect(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      this._connected.set(true);
      return;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    if (!this.connection) {
      this.createConnection();
    }

    const connection = this.connection!;

    if (connection.state === HubConnectionState.Connecting) {
      if (this.startPromise) {
        return this.startPromise;
      }

      throw new Error('SignalR connection is already starting.');
    }

    if (connection.state === HubConnectionState.Reconnecting) {
      throw new Error('SignalR is reconnecting. Please try again shortly.');
    }

    this.startPromise = connection
      .start()
      .then(() => {
        this._connected.set(true);

        console.info('[Explore3D Multiplayer] Connected:', this.hubUrl);
      })
      .catch((error: unknown) => {
        this._connected.set(false);

        console.error('[Explore3D Multiplayer] Connection failed:', error);

        throw error;
      })
      .finally(() => {
        this.startPromise = undefined;
      });

    return this.startPromise;
  }

  /**
   * Create and configure the SignalR connection.
   */
  private createConnection(): void {
    this.connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        withCredentials: true,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    this.registerHubEvents(this.connection);
  }

  /**
   * Register server events and connection lifecycle handlers.
   */
  private registerHubEvents(connection: HubConnection): void {
    connection.on('ExistingPlayers', (players: Explore3dRemotePlayer[]) => {
      this._players.set(players ?? []);

      console.info(
        '[Explore3D Multiplayer] Existing players:',
        players?.length ?? 0,
      );
    });

    connection.on('PlayerJoined', (player: Explore3dRemotePlayer) => {
      this.upsertPlayer(player);

      console.info(
        '[Explore3D Multiplayer] Player joined:',
        player?.displayName,
      );
    });

    connection.on('PlayerMoved', (player: Explore3dRemotePlayer) => {
      this.upsertPlayer(player);
    });

    connection.on('PlayerLeft', (event: PlayerLeftEvent) => {
      if (!event?.connectionId) {
        return;
      }

      this._players.update((players) =>
        players.filter((player) => player.connectionId !== event.connectionId),
      );

      console.info('[Explore3D Multiplayer] Player left:', event.connectionId);
    });

    connection.onreconnecting((error) => {
      this._connected.set(false);

      console.warn('[Explore3D Multiplayer] Reconnecting...', error);
    });

    connection.onreconnected(async () => {
      this._connected.set(true);

      console.info('[Explore3D Multiplayer] Reconnected.');

      // Rejoin the previous world after SignalR reconnects.
      if (this.currentWorld) {
        try {
          await connection.invoke('JoinWorld', this.currentWorld);

          console.info(
            '[Explore3D Multiplayer] Rejoined world:',
            this.currentWorld.worldId,
          );
        } catch (error) {
          console.error(
            '[Explore3D Multiplayer] Failed to rejoin world:',
            error,
          );
        }
      }
    });

    connection.onclose((error) => {
      this._connected.set(false);
      this._players.set([]);

      if (error) {
        console.error('[Explore3D Multiplayer] Connection closed:', error);
      } else {
        console.info('[Explore3D Multiplayer] Connection stopped.');
      }
    });
  }

  /**
   * Join a specific 3D world.
   */
  async joinWorld(
    worldId: string,
    displayName: string,
    characterModel: string,
    position: Explore3dPlayerPosition,
  ): Promise<void> {
    const request: JoinWorldRequest = {
      worldId,
      displayName,
      characterModel,
      position: { ...position },
    };

    this._joining.set(true);

    try {
      await this.connect();

      if (!this.connection) {
        throw new Error('SignalR connection is not available.');
      }

      this.currentWorld = request;

      await this.connection.invoke('JoinWorld', request);

      console.info('[Explore3D Multiplayer] Joined world:', worldId);
    } catch (error) {
      this.currentWorld = undefined;

      console.error('[Explore3D Multiplayer] Failed to join world:', error);

      throw error;
    } finally {
      this._joining.set(false);
    }
  }

  /**
   * Send the local player's latest position to the server.
   */
  async movePlayer(position: Explore3dPlayerPosition): Promise<void> {
    if (this.connection?.state !== HubConnectionState.Connected) {
      return;
    }

    if (!this.currentWorld) {
      return;
    }

    await this.connection.invoke('MovePlayer', { ...position });

    // Keep the latest position for reconnect handling.
    this.currentWorld = {
      ...this.currentWorld,
      position: { ...position },
    };
  }

  /**
   * Leave the currently joined world.
   */
  async leaveWorld(): Promise<void> {
    this.currentWorld = undefined;

    if (this.connection?.state !== HubConnectionState.Connected) {
      this._players.set([]);
      return;
    }

    try {
      await this.connection.invoke('LeaveWorld');

      console.info('[Explore3D Multiplayer] Left world.');
    } catch (error) {
      console.error('[Explore3D Multiplayer] Failed to leave world:', error);

      throw error;
    } finally {
      this._players.set([]);
    }
  }

  /**
   * Stop the SignalR connection and clear multiplayer state.
   */
  async disconnect(): Promise<void> {
    this.currentWorld = undefined;

    const connection = this.connection;

    this.connection = undefined;
    this.startPromise = undefined;

    if (connection) {
      await connection.stop();
    }

    this._players.set([]);
    this._connected.set(false);
    this._joining.set(false);

    console.info('[Explore3D Multiplayer] Disconnected.');
  }

  /**
   * Add a player to the list or update an existing player.
   */
  private upsertPlayer(player: Explore3dRemotePlayer): void {
    if (!player?.connectionId) {
      return;
    }

    this._players.update((players) => {
      const index = players.findIndex(
        (existing) => existing.connectionId === player.connectionId,
      );

      if (index === -1) {
        return [...players, player];
      }

      return players.map((existing, i) => (i === index ? player : existing));
    });
  }

  /**
   * Get a remote player by connection ID.
   */
  getPlayer(connectionId: string): Explore3dRemotePlayer | undefined {
    return this._players().find(
      (player) => player.connectionId === connectionId,
    );
  }

  /**
   * Check whether a player is currently tracked.
   */
  hasPlayer(connectionId: string): boolean {
    return this._players().some(
      (player) => player.connectionId === connectionId,
    );
  }

  /**
   * Return the number of currently tracked players.
   */
  getPlayerCount(): number {
    return this._players().length;
  }

  /**
   * Clear local multiplayer state without stopping connection.
   */
  clearPlayers(): void {
    this._players.set([]);
  }
}
