import { Injectable, signal } from '@angular/core';

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import { API_CONFIG } from '../config/api.config';

// =============================================================
// CHARACTER MODEL
// =============================================================

export type Explore3dCharacterModel = 'aj' | 'suit' | 'brian';

// =============================================================
// REMOTE PLAYER
// =============================================================

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

// =============================================================
// PLAYER POSITION
// =============================================================

export interface Explore3dPlayerPosition {
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

// =============================================================
// JOIN REQUEST
// =============================================================

/*
 * Must match:
 *
 * C# JoinExplore3dWorldRequest
 *
 * {
 *   worldId,
 *   displayName,
 *   characterModel,
 *   position
 * }
 */

interface JoinWorldRequest {
  worldId: string;
  displayName: string;
  characterModel: Explore3dCharacterModel;
  position: Explore3dPlayerPosition;
}

// =============================================================
// CURRENT WORLD
// =============================================================

interface CurrentWorldState {
  worldId: string;
  displayName: string;
  characterModel: Explore3dCharacterModel;
  position: Explore3dPlayerPosition;
}

// =============================================================
// PLAYER LEFT EVENT
// =============================================================

interface PlayerLeftEvent {
  userId: string;
  connectionId: string;
  worldId: string;
}

// =============================================================
// PLAYER MOVED EVENT
// =============================================================

interface PlayerMovedEvent {
  player: Explore3dRemotePlayer;

  /*
   * Current backend sends only:
   *
   * PlayerMoved
   * -> updatedPlayer
   *
   * These are therefore optional.
   */
  clientSentAt?: number;
  serverReceivedAt?: number;
}

// =============================================================
// SERVICE
// =============================================================

@Injectable({
  providedIn: 'root',
})
export class Explore3dMultiplayerService {
  // ===========================================================
  // AVAILABLE CHARACTERS
  // ===========================================================

  readonly availableCharacters: Explore3dCharacterModel[] = [
    'aj',
    'suit',
    'brian',
  ];

  // ===========================================================
  // SIGNALS
  // ===========================================================

  private readonly _players = signal<Explore3dRemotePlayer[]>([]);

  private readonly _connected = signal(false);

  private readonly _joining = signal(false);

  private readonly _connectionError = signal<string | null>(null);

  private readonly _latency = signal(0);

  private readonly _onlinePlayers = signal(0);

  private readonly _movementDelay = signal(0);

  // ===========================================================
  // PUBLIC SIGNALS
  // ===========================================================

  readonly players = this._players.asReadonly();

  readonly connected = this._connected.asReadonly();

  readonly joining = this._joining.asReadonly();

  readonly connectionError = this._connectionError.asReadonly();

  readonly latency = this._latency.asReadonly();

  readonly onlinePlayers = this._onlinePlayers.asReadonly();

  readonly movementDelay = this._movementDelay.asReadonly();

  // ===========================================================
  // CONNECTION
  // ===========================================================

  private connection: HubConnection | null = null;

  private connectionPromise: Promise<void> | null = null;

  // ===========================================================
  // CURRENT WORLD
  // ===========================================================

  private currentWorld: CurrentWorldState | null = null;

  // ===========================================================
  // MOVEMENT NETWORK THROTTLE
  // ===========================================================

  /**
   * Keep movement traffic bounded even if a caller accidentally calls
   * movePlayer() every render frame. Only the newest position is kept.
   */
  private readonly movementSendIntervalMs = 66; // ~15 Hz
  private pendingMove: Explore3dPlayerPosition | null = null;
  private movementSendInFlight = false;
  private movementSendTimer?: ReturnType<typeof setTimeout>;
  private lastMovementSentAt = 0;

  // ===========================================================
  // JOIN STATE
  // ===========================================================

  /*
   * IMPORTANT:
   *
   * SignalR being Connected does NOT mean that the player
   * has successfully joined the Explore3D world.
   *
   * Therefore:
   *
   * connected === true
   *
   * does NOT automatically mean:
   *
   * joinedWorld === true
   */

  private joinedWorld = false;

