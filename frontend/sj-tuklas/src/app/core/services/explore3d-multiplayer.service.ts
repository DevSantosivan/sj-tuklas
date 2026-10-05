import { Injectable, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import { API_CONFIG } from '../config/api.config';

/* =========================================================
   AVAILABLE CHARACTERS
========================================================= */

export type Explore3dCharacterModel = 'aj' | 'suit' | 'brian';

/* =========================================================
   REMOTE PLAYER
========================================================= */

export interface Explore3dRemotePlayer {
  userId: string;
  connectionId: string;
  worldId: string;

  displayName: string;
  characterModel: Explore3dCharacterModel;

  x: number;
  y: number;
  z: number;
  rotationY: number;
}

/* =========================================================
   PLAYER POSITION
========================================================= */

export interface Explore3dPlayerPosition {
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

/* =========================================================
   JOIN REQUEST
========================================================= */

interface JoinWorldRequest {
  worldId: string;
  displayName: string;
  characterModel: Explore3dCharacterModel;
  position: Explore3dPlayerPosition;
}

/* =========================================================
   CURRENT WORLD
========================================================= */

interface CurrentWorldState {
  worldId: string;
  displayName: string;
  characterModel: Explore3dCharacterModel;
  position: Explore3dPlayerPosition;
}

/* =========================================================
   PLAYER LEFT
========================================================= */

interface PlayerLeftEvent {
  userId: string;
  connectionId: string;
  worldId: string;
}

/* =========================================================
   SERVICE
========================================================= */

@Injectable({
  providedIn: 'root',
})
export class Explore3dMultiplayerService {
  /* =======================================================
     AVAILABLE CHARACTER MODELS
  ======================================================= */

  readonly availableCharacters: Explore3dCharacterModel[] = [
    'aj',
    'suit',
    'brian',
  ];

  /* =======================================================
     SIGNALS
  ======================================================= */

  private readonly _players = signal<Explore3dRemotePlayer[]>([]);

  private readonly _connected = signal(false);

  private readonly _joining = signal(false);

  private readonly _connectionError = signal<string | null>(null);

  readonly players = this._players.asReadonly();
  readonly connected = this._connected.asReadonly();
  readonly joining = this._joining.asReadonly();
  readonly connectionError = this._connectionError.asReadonly();

  /* =======================================================
     SIGNALR
  ======================================================= */

  private connection: HubConnection | null = null;

  private connectionPromise: Promise<void> | null = null;

  /* =======================================================
     CURRENT WORLD
  ======================================================= */

  private currentWorld: CurrentWorldState | null = null;

  /* =======================================================
     HUB URL
  ======================================================= */

  private get hubUrl(): string {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;

      // Production frontend
      if (hostname === 'sj-tuklas.sjtuklas.workers.dev') {
        return 'https://sj-tuklas.onrender.com/hubs/explore3d';
      }
    }

    // Local / development
    return '/hubs/explore3d';
  }

  /* =======================================================
     CONNECT
  ======================================================= */

  async connect(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      console.log('[Explore3D Multiplayer] Already connected:', this.hubUrl);

      this._connected.set(true);

      return;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.createConnection();

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  /* =======================================================
     CREATE CONNECTION
  ======================================================= */

  private async createConnection(): Promise<void> {
    this._connectionError.set(null);

    console.log('[Explore3D Multiplayer] Hub URL:', this.hubUrl);

    const connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .configureLogging(LogLevel.Information)
      .build();

    this.connection = connection;

    this.registerHubEvents(connection);

    try {
      await connection.start();

      this._connected.set(true);
      this._connectionError.set(null);

      console.log('[Explore3D Multiplayer] Connected:', this.hubUrl);

      /*
       * Rejoin after connection restoration.
       */
      if (this.currentWorld) {
        console.log(
          '[Explore3D Multiplayer] Rejoining world:',
          this.currentWorld.worldId,
        );

        await this.joinWorldInternal(this.currentWorld);
      }
    } catch (error) {
      this._connected.set(false);

      const message = this.getErrorMessage(error);

      this._connectionError.set(message);

      console.error('[Explore3D Multiplayer] Connection failed:', error);

      throw error;
    }
  }

  /* =======================================================
     HUB EVENTS
  ======================================================= */

  private registerHubEvents(connection: HubConnection): void {
    /* =====================================================
       EXISTING PLAYERS
    ===================================================== */

    connection.on('ExistingPlayers', (players: Explore3dRemotePlayer[]) => {
      console.log(
        '[Explore3D Multiplayer] Existing players:',
        players?.length ?? 0,
      );

      if (!Array.isArray(players)) {
        console.warn(
          '[Explore3D Multiplayer] Invalid ExistingPlayers payload:',
          players,
        );

        return;
      }

      const validPlayers: Explore3dRemotePlayer[] = players
        .filter((player) => this.isCurrentWorldPlayer(player))
        .map((player) => this.normalizeRemotePlayer(player));

      console.log(
        '[Explore3D Multiplayer] Valid existing players:',
        validPlayers.length,
      );

      this._players.set(validPlayers);

      console.log('[Explore3D Multiplayer] Players state:', this._players());
    });

    /* =====================================================
       PLAYER JOINED
    ===================================================== */

    connection.on('PlayerJoined', (player: Explore3dRemotePlayer) => {
      console.log('[Explore3D Multiplayer] PlayerJoined:', player);

      if (!player) {
        return;
      }

      if (!this.isCurrentWorldPlayer(player)) {
        console.warn('[Explore3D Multiplayer] PlayerJoined rejected:', {
          currentWorld: this.currentWorld?.worldId,

          playerWorld: player?.worldId,

          connectionId: player?.connectionId,
        });

        return;
      }

      const normalized = this.normalizeRemotePlayer(player);

      this.upsertPlayer(normalized);

      console.log(
        '[Explore3D Multiplayer] Total players:',
        this._players().length,
      );
    });

    /* =====================================================
       PLAYER MOVED
    ===================================================== */

    connection.on('PlayerMoved', (player: Explore3dRemotePlayer) => {
      if (!player) {
        return;
      }

      if (!this.isCurrentWorldPlayer(player)) {
        return;
      }

      const normalized = this.normalizeRemotePlayer(player);

      this.upsertPlayer(normalized);
    });

    /* =====================================================
       PLAYER LEFT
    ===================================================== */

    connection.on('PlayerLeft', (event: PlayerLeftEvent) => {
      console.log('[Explore3D Multiplayer] PlayerLeft:', event);

      if (!event?.connectionId) {
        return;
      }

      this.removePlayer(event.connectionId);
    });

    /* =====================================================
       CONNECTION CLOSED
    ===================================================== */

    connection.onclose((error) => {
      this._connected.set(false);

      console.warn('[Explore3D Multiplayer] Connection closed:', error);

      if (error) {
        this._connectionError.set(this.getErrorMessage(error));
      }
    });

    /* =====================================================
       RECONNECTING
    ===================================================== */

    connection.onreconnecting((error) => {
      this._connected.set(false);

      console.warn('[Explore3D Multiplayer] Reconnecting...', error);
    });

    /* =====================================================
       RECONNECTED
    ===================================================== */

    connection.onreconnected(async (connectionId) => {
      this._connected.set(true);
      this._connectionError.set(null);

      console.log('[Explore3D Multiplayer] Reconnected:', connectionId);

      if (this.currentWorld) {
        try {
          await this.joinWorldInternal(this.currentWorld);
        } catch (error) {
          console.error('[Explore3D Multiplayer] Rejoin failed:', error);
        }
      }
    });
  }

  /* =======================================================
     CHARACTER VALIDATION
  ======================================================= */

  isValidCharacterModel(
    value: string | null | undefined,
  ): value is Explore3dCharacterModel {
    return value === 'aj' || value === 'suit' || value === 'brian';
  }

  /* =======================================================
     NORMALIZE CHARACTER
  ======================================================= */

  private normalizeCharacterModel(
    value: string | null | undefined,
  ): Explore3dCharacterModel {
    const normalized = value?.trim().toLowerCase();

    if (this.isValidCharacterModel(normalized)) {
      return normalized;
    }

    /*
     * Safe fallback.
     */
    return 'aj';
  }

  /* =======================================================
     NORMALIZE REMOTE PLAYER
  ======================================================= */

  private normalizeRemotePlayer(
    player: Explore3dRemotePlayer,
  ): Explore3dRemotePlayer {
    return {
      ...player,

      characterModel: this.normalizeCharacterModel(player.characterModel),
    };
  }

  /* =======================================================
     CHECK WORLD
  ======================================================= */

  private isCurrentWorldPlayer(
    player: Explore3dRemotePlayer | null | undefined,
  ): boolean {
    return !!(
      player &&
      player.connectionId &&
      player.worldId &&
      this.currentWorld &&
      player.worldId === this.currentWorld.worldId
    );
  }

  /* =======================================================
     JOIN WORLD
  ======================================================= */

  async joinWorld(
    worldId: string,
    displayName: string,
    characterModel: string,
    position: Explore3dPlayerPosition,
  ): Promise<void> {
    if (!worldId) {
      throw new Error('World ID is required.');
    }

    /*
     * IMPORTANT:
     *
     * Do NOT send "explorer".
     *
     * Only:
     * aj
     * suit
     * brian
     */

    const normalizedCharacter = this.normalizeCharacterModel(characterModel);

    const safeDisplayName = displayName?.trim() || 'Guest';

    const safePosition: Explore3dPlayerPosition = position ?? {
      x: 0,
      y: 0,
      z: 0,
      rotationY: 0,
    };

    this.currentWorld = {
      worldId,
      displayName: safeDisplayName,
      characterModel: normalizedCharacter,
      position: {
        ...safePosition,
      },
    };

    console.log('[Explore3D Multiplayer] Joining world:', this.currentWorld);

    await this.connect();

    await this.joinWorldInternal(this.currentWorld);
  }

  /* =======================================================
     JOIN WORLD INTERNAL
  ======================================================= */

  private async joinWorldInternal(world: CurrentWorldState): Promise<void> {
    if (!this.connection) {
      throw new Error('SignalR connection is not initialized.');
    }

    if (this.connection.state !== HubConnectionState.Connected) {
      throw new Error('SignalR connection is not connected.');
    }

    if (this._joining()) {
      console.log('[Explore3D Multiplayer] Already joining world.');

      return;
    }

    this._joining.set(true);
    this._connectionError.set(null);

    try {
      const request: JoinWorldRequest = {
        worldId: world.worldId,

        displayName: world.displayName,

        /*
         * This will ONLY be:
         * aj / suit / brian
         */
        characterModel: world.characterModel,

        position: {
          ...world.position,
        },
      };

      console.log('[Explore3D Multiplayer] JoinWorld request:', request);

      await this.connection.invoke('JoinWorld', request);

      console.log('[Explore3D Multiplayer] Joined world:', world.worldId);
    } catch (error) {
      const message = this.getErrorMessage(error);

      this._connectionError.set(message);

      console.error('[Explore3D Multiplayer] JoinWorld failed:', error);

      throw error;
    } finally {
      this._joining.set(false);
    }
  }

  /* =======================================================
     MOVE PLAYER
  ======================================================= */

  async movePlayer(position: Explore3dPlayerPosition): Promise<void> {
    if (!this.connection) {
      return;
    }

    if (this.connection.state !== HubConnectionState.Connected) {
      return;
    }

    if (!this.currentWorld) {
      return;
    }

    this.currentWorld = {
      ...this.currentWorld,

      position: {
        ...position,
      },
    };

    try {
      await this.connection.invoke('MovePlayer', {
        x: position.x,
        y: position.y,
        z: position.z,
        rotationY: position.rotationY,
      });
    } catch (error) {
      console.error('[Explore3D Multiplayer] MovePlayer failed:', error);
    }
  }

  /* =======================================================
     LEAVE WORLD
  ======================================================= */

  async leaveWorld(): Promise<void> {
    if (!this.connection) {
      this.clearPlayers();
      this.currentWorld = null;
      return;
    }

    try {
      if (this.connection.state === HubConnectionState.Connected) {
        console.log(
          '[Explore3D Multiplayer] Leaving world:',
          this.currentWorld?.worldId,
        );

        await this.connection.invoke('LeaveWorld');
      }
    } catch (error) {
      console.warn('[Explore3D Multiplayer] LeaveWorld failed:', error);
    }

    this.clearPlayers();
    this.currentWorld = null;
  }

  /* =======================================================
     DISCONNECT
  ======================================================= */

  async disconnect(): Promise<void> {
    console.log('[Explore3D Multiplayer] Disconnecting...');

    this.currentWorld = null;

    this.clearPlayers();

    if (!this.connection) {
      this._connected.set(false);
      return;
    }

    try {
      await this.connection.stop();
    } catch (error) {
      console.warn('[Explore3D Multiplayer] Disconnect failed:', error);
    } finally {
      this.connection = null;

      this._connected.set(false);
      this._joining.set(false);
    }
  }

  /* =======================================================
     UPSERT PLAYER
  ======================================================= */

  private upsertPlayer(player: Explore3dRemotePlayer): void {
    if (!player?.connectionId) {
      return;
    }

    this._players.update((players) => {
      const index = players.findIndex(
        (existing) => existing.connectionId === player.connectionId,
      );

      if (index === -1) {
        return [
          ...players,
          {
            ...player,
          },
        ];
      }

      const updated = [...players];

      updated[index] = {
        ...updated[index],
        ...player,
      };

      return updated;
    });
  }

  /* =======================================================
     REMOVE PLAYER
  ======================================================= */

  private removePlayer(connectionId: string): void {
    this._players.update((players) =>
      players.filter((player) => player.connectionId !== connectionId),
    );

    console.log('[Explore3D Multiplayer] Removed player:', connectionId);

    console.log(
      '[Explore3D Multiplayer] Remaining players:',
      this._players().length,
    );
  }

  /* =======================================================
     GET PLAYER
  ======================================================= */

  getPlayer(connectionId: string): Explore3dRemotePlayer | undefined {
    return this._players().find(
      (player) => player.connectionId === connectionId,
    );
  }

  /* =======================================================
     HAS PLAYER
  ======================================================= */

  hasPlayer(connectionId: string): boolean {
    return this._players().some(
      (player) => player.connectionId === connectionId,
    );
  }

  /* =======================================================
     PLAYER COUNT
  ======================================================= */

  getPlayerCount(): number {
    return this._players().length;
  }

  /* =======================================================
     CLEAR PLAYERS
  ======================================================= */

  clearPlayers(): void {
    this._players.set([]);
  }

  /* =======================================================
     CURRENT WORLD
  ======================================================= */

  getCurrentWorld(): CurrentWorldState | null {
    if (!this.currentWorld) {
      return null;
    }

    return {
      ...this.currentWorld,

      position: {
        ...this.currentWorld.position,
      },
    };
  }

  /* =======================================================
     CONNECTION STATE
  ======================================================= */

  getConnectionState(): HubConnectionState | null {
    return this.connection?.state ?? null;
  }

  /* =======================================================
     ERROR
  ======================================================= */

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown multiplayer connection error.';
    }
  }
}