  // ===========================================================
  // HUB URL
  // ===========================================================

  private get hubUrl(): string {
    return API_CONFIG.baseUrl.replace(/\/api\/?$/, '') + '/hubs/explore3d';
  }

  // ===========================================================
  // CONNECT
  // ===========================================================

  async connect(): Promise<void> {
    // ---------------------------------------------------------
    // Already connected
    // ---------------------------------------------------------

    if (this.connection?.state === HubConnectionState.Connected) {
      this._connected.set(true);
      return;
    }

    // ---------------------------------------------------------
    // Existing connection attempt
    // ---------------------------------------------------------

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // ---------------------------------------------------------
    // Create connection
    // ---------------------------------------------------------

    this.connectionPromise = this.createConnection();

    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  // ===========================================================
  // CREATE CONNECTION
  // ===========================================================

  private async createConnection(): Promise<void> {
    this._connectionError.set(null);

    const connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 20000])
      .configureLogging(LogLevel.Error)
      .build();

    this.connection = connection;

    // Register events BEFORE start.
    this.registerHubEvents(connection);

    try {
      await connection.start();

      this._connected.set(true);

      this._connectionError.set(null);

      /*
       * IMPORTANT:
       *
       * Do NOT call JoinWorld here.
       *
       * joinWorld() is responsible for joining.
       *
       * This prevents:
       *
       * connect()
       *      ↓
       * createConnection()
       *      ↓
       * JoinWorld()
       *
       * AND
       *
       * joinWorld()
       *      ↓
       * JoinWorld()
       *
       * from happening twice.
       */

      void this.measureLatency();
    } catch (error) {
      this._connected.set(false);

      this.joinedWorld = false;

      this._connectionError.set(this.getErrorMessage(error));

      throw error;
    }
  }

  // ===========================================================
  // HUB EVENTS
  // ===========================================================

  private registerHubEvents(connection: HubConnection): void {
    // =========================================================
    // EXISTING PLAYERS
    // =========================================================

    connection.on('ExistingPlayers', (players: Explore3dRemotePlayer[]) => {
      if (!Array.isArray(players)) {
        return;
      }

      this._players.set(
        players
          .filter((player) => this.isCurrentWorldPlayer(player))
          .map((player) => this.normalizeRemotePlayer(player)),
      );
    });

    // =========================================================
    // PLAYER JOINED
    // =========================================================

    connection.on('PlayerJoined', (player: Explore3dRemotePlayer) => {
      if (!player || !this.isCurrentWorldPlayer(player)) {
        return;
      }

      this.upsertPlayer(this.normalizeRemotePlayer(player));
    });

    // =========================================================
    // PLAYER MOVED
    // =========================================================

    connection.on(
      'PlayerMoved',
      (message: Explore3dRemotePlayer | PlayerMovedEvent) => {
        if (!message) {
          return;
        }

        /*
         * Current backend sends:
         *
         * SendAsync(
         *   "PlayerMoved",
         *   updatedPlayer
         * )
         *
         * So support both:
         *
         * 1. direct player object
         * 2. wrapped PlayerMovedEvent
         */

        const player = this.isPlayerMovedEvent(message)
          ? message.player
          : message;

        if (!player) {
          return;
        }

        if (!this.isCurrentWorldPlayer(player)) {
          return;
        }

        /*
         * Only calculate movement delay if the
         * backend actually provides clientSentAt.
         */

        if (
          this.isPlayerMovedEvent(message) &&
          typeof message.clientSentAt === 'number'
        ) {
          const receivedAt = Date.now();

          const movementDelay = receivedAt - message.clientSentAt;

          this._movementDelay.set(Math.max(0, movementDelay));
        }

        this.upsertPlayer(this.normalizeRemotePlayer(player));
      },
    );

    // =========================================================
    // PLAYER LEFT
    // =========================================================

    connection.on('PlayerLeft', (event: PlayerLeftEvent) => {
      if (!event?.connectionId) {
        return;
      }

      this.removePlayer(event.connectionId);
    });

    // =========================================================
    // WORLD PLAYER COUNT
    // =========================================================

    connection.on('WorldPlayerCount', (count: number) => {
      this._onlinePlayers.set(Math.max(0, Number(count) || 0));
    });

    // =========================================================
    // CLOSED
    // =========================================================

    connection.onclose((error) => {
      this._connected.set(false);

      this.joinedWorld = false;

      if (error) {
        this._connectionError.set(this.getErrorMessage(error));
      }
    });

    // =========================================================
    // RECONNECTING
    // =========================================================

    connection.onreconnecting(() => {
      this._connected.set(false);

      this.joinedWorld = false;

      this._connectionError.set('Reconnecting to Explore3D...');
    });

    // =========================================================
    // RECONNECTED
    // =========================================================

    connection.onreconnected(async () => {
      this._connected.set(true);

      this.joinedWorld = false;

      this._connectionError.set(null);

      /*
       * SignalR reconnect creates a new server-side
       * connection.
       *
       * Therefore the server no longer has the old
       * connection in Players.
       *
       * We must join the world again.
       */

      if (this.currentWorld) {
        try {
          await this.joinWorldInternal(this.currentWorld);
        } catch (error) {
          this._connectionError.set(this.getErrorMessage(error));
        }
      }

      void this.measureLatency();
    });
  }

  // ===========================================================
  // LATENCY
  // ===========================================================

  async measureLatency(): Promise<number> {
    if (
      !this.connection ||
      this.connection.state !== HubConnectionState.Connected
    ) {
      return 0;
    }

    try {
      const startedAt = performance.now();

      await this.connection.invoke('Ping');

      const latency = Math.round(performance.now() - startedAt);

      this._latency.set(latency);

      return latency;
    } catch {
      this._latency.set(0);

      return 0;
    }
  }

  // ===========================================================
  // CHARACTER VALIDATION
  // ===========================================================

  isValidCharacterModel(
    value: string | null | undefined,
  ): value is Explore3dCharacterModel {
    return value === 'aj' || value === 'suit' || value === 'brian';
  }

  // ===========================================================
  // NORMALIZE CHARACTER
  // ===========================================================

  private normalizeCharacterModel(
    value: string | null | undefined,
  ): Explore3dCharacterModel {
    const normalized = value?.trim().toLowerCase();

    return this.isValidCharacterModel(normalized) ? normalized : 'aj';
  }

  // ===========================================================
  // NORMALIZE REMOTE PLAYER
  // ===========================================================

  private normalizeRemotePlayer(
    player: Explore3dRemotePlayer,
  ): Explore3dRemotePlayer {
    return {
      ...player,

      characterModel: this.normalizeCharacterModel(player.characterModel),
    };
  }

  // ===========================================================
  // CURRENT WORLD CHECK
  // ===========================================================

  private isCurrentWorldPlayer(
    player: Explore3dRemotePlayer | null | undefined,
  ): boolean {
    return !!(
      player?.connectionId &&
      player.worldId &&
      this.currentWorld &&
      player.worldId === this.currentWorld.worldId
    );
  }

  // ===========================================================
  // JOIN WORLD
  // ===========================================================

  async joinWorld(
    worldId: string,
    displayName: string,
    characterModel: string,
    position: Explore3dPlayerPosition,
  ): Promise<void> {
    // ---------------------------------------------------------
    // Validate world
    // ---------------------------------------------------------

    if (!worldId?.trim()) {
      throw new Error('World ID is required.');
    }

    // ---------------------------------------------------------
    // Normalize data
    // ---------------------------------------------------------

    const normalizedWorldId = worldId.trim();

    const normalizedCharacter = this.normalizeCharacterModel(characterModel);

    const safeDisplayName = displayName?.trim() || 'Guest';

    const safePosition = position ?? {
      x: 0,
      y: 0,
      z: 0,
      rotationY: 0,
    };

    // ---------------------------------------------------------
    // Save current world
    // ---------------------------------------------------------

    this.currentWorld = {
      worldId: normalizedWorldId,

      displayName: safeDisplayName,

      characterModel: normalizedCharacter,

      position: {
        x: safePosition.x ?? 0,

        y: safePosition.y ?? 0,

        z: safePosition.z ?? 0,

        rotationY: safePosition.rotationY ?? 0,
      },
    };

    // ---------------------------------------------------------
    // Reset join state
    // ---------------------------------------------------------

    this.joinedWorld = false;

    this.clearPlayers();
    this.pendingMove = null;

    this._onlinePlayers.set(0);

    this._movementDelay.set(0);

    // ---------------------------------------------------------
    // Connect
    // ---------------------------------------------------------

    await this.connect();

    // ---------------------------------------------------------
    // Join exactly once
    // ---------------------------------------------------------

    if (!this.currentWorld) {
      return;
    }

    await this.joinWorldInternal(this.currentWorld);
  }

  // ===========================================================
  // JOIN WORLD INTERNAL
  // ===========================================================

  private async joinWorldInternal(world: CurrentWorldState): Promise<void> {
    // ---------------------------------------------------------
    // Validate connection
    // ---------------------------------------------------------

    if (!this.connection) {
      throw new Error('SignalR connection is not initialized.');
    }

    if (this.connection.state !== HubConnectionState.Connected) {
      throw new Error('SignalR connection is not connected.');
    }

    // ---------------------------------------------------------
    // Already joining
    // ---------------------------------------------------------

    if (this._joining()) {
      return;
    }

    // ---------------------------------------------------------
    // Start joining
    // ---------------------------------------------------------

    this._joining.set(true);

    this.joinedWorld = false;

    this._connectionError.set(null);

    try {
      const request: JoinWorldRequest = {
        worldId: world.worldId,

        displayName: world.displayName,

        characterModel: world.characterModel,

        position: {
          ...world.position,
        },
      };

      console.log('[Explore3D] Joining world:', request);

      // =======================================================
      // THIS MUST MATCH C#:
      //
      // JoinWorld(JoinExplore3dWorldRequest request)
      // =======================================================

      await this.connection.invoke('JoinWorld', request);

      // =======================================================
      // ONLY MARK JOINED AFTER SERVER SUCCESS
      // =======================================================

      this.joinedWorld = true;

      console.log('[Explore3D] JoinWorld success.');

      void this.measureLatency();
    } catch (error) {
      this.joinedWorld = false;

      const message = this.getErrorMessage(error);

      console.error('[Explore3D] JoinWorld failed:', error);

      this._connectionError.set(message);

      throw error;
    } finally {
      this._joining.set(false);
    }
  }

  // ===========================================================
  // MOVE PLAYER
  // ===========================================================

  async movePlayer(position: Explore3dPlayerPosition): Promise<void> {
    if (
      !this.connection ||
      this.connection.state !== HubConnectionState.Connected
    ) {
      return;
    }

    if (!this.currentWorld || !this.joinedWorld || this._joining()) {
      return;
    }

    // Keep the local world state current immediately.
    this.currentWorld = {
      ...this.currentWorld,
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
        rotationY: position.rotationY,
      },
    };

    // Coalesce movement packets: never queue stale positions.
    this.pendingMove = {
      x: position.x,
      y: position.y,
      z: position.z,
      rotationY: position.rotationY,
    };

    void this.flushMovementSend();
  }

  private scheduleMovementFlush(delayMs: number): void {
    if (this.movementSendTimer || this.movementSendInFlight) {
      return;
    }

    this.movementSendTimer = setTimeout(
      () => {
        this.movementSendTimer = undefined;
        void this.flushMovementSend();
      },
      Math.max(0, delayMs),
    );
  }

  private async flushMovementSend(): Promise<void> {
    if (this.movementSendInFlight || !this.pendingMove) {
      return;
    }

    if (
      !this.connection ||
      this.connection.state !== HubConnectionState.Connected ||
      !this.currentWorld ||
      !this.joinedWorld ||
      this._joining()
    ) {
      return;
    }

    const elapsed = performance.now() - this.lastMovementSentAt;

    if (this.lastMovementSentAt > 0 && elapsed < this.movementSendIntervalMs) {
      this.scheduleMovementFlush(this.movementSendIntervalMs - elapsed);
      return;
    }

    const move = this.pendingMove;
    this.pendingMove = null;
    this.movementSendInFlight = true;
    this.lastMovementSentAt = performance.now();

    try {
      await this.connection.send('MovePlayer', move);
    } catch (error) {
      console.warn('[Explore3D] MovePlayer failed:', error);
    } finally {
      this.movementSendInFlight = false;

      // If movement happened while the packet was in flight, send only
      // the latest position after the throttle interval.
      if (this.pendingMove) {
        const elapsedAfterSend = performance.now() - this.lastMovementSentAt;
        this.scheduleMovementFlush(
          Math.max(0, this.movementSendIntervalMs - elapsedAfterSend),
        );
      }
    }
  }

  // ===========================================================
  // LEAVE WORLD
  // ===========================================================

  async leaveWorld(): Promise<void> {
    this.joinedWorld = false;
    this.pendingMove = null;
    if (this.movementSendTimer) {
      clearTimeout(this.movementSendTimer);
      this.movementSendTimer = undefined;
    }

    if (this.connection?.state === HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveWorld');
      } catch (error) {
        console.warn('[Explore3D] LeaveWorld failed:', error);
      }
    }

    this.clearPlayers();

    this.currentWorld = null;

    this._onlinePlayers.set(0);

    this._movementDelay.set(0);
  }

  // ===========================================================
  // DISCONNECT
  // ===========================================================

  async disconnect(): Promise<void> {
    this.joinedWorld = false;
    this.pendingMove = null;
    if (this.movementSendTimer) {
      clearTimeout(this.movementSendTimer);
      this.movementSendTimer = undefined;
    }

    this.currentWorld = null;

    this.clearPlayers();

    this._onlinePlayers.set(0);

    this._latency.set(0);

    this._movementDelay.set(0);

    if (!this.connection) {
      this._connected.set(false);

      return;
    }

    try {
      await this.connection.stop();
    } catch {
      // Ignore disconnect errors.
    } finally {
      this.connection = null;

      this._connected.set(false);

      this._joining.set(false);

      this.joinedWorld = false;
    }
  }

  // ===========================================================
  // UPSERT PLAYER
  // ===========================================================

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

      const updated = [...players];

      updated[index] = {
        ...updated[index],
        ...player,
      };

      return updated;
    });
  }

  // ===========================================================
  // REMOVE PLAYER
  // ===========================================================

  private removePlayer(connectionId: string): void {
    this._players.update((players) =>
      players.filter((player) => player.connectionId !== connectionId),
    );
  }

  // ===========================================================
  // GET PLAYER
  // ===========================================================

  getPlayer(connectionId: string): Explore3dRemotePlayer | undefined {
    return this._players().find(
      (player) => player.connectionId === connectionId,
    );
  }

  // ===========================================================
  // HAS PLAYER
  // ===========================================================

  hasPlayer(connectionId: string): boolean {
    return this._players().some(
      (player) => player.connectionId === connectionId,
    );
  }

  // ===========================================================
  // PLAYER COUNT
  // ===========================================================

  getPlayerCount(): number {
    return this._players().length;
  }

  // ===========================================================
  // CLEAR PLAYERS
  // ===========================================================

  clearPlayers(): void {
    this._players.set([]);
  }

  // ===========================================================
  // CURRENT WORLD
  // ===========================================================

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

  // ===========================================================
  // CONNECTION STATE
  // ===========================================================

  getConnectionState(): HubConnectionState | null {
    return this.connection?.state ?? null;
  }

  // ===========================================================
  // PLAYER MOVED EVENT CHECK
  // ===========================================================

  private isPlayerMovedEvent(
    value: Explore3dRemotePlayer | PlayerMovedEvent,
  ): value is PlayerMovedEvent {
    return typeof value === 'object' && value !== null && 'player' in value;
  }

  // ===========================================================
  // ERROR MESSAGE
  // ===========================================================

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
